import { Injectable, Inject } from '@nestjs/common';
import {
  PROJECT_CONFIG_SERVICE,
  STORAGE_SERVICE,
  DRIVER_FACTORY_SERVICE,
  COMPARATOR_SERVICE,
  EXPORTER_SERVICE,
  MIGRATOR_SERVICE
} from '../../common/constants/tokens';

@Injectable()
export class OrchestrationService {
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
      this.configService.setConnection(payload.srcEnv, payload.sourceConfig, payload.sourceConfig.type);
    }
    if (payload.targetConfig && payload.destEnv) {
      this.configService.setConnection(payload.destEnv, payload.targetConfig, payload.targetConfig.type);
    }
    if (payload.domainNormalization) {
      this.configService.setDomainNormalization(
        new RegExp(payload.domainNormalization.pattern),
        payload.domainNormalization.replacement
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
      sandboxTest: 'fail'
    };

    try {
      await driver.connect();
      results.baseConn = 'pass';

      // 1. Schema Read Check
      try {
        const introspection = driver.getIntrospectionService();
        await introspection.listTables();
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
    const { env, name = null } = payload;
    return await this.exporter.exportSchema(env, name);
  }

  private async getSchemaObjects(payload: any) {
    const { connection, type } = payload;
    const driver = await this.getDriverFromConnection(connection);

    try {
      await driver.connect();
      const intro = driver.getIntrospectionService();
      const dbName = (connection.database || connection.name) || 'default';

      switch (type.toLowerCase()) {
        case 'tables': return await intro.listTables(dbName);
        case 'views': return await intro.listViews(dbName);
        case 'procedures': return await intro.listProcedures(dbName);
        case 'functions': return await intro.listFunctions(dbName);
        case 'triggers': return await intro.listTriggers(dbName);
        default: return [];
      }
    } finally {
      await driver.disconnect();
    }
  }

  private async compareSchema(payload: any) {
    const { srcEnv, destEnv, type = 'tables' } = payload;
    const ddlType = type.toLowerCase();

    const srcConn = this.configService.getConnection(srcEnv);
    const destConn = this.configService.getConnection(destEnv);

    const srcDriver = await this.driverFactory.create(srcConn.type, srcConn.config);
    const destDriver = await this.driverFactory.create(destConn.type, destConn.config);

    try {
      await srcDriver.connect();
      await destDriver.connect();

      const srcIntro = srcDriver.getIntrospectionService();
      const destIntro = destDriver.getIntrospectionService();
      const dbName = srcConn.config.database || 'default';
      const destDbName = destConn.config.database || 'default';

      const diff = await this.comparator.compareSchema(srcIntro, destIntro, dbName);
      const results: any[] = [];

      if (ddlType === 'tables') {
        for (const name of Object.keys(diff.tables)) {
          const ddl = this.migrator.generateAlterSQL(diff.tables[name]);
          const result = {
            name,
            status: 'different',
            type: 'TABLES',
            ddl,
            diff: {
              source: await srcIntro.getTableDDL(dbName, name),
              target: await destIntro.getTableDDL(destDbName, name),
            },
          };
          results.push(result);
          await this.storageService.saveComparison({
            srcEnv,
            destEnv,
            database: dbName,
            type: 'TABLES',
            name,
            status: result.status,
            alterStatements: ddl,
          });
        }
        for (const name of diff.droppedTables) {
          const ddl = [`DROP TABLE IF EXISTS \`${name}\`;`];
          const result = {
            name,
            status: 'missing_in_source',
            type: 'TABLES',
            ddl,
            diff: { source: null, target: await destIntro.getTableDDL(destDbName, name) },
          };
          results.push(result);
          await this.storageService.saveComparison({
            srcEnv,
            destEnv,
            database: dbName,
            type: 'TABLES',
            name,
            status: result.status,
            alterStatements: ddl,
          });
        }
        const srcTables = await srcIntro.listTables(dbName);
        const destTables = await destIntro.listTables(destDbName);
        for (const name of srcTables) {
          if (!destTables.includes(name) && !diff.tables[name]) {
            const ddl = await srcIntro.getTableDDL(dbName, name);
            const result = {
              name,
              status: 'missing_in_target',
              type: 'TABLES',
              ddl: [ddl],
              diff: { source: ddl, target: null },
            };
            results.push(result);
            await this.storageService.saveComparison({
              srcEnv,
              destEnv,
              database: dbName,
              type: 'TABLES',
              name,
              status: result.status,
              alterStatements: [ddl],
            });
          }
        }

        // Add Identical Tables
        for (const name of srcTables) {
          if (destTables.includes(name) && !diff.tables[name]) {
            const ddl = await srcIntro.getTableDDL(dbName, name);
            const result = {
              name,
              status: 'equal',
              type: 'TABLES',
              ddl: [],
              diff: { source: ddl, target: ddl } // Identical
            };
            results.push(result);
            await this.storageService.saveComparison({
              srcEnv,
              destEnv,
              database: dbName,
              type: 'TABLES',
              name,
              status: 'equal',
              alterStatements: []
            });
          }
        }
      } else {
        // Generic Objects (Procedures, Functions, Views, Triggers)
        // 1. Add Diff Items
        const processedNames = new Set<string>();

        for (const obj of diff.objects) {
          const typeMatch = obj.type.toLowerCase() + 's' === ddlType || (ddlType === 'procedures' && obj.type === 'PROCEDURE');
          if (!typeMatch) continue;

          processedNames.add(obj.name);

          const ddl = this.migrator.generateObjectSQL(obj);
          const result = {
            name: obj.name,
            status: obj.operation === 'DROP' ? 'missing_in_source' : (obj.operation === 'CREATE' ? 'missing_in_target' : 'different'),
            type: obj.type + 'S',
            ddl,
            diff: {
              source: obj.operation === 'DROP' ? null : obj.definition,
              target: obj.operation === 'CREATE' ? null : (await destIntro.getObjectDDL(destDbName, obj.type, obj.name)),
            },
          };
          results.push(result);
          await this.storageService.saveComparison({
            srcEnv,
            destEnv,
            database: dbName,
            type: obj.type + 'S',
            name: obj.name,
            status: result.status,
            alterStatements: ddl,
          });
        }

        // 2. Add Identical Items
        // We need to list all objects to find the ones not in diff
        const singularType = ddlType.replace(/s$/, '').toUpperCase(); // tables -> TABLE (handled above), procedures -> PROCEDURE
        // Map common plurals to singular
        let listType = singularType;
        if (ddlType === 'procedures') listType = 'PROCEDURE';
        if (ddlType === 'functions') listType = 'FUNCTION';
        if (ddlType === 'views') listType = 'VIEW';
        if (ddlType === 'triggers') listType = 'TRIGGER';
        if (ddlType === 'events') listType = 'EVENT';

        // Helper to get list
        const getList = async (intro: any) => {
          if (listType === 'PROCEDURE') return intro.listProcedures(dbName);
          if (listType === 'FUNCTION') return intro.listFunctions(dbName);
          if (listType === 'VIEW') return intro.listViews(dbName);
          if (listType === 'TRIGGER') return intro.listTriggers(dbName);
          return [];
        };

        const srcObjList = await getList(srcIntro);
        const destObjList = await getList(destIntro);

        for (const name of srcObjList) {
          if (destObjList.includes(name) && !processedNames.has(name)) {
            // Identical
            const ddl = await destIntro.getObjectDDL(destDbName, listType, name);
            const result = {
              name,
              status: 'equal',
              type: listType + 'S',
              ddl: [],
              diff: { source: ddl, target: ddl }
            };
            results.push(result);
            await this.storageService.saveComparison({
              srcEnv,
              destEnv,
              database: dbName,
              type: listType + 'S',
              name,
              status: 'equal',
              alterStatements: []
            });
          }
        }
      }

      return results;
    } finally {
      await srcDriver.disconnect();
      await destDriver.disconnect();
    }
  }

  private async migrateSchema(payload: any) {
    const { srcEnv, destEnv, objects } = payload;
    const destConn = this.configService.getConnection(destEnv);
    const destDriver = await this.driverFactory.create(destConn.type, destConn.config);

    const successful: any[] = [];
    const failed: any[] = [];

    try {
      await destDriver.connect();
      for (const obj of objects) {
        try {
          if (Array.isArray(obj.ddl)) {
            for (const statement of obj.ddl) {
              await destDriver.query(statement);
            }
          } else {
            await destDriver.query(obj.ddl);
          }
          successful.push(obj);
          await this.storageService.saveMigration(destEnv, destConn.config.database || 'default', obj.type, obj.name, obj.status, 'SUCCESS');
        } catch (err: any) {
          failed.push({ ...obj, error: err.message });
          await this.storageService.saveMigration(destEnv, destConn.config.database || 'default', obj.type, obj.name, obj.status, 'FAILED', err.message);
        }
      }
      return { success: true, successful, failed };
    } finally {
      await destDriver.disconnect();
    }
  }

  private async setupRestrictedUser(payload: any) {
    const { adminConnection, script } = payload;
    const driver = await this.getDriverFromConnection(adminConnection);

    try {
      await driver.connect();

      const statements = Array.isArray(script)
        ? script
        : script.split(';').map((s: string) => s.trim()).filter((s: string) => s.length > 0);

      for (const stmt of statements) {
        if (!stmt) continue;
        try {
          await driver.query(stmt);
        } catch (err: any) {
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
      throw new Error(`Driver for ${adminConnection.type || 'unknown'} does not support user setup generation.`);
    }

    try {
      return await (driver as any).generateUserSetupScript({
        username: restrictedUser.username || 'the_andb',
        password: restrictedUser.password || '',
        database: adminConnection.database || adminConnection.name || 'default',
        host: '%', // Default
        permissions
      });
    } catch (err: any) {
      throw new Error(`Driver failed to generate script: ${err.message}`);
    }
  }

  private async getDriverFromConnection(connection: any) {
    const config = {
      host: connection.host,
      port: connection.port,
      database: connection.database || connection.name,
      user: connection.username,
      password: connection.password || '',
    };
    const connType = (connection as any).type === 'dump' || connection.host === 'file' ? 'dump' : 'mysql';
    return await this.driverFactory.create(connType, config);
  }

  async testConnection(payload: any) {
    const connection = payload.connection || payload;
    try {
      const driver = await this.getDriverFromConnection(connection);
      await driver.connect();

      // For real DBs, verify with a simple query
      const connType = (connection as any).type === 'dump' || connection.host === 'file' ? 'dump' : 'mysql';
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
