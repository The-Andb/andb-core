import { IDiffOperation, ITableDiff, IObjectDiff } from '../../../common/interfaces/diff.interface';
import { IMigrator } from '../../../common/interfaces/driver.interface';

export class SqliteMigrator implements IMigrator {
  generateObjectSQL(diff: IObjectDiff): string[] {
    const { type, name, operation, definition } = diff;
    const statements: string[] = [];

    if (operation === 'DROP' || operation === 'REPLACE') {
      statements.push(`DROP ${type} IF EXISTS "${name}";`);
    }

    if ((operation === 'CREATE' || operation === 'REPLACE') && definition) {
      statements.push(definition.endsWith(';') ? definition : definition + ';');
    }

    return statements;
  }

  generateTableAlterSQL(diff: ITableDiff): string[] {
    if (!diff.hasChanges || diff.operations.length === 0) {
      return [];
    }

    const { tableName, operations } = diff;
    const statements: string[] = [];

    const addColumns = operations.filter((op: IDiffOperation) => op.type === 'ADD' && op.target === 'COLUMN');
    const dropColumns = operations.filter((op: IDiffOperation) => op.type === 'DROP' && op.target === 'COLUMN');
    const modifyColumns = operations.filter((op: IDiffOperation) => op.type === 'MODIFY' && op.target === 'COLUMN');

    const addIndexes = operations.filter((op: IDiffOperation) => op.type === 'ADD' && op.target === 'INDEX');
    const dropIndexes = operations.filter((op: IDiffOperation) => op.type === 'DROP' && op.target === 'INDEX');

    // SQLite typically requires separate ALTER TABLE statements for each operation.
    // ADD COLUMN
    addColumns.forEach((op: IDiffOperation) => {
      statements.push(`ALTER TABLE "${tableName}" ADD COLUMN ${op.definition};`);
    });

    // DROP COLUMN (Supported in SQLite 3.35.0+)
    dropColumns.forEach((op: IDiffOperation) => {
      statements.push(`ALTER TABLE "${tableName}" DROP COLUMN "${op.name}";`);
    });

    // MODIFY COLUMN is not directly supported by SQLite ALTER TABLE.
    modifyColumns.forEach((op: IDiffOperation) => {
      statements.push(`-- WARNING: SQLite does not support MODIFY COLUMN natively. Table recreation is required to modify column "${op.name}".`);
    });

    // DROP INDEX
    dropIndexes.forEach((op: IDiffOperation) => {
         statements.push(`DROP INDEX IF EXISTS "${op.name}";`);
    });

    // ADD INDEX
    addIndexes.forEach((op: IDiffOperation) => {
      statements.push(op.definition!.endsWith(';') ? op.definition! : op.definition! + ';');
    });

    return statements;
  }

  isNotMigrateCondition(name: string): boolean {
    const n = name.toLowerCase();
    if (n.includes('test')) return true;
    if (n.startsWith('sqlite_')) return true;
    return false;
  }

  disableForeignKeyChecks(): string {
    return 'PRAGMA foreign_keys = OFF;';
  }

  enableForeignKeyChecks(): string {
    return 'PRAGMA foreign_keys = ON;';
  }
}
