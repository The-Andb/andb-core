import { IDiffOperation, ITableDiff, IObjectDiff } from '../../../common/interfaces/diff.interface';

export class MysqlMigrator {
  generateObjectSQL(diff: IObjectDiff): string[] {
    const { type, name, operation, definition } = diff;
    const statements: string[] = [];

    if (operation === 'DROP' || operation === 'REPLACE') {
      statements.push(`DROP ${type} IF EXISTS \`${name}\`;`);
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

    // Group columns by add, modify, drop to generate efficient SQL
    const addColumns = operations.filter(
      (op: IDiffOperation) => op.type === 'ADD' && op.target === 'COLUMN',
    );
    const modifyColumns = operations.filter(
      (op: IDiffOperation) => op.type === 'MODIFY' && op.target === 'COLUMN',
    );
    const dropColumns = operations.filter(
      (op: IDiffOperation) => op.type === 'DROP' && op.target === 'COLUMN',
    );

    const addIndexes = operations.filter(
      (op: IDiffOperation) => op.type === 'ADD' && op.target === 'INDEX',
    );
    const dropIndexes = operations.filter(
      (op: IDiffOperation) => op.type === 'DROP' && op.target === 'INDEX',
    );

    const addForeignKeys = operations.filter(
      (op: IDiffOperation) => op.type === 'ADD' && op.target === 'FOREIGN_KEY',
    );
    const dropForeignKeys = operations.filter(
      (op: IDiffOperation) => op.type === 'DROP' && op.target === 'FOREIGN_KEY',
    );

    // MySQL quirk: Cannot DROP and ADD a FK with the same name in a single ALTER TABLE.
    // MySQL validates constraint names before processing drops within the same statement.
    // Solution: If any FK name appears in both DROP and ADD, split into two ALTER statements.
    const dropFkNames = new Set(dropForeignKeys.map((op: IDiffOperation) => op.name));
    const hasFkModification = addForeignKeys.some((op: IDiffOperation) => dropFkNames.has(op.name));

    const clauses: string[] = [];
    const addFkClauses: string[] = [];

    // Drops
    dropForeignKeys.forEach((op: IDiffOperation) =>
      clauses.push(`DROP FOREIGN KEY \`${op.name}\``),
    );
    dropIndexes.forEach((op: IDiffOperation) => {
      if (op.name === 'PRIMARY') {
        clauses.push('DROP PRIMARY KEY');
      } else {
        clauses.push(`DROP INDEX \`${op.name}\``);
      }
    });
    dropColumns.forEach((op: IDiffOperation) => clauses.push(`DROP COLUMN \`${op.name}\``));

    // Modifies
    modifyColumns.forEach((op: IDiffOperation) => {
      // Legacy logic cleanup: remove DEFAULT NULL, trailing comma
      let def = op.definition!.replace(/ DEFAULT NULL/gi, '').replace(/,$/, '');
      if (!def.startsWith('\`')) {
        def = '\`' + op.name + '\` ' + def;
      }
      clauses.push(`MODIFY COLUMN ${def}`);
    });

    addColumns.forEach((op: IDiffOperation) => {
      let def = op.definition!;
      if (!def.startsWith('\`')) {
        def = '\`' + op.name + '\` ' + def;
      }
      clauses.push(`ADD COLUMN ${def}`);
    });

    addIndexes.forEach((op: IDiffOperation) => {
      // Comparator srcDef: "KEY `idx` (`col`)"
      clauses.push(`ADD ${op.definition}`);
    });

    // FK Adds: put in separate statement if modification detected
    if (hasFkModification) {
      addForeignKeys.forEach((op: IDiffOperation) => {
        addFkClauses.push(`ADD ${op.definition}`);
      });
    } else {
      addForeignKeys.forEach((op: IDiffOperation) => {
        clauses.push(`ADD ${op.definition}`);
      });
    }

    if (clauses.length > 0) {
      const sql = `ALTER TABLE \`${tableName}\` ${clauses.join(', ')};`;
      statements.push(sql);
    }

    // Second ALTER for FK adds (only when modifying FKs)
    if (addFkClauses.length > 0) {
      const sql = `ALTER TABLE \`${tableName}\` ${addFkClauses.join(', ')};`;
      statements.push(sql);
    }

    return statements;
  }
}
