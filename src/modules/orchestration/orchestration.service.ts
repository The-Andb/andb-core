import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  PROJECT_CONFIG_SERVICE,
  STORAGE_SERVICE,
  DRIVER_FACTORY_SERVICE,
  COMPARATOR_SERVICE,
  EXPORTER_SERVICE,
  MIGRATOR_SERVICE,
} from '../../common/constants/tokens';
import * as fs from 'fs';

@Injectable()
export class OrchestrationService {
  private readonly logger = new Logger(OrchestrationService.name);

  constructor(
    @Inject(PROJECT_CONFIG_SERVICE) private configService: any,
    @Inject(STORAGE_SERVICE) private storageService: any,
    @Inject(DRIVER_FACTORY_SERVICE) private driverFactory: any,
    @Inject(COMPARATOR_SERVICE) private comparator: any,
    @Inject(EXPORTER_SERVICE) private exporter: any,
    @Inject(MIGRATOR_SERVICE) private migrator: any,
  ) { }

  async execute(operation: string, payload: any) {
    // Synchronize Config Service with Payload if provided
    if (payload.sourceConfig && payload.srcEnv) {
      this.configService.setConnection(
        payload.srcEnv,
        payload.sourceConfig,
        payload.sourceConfig.type,
      );
    }
    if (payload.targetConfig && payload.destEnv) {
      this.configService.setConnection(
        payload.destEnv,
        payload.targetConfig,
        payload.targetConfig.type,
      );
    }
    if (payload.domainNormalization) {
      this.configService.setDomainNormalization(
        new RegExp(payload.domainNormalization.pattern),
        payload.domainNormalization.replacement,
      );
    }

    switch (operation) {
      case 'getSchemaObjects':
        return this.getSchemaObjects(payload);
      case 'export':
        return this.exportSchema(payload);
      case 'compare':
        return this.compareSchema(payload);
      case 'migrate':
        return this.migrateSchema(payload);
      case 'setup-restricted-user':
        return this.setupRestrictedUser(payload);
      case 'generate-user-setup-script':
        return this.generateUserSetupScript(payload);
      case 'probe-restricted-user':
        return this.probeRestrictedUser(payload);
      case 'test-connection':
        return this.testConnection(payload);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  private async probeRestrictedUser(payload: any) {
    const { connection, permissions } = payload;
    const driver = await this.getDriverFromConnection(connection);

    const results = {
      baseConn: 'fail',
      schemaRead: 'fail',
      sandboxTest: 'fail',
    };

    try {
      await driver.connect();
      results.baseConn = 'pass';

      // 1. Schema Read Check — verify ALL DDL types are readable
      try {
        const introspection = driver.getIntrospectionService();
        const dbName = connection.database || connection.name || 'default';

        // Basic: list tables
        await introspection.listTables(dbName);

        // Critical: verify routine DDL access (SHOW_ROUTINE privilege)
        // This is the most common failure point for restricted users
        const procs = await introspection.listProcedures(dbName);
        if (procs.length > 0) {
          const ddl = await introspection.getProcedureDDL(dbName, procs[0]);
          if (ddl === null || ddl === undefined) {
            this.logger.warn(`Probe: procedure "${procs[0]}" listed but DDL is NULL — SHOW_ROUTINE privilege may be missing`);
          }
        }

        results.schemaRead = 'pass';
      } catch (e) {
        results.schemaRead = 'fail';
      }

      // 2. Permission Boundary Check (Sandbox Write/Alter)
      const probeTable = `_andb_probe_${Date.now()}`;
      try {
        // We try a REAL DDL operation
        await driver.query(`CREATE TABLE \`${probeTable}\` (id INT)`);
        await driver.query(`DROP TABLE \`${probeTable}\``);

        // If it succeeds, it's a pass ONLY if we requested writeAlter
        results.sandboxTest = permissions.writeAlter ? 'pass' : 'fail';
      } catch (e) {
        // If it fails, it's a pass ONLY if we did NOT request writeAlter
        results.sandboxTest = !permissions.writeAlter ? 'pass' : 'fail';
      }

      return results;
    } finally {
      await driver.disconnect();
    }
  }

  private async exportSchema(payload: any) {
    const { env, name = null, type = null } = payload;
    return await this.exporter.exportSchema(env, name, type);
  }

  private async getSchemaObjects(payload: any) {
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

  private async compareSchema(payload: any) {
    const { srcEnv, destEnv, type = 'tables', name: specificName } = payload;

    // Rule #1: Compare = OFFLINE. Delegate to ComparatorService which reads from Storage.
    const srcConn = this.configService.getConnection(srcEnv);
    const destConn = this.configService.getConnection(destEnv);
    const srcDbName = srcConn?.config?.database || 'default';
    const destDbName = destConn?.config?.database || 'default';

    return this.comparator.compareFromStorage(
      srcEnv, destEnv, srcDbName, destDbName, type, specificName,
    );
  }

  private async migrateSchema(payload: any) {
    const { srcEnv, destEnv, objects } = payload;
    const destConn = this.configService.getConnection(destEnv);

    // Static SQL Dump Guard (Rule #1 parity)
    if (destEnv.toLowerCase().endsWith('.sql')) {
      throw new Error(`Migration safety: Cannot execute migration into a static SQL file "${destEnv}".`);
    }

    const successful: any[] = [];
    const failed: any[] = [];
    const autoBackup = this.configService.getAutoBackup();
    const dbName = destConn.config.database || 'default';
    const isExperimental = process.env.EXPERIMENTAL === '1';

    if (isExperimental) {
      this.logger.warn('🧪 EXPERIMENTAL MODE ACTIVE: Proceeding with potentially unsafe migrations.');
    }

    const destDriver = await this.driverFactory.create(destConn.type, destConn.config);

    try {
      await destDriver.connect();
      const destIntro = destDriver.getIntrospectionService();

      // Disable Foreign Key Checks (Rule #1 parity)
      await destDriver.query(this.migrator.disableForeignKeyChecks());

      for (const obj of objects) {
        // Skip Condition (Rule #1 parity)
        if (this.migrator.isNotMigrateCondition(obj.name)) {
          this.logger.log(`Skipping restricted object: ${obj.name}`);
          continue;
        }

        // Auto-backup before destructive/update operations
        if (
          autoBackup &&
          (obj.status === 'UPDATED' ||
            obj.status === 'DEPRECATED' ||
            obj.status === 'different' ||
            obj.status === 'modified' ||
            obj.status === 'missing_in_source')
        ) {
          try {
            const currentDdl = await destIntro.getObjectDDL(dbName, obj.type, obj.name);
            if (currentDdl) {
              await this.storageService.saveSnapshot(
                destEnv,
                dbName,
                obj.type,
                obj.name,
                currentDdl,
                'PRE_MIGRATE',
              );
              this.logger.log(`Auto-backup created for ${obj.type} ${obj.name}`);
            }
          } catch (e: any) {
            this.logger.warn(`Failed to create auto-backup for ${obj.name}: ${e.message}`);
          }
        }

        try {
          const statements = Array.isArray(obj.ddl) ? obj.ddl : [obj.ddl];
          for (const statement of statements) {
            if (statement) await destDriver.query(statement);
          }
          successful.push(obj);
          await this.storageService.saveMigration({
            srcEnv,
            destEnv,
            database: dbName,
            type: obj.type,
            name: obj.name,
            operation: obj.status,
            status: 'SUCCESS',
          });
        } catch (err: any) {
          failed.push({ ...obj, error: err.message });
          await this.storageService.saveMigration({
            srcEnv,
            destEnv,
            database: dbName,
            type: obj.type,
            name: obj.name,
            operation: obj.status,
            status: 'FAILED',
            error: err.message,
          });
          this.logger.error(`Migration failed for ${obj.name}: ${err.message}`);
        }
      }

      // Re-enable Foreign Key Checks (Rule #1 parity)
      await destDriver.query(this.migrator.enableForeignKeyChecks());

      return { success: true, successful, failed };
    } finally {
      await destDriver.disconnect();
    }
  }

  /**
   * isTableExists (Legacy parity)
   */
  async isTableExists(env: string, tableName: string): Promise<boolean> {
    const conn = this.configService.getConnection(env);
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

  private getBackupFolder(env: string, db: string): string {
    const folder = `db/backups/${env}/${db}`;
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
    return folder;
  }

  private async setupRestrictedUser(payload: any) {
    const { adminConnection, script } = payload;
    const driver = await this.getDriverFromConnection(adminConnection);

    try {
      await driver.connect();

      const statements = Array.isArray(script)
        ? script
        : script
          .split(';')
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0);

      for (const stmt of statements) {
        if (!stmt) continue;
        try {
          await driver.query(stmt);
        } catch (err: any) {
          // Handle cases where REVOKE fails because no such grant exists
          // Error 1141: There is no such grant defined for user '...' on host '...'
          const cleanStmt = stmt.replace(/--.*$/gm, '').trim().toUpperCase();
          const isRevoke = cleanStmt.startsWith('REVOKE');
          const isShowRoutine = cleanStmt.includes('SHOW_ROUTINE');

          const isNoSuchGrant =
            err.message.toLowerCase().includes('no such grant') ||
            err.code === 'ER_NONEXISTING_GRANT';

          const isIllegalLevel =
            err.message.toLowerCase().includes('illegal privilege level') ||
            err.code === 'ER_ILLEGAL_PRIVILEGE_LEVEL' ||
            err.message.includes('3619');

          if (isRevoke && isNoSuchGrant) {
            this.logger.warn(`Ignored "no such grant" error for statement: ${stmt}`);
            continue;
          }

          if (isShowRoutine && isIllegalLevel) {
            this.logger.warn(`Ignored "illegal privilege level" error for SHOW_ROUTINE statement: ${stmt}`);
            continue;
          }

          throw new Error(`Failed to execute statement: ${stmt}. Error: ${err.message}`);
        }
      }
      return { success: true };
    } finally {
      await driver.disconnect();
    }
  }

  private async generateUserSetupScript(payload: any) {
    const { adminConnection, restrictedUser, permissions } = payload;

    if (!adminConnection) throw new Error('Admin connection details are missing from payload');
    if (!restrictedUser) throw new Error('Restricted user details are missing from payload');
    if (!permissions) throw new Error('Permissions details are missing from payload');

    const driver = await this.getDriverFromConnection(adminConnection);

    // Check if driver supports this
    if (typeof (driver as any).generateUserSetupScript !== 'function') {
      throw new Error(
        `Driver for ${adminConnection.type || 'unknown'} does not support user setup generation.`,
      );
    }

    try {
      return await (driver as any).generateUserSetupScript({
        username: restrictedUser.username || 'the_andb',
        password: restrictedUser.password || '',
        database: adminConnection.database || adminConnection.name || 'default',
        host: '%', // Default
        permissions,
      });
    } catch (err: any) {
      throw new Error(`Driver failed to generate script: ${err.message}`);
    }
  }

  private async getDriverFromConnection(connection: any) {
    let sshConfig: any = undefined;
    const rawSsh = connection.sshConfig || connection.ssh;

    if (rawSsh && (rawSsh.enabled === undefined || rawSsh.enabled === true)) {
      sshConfig = {
        host: rawSsh.host,
        port: rawSsh.port,
        username: rawSsh.username,
        password: rawSsh.password,
        passphrase: rawSsh.passphrase,
      };

      if (rawSsh.privateKeyPath && !rawSsh.privateKey) {
        try {
          sshConfig.privateKey = fs.readFileSync(rawSsh.privateKeyPath, 'utf8');
        } catch (e: any) {
          // Type assertion for error
          console.warn(`Failed to read SSH Key: ${e.message}`);
        }
      } else if (rawSsh.privateKey) {
        sshConfig.privateKey = rawSsh.privateKey;
      }
    }

    const config = {
      host: connection.host,
      port: connection.port,
      database: connection.database || connection.name,
      user: connection.username,
      password: connection.password || '',
      sshConfig,
    };
    const connType =
      (connection as any).type === 'dump' || connection.host === 'file' ? 'dump' : 'mysql';
    return await this.driverFactory.create(connType, config);
  }

  async testConnection(payload: any) {
    const connection = payload.connection || payload;
    try {
      const driver = await this.getDriverFromConnection(connection);
      await driver.connect();

      // For real DBs, verify with a simple query
      const connType =
        (connection as any).type === 'dump' || connection.host === 'file' ? 'dump' : 'mysql';
      if (connType !== 'dump') {
        await driver.query('SELECT 1');
      }

      await driver.disconnect();
      return { success: true, message: 'Connection successful' };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }
}
