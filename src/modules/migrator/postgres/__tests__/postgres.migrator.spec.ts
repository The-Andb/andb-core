import { PostgresMigrator } from '../postgres.migrator';
import { ITableDiff, IObjectDiff } from '../../../../common/interfaces/diff.interface';

describe('PostgresMigrator', () => {
  let migrator: PostgresMigrator;

  beforeEach(() => {
    migrator = new PostgresMigrator();
  });

  describe('generateTableAlterSQL', () => {
    it('should handle ADD COLUMN', () => {
      const diff: ITableDiff = {
        tableName: 'users',
        hasChanges: true,
        operations: [
          { type: 'ADD', target: 'COLUMN', name: 'age', definition: 'INT NOT NULL' }
        ]
      };

      const sqls = migrator.generateTableAlterSQL(diff);
      expect(sqls.length).toBe(1);
      expect(sqls[0]).toBe('ALTER TABLE "users"\n  ADD COLUMN "age" INT NOT NULL;');
    });

    it('should handle DROP COLUMN', () => {
      const diff: ITableDiff = {
        tableName: 'users',
        hasChanges: true,
        operations: [
          { type: 'DROP', target: 'COLUMN', name: 'old_col' }
        ]
      };

      const sqls = migrator.generateTableAlterSQL(diff);
      expect(sqls.length).toBe(1);
      expect(sqls[0]).toBe('ALTER TABLE "users"\n  DROP COLUMN "old_col";');
    });

    it('should handle MODIFY COLUMN type and nullability', () => {
      const diff: ITableDiff = {
        tableName: 'users',
        hasChanges: true,
        operations: [
          { type: 'MODIFY', target: 'COLUMN', name: 'status', definition: 'VARCHAR(255) NOT NULL DEFAULT \'active\'' }
        ]
      };

      const sqls = migrator.generateTableAlterSQL(diff);
      expect(sqls.length).toBe(1);
      const expectedSql = `ALTER TABLE "users"
  ALTER COLUMN "status" TYPE VARCHAR(255) USING "status"::VARCHAR(255),
  ALTER COLUMN "status" SET NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'active';`;
      expect(sqls[0]).toBe(expectedSql);
    });

    it('should separate CREATE INDEX from ALTER TABLE', () => {
      const diff: ITableDiff = {
        tableName: 'users',
        hasChanges: true,
        operations: [
          { type: 'ADD', target: 'COLUMN', name: 'email', definition: 'VARCHAR(255)' },
          { type: 'ADD', target: 'INDEX', name: 'idx_email', definition: 'CREATE INDEX "idx_email" ON "users" ("email")' }
        ]
      };

      const sqls = migrator.generateTableAlterSQL(diff);
      expect(sqls.length).toBe(2);
      expect(sqls[0]).toBe('ALTER TABLE "users"\n  ADD COLUMN "email" VARCHAR(255);');
      expect(sqls[1]).toBe('CREATE INDEX "idx_email" ON "users" ("email");');
    });

    it('should handle DROP INDEX', () => {
      const diff: ITableDiff = {
        tableName: 'users',
        hasChanges: true,
        operations: [
          { type: 'DROP', target: 'INDEX', name: 'idx_old' }
        ]
      };

      const sqls = migrator.generateTableAlterSQL(diff);
      expect(sqls.length).toBe(1);
      expect(sqls[0]).toBe('DROP INDEX IF EXISTS "idx_old";');
    });

    it('should handle PRIMARY KEY drop', () => {
      const diff: ITableDiff = {
        tableName: 'users',
        hasChanges: true,
        operations: [
          { type: 'DROP', target: 'INDEX', name: 'PRIMARY' }
        ]
      };

      const sqls = migrator.generateTableAlterSQL(diff);
      expect(sqls.length).toBe(1);
      expect(sqls[0]).toBe('ALTER TABLE "users"\n  DROP CONSTRAINT IF EXISTS "users_pkey";');
    });
  });

  describe('generateObjectSQL', () => {
    it('should prepend OR REPLACE if operation is REPLACE', () => {
      const diff: IObjectDiff = {
        type: 'FUNCTION',
        name: 'my_func',
        operation: 'REPLACE',
        definition: 'CREATE FUNCTION my_func() RETURNS INT'
      };

      const sqls = migrator.generateObjectSQL(diff);
      expect(sqls[0]).toBe('CREATE OR REPLACE FUNCTION my_func() RETURNS INT;');
    });

    it('should generate DROP CASCADE for objects', () => {
      const diff: IObjectDiff = {
        type: 'VIEW',
        name: 'v_old',
        operation: 'DROP',
      };

      const sqls = migrator.generateObjectSQL(diff);
      expect(sqls).toEqual(['DROP VIEW IF EXISTS "v_old" CASCADE;']);
    });
    
    it('should handle TRIGGER drop logic', () => {
      const diff: IObjectDiff = {
        type: 'TRIGGER',
        name: 't1',
        operation: 'DROP',
      };

      const sqls = migrator.generateObjectSQL(diff);
      expect(sqls[0]).toBe('DROP TRIGGER IF EXISTS "t1" ON "unknown_table_fallback" CASCADE;');
    });
  });
});
