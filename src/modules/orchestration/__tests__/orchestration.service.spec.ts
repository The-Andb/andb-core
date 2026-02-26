import { OrchestrationService } from '../orchestration.service';

describe('OrchestrationService', () => {
  let service: OrchestrationService;
  let configService: any;
  let storageService: any;
  let driverFactory: any;
  let comparator: any;
  let exporter: any;
  let migrator: any;

  let mockDriver: any;
  let mockIntrospection: any;

  beforeEach(() => {
    mockIntrospection = {
      listTables: jest.fn().mockResolvedValue(['users']),
      listViews: jest.fn().mockResolvedValue([]),
      listProcedures: jest.fn().mockResolvedValue([]),
      listFunctions: jest.fn().mockResolvedValue([]),
      listTriggers: jest.fn().mockResolvedValue([]),
      listEvents: jest.fn().mockResolvedValue([]),
      getTableDDL: jest.fn().mockResolvedValue('CREATE TABLE `users` (`id` int)'),
      getViewDDL: jest.fn().mockResolvedValue(''),
      getProcedureDDL: jest.fn().mockResolvedValue(''),
      getFunctionDDL: jest.fn().mockResolvedValue(''),
      getTriggerDDL: jest.fn().mockResolvedValue(''),
      getEventDDL: jest.fn().mockResolvedValue(''),
    };

    mockDriver = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      getIntrospectionService: jest.fn().mockReturnValue(mockIntrospection),
      getMigrator: jest.fn().mockReturnValue({
        generateTableAlterSQL: jest.fn().mockReturnValue([]),
        generateObjectSQL: jest.fn().mockReturnValue([]),
      }),
      query: jest.fn().mockResolvedValue([]),
      setForeignKeyChecks: jest.fn().mockResolvedValue(undefined),
      generateUserSetupScript: jest.fn().mockResolvedValue('-- script'),
    };

    configService = {
      getConnection: jest.fn().mockReturnValue({
        type: 'mysql',
        config: { database: 'testdb', host: 'localhost' },
      }),
      setConnection: jest.fn(),
      setDomainNormalization: jest.fn(),
      setAutoBackup: jest.fn(),
    };

    storageService = {
      saveDDL: jest.fn().mockResolvedValue(undefined),
      saveComparison: jest.fn().mockResolvedValue(undefined),
      saveMigration: jest.fn().mockResolvedValue(undefined),
    };

    driverFactory = {
      create: jest.fn().mockResolvedValue(mockDriver),
    };

    comparator = {
      compareSchema: jest.fn().mockResolvedValue({
        tables: {},
        droppedTables: [],
        objects: [],
        summary: { totalChanges: 0, tablesChanged: 0, objectsChanged: 0 },
      }),
      compareTables: jest.fn().mockReturnValue({ tableName: 'users', operations: [], hasChanges: false }),
    };

    exporter = {
      exportSchema: jest.fn().mockResolvedValue({ TABLES: 1 }),
    };

    migrator = {
      generateAlterSQL: jest.fn().mockReturnValue([]),
      generateObjectSQL: jest.fn().mockReturnValue([]),
      generateSchemaSQL: jest.fn().mockReturnValue([]),
    };

    service = new OrchestrationService(
      configService,
      storageService,
      driverFactory,
      comparator,
      exporter,
      migrator,
    );
  });

  describe('execute', () => {
    it('should route to exportSchema', async () => {
      await service.execute('export', { env: 'dev' });
      expect(exporter.exportSchema).toHaveBeenCalledWith('dev', null);
    });

    it('should route to getSchemaObjects', async () => {
      const result = await service.execute('getSchemaObjects', {
        connection: { type: 'mysql', database: 'testdb' },
        type: 'tables',
      });
      expect(result).toEqual(['users']);
    });

    it('should route to test-connection', async () => {
      const result = await service.execute('test-connection', {
        connection: { type: 'mysql', database: 'testdb' },
      });
      expect(result).toEqual(expect.objectContaining({ success: true }));
    });

    it('should throw for unknown operation', async () => {
      await expect(service.execute('unknown-op', {})).rejects.toThrow('Unknown operation');
    });

    it('should sync source config if provided', async () => {
      await service.execute('export', {
        env: 'dev',
        srcEnv: 'dev',
        sourceConfig: { type: 'mysql', database: 'db' },
      });
      expect(configService.setConnection).toHaveBeenCalledWith('dev', expect.anything(), 'mysql');
    });

    it('should sync target config if provided', async () => {
      await service.execute('export', {
        env: 'dev',
        destEnv: 'prod',
        targetConfig: { type: 'mysql', database: 'db' },
      });
      expect(configService.setConnection).toHaveBeenCalledWith('prod', expect.anything(), 'mysql');
    });

    it('should set domain normalization if provided', async () => {
      await service.execute('export', {
        env: 'dev',
        domainNormalization: { pattern: 'test', replacement: 'prod' },
      });
      expect(configService.setDomainNormalization).toHaveBeenCalled();
    });
  });

  describe('getSchemaObjects', () => {
    it('should list views', async () => {
      mockIntrospection.listViews.mockResolvedValue(['v1']);
      const result = await service.execute('getSchemaObjects', {
        connection: { type: 'mysql', database: 'testdb' },
        type: 'views',
      });
      expect(result).toEqual(['v1']);
    });

    it('should list procedures', async () => {
      mockIntrospection.listProcedures.mockResolvedValue(['sp1']);
      const result = await service.execute('getSchemaObjects', {
        connection: { type: 'mysql', database: 'testdb' },
        type: 'procedures',
      });
      expect(result).toEqual(['sp1']);
    });

    it('should list functions', async () => {
      mockIntrospection.listFunctions.mockResolvedValue(['fn1']);
      const result = await service.execute('getSchemaObjects', {
        connection: { type: 'mysql', database: 'testdb' },
        type: 'functions',
      });
      expect(result).toEqual(['fn1']);
    });

    it('should list triggers', async () => {
      mockIntrospection.listTriggers.mockResolvedValue(['t1']);
      const result = await service.execute('getSchemaObjects', {
        connection: { type: 'mysql', database: 'testdb' },
        type: 'triggers',
      });
      expect(result).toEqual(['t1']);
    });

    it('should return empty for unknown type', async () => {
      const result = await service.execute('getSchemaObjects', {
        connection: { type: 'mysql', database: 'testdb' },
        type: 'unknown',
      });
      expect(result).toEqual([]);
    });

    it('should disconnect even on error', async () => {
      mockIntrospection.listTables.mockRejectedValue(new Error('fail'));
      await expect(service.execute('getSchemaObjects', {
        connection: { type: 'mysql', database: 'testdb' },
        type: 'tables',
      })).rejects.toThrow('fail');
      expect(mockDriver.disconnect).toHaveBeenCalled();
    });
  });

  describe('testConnection', () => {
    it('should return success on good connection', async () => {
      const result = await service.execute('test-connection', {
        connection: { type: 'mysql', database: 'testdb' },
      });
      expect(result.success).toBe(true);
    });

    it('should return failure on bad connection', async () => {
      mockDriver.connect.mockRejectedValue(new Error('Connection refused'));
      const result = await service.execute('test-connection', {
        connection: { type: 'mysql', database: 'testdb' },
      });
      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection refused');
    });
  });

  describe('exportSchema', () => {
    it('should delegate to exporter', async () => {
      const result = await service.execute('export', { env: 'dev' });
      expect(exporter.exportSchema).toHaveBeenCalledWith('dev', null);
      expect(result).toEqual({ TABLES: 1 });
    });

    it('should pass specific name', async () => {
      await service.execute('export', { env: 'dev', name: 'users' });
      expect(exporter.exportSchema).toHaveBeenCalledWith('dev', 'users');
    });
  });

  describe('compareSchema', () => {
    it('should connect to src and dest, run comparison', async () => {
      const result = await service.execute('compare', {
        srcEnv: 'dev',
        destEnv: 'prod',
      });
      expect(driverFactory.create).toHaveBeenCalledTimes(2);
      expect(comparator.compareSchema).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('generate-user-setup-script', () => {
    it('should generate script from driver', async () => {
      const result = await service.execute('generate-user-setup-script', {
        adminConnection: { type: 'mysql', database: 'testdb' },
        restrictedUser: { username: 'testuser', password: 'pass' },
        permissions: { schemaRead: true },
      });
      expect(result).toBeDefined();
    });
  });
});
