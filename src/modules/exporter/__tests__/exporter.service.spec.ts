import { ExporterService } from '../exporter.service';
import { DriverFactoryService } from '../../driver/driver-factory.service';
import { ProjectConfigService } from '../../config/project-config.service';
import { ConnectionType } from '../../../common/interfaces/connection.interface';
import * as fs from 'fs';

jest.mock('fs');

describe('ExporterService', () => {
  let service: ExporterService;
  let driverFactory: jest.Mocked<DriverFactoryService>;
  let configService: jest.Mocked<ProjectConfigService>;
  let storageService: any;
  let mockIntrospection: any;
  let mockDriver: any;

  beforeEach(() => {
    mockIntrospection = {
      listTables: jest.fn().mockResolvedValue(['users']),
      listViews: jest.fn().mockResolvedValue([]),
      listProcedures: jest.fn().mockResolvedValue([]),
      listFunctions: jest.fn().mockResolvedValue([]),
      listTriggers: jest.fn().mockResolvedValue([]),
      listEvents: jest.fn().mockResolvedValue([]),
      getTableDDL: jest.fn().mockResolvedValue('CREATE TABLE `users` (`id` int);'),
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
    };

    driverFactory = {
      create: jest.fn().mockResolvedValue(mockDriver),
    } as any;

    configService = {
      getConnection: jest.fn().mockReturnValue({
        type: ConnectionType.MYSQL,
        config: { database: 'test_db' },
      }),
    } as any;

    storageService = {
      saveDDL: jest.fn().mockResolvedValue(undefined),
    };

    const mockParserService = {
      uppercaseKeywords: jest.fn().mockImplementation((s) => s),
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);

    service = new ExporterService(driverFactory, configService, mockParserService as any, storageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportSchema', () => {
    it('should export tables and return summary', async () => {
      const summary = await service.exportSchema('dev');

      expect(driverFactory.create).toHaveBeenCalled();
      expect(mockDriver.connect).toHaveBeenCalled();
      expect(mockDriver.disconnect).toHaveBeenCalled();
      expect(summary.TABLES).toBe(1);
      expect(storageService.saveDDL).toHaveBeenCalledWith(
        'dev', 'test_db', 'TABLES', 'users',
        expect.stringContaining('CREATE TABLE'),
      );
    });

    it('should throw if connection not found', async () => {
      configService.getConnection.mockReturnValue(undefined as any);
      await expect(service.exportSchema('unknown')).rejects.toThrow('Connection not found');
    });

    it('should disconnect even if export fails', async () => {
      mockIntrospection.listTables.mockRejectedValue(new Error('Query failed'));
      await expect(service.exportSchema('dev')).rejects.toThrow('Query failed');
      expect(mockDriver.disconnect).toHaveBeenCalled();
    });

    it('should create directories if they do not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      await service.exportSchema('dev');
      expect(fs.mkdirSync).toHaveBeenCalled();
    });

    it('should write empty DDL to file for consistency (parity fix)', async () => {
      mockIntrospection.getTableDDL.mockResolvedValue('');
      await service.exportSchema('dev');
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('users.sql'), '',
      );
    });

    it('should export with a specific name filter', async () => {
      const summary = await service.exportSchema('dev', 'users');
      // When specificName is provided, it's used directly instead of listing
      expect(summary.TABLES).toBe(1);
    });

    it('should export views, procedures, triggers etc.', async () => {
      mockIntrospection.listViews.mockResolvedValue(['v_report']);
      mockIntrospection.getViewDDL.mockResolvedValue('CREATE VIEW v_report AS SELECT 1;');
      mockIntrospection.listTriggers.mockResolvedValue(['trg_audit']);
      mockIntrospection.getTriggerDDL.mockResolvedValue('CREATE TRIGGER trg_audit AFTER INSERT ON users FOR EACH ROW BEGIN END;');

      const summary = await service.exportSchema('dev');
      expect(summary.VIEWS).toBe(1);
      expect(summary.TRIGGERS).toBe(1);
    });
  });
});
