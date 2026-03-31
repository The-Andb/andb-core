import {
  IDatabaseDriver,
  IDatabaseConfig,
  IIntrospectionService,
  IMonitoringService,
  IMigrator,
} from '../../../common/interfaces/driver.interface';
import * as BetterSqlite3 from 'better-sqlite3';
const Database = (BetterSqlite3 as any).default || BetterSqlite3;
// Use the type directly from the imported namespace
type BetterSqliteDatabase = BetterSqlite3.Database;

// @ts-ignore
const { getLogger } = require('andb-logger');
import { SqliteIntrospectionService } from './sqlite.introspection';
import { SqliteMonitoringService } from './sqlite.monitoring';
import { SqliteMigrator } from '../../migrator/sqlite/sqlite.migrator';
import { ParserService } from '../../parser/parser.service';
import * as path from 'path';

export class SqliteDbDriver implements IDatabaseDriver {
  private db: BetterSqliteDatabase | null = null;
  private readonly logger = getLogger({ logName: 'SqliteDbDriver' });

  private introspectionService?: IIntrospectionService;
  private monitoringService?: IMonitoringService;
  private migrator?: IMigrator;
  private parserService: ParserService;

  constructor(private readonly config: IDatabaseConfig) {
    this.parserService = new ParserService();
  }

  async connect(): Promise<void> {
    try {
      if (!this.config.host && !this.config.database && !this.config.path) {
        throw new Error('SQLite config requires "database", "host", or "path" specifying the file location.');
      }
      
      const dbPath = this.config.path || this.config.database || this.config.host;
      this.logger.info(`Connecting to SQLite DB at ${dbPath}`);
      
      this.db = new Database(dbPath, {
        fileMustExist: false // Create if doesn't exist, mimicking standard SQLite behavior
      });
      // Ensure foreign keys are enforced by default
      if (this.db) {
        this.db.pragma('foreign_keys = ON');
      }
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(`SQLite Connection Failed: ${error.message}`);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T> {
    if (!this.db) await this.connect();
    
    try {
      // Split multiple statements if necessary since better-sqlite3 exec doesn't return rows
      // We will handle single queries here for introspection purposes. 
      // If mutiple statements are sent, .exec() should be theoretically used, but query() expects rows.
      // We will assume 1 statement here for the standard driver.
      const stmt = this.db!.prepare(sql);
      if (stmt.reader) {
        if (params && params.length > 0) {
          return stmt.all(...params) as T;
        }
        return stmt.all() as T;
      } else {
        const result = params && params.length > 0 ? stmt.run(...params) : stmt.run();
        return [{ insertId: result.lastInsertRowid, changes: result.changes }] as any; 
      }
    } catch (e: any) {
       this.logger.error(`SQLite query error: ${e.message}`, { sql });
       throw e;
    }
  }

  getIntrospectionService(): IIntrospectionService {
    if (!this.introspectionService) {
      this.introspectionService = new SqliteIntrospectionService(this, this.parserService);
    }
    return this.introspectionService;
  }

  getMonitoringService(): IMonitoringService {
    if (!this.monitoringService) {
      this.monitoringService = new SqliteMonitoringService(this);
    }
    return this.monitoringService;
  }

  getMigrator(): IMigrator {
    if (!this.migrator) {
      this.migrator = new SqliteMigrator();
    }
    return this.migrator;
  }

  async getSessionContext(): Promise<any> {
    return {
       sql_mode: 'STRICT',
       time_zone: 'UTC',
       charset: 'utf8'
    };
  }

  async setForeignKeyChecks(enabled: boolean): Promise<void> {
    const value = enabled ? 'ON' : 'OFF';
    await this.query(`PRAGMA foreign_keys = ${value};`);
  }

  async generateUserSetupScript(params: any): Promise<string> {
    return `-- SQLite does not support user grants natively.\n-- Skipped user setup script for ${params.username}.`;
  }
}
