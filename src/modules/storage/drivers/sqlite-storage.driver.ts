import * as Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { IStorageDriver } from '../interfaces/storage-driver.interface';

export class SqliteStorageDriver implements IStorageDriver {
  private db: Database.Database | null = null;
  private dbPath: string = '';

  async initialize(dbPath: string): Promise<void> {
    this.dbPath = dbPath;
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new Database(dbPath);
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async execute(sql: string, params: any[] = []): Promise<any> {
    if (!this.db) throw new Error('Storage driver not initialized');
    return this.db.prepare(sql).run(...params);
  }

  async exec(sql: string): Promise<void> {
    if (!this.db) throw new Error('Storage driver not initialized');
    this.db.exec(sql);
  }

  async queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db) throw new Error('Storage driver not initialized');
    return this.db.prepare(sql).all(...params) as T[];
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    if (!this.db) throw new Error('Storage driver not initialized');
    return (this.db.prepare(sql).get(...params) as T) || null;
  }

  async transaction<T>(fn: (driver: IStorageDriver) => T | Promise<T>): Promise<T> {
    if (!this.db) throw new Error('Storage driver not initialized');
    
    // Safety check: nested transactions are not supported by manual BEGIN
    if (this.db.inTransaction) {
      return await fn(this);
    }

    this.db.prepare('BEGIN').run();
    
    try {
      const result = await fn(this);
      if (this.db && this.db.inTransaction) {
        this.db.prepare('COMMIT').run();
      }
      return result;
    } catch (error) {
      if (this.db && this.db.inTransaction) {
        this.db.prepare('ROLLBACK').run();
      }
      throw error;
    }
  }

  getDbPath(): string {
    return this.dbPath;
  }

  isInitialized(): boolean {
    return !!this.db;
  }
}
