import { DumpDriver } from '../dump.driver';
import { IDatabaseConfig } from '../../../../common/interfaces/driver.interface';
import { ParserService } from '../../../parser/parser.service';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');

describe('DumpDriver', () => {
  let driver: DumpDriver;
  let mockConfig: IDatabaseConfig;
  let parser: ParserService;

  beforeEach(() => {
    mockConfig = {
      host: 'test.sql',
      port: 3306,
      user: 'root',
      database: 'test_db',
    };
    parser = new ParserService();
    driver = new DumpDriver(mockConfig, parser);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should throw if path missing', async () => {
      driver = new DumpDriver({} as any, parser);
      await expect(driver.connect()).rejects.toThrow('path is required');
    });

    it('should parse simple dump file', async () => {
      const dumpContent = `
        CREATE TABLE \`users\` ( \`id\` int );
        CREATE TABLE \`posts\` ( \`id\` int );
        /*!50003 CREATE TRIGGER \`t1\` AFTER INSERT ON \`users\` FOR EACH ROW BEGIN END */;
      `;
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(dumpContent);

      await driver.connect();

      expect(driver.data.TABLES.has('users')).toBe(true);
      expect(driver.data.TABLES.has('posts')).toBe(true);
      expect(driver.data.TRIGGERS.has('t1')).toBe(true);
      expect(driver.data.TABLES.get('users')).toContain('CREATE TABLE `users` ( `id` int );');
    });

    it('should handle complex delimiters and blocks', async () => {
      const dumpContent = `
        DELIMITER //
        CREATE PROCEDURE \`test_proc\`()
        BEGIN
          SELECT 1;
        END //
        DELIMITER ;
        
        CREATE VIEW \`v_users\` AS SELECT * FROM users;
      `;
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(dumpContent);

      await driver.connect();

      expect(driver.data.PROCEDURES.has('test_proc')).toBe(true);
      expect(driver.data.VIEWS.has('v_users')).toBe(true);
      expect(driver.data.PROCEDURES.get('test_proc')).toContain('CREATE PROCEDURE `test_proc`()');
      expect(driver.data.PROCEDURES.get('test_proc')).toContain('END;');
    });
  });

  describe('query', () => {
    it('should return empty list and log warning', async () => {
      const result = await driver.query('SELECT * FROM users');
      expect(result).toEqual([]);
    });
  });

  describe('getIntrospectionService', () => {
    it('should return DumpIntrospectionService instance', () => {
      const service = driver.getIntrospectionService();
      expect(service).toBeDefined();
    });
  });

  describe('extractName', () => {
    it('should handle quoted names and schema prefixes', () => {
      // Accessing private method for granular testing
      const result1 = (driver as any)._extractName('`mydb`.`users`');
      const result2 = (driver as any)._extractName('"posts"');
      const result3 = (driver as any)._extractName('public.comments');

      expect(result1).toBe('users');
      expect(result2).toBe('posts');
      expect(result3).toBe('comments');
    });

    it('should return null for empty input', () => {
      expect((driver as any)._extractName('')).toBeNull();
      expect((driver as any)._extractName(null)).toBeNull();
    });
  });

  describe('getMigrator', () => {
    it('should return a MysqlMigrator instance', () => {
      const migrator = driver.getMigrator();
      expect(migrator).toBeDefined();
      expect(migrator.generateTableAlterSQL).toBeDefined();
    });

    it('should cache and return the same instance', () => {
      const migrator1 = driver.getMigrator();
      const migrator2 = driver.getMigrator();
      expect(migrator1).toBe(migrator2);
    });
  });

  describe('getMonitoringService', () => {
    it('should return a stub monitoring service', () => {
      const service = driver.getMonitoringService();
      expect(service).toBeDefined();
      expect(service.getProcessList).toBeDefined();
      expect(service.getStatus).toBeDefined();
      expect(service.getVariables).toBeDefined();
    });

    it('should return sensible defaults', async () => {
      const service = driver.getMonitoringService();
      const processes = await service.getProcessList();
      const version = await service.getVersion();
      const connections = await service.getConnections();
      const transactions = await service.getTransactions();
      const status = await service.getStatus();
      const variables = await service.getVariables();
      expect(processes).toEqual([]);
      expect(version).toBe('Dump-1.0');
      expect(connections).toEqual([]);
      expect(transactions).toEqual([]);
      expect(status).toEqual({});
      expect(variables).toEqual({});
    });
  });

  describe('getSessionContext', () => {
    it('should return empty object', async () => {
      const ctx = await driver.getSessionContext();
      expect(ctx).toEqual({});
    });
  });

  describe('setForeignKeyChecks', () => {
    it('should be a no-op', async () => {
      await expect(driver.setForeignKeyChecks(true)).resolves.not.toThrow();
      await expect(driver.setForeignKeyChecks(false)).resolves.not.toThrow();
    });
  });

  describe('generateUserSetupScript', () => {
    it('should throw for dump connections', async () => {
      await expect(driver.generateUserSetupScript({
        username: 'user',
        permissions: {},
      })).rejects.toThrow('not supported');
    });
  });

  describe('disconnect', () => {
    it('should be a no-op', async () => {
      await expect(driver.disconnect()).resolves.not.toThrow();
    });
  });

  describe('connect edge cases', () => {
    it('should resolve relative paths', async () => {
      const relConfig = { host: './test.sql' } as any;
      const relDriver = new DumpDriver(relConfig, parser);

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('CREATE TABLE `t` ( `id` int );');

      await relDriver.connect();
      expect(relDriver.data.TABLES.has('t')).toBe(true);
    });

    it('should handle empty dump content gracefully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('');

      await driver.connect();
      expect(driver.data.TABLES.size).toBe(0);
    });

    it('should throw if dump file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      await expect(driver.connect()).rejects.toThrow('Dump file not found');
    });
  });
});

