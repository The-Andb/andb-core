const { getLogger } = require('andb-logger');
import { ProjectConfigService } from '../config/project-config.service';
import { GitOrchestrator } from './git-orchestrator.service';
import { ISafetyReport, SafetyLevel } from '../../common/interfaces/schema.interface';

export class SchemaOrchestrator {
  private readonly logger = getLogger({ logName: 'SchemaOrchestrator' });

  constructor(
    private readonly configService: ProjectConfigService,
    private storageService: any,
    private driverFactory: any,
    private comparator: any,
    private exporter: any,
    private migrator: any,
    private semanticDiff: any,
    private readonly gitOrchestrator: GitOrchestrator,
    private readonly dependencySearch: any, // Using any for now to avoid complex type imports if not readily available
  ) { }

  async exportSchema(payload: any) {
    const { env, db, name = null, type = null, onProgress, gitConfig } = payload;
    const result = await this.exporter.exportSchema(env, name, type, onProgress);

    if (gitConfig?.autoCommit) {
      await this.gitOrchestrator.gitSync({
        config: gitConfig,
        env,
        db: db || 'default',
        message: null
      });
    }

    return result;
  }

  async getSchemaObjects(payload: any) {
    const { connection, type } = payload;
    const driver = await this.getDriverFromConnection(connection);

    try {
      await driver.connect();
      const intro = driver.getIntrospectionService();
      const dbName = connection.database || connection.name || 'default';

      switch (type.toLowerCase()) {
        case 'tables':
          return await intro.listTables(dbName);
        case 'views':
          return await intro.listViews(dbName);
        case 'procedures':
          return await intro.listProcedures(dbName);
        case 'functions':
          return await intro.listFunctions(dbName);
        case 'triggers':
          return await intro.listTriggers(dbName);
        default:
          return [];
      }
    } finally {
      await driver.disconnect();
    }
  }

  async compareSchema(payload: any) {
    const { srcEnv, destEnv, type = 'tables', name: specificName } = payload;

    const srcConn = this.configService.getConnection(srcEnv);
    const destConn = this.configService.getConnection(destEnv);
    const srcDbName = srcConn?.config?.database || 'default';
    const destDbName = destConn?.config?.database || 'default';

    const diff = await this.comparator.compareFromStorage(
      srcEnv, destEnv, srcDbName, destDbName, type, specificName,
    );

    // Phase 2: Enrich with Semantic Diffs for Tables
    if (type.toUpperCase() === 'TABLES' && diff.tables) {
      if (!srcConn || !destConn) {
        this.logger.warn(`Skipping semantic enrichment: Environment config not found for ${!srcConn ? srcEnv : destEnv}`);
        return diff;
      }

      const srcDriver = await this.driverFactory.create(srcConn.type, srcConn.config);
      const destDriver = await this.driverFactory.create(destConn.type, destConn.config);

      try {
        await srcDriver.connect();
        await destDriver.connect();
        const srcIntro = srcDriver.getIntrospectionService();
        const destIntro = destDriver.getIntrospectionService();

        for (const tableName in diff.tables) {
          const tableDiff = diff.tables[tableName];
          if (tableDiff.hasChanges) {
            const srcDDL = await srcIntro.getTableDDL(srcDbName, tableName);
            const destDDL = await destIntro.getTableDDL(destDbName, tableName);
            if (srcDDL && destDDL) {
              const semantic = await this.semanticDiff.compare(srcDDL, destDDL);
              (tableDiff as any).semantic = semantic;
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(`Failed to enrich semantic diff: ${err.message}`);
      } finally {
        await srcDriver.disconnect();
        await destDriver.disconnect();
      }
    }

    return diff;
  }

  async semanticCompare(payload: any) {
    const { srcEnv, destEnv, type = 'TABLE', name } = payload;

    // For now, it mostly supports single table comparison via playground or explicit names
    // We get the DDLs from introspection
    const srcConn = this.configService.getConnection(srcEnv);
    const destConn = this.configService.getConnection(destEnv);

    if (!srcConn || !destConn) {
      throw new Error(`Environment config not found: ${!srcConn ? srcEnv : destEnv}`);
    }

    const srcDriver = await this.driverFactory.create(srcConn.type, srcConn.config);
    const destDriver = await this.driverFactory.create(destConn.type, destConn.config);

    try {
      await srcDriver.connect();
      await destDriver.connect();

      const srcIntro = srcDriver.getIntrospectionService();
      const destIntro = destDriver.getIntrospectionService();

      const srcDDL = await srcIntro.getObjectDDL(srcConn.config.database || 'default', type, name);
      const destDDL = await destIntro.getObjectDDL(destConn.config.database || 'default', type, name);

      if (!srcDDL || !destDDL) {
        throw new Error(`DDL not found for ${type} ${name}`);
      }

      return await this.semanticDiff.compare(srcDDL, destDDL);
    } finally {
      await srcDriver.disconnect();
      await destDriver.disconnect();
    }
  }

  async compareArbitraryDDL(payload: any) {
    const { srcDDL, destDDL, type } = payload;
    return await this.comparator.compareArbitraryDDL(srcDDL, destDDL, type);
  }

  async compareCustomSelection(payload: any) {
    const { src, dest } = payload;
    return await this.comparator.compareCustomSelection(src, dest);
  }

  async migrateSchema(payload: any) {
    const { srcEnv, destEnv, objects, gitConfig, dryRun = false } = payload;
    const destConn = this.configService.getConnection(destEnv);
    if (!destConn) {
      throw new Error(`Connection not found for environment: ${destEnv}`);
    }

    if (destEnv.toLowerCase().endsWith('.sql')) {
      throw new Error(`Migration safety: Cannot execute migration into a static SQL file "${destEnv}".`);
    }

    if (!Array.isArray(objects) || objects.length === 0) {
      this.logger.info('No objects to migrate.');
      return { success: true, successful: [], failed: [], dryRun, safetyLevel: 'safe', totalStatements: 0 };
    }

    if (!Array.isArray(objects) || objects.length === 0) {
      this.logger.info('No objects to migrate.');
      return { success: true, successful: [], failed: [], dryRun, safetyLevel: 'safe', totalStatements: 0 };
    }

    // Rule: Never migrate DROP. Filter out DEPRECATED objects.
    const safeObjects = objects.filter((obj: any) =>
      obj.status !== 'DEPRECATED' && obj.status !== 'deprecated' && obj.status !== 'missing_in_source'
    );

    if (safeObjects.length === 0) {
      this.logger.info('All selected objects are DEPRECATED (DROP). Migration skipped by safety rule.');
      return { success: true, successful: [], failed: [], dryRun, safetyLevel: 'safe', totalStatements: 0, skippedDrops: objects.length };
    }

    const allStatements = safeObjects.flatMap((obj: any) =>
      Array.isArray(obj.ddl) ? obj.ddl : (obj.ddl ? [obj.ddl] : [])
    );

    // 1. Safety Analysis
    const safetyReport = await this.migrator.getSafetyReport(allStatements);

    // 2. Dry Run Handler
    if (dryRun) {
      this.logger.info(`🔍 DRY RUN: Simulating migration for ${safeObjects.length} objects. Level: ${safetyReport.level}`);
      return {
        success: true,
        dryRun: true,
        safetyReport,
        totalStatements: allStatements.length,
        objects: safeObjects.map((obj: any) => ({
          name: obj.name,
          type: obj.type,
          status: obj.status,
          safetyLevel: this.migrator.getSafetyLevel(Array.isArray(obj.ddl) ? obj.ddl[0] : obj.ddl)
        }))
      };
    }

    // 3. Live Migration
    return await this.performLiveMigration(destEnv, destConn, safeObjects, safetyReport, payload);
  }

  private async performLiveMigration(
    destEnv: string,
    destConn: any,
    objects: any[],
    safetyReport: ISafetyReport,
    payload: any
  ) {
    const { summary: impactSummary } = safetyReport as any;
    const { gitConfig, force = false } = payload;
    const successful: any[] = [];
    const failed: any[] = [];
    const autoBackup = this.configService.getAutoBackup();
    const dbName = destConn.config.database || 'default';

    const destDriver = await this.driverFactory.create(destConn.type, destConn.config);

    try {
      await destDriver.connect();
      const destIntro = destDriver.getIntrospectionService();

      // Final pre-flight validation
      this.migrator.validateMigration(destEnv, safetyReport, { force });

      await destDriver.query(this.migrator.disableForeignKeyChecks());

      for (const obj of objects) {
        if (this.migrator.isNotMigrateCondition(obj.name)) {
          this.logger.info(`Skipping restricted object: ${obj.name}`);
          continue;
        }

        const statements = Array.isArray(obj.ddl) ? obj.ddl : [obj.ddl];

        // Individual safety check per object if needed, though global validation already ran
        this.migrator.checkSafety(statements, force);

        // Handle Auto-Backup
        if (autoBackup && this.requiresBackup(obj.status)) {
          await this.handleObjectBackup(destEnv, dbName, obj, destIntro);
        }

        try {
          for (const statement of statements) {
            if (statement) await destDriver.query(statement);
          }
          successful.push(obj);
        } catch (err: any) {
          failed.push({ ...obj, error: err.message });
          this.logger.error(`Migration failed for ${obj.name}: ${err.message}`);
        }
      }

      await destDriver.query(this.migrator.enableForeignKeyChecks());

      // Git Sync
      if (gitConfig?.autoCommit) {
        await this.handleGitSync(destEnv, dbName, successful, failed, gitConfig);
      }

      return {
        success: true,
        successful,
        failed,
        dryRun: false,
        safetyLevel: safetyReport.level,
        impact: impactSummary
      };
    } finally {
      await destDriver.disconnect();
    }
  }

  private requiresBackup(status: string): boolean {
    const statuses = ['UPDATED', 'DEPRECATED', 'different', 'modified', 'missing_in_source'];
    return statuses.includes(status);
  }

  private async handleObjectBackup(env: string, db: string, obj: any, intro: any) {
    try {
      const currentDdl = await intro.getObjectDDL(db, obj.type, obj.name);
      if (currentDdl) {
        await this.storageService.saveSnapshot(
          env,
          db,
          obj.type,
          obj.name,
          currentDdl,
          'PRE_MIGRATE',
        );
        this.logger.info(`Auto-backup created for ${obj.type} ${obj.name}`);
      }
    } catch (e: any) {
      this.logger.warn(`Failed to create auto-backup for ${obj.name}: ${e.message}`);
    }
  }

  private async handleGitSync(env: string, db: string, successful: any[], failed: any[], config: any) {
    const status = failed.length > 0 ? 'ALERT' : 'SUCCESS';
    const failSummary = failed.length > 0 ? ` [FAILED: ${failed.length} objects]` : '';
    const message = `${status.toLowerCase()}(migrate): applied ${successful.length} objects to ${env}${failSummary}`;

    try {
      await this.gitOrchestrator.gitSync({
        config,
        env,
        db,
        message
      });
    } catch (e: any) {
      this.logger.error(`Git sync failed: ${e.message}`);
    }
  }

  async isTableExists(env: string, tableName: string): Promise<boolean> {
    const conn = this.configService.getConnection(env);
    if (!conn) {
      throw new Error(`Connection not found for environment: ${env}`);
    }
    const driver = await this.driverFactory.create(conn.type, conn.config);
    try {
      await driver.connect();
      const intro = driver.getIntrospectionService();
      const tables = await intro.listTables(conn.config.database || 'default');
      return tables.includes(tableName);
    } finally {
      await driver.disconnect();
    }
  }

  public async getDriverFromConnection(connection: any) {
    const config = {
      host: connection.host,
      port: connection.port,
      database: connection.database || connection.name,
      user: connection.username,
      password: connection.password || '',
    };
    const connType =
      (connection as any).type === 'dump' || connection.host === 'file' ? 'dump' : 'mysql';
    return await this.driverFactory.create(connType, config);
  }

  async getSchemaNormalized(payload: any) {
    const { env, db = 'default' } = payload;
    const conn = this.configService.getConnection(env);
    if (!conn) throw new Error(`Connection not found: ${env}`);

    const driver = await this.driverFactory.create(conn.type, conn.config);
    try {
      await driver.connect();
      const intro = driver.getIntrospectionService();
      const tables = await intro.listTables(db);

      const result: Record<string, any> = { tables: {} };

      for (const table of tables) {
        const ddl = await intro.getTableDDL(db, table);
        if (ddl) {
          result.tables[table] = {
            name: table,
            ddl: ddl.trim(),
          };
        }
      }
      return result;
    } finally {
      await driver.disconnect();
    }
  }

  async searchDependencies(payload: any) {
    const { connection, query, flags } = payload;
    const dbName = connection.database || connection.name || 'default';
    
    // We search locally in SQLite as per user's request
    return await this.dependencySearch.searchLocal(
      this.storageService,
      connection.environment,
      dbName,
      query,
      flags
    );
  }
}
