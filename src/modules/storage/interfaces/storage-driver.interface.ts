export interface IStorageDriver {
  initialize(dbPath: string): Promise<void>;
  close(): Promise<void>;
  
  // Basic CRUD/Query operations
  execute(sql: string, params?: any[]): Promise<any>;
  exec(sql: string): Promise<void>;
  queryAll<T = any>(sql: string, params?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
  
  // Transaction Support
  transaction<T>(fn: (driver: IStorageDriver) => T | Promise<T>): Promise<T>;
  
  // Helpers
  getDbPath(): string;
  isInitialized(): boolean;
}
