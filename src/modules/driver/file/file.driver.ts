import {
  IDatabaseDriver,
  IIntrospectionService,
  IMonitoringService,
  IDatabaseConfig,
  IMigrator,
} from '../../../common/interfaces/driver.interface';
const { getLogger } = require('andb-logger');
import * as fs from 'fs';
import * as path from 'path';
import { FileIntrospectionService } from './file.introspection';
import { MysqlMigrator } from '../../migrator/mysql/mysql.migrator';

export class FileDriver implements IDatabaseDriver {
  private readonly logger = getLogger({ logName: 'FileDriver' });
  private introspectionService?: IIntrospectionService;
  private migrator?: IMigrator;
  private basePath: string = '';

  constructor(private readonly config: IDatabaseConfig) { }

  async connect(): Promise<void> {
    // Config path should point to the base directory containing tables/, procedures/, etc.
    const configPath = this.config.path;

    if (!configPath) {
      throw new Error('File path is required in configuration (field "path")');
    }

    this.basePath = path.isAbsolute(configPath)
      ? configPath
      : path.resolve(process.cwd(), configPath);

    if (!fs.existsSync(this.basePath)) {
      throw new Error(`Base path for files not found: ${this.basePath}`);
    }

    this.logger.info(`Connected to File Storage at: ${this.basePath}`);
  }

  async disconnect(): Promise<void> {
    // No-op
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async query<T = any>(sql: string): Promise<T> {
    this.logger.warn(`Query on FileDriver is not supported: ${sql}`);
    return [] as unknown as T;
  }

  getIntrospectionService(): IIntrospectionService {
    if (!this.introspectionService) {
      this.introspectionService = new FileIntrospectionService(this);
    }
    return this.introspectionService;
  }

  getMigrator(): IMigrator {
    if (!this.migrator) {
      this.migrator = new MysqlMigrator(); // Defaults to MySQL syntax
    }
    return this.migrator;
  }

  getMonitoringService(): IMonitoringService {
    return {
      getProcessList: async () => [],
      getStatus: async () => ({ basePath: this.basePath }),
      getVariables: async () => ({}),
      getVersion: async () => 'FileDriver-4.0',
      getConnections: async () => [],
      getTransactions: async () => [],
    };
  }

  async getSessionContext(): Promise<unknown> {
    return {};
  }

  async setForeignKeyChecks(_enabled: boolean): Promise<void> {
    // No-op
  }

  async generateUserSetupScript(_params: any): Promise<string> {
    throw new Error('User setup script generation not supported for FileDriver.');
  }

  /**
   * Internal helper to list names of objects in a subdirectory
   */
  async listObjects(folder: string): Promise<string[]> {
    const dir = path.join(this.basePath, folder.toLowerCase());
    if (!fs.existsSync(dir)) return [];

    try {
      const files = fs.readdirSync(dir);
      return files
        .filter(f => f.endsWith('.sql'))
        .map(f => f.replace(/\.sql$/, ''));
    } catch (err) {
      this.logger.error(`Failed to list objects in ${dir}: ${err instanceof Error ? err.message : err}`);
      return [];
    }
  }

  /**
   * Internal helper to read a DDL file
   */
  async readObject(folder: string, name: string): Promise<string> {
    const filePath = path.join(this.basePath, folder.toLowerCase(), `${name}.sql`);
    if (!fs.existsSync(filePath)) return '';

    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      this.logger.error(`Failed to read object from ${filePath}: ${err instanceof Error ? err.message : err}`);
      return '';
    }
  }
}
