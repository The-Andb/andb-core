import { MysqlMigrator } from '../mysql.migrator';
import { ITableDiff, IObjectDiff } from '../../../../common/interfaces/diff.interface';

describe('MysqlMigrator', () => {
  let migrator: MysqlMigrator;

  beforeEach(() => {
    migrator = new MysqlMigrator();
  });

  describe('generateTableAlterSQL', () => {
    it('should group multiple operations into a single ALTER TABLE', () => {
      const diff: ITableDiff = {
        tableName: 'users',
        hasChanges: true,
        operations: [
          { type: 'ADD', target: 'COLUMN', name: 'age', definition: 'int' },
          { type: 'DROP', target: 'COLUMN', name: 'old_col' }
        ]
      };

      const sqls = migrator.generateTableAlterSQL(diff);
      expect(sqls.length).toBe(1);
      expect(sqls[0]).toBe('ALTER TABLE `users` DROP COLUMN `old_col`, ADD COLUMN `age` int;');
    });

    it('should split ALTER TABLE when modifying a foreign key with same name', () => {
      const diff: ITableDiff = {
        tableName: 'users',
        hasChanges: true,
        operations: [
          { type: 'DROP', target: 'FOREIGN_KEY', name: 'fk_role' },
          { type: 'ADD', target: 'FOREIGN_KEY', name: 'fk_role', definition: 'CONSTRAINT `fk_role` FOREIGN KEY (`r_id`) REFERENCES roles(`id`)' }
        ]
      };

      const sqls = migrator.generateTableAlterSQL(diff);
      expect(sqls.length).toBe(2);
      expect(sqls[0]).toBe('ALTER TABLE `users` DROP FOREIGN KEY `fk_role`;');
      expect(sqls[1]).toBe('ALTER TABLE `users` ADD CONSTRAINT `fk_role` FOREIGN KEY (`r_id`) REFERENCES roles(`id`);');
    });

    it('should handle primary key drop and add', () => {
      const diff: ITableDiff = {
        tableName: 'users',
        hasChanges: true,
        operations: [
          { type: 'DROP', target: 'INDEX', name: 'PRIMARY' },
          { type: 'ADD', target: 'INDEX', name: 'PRIMARY', definition: 'PRIMARY KEY (`new_id`)' }
        ]
      };

      const sqls = migrator.generateTableAlterSQL(diff);
      expect(sqls[0]).toBe('ALTER TABLE `users` DROP PRIMARY KEY, ADD PRIMARY KEY (`new_id`);');
    });
  });

  describe('generateObjectSQL', () => {
    it('should generate REPLACE logic (DROP then CREATE)', () => {
      const diff: IObjectDiff = {
        type: 'PROCEDURE',
        name: 'my_proc',
        operation: 'REPLACE',
        definition: 'CREATE PROCEDURE my_proc() BEGIN END'
      };

      const sqls = migrator.generateObjectSQL(diff);
      expect(sqls).toEqual([
        'DROP PROCEDURE IF EXISTS `my_proc`;',
        'CREATE PROCEDURE my_proc() BEGIN END;'
      ]);
    });

    it('should generate DROP only for DROP operation', () => {
      const diff: IObjectDiff = {
        type: 'VIEW',
        name: 'v_old',
        operation: 'DROP',
      };

      const sqls = migrator.generateObjectSQL(diff);
      expect(sqls).toEqual(['DROP VIEW IF EXISTS `v_old`;']);
    });

    it('should generate CREATE only for CREATE operation', () => {
      const diff: IObjectDiff = {
        type: 'FUNCTION',
        name: 'fn_new',
        operation: 'CREATE',
        definition: 'CREATE FUNCTION fn_new() RETURNS INT BEGIN RETURN 1; END;'
      };

      const sqls = migrator.generateObjectSQL(diff);
      expect(sqls.length).toBe(1);
      expect(sqls[0]).toContain('CREATE FUNCTION fn_new');
    });

    it('should not duplicate trailing semicolon', () => {
      const diff: IObjectDiff = {
        type: 'TRIGGER',
        name: 't1',
        operation: 'CREATE',
        definition: 'CREATE TRIGGER t1 AFTER INSERT ON users FOR EACH ROW BEGIN END;'
      };

      const sqls = migrator.generateObjectSQL(diff);
      expect(sqls[0]).toBe('CREATE TRIGGER t1 AFTER INSERT ON users FOR EACH ROW BEGIN END;');
      expect(sqls[0].endsWith(';;')).toBe(false);
    });
  });

  describe('generateTableAlterSQL edge cases', () => {
    it('should return empty array for no changes', () => {
      const diff: ITableDiff = {
        tableName: 'users',
        hasChanges: false,
        operations: []
      };

      expect(migrator.generateTableAlterSQL(diff)).toEqual([]);
    });

    it('should return empty array for hasChanges but empty operations', () => {
      const diff: ITableDiff = {
        tableName: 'users',
        hasChanges: true,
        operations: []
      };

      expect(migrator.generateTableAlterSQL(diff)).toEqual([]);
    });

    it('should handle index additions', () => {
      const diff: ITableDiff = {
        tableName: 'users',
        hasChanges: true,
        operations: [
          { type: 'ADD', target: 'INDEX', name: 'idx_name', definition: 'KEY `idx_name` (`name`)' }
        ]
      };

      const sqls = migrator.generateTableAlterSQL(diff);
      expect(sqls[0]).toContain('ADD KEY `idx_name` (`name`)');
    });

    it('should handle column MODIFY with definition normalization', () => {
      const diff: ITableDiff = {
        tableName: 'users',
        hasChanges: true,
        operations: [
          { type: 'MODIFY', target: 'COLUMN', name: 'name', definition: '`name` varchar(100) DEFAULT NULL,' }
        ]
      };

      const sqls = migrator.generateTableAlterSQL(diff);
      expect(sqls[0]).toContain('MODIFY COLUMN `name` varchar(100)');
      expect(sqls[0]).not.toContain('DEFAULT NULL');
    });

    it('should handle FK ADD without same-name conflict (single ALTER)', () => {
      const diff: ITableDiff = {
        tableName: 'users',
        hasChanges: true,
        operations: [
          { type: 'ADD', target: 'FOREIGN_KEY', name: 'fk_new', definition: 'CONSTRAINT `fk_new` FOREIGN KEY (`r`) REFERENCES r(`id`)' }
        ]
      };

      const sqls = migrator.generateTableAlterSQL(diff);
      expect(sqls.length).toBe(1);
      expect(sqls[0]).toContain('ADD CONSTRAINT `fk_new`');
    });

    it('should handle DROP INDEX that is not PRIMARY', () => {
      const diff: ITableDiff = {
        tableName: 'users',
        hasChanges: true,
        operations: [
          { type: 'DROP', target: 'INDEX', name: 'idx_email' }
        ]
      };

      const sqls = migrator.generateTableAlterSQL(diff);
      expect(sqls[0]).toContain('DROP INDEX `idx_email`');
    });
  });
});

