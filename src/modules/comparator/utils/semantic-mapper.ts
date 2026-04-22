export class SemanticMapper {
  /**
   * Normalize database types to a generic internal representation
   */
  static normalizeType(type: string, dialect?: string): string {
    if (!type) return 'UNKNOWN';
    const up = type.toUpperCase().split('(')[0].trim();

    // Mapping for generic types
    const typeMap: Record<string, string> = {
      // MySQL to Generic
      'TINYINT': 'BOOLEAN',
      'SMALLINT': 'INTEGER',
      'MEDIUMINT': 'INTEGER',
      'INT': 'INTEGER',
      'INTEGER': 'INTEGER',
      'BIGINT': 'INTEGER',
      'SERIAL': 'INTEGER',
      'BIGSERIAL': 'INTEGER',
      'BOOLEAN': 'BOOLEAN',
      'BOOL': 'BOOLEAN',

      'VARCHAR': 'STRING',
      'CHAR': 'STRING',
      'TEXT': 'STRING',
      'TINYTEXT': 'STRING',
      'MEDIUMTEXT': 'STRING',
      'LONGTEXT': 'STRING',
      'BPCHAR': 'STRING', // Postgres char(n)

      'DECIMAL': 'NUMBER',
      'NUMERIC': 'NUMBER',
      'FLOAT': 'NUMBER',
      'DOUBLE': 'NUMBER',
      'REAL': 'NUMBER',

      'DATETIME': 'TIMESTAMP',
      'TIMESTAMP': 'TIMESTAMP',
      'TIMESTAMP WITH TIME ZONE': 'TIMESTAMP',
      'TIMESTAMP WITHOUT TIME ZONE': 'TIMESTAMP',

      'JSON': 'JSON',
      'JSONB': 'JSON',
    };

    return typeMap[up] || up;
  }

  /**
   * Check if two column properties are semantically equal across engines
   */
  static arePropertiesEqual(prop: string, val1: any, val2: any, srcDialect: string, destDialect: string): boolean {
    if (prop === 'type') {
      return this.normalizeType(val1, srcDialect) === this.normalizeType(val2, destDialect);
    }

    if (prop === 'autoIncrement') {
      // MySQL autoIncrement is semantic similar to Postgres SERIAL/BIGSERIAL (handled in parser)
      return !!val1 === !!val2;
    }

    if (prop === 'defaultValue') {
      if (!val1 && !val2) return true;
      if (!val1 || !val2) return false;
      const v1 = String(val1).replace(/::[a-z ]+$/i, '').replace(/^'|'$/g, '');
      const v2 = String(val2).replace(/::[a-z ]+$/i, '').replace(/^'|'$/g, '');
      return v1 === v2;
    }

    // Default to strict equality
    return val1 === val2;
  }

  /**
   * Ignore list for engine-specific noise in cross-engine compare
   */
  static shouldIgnoreProperty(prop: string, srcDialect: string, destDialect: string): boolean {
    if (srcDialect === destDialect) return false;

    const noise = [
      'unsigned',
      'zerofill',
      'charset',
      'collate',
      'engine',
      'rowFormat',
      'onUpdate' // MySQL specific ON UPDATE CURRENT_TIMESTAMP
    ];

    return noise.includes(prop);
  }
}
