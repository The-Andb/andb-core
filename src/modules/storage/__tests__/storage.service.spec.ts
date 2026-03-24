import { StorageService } from '../storage.service';
import { ICoreStorageStrategy } from '../interfaces/core-storage-strategy.interface';
import * as path from 'path';
import * as os from 'os';

describe('StorageService', () => {
  let service: StorageService;
  let mockStrategy: jest.Mocked<ICoreStorageStrategy>;
  let tmpDir: string;
  let dbPath: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `andb-test-${Date.now()}`);
    dbPath = path.join(tmpDir, 'test-storage.db');
    
    mockStrategy = {
      initialize: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      getDataSource: jest.fn().mockReturnValue({}),
      saveProject: jest.fn().mockResolvedValue(undefined),
      getProjects: jest.fn().mockResolvedValue([]),
      deleteProject: jest.fn().mockResolvedValue(undefined),
      saveProjectEnvironment: jest.fn().mockResolvedValue(undefined),
      getProjectEnvironments: jest.fn().mockResolvedValue([]),
      deleteProjectEnvironment: jest.fn().mockResolvedValue(undefined),
      saveProjectSetting: jest.fn().mockResolvedValue(undefined),
      getProjectSettings: jest.fn().mockResolvedValue({}),
      saveUserSetting: jest.fn().mockResolvedValue(undefined),
      getUserSettings: jest.fn().mockResolvedValue({}),
      getMetadata: jest.fn().mockResolvedValue(null),
      setMetadata: jest.fn().mockResolvedValue(undefined),
      saveDdlExport: jest.fn().mockResolvedValue(undefined),
      getDdlExports: jest.fn().mockResolvedValue([]),
      saveSnapshot: jest.fn().mockResolvedValue(undefined),
      getSnapshot: jest.fn().mockResolvedValue(null),
      getAllSnapshots: jest.fn().mockResolvedValue([]),
      saveComparison: jest.fn().mockResolvedValue(undefined),
      getComparisons: jest.fn().mockResolvedValue([]),
      getLatestComparisons: jest.fn().mockResolvedValue([]),
      saveMigrationHistory: jest.fn().mockResolvedValue(1),
      updateMigrationStatus: jest.fn().mockResolvedValue(undefined),
      getMigrationHistory: jest.fn().mockResolvedValue([]),
      queryRaw: jest.fn().mockResolvedValue([]),
      executeRaw: jest.fn().mockResolvedValue(undefined)
    } as any;

    service = new StorageService();
    process.env.ANDB_QUIET = '1';
    await service.initialize(mockStrategy, dbPath);
  });

  afterEach(async () => {
    await service.close();
    delete process.env.ANDB_QUIET;
  });

  describe('initialize', () => {
    it('should initialize the strategy', () => {
      expect(mockStrategy.initialize).toHaveBeenCalledWith(dbPath);
    });
  });

  describe('Project operations', () => {
    it('should save project via strategy', async () => {
      const p = { id: 'p1', name: 'proj1' };
      await service.saveProject(p);
      expect(mockStrategy.saveProject).toHaveBeenCalledWith(p);
    });

    it('should retrieve projects via strategy', async () => {
      const p = [{ id: 'p1', name: 'proj1' }];
      mockStrategy.getProjects.mockResolvedValueOnce(p);
      const res = await service.getProjects();
      expect(res).toEqual(p);
    });
  });

  describe('Comparison operations', () => {
    it('should save comparison via strategy', async () => {
      await service.saveComparison('DEV', 'PROD', 'mydb', 'TABLES', 'users', 'CHANGED', '');
      expect(mockStrategy.saveComparison).toHaveBeenCalledWith(expect.objectContaining({
        source_env: 'DEV', target_env: 'PROD', database_name: 'mydb',
        ddl_type: 'TABLES', ddl_name: 'users', status: 'CHANGED'
      }));
    });
  });

  describe('close', () => {
    it('should close the strategy', async () => {
      await service.close();
      expect(mockStrategy.close).toHaveBeenCalled();
    });
  });
});
