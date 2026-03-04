import { MysqlIntrospectionService } from '../mysql.introspection';
import {
  IIntrospectionService,
  IDatabaseDriver,
} from '../../../../common/interfaces/driver.interface';
import { ParserService } from '../../../parser/parser.service';

describe('MysqlIntrospectionService', () => {
  let service: MysqlIntrospectionService;
  let mockDriver: jest.Mocked<IDatabaseDriver>;
  let parser: ParserService;

  beforeEach(() => {
    mockDriver = {
      query: jest.fn(),
    } as any;
    parser = new ParserService();
    service = new MysqlIntrospectionService(mockDriver, parser);
  });

  describe('Listing Methods', () => {
    it('listTables should use information_schema', async () => {
      mockDriver.query.mockResolvedValue([
        { TABLE_NAME: 'users' },
        { TABLE_NAME: 'posts' },
      ]);
      const tables = await service.listTables('db');
      expect(tables).toEqual(['users', 'posts']);
      expect(mockDriver.query).toHaveBeenCalledWith(
        expect.stringContaining('information_schema.TABLES'),
        ['db']
      );
    });

    it('listViews should use information_schema', async () => {
      mockDriver.query.mockResolvedValue([
        { TABLE_NAME: 'v_users' },
      ]);
      const views = await service.listViews('db');
      expect(views).toEqual(['v_users']);
      expect(mockDriver.query).toHaveBeenCalledWith(
        expect.stringContaining("TABLE_TYPE = 'VIEW'"),
        ['db']
      );
    });

    it('listProcedures should use information_schema', async () => {
      mockDriver.query.mockResolvedValue([
        { ROUTINE_NAME: 'p1' },
      ]);
      const procs = await service.listProcedures('db');
      expect(procs).toEqual(['p1']);
      expect(mockDriver.query).toHaveBeenCalledWith(
        expect.stringContaining('ROUTINE_TYPE = \'PROCEDURE\''),
        ['db']
      );
    });

    it('listFunctions should use information_schema', async () => {
      mockDriver.query.mockResolvedValue([
        { ROUTINE_NAME: 'f1' },
      ]);
      const funcs = await service.listFunctions('db');
      expect(funcs).toEqual(['f1']);
      expect(mockDriver.query).toHaveBeenCalledWith(
        expect.stringContaining('ROUTINE_TYPE = \'FUNCTION\''),
        ['db']
      );
    });

    it('listTriggers should use information_schema', async () => {
      mockDriver.query.mockResolvedValue([
        { TRIGGER_NAME: 't1' },
      ]);
      const triggers = await service.listTriggers('db');
      expect(triggers).toEqual(['t1']);
      expect(mockDriver.query).toHaveBeenCalledWith(
        expect.stringContaining('information_schema.TRIGGERS'),
        ['db']
      );
    });

    it('listEvents should use information_schema', async () => {
      mockDriver.query.mockResolvedValue([
        { EVENT_NAME: 'e1' },
      ]);
      const events = await service.listEvents('db');
      expect(events).toEqual(['e1']);
      expect(mockDriver.query).toHaveBeenCalledWith(
        expect.stringContaining('information_schema.EVENTS'),
        ['db']
      );
    });
  });

  describe('getTableDDL', () => {
    it('should return sanitized table DDL', async () => {
      mockDriver.query.mockResolvedValue([{
        'Create Table': 'CREATE TABLE `users` (\n  `id` int(11) NOT NULL AUTO_INCREMENT,\n  PRIMARY KEY (`id`)\n) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4'
      }]);
      const ddl = await service.getTableDDL('db', 'users');
      expect(ddl).toContain('CREATE TABLE `users`');
      expect(ddl).not.toContain('AUTO_INCREMENT=10');
    });

    it('should sort non-primary keys alphabetically to normalize DDL', async () => {
      mockDriver.query.mockResolvedValue([{
        'Create Table': 'CREATE TABLE `users` (\n  `id` int(11) NOT NULL,\n  `email` varchar(255) NOT NULL,\n  `age` int(11) NOT NULL,\n  PRIMARY KEY (`id`),\n  KEY `idx_email` (`email`),\n  KEY `idx_age` (`age`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
      }]);
      const ddl = await service.getTableDDL('db', 'users');
      // idx_age should come before idx_email
      const ageIndex = ddl.indexOf('`idx_age`');
      const emailIndex = ddl.indexOf('`idx_email`');
      expect(ageIndex).toBeGreaterThan(0);
      expect(emailIndex).toBeGreaterThan(0);
      expect(ageIndex).toBeLessThan(emailIndex);
    });

    it('should return empty string if it is a view', async () => {
      mockDriver.query.mockResolvedValue([{
        'Create View': 'CREATE VIEW ...'
      }]);
      const ddl = await service.getTableDDL('db', 'users');
      expect(ddl).toBe('');
    });
  });

  describe('getTriggerDDL', () => {
    it('should return sanitized trigger DDL', async () => {
      mockDriver.query.mockResolvedValue([{
        'SQL Original Statement': 'CREATE DEFINER=`root`@`localhost` TRIGGER `t` AFTER INSERT ON `u` FOR EACH ROW BEGIN END'
      }]);
      const ddl = await service.getTriggerDDL('db', 't');
      expect(ddl).toBe('CREATE TRIGGER `t` AFTER INSERT ON `u` FOR EACH ROW BEGIN END');
    });
  });

  describe('getObjectDDL', () => {
    it('should delegate to correct method based on type', async () => {
      const spy = jest.spyOn(service, 'getTableDDL').mockResolvedValue('TABLE DDL');
      const ddl = await service.getObjectDDL('db', 'TABLES', 'users');
      expect(ddl).toBe('TABLE DDL');
      expect(spy).toHaveBeenCalledWith('db', 'users');
    });
  });

  describe('getChecksums', () => {
    it('should return record of table checksums', async () => {
      mockDriver.query.mockResolvedValue([
        { TABLE_NAME: 'users', CHECKSUM: '123', UPDATE_TIME: '2024-01-01' },
      ]);
      const checksums = await service.getChecksums('db');
      expect(checksums).toEqual({
        users: '123|2024-01-01'
      });
    });
  });
});
