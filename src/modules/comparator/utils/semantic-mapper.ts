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
    const isNullOrEmpty = (v: any) => v === null || v === undefined || String(v).trim() === '' || String(v).toLowerCase() === 'null';

    if (prop === 'type') {
      if (srcDialect === destDialect) {
        const normType = (v: any) => {
          return String(isNullOrEmpty(v) ? '' : v)
            .toUpperCase()
            .replace(/\s+/g, ' ')
            .replace(/(TINYINT|SMALLINT|MEDIUMINT|INT|INTEGER|BIGINT)\(\d+\)/gi, '$1')
            .replace(/,\s*/g, ',')
            .trim();
        };
        return normType(val1) === normType(val2);
      }
      return this.normalizeType(val1, srcDialect) === this.normalizeType(val2, destDialect);
    }

    if (prop === 'collate') {
      const defaultCollations = ['latin1_swedish_ci', 'utf8mb4_0900_ai_ci'];
      const c1 = val1 ? String(val1).toLowerCase().trim() : null;
      const c2 = val2 ? String(val2).toLowerCase().trim() : null;
      if (!c1 && defaultCollations.includes(c2 || '')) return true;
      if (!c2 && defaultCollations.includes(c1 || '')) return true;
      return c1 === c2;
    }

    if (prop === 'autoIncrement') {
      // MySQL autoIncrement is semantic similar to Postgres SERIAL/BIGSERIAL (handled in parser)
      return !!val1 === !!val2;
    }

    if (prop === 'default' || prop === 'defaultValue') {
      if (isNullOrEmpty(val1) && isNullOrEmpty(val2)) return true;
      if (isNullOrEmpty(val1) || isNullOrEmpty(val2)) return false;

      const normDefault = (v: any) => {
        let s = String(v).trim()
          .replace(/::[a-z_ ]+$/i, '') // strip postgres type casts
          .replace(/^['"`]|['"`]$/g, ''); // strip outer quotes
        
        if (s.toLowerCase().endsWith('()')) {
          s = s.slice(0, -2);
        }
        
        const upper = s.toUpperCase();
        if (upper === 'NOW' || upper === 'CURRENT_TIMESTAMP') return 'CURRENT_TIMESTAMP';
        return upper;
      };

      return normDefault(val1) === normDefault(val2);
    }

    if (prop === 'comment') {
      const normComment = (v: any) => {
        if (isNullOrEmpty(v)) return '';
        return String(v).trim().replace(/^['"`]|['"`]$/g, '');
      };
      return normComment(val1) === normComment(val2);
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
