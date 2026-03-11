import { FileDriver } from '../file.driver';
import { IDatabaseConfig } from '../../../../common/interfaces/driver.interface';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');

describe('FileDriver', () => {
  let driver: FileDriver;
  let mockConfig: IDatabaseConfig;
  const mockBasePath = '/mock/db';

  beforeEach(() => {
    mockConfig = {
      path: mockBasePath,
    };
    driver = new FileDriver(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should throw if path is missing', async () => {
      driver = new FileDriver({} as any);
      await expect(driver.connect()).rejects.toThrow('File path is required');
    });

    it('should throw if path does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      await expect(driver.connect()).rejects.toThrow('Base path for files not found');
    });

    it('should connect if path exists', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      await expect(driver.connect()).resolves.not.toThrow();
    });
  });

  describe('introspection', () => {
    beforeEach(async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      await driver.connect();
    });

    it('should list objects in a folder', async () => {
      const folder = 'tables';
      const mockFiles = ['user.sql', 'post.sql', 'readme.txt'];
      (fs.readdirSync as jest.Mock).mockReturnValue(mockFiles);

      const objects = await driver.listObjects(folder);
      expect(objects).toEqual(['user', 'post']);
      expect(fs.readdirSync).toHaveBeenCalledWith(path.join(mockBasePath, folder));
    });

    it('should read object content', async () => {
      const folder = 'procedures';
      const name = 'get_user';
      const mockContent = 'CREATE PROCEDURE get_user() BEGIN END;';
      (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

      const content = await driver.readObject(folder, name);
      expect(content).toBe(mockContent);
      expect(fs.readFileSync).toHaveBeenCalledWith(
        path.join(mockBasePath, folder, `${name}.sql`),
        'utf8'
      );
    });

    it('should return empty string if file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockImplementation((p: string) => {
        if (p === mockBasePath) return true;
        return false;
      });
      const content = await driver.readObject('tables', 'missing');
      expect(content).toBe('');
    });
  });

  describe('IntrospectionService Integration', () => {
    let service: any;
    beforeEach(async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      await driver.connect();
      service = driver.getIntrospectionService();
    });

    it('should list tables correctly', async () => {
      (fs.readdirSync as jest.Mock).mockReturnValue(['users.sql']);
      const tables = await service.listTables('any_db');
      expect(tables).toEqual(['users']);
    });

    it('should get table DDL correctly', async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue('CREATE TABLE users');
      const ddl = await service.getTableDDL('any_db', 'users');
      expect(ddl).toBe('CREATE TABLE users');
    });
  });
});
