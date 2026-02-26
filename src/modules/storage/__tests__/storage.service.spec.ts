import { StorageService } from '../storage.service';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

describe('StorageService', () => {
  let service: StorageService;
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `andb-test-${Date.now()}`);
    dbPath = path.join(tmpDir, 'test-storage.db');
    service = new StorageService();
    // Silence the logger
    process.env.ANDB_QUIET = '1';
    service.initialize(dbPath);
  });

  afterEach(() => {
    service.close();
    // Cleanup
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
      if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir);
    } catch { /* ignore */ }
    delete process.env.ANDB_QUIET;
  });

  describe('initialize', () => {
    it('should create the database file', () => {
      expect(fs.existsSync(dbPath)).toBe(true);
    });

    it('should be idempotent for same path', () => {
      // Calling initialize again with same path should not throw
      service.initialize(dbPath);
      expect(fs.existsSync(dbPath)).toBe(true);
    });

    it('should re-initialize with different path', () => {
      const newPath = path.join(tmpDir, 'other.db');
      service.initialize(newPath);
      expect(fs.existsSync(newPath)).toBe(true);
      // Cleanup
      try { fs.unlinkSync(newPath); } catch { }
    });
  });

  describe('DDL operations', () => {
    it('should save and retrieve DDL', async () => {
      await service.saveDDL('DEV', 'mydb', 'TABLES', 'users', 'CREATE TABLE users (id int);');
      const ddl = await service.getDDL('DEV', 'mydb', 'TABLES', 'users');
      expect(ddl).toBe('CREATE TABLE users (id int);');
    });

    it('should upsert DDL on conflict', async () => {
      await service.saveDDL('DEV', 'mydb', 'TABLES', 'users', 'v1');
      await service.saveDDL('DEV', 'mydb', 'TABLES', 'users', 'v2');
      const ddl = await service.getDDL('DEV', 'mydb', 'TABLES', 'users');
      expect(ddl).toBe('v2');
    });

    it('should return null for non-existent DDL', async () => {
      const ddl = await service.getDDL('DEV', 'mydb', 'TABLES', 'nonexistent');
      expect(ddl).toBeNull();
    });

    it('should list DDL objects by type', async () => {
      await service.saveDDL('DEV', 'mydb', 'TABLES', 'users', 'CREATE TABLE users;');
      await service.saveDDL('DEV', 'mydb', 'TABLES', 'posts', 'CREATE TABLE posts;');
      const objects = await service.getDDLObjects('DEV', 'mydb', 'TABLES');
      expect(objects).toHaveLength(2);
    });

    it('should be case-insensitive for environment', async () => {
      await service.saveDDL('dev', 'mydb', 'tables', 'users', 'CREATE TABLE users;');
      const ddl = await service.getDDL('DEV', 'mydb', 'TABLES', 'users');
      expect(ddl).toBe('CREATE TABLE users;');
    });
  });

  describe('Environment & database listing', () => {
    it('should list environments', async () => {
      await service.saveDDL('DEV', 'db1', 'TABLES', 't1', 'DDL');
      await service.saveDDL('PROD', 'db2', 'TABLES', 't2', 'DDL');
      const envs = await service.getEnvironments();
      expect(envs).toContain('DEV');
      expect(envs).toContain('PROD');
    });

    it('should list databases for environment', async () => {
      await service.saveDDL('DEV', 'db1', 'TABLES', 't1', 'DDL');
      await service.saveDDL('DEV', 'db2', 'TABLES', 't2', 'DDL');
      const dbs = await service.getDatabases('DEV');
      expect(dbs).toContain('db1');
      expect(dbs).toContain('db2');
    });

    it('should get last updated timestamp', async () => {
      await service.saveDDL('DEV', 'db1', 'TABLES', 't1', 'DDL');
      const lastUpdated = await service.getLastUpdated('DEV', 'db1');
      expect(lastUpdated).toBeDefined();
      expect(lastUpdated).not.toBeNull();
    });
  });

  describe('Comparison operations', () => {
    it('should save and retrieve comparisons', async () => {
      await service.saveComparison({
        srcEnv: 'DEV', destEnv: 'PROD', database: 'mydb',
        type: 'TABLES', name: 'users', status: 'CHANGED',
        alterStatements: ['ALTER TABLE users ADD col int'],
      });
      const comps = await service.getComparisons('DEV', 'PROD', 'mydb', 'TABLES');
      expect(comps).toHaveLength(1);
      expect((comps[0] as any).name).toBe('users');
    });

    it('should upsert comparisons on conflict', async () => {
      await service.saveComparison({
        srcEnv: 'DEV', destEnv: 'PROD', database: 'mydb',
        type: 'TABLES', name: 'users', status: 'CHANGED',
      });
      await service.saveComparison({
        srcEnv: 'DEV', destEnv: 'PROD', database: 'mydb',
        type: 'TABLES', name: 'users', status: 'IDENTICAL',
      });
      const comps = await service.getComparisons('DEV', 'PROD', 'mydb', 'TABLES');
      expect(comps).toHaveLength(1);
      expect((comps[0] as any).status).toBe('IDENTICAL');
    });

    it('should get latest comparisons', async () => {
      await service.saveComparison({
        srcEnv: 'DEV', destEnv: 'PROD', database: 'mydb',
        type: 'TABLES', name: 'users', status: 'CHANGED',
      });
      const latest = await service.getLatestComparisons(10);
      expect(latest.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Snapshot operations', () => {
    it('should save and retrieve snapshots', async () => {
      await service.saveSnapshot('DEV', 'mydb', 'TABLES', 'users', 'CREATE TABLE v1;', 'tag-1');
      await service.saveSnapshot('DEV', 'mydb', 'TABLES', 'users', 'CREATE TABLE v2;');
      const snaps = await service.getSnapshots('DEV', 'mydb', 'TABLES', 'users');
      expect(snaps.length).toBe(2);
    });

    it('should get all snapshots', async () => {
      await service.saveSnapshot('DEV', 'mydb', 'TABLES', 'users', 'DDL v1');
      const all = await service.getAllSnapshots();
      expect(all.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Migration history', () => {
    it('should save and retrieve migration history', async () => {
      await service.saveMigration({
        srcEnv: 'DEV', destEnv: 'PROD', database: 'mydb',
        type: 'TABLES', name: 'users', operation: 'ALTER',
        status: 'SUCCESS',
      });
      await service.saveMigration({
        srcEnv: 'DEV', destEnv: 'PROD', database: 'mydb',
        type: 'TABLES', name: 'posts', operation: 'CREATE',
        status: 'FAILED', error: 'Syntax error',
      });
      const history = await service.getMigrationHistory();
      expect(history.length).toBe(2);
    });
  });

  describe('Maintenance', () => {
    it('should clear connection data', async () => {
      await service.saveDDL('DEV', 'mydb', 'TABLES', 'users', 'DDL');
      await service.saveComparison({
        srcEnv: 'DEV', destEnv: 'PROD', database: 'mydb',
        type: 'TABLES', name: 'users', status: 'OK',
      });
      const result = await service.clearConnectionData('DEV', 'mydb');
      expect(result.ddlCount).toBe(1);
      expect(result.comparisonCount).toBe(1);
    });

    it('should clear all data', async () => {
      await service.saveDDL('DEV', 'mydb', 'TABLES', 'users', 'DDL');
      await service.saveSnapshot('DEV', 'mydb', 'TABLES', 'users', 'DDL');
      const result = await service.clearAll();
      expect(result.ddl).toBe(1);
      expect(result.snapshot).toBe(1);
    });

    it('should get stats', async () => {
      await service.saveDDL('DEV', 'mydb', 'TABLES', 'users', 'DDL');
      const stats = await service.getStats();
      expect(stats.ddlExports).toBe(1);
      expect(stats.dbPath).toBe(dbPath);
    });
  });

  describe('close', () => {
    it('should handle close gracefully', () => {
      service.close();
      // Calling close again should not throw
      service.close();
    });
  });

  describe('null db guards', () => {
    it('should return safe defaults when db is null', async () => {
      service.close();
      expect(await service.saveDDL('DEV', 'db', 'TABLES', 't', 'DDL')).toBeUndefined();
      expect(await service.getDDL('DEV', 'db', 'TABLES', 't')).toBeNull();
      expect(await service.getDDLObjects('DEV', 'db', 'TABLES')).toEqual([]);
      expect(await service.getEnvironments()).toEqual([]);
      expect(await service.getDatabases('DEV')).toEqual([]);
      expect(await service.getLastUpdated('DEV', 'db')).toBeNull();
      expect(await service.saveComparison({
        srcEnv: 'DEV', destEnv: 'PROD', database: 'db',
        type: 'TABLES', name: 't', status: 'OK',
      })).toBeUndefined();
      expect(await service.getComparisons('DEV', 'PROD', 'db', 'TABLES')).toEqual([]);
      expect(await service.getLatestComparisons()).toEqual([]);
      expect(await service.saveSnapshot('DEV', 'db', 'TABLES', 't', 'DDL')).toBeUndefined();
      expect(await service.getSnapshots('DEV', 'db', 'TABLES', 't')).toEqual([]);
      expect(await service.getAllSnapshots()).toEqual([]);
      expect(await service.saveMigration({
        srcEnv: 'DEV', destEnv: 'PROD', database: 'db',
        type: 'TABLES', name: 't', operation: 'ALTER', status: 'OK',
      })).toBeUndefined();
      expect(await service.getMigrationHistory()).toEqual([]);
      expect(await service.clearConnectionData('DEV', 'db')).toEqual({ ddlCount: 0, comparisonCount: 0 });
      expect(await service.clearAll()).toEqual({ ddl: 0, comparison: 0, snapshot: 0, migration: 0 });
      expect(await service.getStats()).toEqual({});
    });
  });
});
