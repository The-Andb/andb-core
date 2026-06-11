import { ParserService } from './parser.service';

export class DialectTranslatorService {
  constructor(private readonly parser: ParserService = new ParserService()) {}

  /**
   * Translate DDL from source dialect to target dialect
   */
  translateTable(sourceDDL: string, fromDialect: string = 'mysql', toDialect: string = 'postgres'): string {
    if (!sourceDDL) return '';
    
    const parsed = this.parser.parseTableDetailed(sourceDDL, fromDialect);
    if (!parsed) {
      throw new Error(`Failed to parse source DDL for translation.`);
    }

    const targetDialect = toDialect.toLowerCase();
    if (targetDialect === 'postgres' || targetDialect === 'postgresql') {
      return this.toPostgres(parsed);
    } else if (targetDialect === 'sqlite') {
      return this.toSqlite(parsed);
    } else if (['mssql', 'sqlserver', 'oracle', 'mariadb', 'snowflake', 'clickhouse'].includes(targetDialect)) {
      throw new Error(`Dialect translation to target "${toDialect}" is under development (Coming Soon).`);
    }

    throw new Error(`Unsupported target dialect: "${toDialect}"`);
  }

  /**
   * Compile parsed table representation into PostgreSQL syntax
   */
  private toPostgres(parsed: any): string {
    const lines: string[] = [];
    const tableName = parsed.tableName;
    const postTableStatements: string[] = [];

    // Header
    lines.push(`CREATE TABLE "${tableName}" (`);

    const definitions: string[] = [];

    // Columns
    for (const col of parsed.columns) {
      const upperType = col.type.toUpperCase();
      const isEnum = upperType.startsWith('ENUM') || (col.definition && col.definition.toUpperCase().startsWith('ENUM'));
      const isSet = upperType.startsWith('SET') || (col.definition && col.definition.toUpperCase().startsWith('SET'));

      let pgType = this.mapTypeToPostgres(col.type, col.autoIncrement);
      if (isEnum || isSet) pgType = 'VARCHAR(255)';

      let colDef = `  "${col.name}" ${pgType}`;

      // Default & Nullability
      if (!pgType.includes('SERIAL')) {
        if (col.notNull) {
          colDef += ' NOT NULL';
        }
        if (col.default !== null && col.default !== undefined) {
          colDef += ` DEFAULT ${this.mapDefaultValueToPostgres(col.default, pgType)}`;
        }
      } else {
        if (col.notNull) {
          colDef += ' NOT NULL';
        }
      }

      // Check Constraint for ENUM/SET fallback
      if (isEnum || isSet) {
        const defStr = col.definition || '';
        const match = defStr.match(/\(([^)]+)\)/);
        if (match) {
          const values = match[1];
          colDef += ` CHECK ("${col.name}" IN (${values}))`;
        }
      }

      definitions.push(colDef);
    }

    // Primary Key (if exists and not handled by SERIAL implicitly, though standard PK constraint is preferred)
    const pkCols = parsed.columns.filter((c: any) => c.pk).map((c: any) => `"${c.name}"`);
    if (pkCols.length > 0) {
      definitions.push(`  CONSTRAINT "${tableName}_pkey" PRIMARY KEY (${pkCols.join(', ')})`);
    }

    // Foreign Keys
    if (Array.isArray(parsed.foreignKeys)) {
      for (const fk of parsed.foreignKeys) {
        const name = fk.name || `${tableName}_${fk.columns[0]}_fkey`;
        const localCols = fk.columns.map((c: string) => `"${c}"`).join(', ');
        const refCols = fk.referencedColumns.map((c: string) => `"${c}"`).join(', ');
        let fkDef = `  CONSTRAINT "${name}" FOREIGN KEY (${localCols}) REFERENCES "${fk.referencedTable}" (${refCols})`;
        if (fk.onDelete) fkDef += ` ON DELETE ${fk.onDelete.toUpperCase()}`;
        if (fk.onUpdate) fkDef += ` ON UPDATE ${fk.onUpdate.toUpperCase()}`;
        definitions.push(fkDef);
      }
    }

    lines.push(definitions.join(',\n'));
    lines.push(');');

    // Separate CREATE INDEX statements (PostgreSQL standard)
    if (Array.isArray(parsed.indexes)) {
      for (const idx of parsed.indexes) {
        // Skip primary key as it is handled in CREATE TABLE
        if (idx.type === 'PRIMARY') continue;

        const idxName = idx.name || `${tableName}_${idx.columns.join('_')}_idx`;
        const isUnique = idx.type === 'UNIQUE';
        const cols = idx.columns.map((c: string) => `"${c}"`).join(', ');
        
        const uniqueKeyword = isUnique ? 'UNIQUE ' : '';
        postTableStatements.push(`CREATE ${uniqueKeyword}INDEX "${idxName}" ON "${tableName}" (${cols});`);
      }
    }

    // Comments translation (PostgreSQL standard uses separate COMMENT ON statements)
    for (const col of parsed.columns) {
      if (col.comment) {
        const escapedComment = col.comment.replace(/'/g, "''");
        postTableStatements.push(`COMMENT ON COLUMN "${tableName}"."${col.name}" IS '${escapedComment}';`);
      }
    }

    let result = lines.join('\n');
    if (postTableStatements.length > 0) {
      result += '\n\n' + postTableStatements.join('\n');
    }

    return result;
  }

  /**
   * Compile parsed table representation into SQLite syntax
   */
  private toSqlite(parsed: any): string {
    const lines: string[] = [];
    const tableName = parsed.tableName;
    lines.push(`CREATE TABLE "${tableName}" (`);

    const definitions: string[] = [];

    // Columns
    for (const col of parsed.columns) {
      let sqliteType = this.mapTypeToSqlite(col.type, col.autoIncrement);
      let colDef = `  "${col.name}" ${sqliteType}`;

      if (col.pk && col.autoIncrement) {
        colDef += ' PRIMARY KEY AUTOINCREMENT';
      } else {
        if (col.notNull) colDef += ' NOT NULL';
        if (col.default !== null && col.default !== undefined) {
          colDef += ` DEFAULT ${col.default}`;
        }
      }

      definitions.push(colDef);
    }

    // PK Constraint if not autoIncrement PK
    const pkCols = parsed.columns.filter((c: any) => c.pk);
    const hasAutoPk = pkCols.some((c: any) => c.autoIncrement);
    if (pkCols.length > 0 && !hasAutoPk) {
      const pkNames = pkCols.map((c: any) => `"${c.name}"`).join(', ');
      definitions.push(`  PRIMARY KEY (${pkNames})`);
    }

    lines.push(definitions.join(',\n'));
    lines.push(');');

    return lines.join('\n');
  }

  private mapTypeToPostgres(type: string, autoIncrement: boolean): string {
    const upper = type.toUpperCase().split('(')[0].trim();
    if (autoIncrement) {
      if (upper === 'BIGINT') return 'BIGSERIAL';
      return 'SERIAL';
    }

    const typeMap: Record<string, string> = {
      'TINYINT': 'BOOLEAN',
      'INT': 'INTEGER',
      'INTEGER': 'INTEGER',
      'BIGINT': 'BIGINT',
      'SMALLINT': 'SMALLINT',
      'MEDIUMINT': 'INTEGER',
      
      'VARCHAR': 'VARCHAR',
      'CHAR': 'CHAR',
      'TEXT': 'TEXT',
      'TINYTEXT': 'TEXT',
      'MEDIUMTEXT': 'TEXT',
      'LONGTEXT': 'TEXT',

      'DOUBLE': 'DOUBLE PRECISION',
      'FLOAT': 'REAL',
      'DECIMAL': 'NUMERIC',

      'DATETIME': 'TIMESTAMP WITHOUT TIME ZONE',
      'TIMESTAMP': 'TIMESTAMP WITH TIME ZONE',
      
      'BLOB': 'BYTEA',
      'LONGBLOB': 'BYTEA',
      'MEDIUMBLOB': 'BYTEA',
      'TINYBLOB': 'BYTEA',

      'JSON': 'JSONB',
    };

    let baseType = typeMap[upper] || upper;
    
    // Preserve length/scale if applicable
    const match = type.match(/\(([^)]+)\)/);
    if (match && !['TINYINT', 'INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'MEDIUMINT', 'BLOB', 'JSON', 'TEXT', 'ENUM', 'SET'].includes(upper)) {
      baseType += `(${match[1]})`;
    }

    if (upper === 'ENUM' || upper === 'SET') {
      return 'VARCHAR(255)';
    }

    return baseType;
  }

  private mapTypeToSqlite(type: string, autoIncrement: boolean): string {
    const upper = type.toUpperCase().split('(')[0].trim();
    if (autoIncrement) {
      return 'INTEGER'; // SQLite requirement for AUTOINCREMENT
    }

    const typeMap: Record<string, string> = {
      'TINYINT': 'INTEGER',
      'INT': 'INTEGER',
      'INTEGER': 'INTEGER',
      'BIGINT': 'INTEGER',
      'SMALLINT': 'INTEGER',
      'MEDIUMINT': 'INTEGER',
      
      'VARCHAR': 'TEXT',
      'CHAR': 'TEXT',
      'TEXT': 'TEXT',
      'LONGTEXT': 'TEXT',

      'DOUBLE': 'REAL',
      'FLOAT': 'REAL',
      'DECIMAL': 'NUMERIC',

      'DATETIME': 'TEXT',
      'TIMESTAMP': 'TEXT',
    };

    return typeMap[upper] || 'TEXT';
  }

  private mapDefaultValueToPostgres(val: string, pgType: string): string {
    const upper = String(val).toUpperCase().trim();
    if (upper === 'NULL') {
      return 'NULL';
    }
    if (upper === 'CURRENT_TIMESTAMP' || upper === 'CURRENT_TIMESTAMP()' || upper === 'NOW()' || upper === 'NOW') {
      return 'CURRENT_TIMESTAMP';
    }
    if (upper === 'TRUE' || upper === 'FALSE') {
      return upper;
    }
    if (val.startsWith("'") && val.endsWith("'")) {
      return val;
    }
    const upperPgType = pgType.toUpperCase();
    const isNumericType = ['INTEGER', 'BIGINT', 'SMALLINT', 'NUMERIC', 'REAL', 'DOUBLE PRECISION', 'SERIAL', 'BIGSERIAL'].some(t => upperPgType.includes(t));
    if (isNumericType) {
      if (!isNaN(Number(val))) {
        return val;
      }
    }
    const escaped = val.replace(/'/g, "''");
    return `'${escaped}'`;
  }
}
