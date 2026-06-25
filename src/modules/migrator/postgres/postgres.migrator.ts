import { IDiffOperation, ITableDiff, IObjectDiff } from '../../../common/interfaces/diff.interface';

export class PostgresMigrator {
  cleanDefiner(ddl: string): string {
    // Postgres does not use MySQL-style DEFINER=...
    return ddl;
  }

  generateObjectSQL(diff: IObjectDiff): string[] {
    const { type, name, operation, definition } = diff;
    const statements: string[] = [];

    // In Postgres, CREATE OR REPLACE is valid for VIEW, FUNCTION, PROCEDURE, RULE
    // But for TRIGGER, we usually drop and recreate.
    if (type.toUpperCase() === 'TRIGGER') {
      if (operation === 'DROP' || operation === 'REPLACE') {
        statements.push(`DROP TRIGGER IF EXISTS "${name}" ON "unknown_table_fallback" CASCADE;`); // Note: We might need table name for proper drop trigger in PG
      }
      if ((operation === 'CREATE' || operation === 'REPLACE') && definition) {
        statements.push(definition.endsWith(';') ? definition : definition + ';');
      }
      return statements;
    }

    if (operation === 'DROP') {
      statements.push(`DROP ${type} IF EXISTS "${name}" CASCADE;`);
    } else if (operation === 'REPLACE' || operation === 'CREATE') {
      if (definition) {
        // Just use the definition. It should ideally be CREATE OR REPLACE.
        // If not, we might need to prepend OR REPLACE manually, but introspection usually returns CREATE OR REPLACE.
        let sql = definition;
        if (operation === 'REPLACE' && !sql.toUpperCase().includes('OR REPLACE')) {
           sql = sql.replace(/^CREATE\s+/i, 'CREATE OR REPLACE ');
        }
        statements.push(sql.endsWith(';') ? sql : sql + ';');
      }
    }

    return statements;
  }

  generateTableAlterSQL(diff: ITableDiff): string[] {
    if (!diff.hasChanges || diff.operations.length === 0) {
      return [];
    }

    const { tableName, operations } = diff;
    const statements: string[] = [];
    const alterTableClauses: string[] = [];
    const indexStatements: string[] = [];

    operations.forEach((op: IDiffOperation) => {
      const target = op.target?.toUpperCase();
      const opType = op.type?.toUpperCase();

      if (target === 'COLUMN') {
        if (opType === 'ADD') {
          let def = op.definition || '';
          if (!def.startsWith('"') && !def.toLowerCase().startsWith(op.name.toLowerCase())) {
            def = `"${op.name}" ${def}`;
          }
          alterTableClauses.push(`ADD COLUMN ${def}`);
        } else if (opType === 'DROP') {
          alterTableClauses.push(`DROP COLUMN "${op.name}"`);
        } else if (opType === 'MODIFY') {
          const def = op.definition || '';
          
          let typeStr = def;
          const notNullMatch = def.match(/NOT NULL/i);
          const nullMatch = def.match(/\bNULL\b/i);
          const defaultMatch = def.match(/DEFAULT\s+(.+)$/i);

          if (defaultMatch) {
            typeStr = typeStr.replace(defaultMatch[0], '');
          }
          if (notNullMatch) {
            typeStr = typeStr.replace(notNullMatch[0], '');
          } else if (nullMatch) {
            typeStr = typeStr.replace(nullMatch[0], '');
          }

          typeStr = typeStr.trim();

          if (typeStr) {
            // Using USING clause to auto-cast if possible
            alterTableClauses.push(`ALTER COLUMN "${op.name}" TYPE ${typeStr} USING "${op.name}"::${typeStr.split(' ')[0]}`);
          }

          if (notNullMatch) {
            alterTableClauses.push(`ALTER COLUMN "${op.name}" SET NOT NULL`);
          } else {
            alterTableClauses.push(`ALTER COLUMN "${op.name}" DROP NOT NULL`);
          }

          if (defaultMatch) {
            alterTableClauses.push(`ALTER COLUMN "${op.name}" SET DEFAULT ${defaultMatch[1].trim()}`);
          } else {
            alterTableClauses.push(`ALTER COLUMN "${op.name}" DROP DEFAULT`);
          }
        }
      } else if (target === 'INDEX') {
        if (opType === 'ADD') {
          // Add index is a separate statement in Postgres
          let def = op.definition || '';
          if (!def.toUpperCase().startsWith('CREATE')) {
            // Reconstruct CREATE INDEX
            def = `CREATE INDEX "${op.name}" ON "${tableName}" ${def}`;
          }
          indexStatements.push(def.endsWith(';') ? def : def + ';');
        } else if (opType === 'DROP') {
          if (op.name === 'PRIMARY') {
            alterTableClauses.push(`DROP CONSTRAINT IF EXISTS "${tableName}_pkey"`); // Postgres standard PK naming
          } else {
            indexStatements.push(`DROP INDEX IF EXISTS "${op.name}";`);
          }
        }
      } else if (target === 'FOREIGN_KEY') {
        if (opType === 'ADD') {
          let def = op.definition || '';
          if (!def.toUpperCase().includes('CONSTRAINT')) {
             def = `CONSTRAINT "${op.name}" ${def}`;
          }
          alterTableClauses.push(`ADD ${def}`);
        } else if (opType === 'DROP') {
          alterTableClauses.push(`DROP CONSTRAINT IF EXISTS "${op.name}"`);
        }
      }
    });

    if (alterTableClauses.length > 0) {
      statements.push(`ALTER TABLE "${tableName}"\n  ${alterTableClauses.join(',\n  ')};`);
    }

    if (indexStatements.length > 0) {
      statements.push(...indexStatements);
    }

    return statements;
  }

  isNotMigrateCondition(name: string): boolean {
    const n = name.toLowerCase();
    if (n.includes('ote_')) return true; 
    if (n.startsWith('pt_')) return true; 
    if (n.includes('test')) return true; 
    return false;
  }

  disableForeignKeyChecks(): string {
    return "SET session_replication_role = 'replica';";
  }

  enableForeignKeyChecks(): string {
    return "SET session_replication_role = 'origin';";
  }
}
