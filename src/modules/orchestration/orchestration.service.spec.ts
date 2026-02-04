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
      expect(exporter.exportSchema).toHaveBeenCalledWith('DEV', null);
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
    it('should return identical tables with status equal', async () => {
      // Mock Drivers
      const mockIntro = {
        listTables: jest.fn(),
        getTableDDL: jest.fn(),
        listProcedures: jest.fn().mockResolvedValue([]),
        listFunctions: jest.fn().mockResolvedValue([]),
        listViews: jest.fn().mockResolvedValue([]),
        listTriggers: jest.fn().mockResolvedValue([]),
        listEvents: jest.fn().mockResolvedValue([]),
      };
      const mockDriver = {
        connect: jest.fn(),
        disconnect: jest.fn(),
        getIntrospectionService: jest.fn().mockReturnValue(mockIntro),
      };
      driverFactory.create.mockResolvedValue(mockDriver);

      // Mock Config
      configService.getConnection.mockReturnValue({ type: 'mysql', config: {} });

      // Mock Comparator (Returns EMPTY diff)
      comparator.compareSchema.mockResolvedValue({
        tables: {},
        droppedTables: [],
        objects: [],
        summary: { totalChanges: 0, tablesChanged: 0, objectsChanged: 0 }
      });

      // Mock Introspection (Identical tables exist)
      mockIntro.listTables.mockResolvedValue(['users']);
      mockIntro.getTableDDL.mockResolvedValue('CREATE TABLE users ...');

      // Mock Storage
      storageService.saveComparison = jest.fn();

      const payload = {
        srcEnv: 'DEV',
        destEnv: 'STAGE',
        type: 'tables'
      };

      const result = await service.execute('compare', payload);

      // Assertions covering the "Big Missing" bug
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        name: 'users',
        status: 'equal',
        type: 'TABLES'
      }));
    });
  });
});
