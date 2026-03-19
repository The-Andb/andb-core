const { getLogger } = require('andb-logger');
import * as fs from 'fs';
import { ProjectConfigService } from '../config/project-config.service';
import { ConnectionUtil } from '../../common/utils/connection.util';

export class SecurityOrchestrator {
  private readonly logger = getLogger({ logName: 'SecurityOrchestrator' });

  constructor(
    private readonly configService: ProjectConfigService,
    private driverFactory: any,
  ) { }

  async probeRestrictedUser(payload: any) {
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

      try {
        const introspection = driver.getIntrospectionService();
        const dbName = connection.database || connection.name || 'default';

        await introspection.listTables(dbName);

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

      const probeTable = `_andb_probe_${Date.now()}`;
      try {
        await driver.query(`CREATE TABLE \`${probeTable}\` (id INT)`);
        await driver.query(`DROP TABLE \`${probeTable}\``);
        results.sandboxTest = permissions.writeAlter ? 'pass' : 'fail';
      } catch (e) {
        results.sandboxTest = !permissions.writeAlter ? 'pass' : 'fail';
      }

      return results;
    } finally {
      await driver.disconnect();
    }
  }

  async setupRestrictedUser(payload: any) {
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

  async generateUserSetupScript(payload: any) {
    const { adminConnection, restrictedUser, permissions } = payload;

    if (!adminConnection) throw new Error('Admin connection details are missing from payload');
    if (!restrictedUser) throw new Error('Restricted user details are missing from payload');
    if (!permissions) throw new Error('Permissions details are missing from payload');

    const driver = await this.getDriverFromConnection(adminConnection);

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
        host: '%',
        permissions,
      });
    } catch (err: any) {
      throw new Error(`Driver failed to generate script: ${err.message}`);
    }
  }

  async testConnection(payload: any) {
    const connection = payload.connection || payload;
    const driver = await this.getDriverFromConnection(connection);
    try {
      await driver.connect();
      const { type: connType } = ConnectionUtil.resolve(connection);
      if (connType !== 'dump') {
        await driver.query('SELECT 1');
      }
      return { success: true, message: 'Connection successful' };
    } catch (e: any) {
      return { success: false, message: e.message };
    } finally {
      await driver.disconnect();
    }
  }

  public async getDriverFromConnection(connection: any) {
    const { type, config } = ConnectionUtil.resolve(connection);
    return await this.driverFactory.create(type, config);
  }
}
