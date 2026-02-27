import { MysqlDriver } from '../mysql.driver';
import { IDatabaseConfig } from '../../../../common/interfaces/driver.interface';
import { ConnectionType } from '../../../../common/interfaces/connection.interface';
import * as mysql from 'mysql2/promise';
import { SshTunnel } from '../../ssh-tunnel';

jest.mock('mysql2/promise');
jest.mock('../../ssh-tunnel');

describe('MysqlDriver', () => {
  let driver: MysqlDriver;
  let mockConfig: IDatabaseConfig;
  let mockConnection: any;

  beforeEach(() => {
    mockConfig = {
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'password',
      database: 'test_db',
    };
    mockConnection = {
      query: jest.fn().mockResolvedValue([[]]),
      end: jest.fn().mockResolvedValue(undefined),
    };
    (mysql.createConnection as jest.Mock).mockResolvedValue(mockConnection);
    driver = new MysqlDriver(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect to MySQL without SSH', async () => {
      await driver.connect();
      expect(mysql.createConnection).toHaveBeenCalledWith(expect.objectContaining({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        database: 'test_db',
      }));
      expect(mockConnection.query).toHaveBeenCalledWith(expect.stringContaining('SET SESSION sql_mode'));
    });

    it('should connect via SSH tunnel if sshConfig is provided', async () => {
      const sshConfig = {
        host: 'proxy',
        port: 22,
        username: 'user',
      };
      mockConfig.sshConfig = sshConfig as any;
      const mockStream = {};
      (SshTunnel.prototype.forward as jest.Mock).mockResolvedValue(mockStream);

      await driver.connect();

      expect(SshTunnel).toHaveBeenCalledWith(sshConfig);
      expect(SshTunnel.prototype.forward).toHaveBeenCalledWith('localhost', 3306);
      expect(mysql.createConnection).toHaveBeenCalledWith(expect.objectContaining({
        stream: mockStream,
      }));
    });

    it('should throw error and cleanup SSH if connection fails', async () => {
      mockConfig.sshConfig = { host: 'proxy' } as any;
      (mysql.createConnection as jest.Mock).mockRejectedValue(new Error('Connect failed'));
      const mockSshClose = jest.fn();
      (SshTunnel.prototype.close as jest.Mock) = mockSshClose;

      await expect(driver.connect()).rejects.toThrow('Connect failed');
      expect(mockSshClose).toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should connect if not connected and execute query', async () => {
      await driver.query('SELECT 1');
      expect(mysql.createConnection).toHaveBeenCalled();
      expect(mockConnection.query).toHaveBeenCalledWith('SELECT 1', []);
    });

    it('should use existing connection if already connected', async () => {
      await driver.connect();
      jest.clearAllMocks();
      await driver.query('SELECT 2');
      expect(mysql.createConnection).not.toHaveBeenCalled();
      expect(mockConnection.query).toHaveBeenCalledWith('SELECT 2', []);
    });
  });

  describe('disconnect', () => {
    it('should end connection and close tunnel', async () => {
      mockConfig.sshConfig = { host: 'proxy' } as any;
      await driver.connect();
      await driver.disconnect();
      expect(mockConnection.end).toHaveBeenCalled();
      expect(SshTunnel.prototype.close).toHaveBeenCalled();
    });
  });

  describe('getSessionContext', () => {
    it('should return session context', async () => {
      const mockResult = { sql_mode: 'STRICT', time_zone: 'UTC' };
      mockConnection.query.mockResolvedValue([[mockResult]]);
      const context = await driver.getSessionContext();
      expect(context).toEqual(mockResult);
    });
  });

  describe('generateUserSetupScript', () => {
    it('should generate script with correct permissions', async () => {
      const script = await driver.generateUserSetupScript({
        username: 'testuser',
        password: 'password',
        database: 'mydb',
        permissions: {
          writeAlter: true,
          writeView: true,
          writeRoutine: true,
        },
      });

      expect(script).toContain("CREATE USER IF NOT EXISTS 'testuser'@'%'");
      expect(script).toContain("GRANT SELECT, SHOW VIEW, TRIGGER, EVENT ON `mydb`.*");
      expect(script).toContain("GRANT ALTER, CREATE, DROP, INDEX, REFERENCES ON `mydb`.*");
      expect(script).toContain("GRANT CREATE VIEW ON `mydb`.*");
      expect(script).toContain("GRANT ALTER ROUTINE, CREATE ROUTINE, EXECUTE ON `mydb`.*");
    });

    it('should generate script with no optional permissions', async () => {
      const script = await driver.generateUserSetupScript({
        username: 'readonly',
        password: 'pass',
        database: 'mydb',
        permissions: {},
      });

      expect(script).toContain("CREATE USER IF NOT EXISTS 'readonly'@'%'");
      expect(script).toContain("GRANT SELECT, SHOW VIEW, TRIGGER, EVENT ON `mydb`.*");
      expect(script).not.toContain("GRANT ALTER, CREATE, DROP");
      expect(script).not.toContain("GRANT CREATE VIEW");
      expect(script).not.toContain("GRANT ALTER ROUTINE");
    });

    it('should sanitize quotes from inputs', async () => {
      const script = await driver.generateUserSetupScript({
        username: "user'inject",
        password: "pass'word",
        database: 'my`db',
        host: "host'bad",
        permissions: {},
      });

      expect(script).not.toContain("'inject");
      expect(script).toContain("userinject");
      expect(script).toContain("password");
      expect(script).toContain("hostbad");
      expect(script).toContain("`mydb`");
    });

    it('should use defaults when database and host are missing', async () => {
      const script = await driver.generateUserSetupScript({
        username: 'testuser',
        permissions: {},
      });

      expect(script).toContain("`default`");
      expect(script).toContain("'%'");
    });
  });

  describe('getIntrospectionService', () => {
    it('should return an introspection service instance', () => {
      const service = driver.getIntrospectionService();
      expect(service).toBeDefined();
      expect(service.listTables).toBeDefined();
    });

    it('should cache and return the same instance', () => {
      const service1 = driver.getIntrospectionService();
      const service2 = driver.getIntrospectionService();
      expect(service1).toBe(service2);
    });
  });

  describe('getMonitoringService', () => {
    it('should return a monitoring service instance', () => {
      const service = driver.getMonitoringService();
      expect(service).toBeDefined();
      expect(service.getProcessList).toBeDefined();
    });

    it('should cache and return the same instance', () => {
      const service1 = driver.getMonitoringService();
      const service2 = driver.getMonitoringService();
      expect(service1).toBe(service2);
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

  describe('setForeignKeyChecks', () => {
    it('should enable foreign key checks', async () => {
      await driver.connect();
      await driver.setForeignKeyChecks(true);
      expect(mockConnection.query).toHaveBeenCalledWith('SET FOREIGN_KEY_CHECKS = 1;', []);
    });

    it('should disable foreign key checks', async () => {
      await driver.connect();
      await driver.setForeignKeyChecks(false);
      expect(mockConnection.query).toHaveBeenCalledWith('SET FOREIGN_KEY_CHECKS = 0;', []);
    });
  });

  describe('disconnect edge cases', () => {
    it('should not throw when disconnect called without connect', async () => {
      await expect(driver.disconnect()).resolves.not.toThrow();
    });
  });
});

