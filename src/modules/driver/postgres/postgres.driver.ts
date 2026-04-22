import { Client } from 'pg';
import { IDatabaseDriver, IIntrospectionService, IMigrator, IMonitoringService, IDatabaseConfig } from "../../../common/interfaces/driver.interface";
import { ConnectionType, ISshConfig } from "../../../common/interfaces/connection.interface";
import { PostgresIntrospectionService } from "./postgres.introspection";
import { ParserService } from "../../parser/parser.service";
import { SshTunnel } from "../ssh-tunnel";
const { getLogger } = require('andb-logger');

export class PostgresDriver implements IDatabaseDriver {
  public type = ConnectionType.POSTGRES;
  private client: Client | null = null;
  private sshTunnel: SshTunnel | null = null;
  private readonly logger = getLogger({ logName: 'PostgresDriver' });
  private introspectionService?: IIntrospectionService;

  constructor(
    private readonly config: IDatabaseConfig,
    private readonly parser: ParserService = new ParserService()
  ) { }

  async connect(): Promise<void> {
    try {
      let stream: any;

      if (this.config.sshConfig && this.config.sshConfig.host) {
        this.logger.info(`Initializing SSH Tunnel to ${this.config.sshConfig.host}...`);
        this.sshTunnel = new SshTunnel(this.config.sshConfig as ISshConfig);
        stream = await this.sshTunnel.forward(
          this.config.host || 'localhost',
          this.config.port || 5432
        );
      }

      this.client = new Client({
        host: this.config.host,
        port: this.config.port || 5432,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        stream: stream
      });

      await this.client.connect();
      this.logger.info(`Connected to PostgreSQL at ${this.config.host} ${this.sshTunnel ? '(via SSH)' : ''}`);
    } catch (err: any) {
      this.logger.error(`Postgres Connection Failed: ${err.message}`);
      if (this.sshTunnel) {
        this.sshTunnel.close();
        this.sshTunnel = null;
      }
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
    if (this.sshTunnel) {
      this.sshTunnel.close();
      this.sshTunnel = null;
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T> {
    if (!this.client) await this.connect();
    const result = await this.client!.query(sql, params);
    return result.rows as T;
  }

  getIntrospectionService(): IIntrospectionService {
    if (!this.introspectionService) {
      this.introspectionService = new PostgresIntrospectionService(this, this.parser);
    }
    return this.introspectionService;
  }

  getMonitoringService(): IMonitoringService {
    return {
      getProcessList: async () => this.query("SELECT * FROM pg_stat_activity"),
      getStatus: async () => ({}),
      getVariables: async () => this.query("SELECT name, setting FROM pg_settings"),
      getConnections: async () => ({}),
      getTransactions: async () => ({}),
      getVersion: async () => {
         const info = await this.getIntrospectionService().getServerInfo();
         return info.version;
      },
    };
  }

  getMigrator(): IMigrator {
    return {
      generateObjectSQL: () => [],
      generateTableAlterSQL: () => [],
    };
  }

  async getSessionContext(): Promise<any> {
    const rows = await this.query("SELECT current_user, current_database(), current_schema()");
    return rows[0];
  }

  async setForeignKeyChecks(enabled: boolean): Promise<void> {
    // Session level constraint handling in Postgres is usually:
    // SET CONSTRAINTS ALL DEFERRED; (needs to be in transaction)
    // or ALTER TABLE DISABLE TRIGGER ALL; (needs superuser)
    // For now, we stub this as it varies by use case.
  }

  async generateUserSetupScript(params: any): Promise<string> {
    return `CREATE USER ${params.username} WITH PASSWORD '${params.password || ''}';\nGRANT ALL PRIVILEGES ON DATABASE ${this.config.database} TO ${params.username};`;
  }
}
