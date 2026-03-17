import { StorageService } from '../storage.service';
import { IStorageDriver } from '../interfaces/storage-driver.interface';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

describe('StorageService', () => {
  let service: StorageService;
  let mockDriver: jest.Mocked<IStorageDriver>;
  let tmpDir: string;
  let dbPath: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `andb-test-${Date.now()}`);
    dbPath = path.join(tmpDir, 'test-storage.db');
    
    mockDriver = {
      initialize: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      execute: jest.fn().mockResolvedValue({ changes: 1 }),
      exec: jest.fn().mockResolvedValue(undefined),
      queryAll: jest.fn().mockResolvedValue([]),
      queryOne: jest.fn().mockResolvedValue(null),
      transaction: jest.fn().mockImplementation(async (fn) => fn(mockDriver)),
      getDbPath: jest.fn().mockReturnValue(dbPath),
      isInitialized: jest.fn().mockReturnValue(true),
    } as any;

    service = new StorageService();
    process.env.ANDB_QUIET = '1';
    await service.initialize(mockDriver, dbPath);
  });

  afterEach(async () => {
    await service.close();
    delete process.env.ANDB_QUIET;
  });

  describe('initialize', () => {
    it('should initialize the driver', () => {
      expect(mockDriver.initialize).toHaveBeenCalledWith(dbPath);
    });
  });

  describe('DDL operations', () => {
    it('should save DDL via driver', async () => {
      await service.saveDDL('DEV', 'mydb', 'TABLES', 'users', 'CREATE TABLE users;');
      expect(mockDriver.execute).toHaveBeenCalled();
    });

    it('should retrieve DDL via driver', async () => {
      mockDriver.queryOne.mockResolvedValueOnce({ ddl_content: 'SELECT 1' });
      const ddl = await service.getDDL('DEV', 'mydb', 'TABLES', 'users');
      expect(ddl).toBe('SELECT 1');
      expect(mockDriver.queryOne).toHaveBeenCalled();
    });

    it('should return null for non-existent DDL', async () => {
      mockDriver.queryOne.mockResolvedValueOnce(null);
      const ddl = await service.getDDL('DEV', 'mydb', 'TABLES', 'nonexistent');
      expect(ddl).toBeNull();
    });
  });

  describe('Comparison operations', () => {
    it('should save comparison via driver', async () => {
      await service.saveComparison({
        srcEnv: 'DEV', destEnv: 'PROD', database: 'mydb',
        type: 'TABLES', name: 'users', status: 'CHANGED',
      });
      expect(mockDriver.execute).toHaveBeenCalled();
    });
  });

  describe('Maintenance', () => {
    it('should clear all data via driver transaction', async () => {
      await service.clearAll();
      expect(mockDriver.transaction).toHaveBeenCalled();
      expect(mockDriver.execute).toHaveBeenCalledWith('DELETE FROM ddl_exports');
    });
  });

  describe('close', () => {
    it('should close the driver', async () => {
      await service.close();
      expect(mockDriver.close).toHaveBeenCalled();
    });
  });
});
