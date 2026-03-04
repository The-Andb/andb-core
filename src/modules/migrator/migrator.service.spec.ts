import { MigratorService } from './migrator.service';
import { ITableDiff, ISchemaDiff, IObjectDiff } from '../../common/interfaces/diff.interface';

import { MysqlMigrator } from './mysql/mysql.migrator';

describe('MigratorService', () => {
  let service: MigratorService;
  let defaultMigrator: MysqlMigrator;

  beforeEach(() => {
    service = new MigratorService();
    defaultMigrator = new MysqlMigrator();
  });

  describe('generateSchemaSQL', () => {
    it('should generate DROP TABLE for dropped tables', () => {
      const schemaDiff: ISchemaDiff = {
        tables: {},
        droppedTables: ['old_table'],
        objects: [],
        summary: { totalChanges: 1, tablesChanged: 0, objectsChanged: 0 }
      };

      const sqls = service.generateSchemaSQL(schemaDiff, defaultMigrator);
      expect(sqls).toContain('DROP TABLE IF EXISTS `old_table`;');
    });

    it('should generate ALTER TABLE for table changes', () => {
      const schemaDiff: ISchemaDiff = {
        tables: {
          users: {
            tableName: 'users',
            hasChanges: true,
            operations: [{ type: 'ADD', target: 'COLUMN', name: 'age', definition: 'int AFTER id' }]
          }
        },
        droppedTables: [],
        objects: [],
        summary: { totalChanges: 1, tablesChanged: 1, objectsChanged: 0 }
      };

      const sqls = service.generateSchemaSQL(schemaDiff, defaultMigrator);
      expect(sqls[0]).toContain('ALTER TABLE `users`\n  ADD COLUMN `age` int AFTER id');
    });

    it('should handle generic object lifecycle (DROP before CREATE)', () => {
      const schemaDiff: ISchemaDiff = {
        tables: {},
        droppedTables: [],
        objects: [
          { type: 'VIEW', name: 'v_users', operation: 'DROP' },
          { type: 'VIEW', name: 'v_users', operation: 'CREATE', definition: 'CREATE VIEW v_users AS SELECT 1' }
        ],
        summary: { totalChanges: 2, tablesChanged: 0, objectsChanged: 2 }
      };

      const sqls = service.generateSchemaSQL(schemaDiff, defaultMigrator);
      expect(sqls[0]).toBe('DROP VIEW IF EXISTS `v_users`;');
      expect(sqls[1]).toContain('CREATE VIEW v_users AS SELECT 1');
    });
  });

  describe('generateAlterSQL', () => {
    it('should delegate to migrator.generateTableAlterSQL', () => {
      const diff: ITableDiff = {
        tableName: 'users',
        hasChanges: true,
        operations: [{ type: 'ADD', target: 'COLUMN', name: 'age', definition: 'int' }]
      };

      const sqls = service.generateAlterSQL(diff, defaultMigrator);
      expect(sqls.length).toBe(1);
      expect(sqls[0]).toContain('ADD COLUMN `age` int');
    });

    it('should return empty for no changes', () => {
      const diff: ITableDiff = {
        tableName: 'users',
        hasChanges: false,
        operations: []
      };

      expect(service.generateAlterSQL(diff, defaultMigrator)).toEqual([]);
    });
  });

  describe('Safety Analysis', () => {
    it('should classify DROP TABLE as CRITICAL', () => {
      expect(service.getSafetyLevel('DROP TABLE users')).toBe('CRITICAL');
      expect(service.getSafetyLevel('truncate table logs')).toBe('CRITICAL');
    });

    it('should classify DROP COLUMN/MODIFY as WARNING', () => {
      expect(service.getSafetyLevel('ALTER TABLE users DROP COLUMN age')).toBe('WARNING');
      expect(service.getSafetyLevel('ALTER TABLE users MODIFY COLUMN name varchar(255)')).toBe('WARNING');
    });

    it('should classify ADD COLUMN as SAFE', () => {
      expect(service.getSafetyLevel('ALTER TABLE users ADD COLUMN age int')).toBe('SAFE');
      expect(service.getSafetyLevel('CREATE TABLE new_table (id int)')).toBe('SAFE');
    });

    it('should generate a structured safety report', () => {
      const statements = [
        'CREATE TABLE test (id int)',
        'ALTER TABLE users DROP COLUMN age',
        'DROP TABLE legacy_data'
      ];
      const report = service.getSafetyReport(statements);

      expect(report.level).toBe('CRITICAL');
      expect(report.summary.critical).toHaveLength(1);
      expect(report.summary.warning).toHaveLength(1);
      expect(report.summary.safe).toHaveLength(1);
      expect(report.hasDestructive).toBe(true);
    });
  });
});

