import {
  IDatabaseDriver,
  IDatabaseConfig,
  IIntrospectionService,
  IMonitoringService,
  IMigrator,
} from '../../../common/interfaces/driver.interface';
import { ISshConfig } from '../../../common/interfaces/connection.interface';
import { MysqlIntrospectionService } from './mysql.introspection';
import { MysqlMonitoringService } from './mysql.monitoring';
import { MysqlMigrator } from '../../migrator/mysql/mysql.migrator';
import { SshTunnel } from '../ssh-tunnel';
import * as mysql from 'mysql2/promise'; // Use promise wrapper natively
const { getLogger } = require('andb-logger');
import { ParserService } from '../../parser/parser.service'; // We need this for Introspection

export class MysqlDriver implements IDatabaseDriver {
  private connection: mysql.Connection | null = null;
  private sshTunnel: SshTunnel | null = null;
  private readonly logger = getLogger({ logName: 'MysqlDriver' });

  // Cache services
  private introspectionService?: IIntrospectionService;
  private monitoringService?: IMonitoringService;
  private migrator?: IMigrator;
  private parserService: ParserService;

  constructor(private readonly config: IDatabaseConfig) {
    this.parserService = new ParserService(); // Instantiate directly or inject if we refactor Driver to be Injectable
  }

  async connect(): Promise<void> {
    try {
      let stream: NodeJS.ReadWriteStream | undefined;

      // Handle SSH Tunneling — only if sshConfig has a valid host
      if (this.config.sshConfig && this.config.sshConfig.host) {
        this.logger.info(`Initializing SSH Tunnel to ${this.config.sshConfig.host}...`);
        this.sshTunnel = new SshTunnel(this.config.sshConfig as ISshConfig);

        // Connect SSH and forward to DB host/port
        // Note: this.config.host is the DB host relative to the SSH server
        stream = await this.sshTunnel.forward(
          this.config.host || 'localhost',
          this.config.port || 3306,
        );
      }

      this.connection = await mysql.createConnection({
        host: this.config.host === 'localhost' ? '127.0.0.1' : this.config.host,
        port: this.config.port || 3306,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        multipleStatements: true,
        stream: stream as any, // Inject the SSH stream if available
      });

      // Session hygiene
      await this.connection.query(
        "SET SESSION sql_mode = 'NO_AUTO_VALUE_ON_ZERO,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'",
      );
      await this.connection.query("SET NAMES 'utf8mb4'");

      this.logger.info(
        `Connected to MySQL at ${this.config.host} ${this.sshTunnel ? '(via SSH)' : ''}`,
      );
    } catch (err: unknown) {
      // Cast to Error to access message safely
      const error = err as Error;
      this.logger.error(`MySQL Connection Failed: ${error.message}`);

      // Cleanup SSH if DB connection failed
      if (this.sshTunnel) {
        this.sshTunnel.close();
        this.sshTunnel = null;
      }

      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
    if (this.sshTunnel) {
      this.sshTunnel.close();
      this.sshTunnel = null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async query<T = any>(sql: string, params: any[] = []): Promise<T> {
    if (!this.connection) {
      await this.connect();
    }
    // mysql2 execute returns [rows, fields], we usually just want rows
    // using query() instead of execute() for better compatibility with un-prepared statements if needed
    // but allow prepared statements via params
    const [rows] = await this.connection!.query(sql, params);
    return rows as T;
  }

  getIntrospectionService(): IIntrospectionService {
    if (!this.introspectionService) {
      this.introspectionService = new MysqlIntrospectionService(this, this.parserService);
    }
    return this.introspectionService;
  }

  getMonitoringService(): IMonitoringService {
    if (!this.monitoringService) {
      this.monitoringService = new MysqlMonitoringService(this);
    }
    return this.monitoringService;
  }

  getMigrator(): IMigrator {
    if (!this.migrator) {
      this.migrator = new MysqlMigrator();
    }
    return this.migrator!;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getSessionContext(): Promise<any> {
    const results = await this.query(`
      SELECT 
        @@session.sql_mode as sql_mode,
        @@session.time_zone as time_zone,
        @@session.wait_timeout as lock_wait_timeout,
        @@session.character_set_results as charset
    `);
    return Array.isArray(results) ? results[0] : results;
  }

  async setForeignKeyChecks(enabled: boolean): Promise<void> {
    const value = enabled ? 1 : 0;
    await this.query(`SET FOREIGN_KEY_CHECKS = ${value};`);
  }

  async generateUserSetupScript(params: {
    username: string;
    password?: string;
    database?: string;
    host?: string;
    permissions: any;
    isReconfigure?: boolean;
  }): Promise<string> {
    const { username, password, database, host = '%', permissions, isReconfigure = false } = params;
    const db = database || 'default';

    // Safety check for quotes to prevent basic injection in generated script review
    const safeUser = username.replace(/'/g, '');
    const safePass = (password || '').replace(/'/g, '');
    const safeHost = host.replace(/'/g, '');
    const safeDb = db.replace(/`/g, '');

    let sql = '';
    if (!isReconfigure) {
      sql += `-- Base: Create user and basic metadata access\n`;
      sql += `CREATE USER IF NOT EXISTS '${safeUser}'@'${safeHost}' IDENTIFIED BY '${safePass}';\n`;
      sql += `ALTER USER '${safeUser}'@'${safeHost}' IDENTIFIED BY '${safePass}';\n\n`;
    } else {
      sql += `-- Reconfigure privileges for existing user '${safeUser}'@'${safeHost}'\n`;
    }

    sql += `-- Reset: Remove all existing privileges (supports re-configuration & downgrade)\n`;
    sql += `REVOKE ALL PRIVILEGES ON \`${safeDb}\`.* FROM '${safeUser}'@'${safeHost}';\n\n`;

    sql += `-- SELECT, SHOW VIEW, TRIGGER, EVENT: READ permissions\n`;
    sql += `GRANT SELECT ON \`${safeDb}\`.* TO '${safeUser}'@'${safeHost}';\n`;
    sql += `GRANT SHOW VIEW ON \`${safeDb}\`.* TO '${safeUser}'@'${safeHost}';\n`;
    sql += `GRANT TRIGGER ON \`${safeDb}\`.* TO '${safeUser}'@'${safeHost}';\n`;
    sql += `GRANT EVENT ON \`${safeDb}\`.* TO '${safeUser}'@'${safeHost}';\n\n`;

    sql += `-- Global READ Permissions (Required for metadata access)\n`;
    sql += `-- GRANT SELECT ON mysql.proc: read procedure/function bodies (Legacy/Compatibility)\n`;
    sql += `GRANT SELECT ON mysql.proc TO '${safeUser}'@'${safeHost}';\n\n`;

    if (permissions.writeAlter) {
      sql += `-- Group: WRITE - DDL Operations\n`;
      sql += `GRANT ALTER, CREATE, DROP, INDEX, REFERENCES ON \`${safeDb}\`.* TO '${safeUser}'@'${safeHost}';\n\n`;
    }

    if (permissions.writeView) {
      sql += `-- Group: WRITE - View Operations\n`;
      sql += `GRANT CREATE VIEW ON \`${safeDb}\`.* TO '${safeUser}'@'${safeHost}';\n\n`;
    }

    if (permissions.writeRoutine) {
      sql += `-- Group: WRITE - Routine Operations\n`;
      sql += `GRANT ALTER ROUTINE, CREATE ROUTINE, EXECUTE ON \`${safeDb}\`.* TO '${safeUser}'@'${safeHost}';\n\n`;
    }

    sql += `FLUSH PRIVILEGES;`;
    console.log('[MysqlDriver] Generated Script:\n', sql);
    return sql;
  }
}
