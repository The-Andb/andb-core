import { Test, TestingModule } from '@nestjs/testing';
import { OrchestrationService } from './orchestration.service';
import {
  PROJECT_CONFIG_SERVICE,
  STORAGE_SERVICE,
  DRIVER_FACTORY_SERVICE,
  COMPARATOR_SERVICE,
  EXPORTER_SERVICE,
  MIGRATOR_SERVICE
} from '../../common/constants/tokens';

describe('OrchestrationService', () => {
  let service: OrchestrationService;
  let configService: any;
  let storageService: any;
  let driverFactory: any;
  let comparator: any;
  let exporter: any;
  let migrator: any;

  beforeEach(async () => {
    const mockConfigService = {
      setConnection: jest.fn(),
      setDomainNormalization: jest.fn(),
      getConnection: jest.fn(),
    };
    const mockStorageService = {
      saveMigration: jest.fn(),
    };
    const mockDriverFactory = {
      create: jest.fn(),
    };
    const mockComparator = {
      compareSchema: jest.fn(),
    };
    const mockExporter = {
      exportSchema: jest.fn(),
    };
    const mockMigrator = {
      generateAlterSQL: jest.fn(),
      generateObjectSQL: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrchestrationService,
        { provide: PROJECT_CONFIG_SERVICE, useValue: mockConfigService },
        { provide: STORAGE_SERVICE, useValue: mockStorageService },
        { provide: DRIVER_FACTORY_SERVICE, useValue: mockDriverFactory },
        { provide: COMPARATOR_SERVICE, useValue: mockComparator },
        { provide: EXPORTER_SERVICE, useValue: mockExporter },
        { provide: MIGRATOR_SERVICE, useValue: mockMigrator },
      ],
    }).compile();

    service = module.get<OrchestrationService>(OrchestrationService);
    configService = module.get(PROJECT_CONFIG_SERVICE);
    storageService = module.get(STORAGE_SERVICE);
    driverFactory = module.get(DRIVER_FACTORY_SERVICE);
    comparator = module.get(COMPARATOR_SERVICE);
    exporter = module.get(EXPORTER_SERVICE);
    migrator = module.get(MIGRATOR_SERVICE);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should configure connection if payload has config', async () => {
      const payload = {
        operation: 'export',
        srcEnv: 'DEV',
        sourceConfig: { type: 'mysql', host: 'localhost' },
        env: 'DEV'
      };
      // Mock export to avoid actual logic
      exporter.exportSchema.mockResolvedValue([]);

      await service.execute('export', payload);

      expect(configService.setConnection).toHaveBeenCalledWith('DEV', payload.sourceConfig, 'mysql');
    });

    it('should call exportSchema when operation is export', async () => {
      const payload = { env: 'DEV' };
      exporter.exportSchema.mockResolvedValue('exported');
      const result = await service.execute('export', payload);
      expect(exporter.exportSchema).toHaveBeenCalledWith('DEV', null, null);
      expect(result).toBe('exported');
    });

    it('should throw error for unknown operation', async () => {
      await expect(service.execute('unknown', {})).rejects.toThrow('Unknown operation: unknown');
    });
  });

  describe('getSchemaObjects', () => {
    it('should return tables list', async () => {
      const mockDriver = {
        connect: jest.fn(),
        disconnect: jest.fn(),
        getIntrospectionService: jest.fn().mockReturnValue({
          listTables: jest.fn().mockResolvedValue(['t1', 't2'])
        })
      };
      driverFactory.create.mockResolvedValue(mockDriver);

      const payload = {
        connection: { host: 'localhost', database: 'db' },
        type: 'tables'
      };

      const result = await service.execute('getSchemaObjects', payload);
      expect(result).toEqual(['t1', 't2']);
      expect(mockDriver.connect).toHaveBeenCalled();
      expect(mockDriver.disconnect).toHaveBeenCalled();
    });
  });

  describe('compareSchema', () => {
    it('should delegate to comparator.compareFromStorage (offline from SQLite)', async () => {
      // Mock Config (needed for database name lookup)
      configService.getConnection.mockReturnValue({ type: 'mysql', config: { database: 'testdb' } });

      // Mock Comparator — compareFromStorage returns results from storage
      const mockResults = [
        { name: 'users', status: 'equal', type: 'TABLES', ddl: [], diff: { source: 'CREATE TABLE...', target: 'CREATE TABLE...' } },
      ];
      comparator.compareFromStorage = jest.fn().mockResolvedValue(mockResults);

      const payload = {
        srcEnv: 'DEV',
        destEnv: 'STAGE',
        type: 'tables'
      };

      const result = await service.execute('compare', payload);

      // Assertions
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        name: 'users',
        status: 'equal',
        type: 'TABLES'
      }));

      // Verify Comparator.compareFromStorage was called with correct args
      expect(comparator.compareFromStorage).toHaveBeenCalledWith(
        'DEV', 'STAGE', 'testdb', 'testdb', 'tables', undefined,
      );
      // Verify NO driver connections were made
      expect(driverFactory.create).not.toHaveBeenCalled();
    });
  });
});
