
export class ParserService {
  /**
   * Remove DEFINER clause from DDL
   * Handles CREATE [DEFINER=...] PROCEDURE/FUNCTION/VIEW/TRIGGER/EVENT
   */
  cleanDefiner(ddl: string): string {
    if (!ddl) return '';

    // Regex components
    const userPart = `(?:'[^']+'|\`[^\`]+\`|"[^"]+"|[a-zA-Z0-9_]+)`;
    const hostPart = `(?:@(?:'[^']+'|\`[^\`]+\`|"[^"]+"|[a-zA-Z0-9_\\.\%]+))?`;
    const definerPattern = `DEFINER\\s*=\\s*${userPart}${hostPart}`;

    // Split routine to separate header and body
    const parts = this.splitRoutine(ddl);
    if (parts) {
      let header = parts.header;
      const body = parts.body;

      // Remove DEFINER from header
      const re = new RegExp(definerPattern, 'gi');
      header = header.replace(re, '');

      // Cleanup double spaces created by removal
      header = header.replace(/\s{2,}/g, ' ');

      return header + ' ' + body;
    }

    // Fallback: simple global replace if split failed
    const reFallback = new RegExp(definerPattern, 'gi');
    return ddl.replace(reFallback, '');
  }

  /**
   * Split Routine into Header and Body
   */
  splitRoutine(ddl: string): { header: string; body: string } | null {
    if (!ddl) return null;

    // Try to find the first "BEGIN" keyword
    const beginMatch = ddl.match(/(\s)BEGIN(\s|$)/i);
    if (beginMatch && beginMatch.index !== undefined) {
      return {
        header: ddl.substring(0, beginMatch.index).trim(),
        body: ddl.substring(beginMatch.index).trim(),
      };
    }

    return null;
  }

  /**
   * Normalize DDL for comparison
   */
  normalize(
    ddl: string,
    options: { ignoreDefiner?: boolean; ignoreWhitespace?: boolean } = {},
  ): string {
    if (!ddl) return '';
    let processed = ddl;

    if (options.ignoreDefiner) {
      processed = this.cleanDefiner(processed);
    }

    if (options.ignoreWhitespace) {
      // Collapse whitespace: tabs, newlines -> space
      processed = processed.replace(/\s+/g, ' ').trim();
    }

    return processed;
  }

  /**
   * Convert SQL keywords to uppercase
   */
  uppercaseKeywords(query: string): string {
    const keywords = new Set([
      'ACCESSIBLE',
      'ADD',
      'ALL',
      'ALTER',
      'ANALYZE',
      'AND',
      'AS',
      'ASC',
      'ASENSITIVE',
      'BEFORE',
      'BETWEEN',
      'BIGINT',
      'BINARY',
      'BLOB',
      'BOTH',
      'BY',
      'CALL',
      'CASCADE',
      'CASE',
      'CHANGE',
      'CHAR',
      'CHARACTER',
      'CHECK',
      'COLLATE',
      'COLUMN',
      'CONDITION',
      'CONSTRAINT',
      'CONTINUE',
      'CONVERT',
      'CREATE',
      'CROSS',
      'CURRENT_DATE',
      'CURRENT_TIME',
      'CURRENT_TIMESTAMP',
      'CURRENT_USER',
      'CURSOR',
      'DATABASE',
      'DATABASES',
      'DAY_HOUR',
      'DAY_MICROSECOND',
      'DAY_MINUTE',
      'DAY_SECOND',
      'DEC',
      'DECIMAL',
      'DECLARE',
      'DEFAULT',
      'DELAYED',
      'DELETE',
      'DESC',
      'DESCRIBE',
      'DETERMINISTIC',
      'DISTINCT',
      'DISTINCTROW',
      'DIV',
      'DOUBLE',
      'DROP',
      'DUAL',
      'EACH',
      'ELSE',
      'ELSEIF',
      'ENCLOSED',
      'ESCAPED',
      'EXISTS',
      'EXIT',
      'EXPLAIN',
      'FALSE',
      'FETCH',
      'FLOAT',
      'FLOAT4',
      'FLOAT8',
      'FORCE',
      'FOREIGN',
      'FROM',
      'FULLTEXT',
      'GENERATED',
      'GET',
      'GRANT',
      'GROUP',
      'HAVING',
      'HIGH_PRIORITY',
      'HOUR_MICROSECOND',
      'HOUR_MINUTE',
      'HOUR_SECOND',
      'IF',
      'IGNORE',
      'IGNORE_SERVER_IDS',
      'IN',
      'INDEX',
      'INFILE',
      'INNER',
      'INOUT',
      'INSENSITIVE',
      'INSERT',
      'INT',
      'INT1',
      'INT2',
      'INT3',
      'INT4',
      'INT8',
      'INTEGER',
      'INTERVAL',
      'INTO',
      'IO_AFTER_GTIDS',
      'IO_BEFORE_GTIDS',
      'IS',
      'ITERATE',
      'JOIN',
      'KEY',
      'KEYS',
      'KILL',
      'LEADING',
      'LEAVE',
      'LEFT',
      'LIKE',
      'LIMIT',
      'LINEAR',
      'LINES',
      'LOAD',
      'LOCALTIME',
      'LOCALTIMESTAMP',
      'LOCK',
      'LONG',
      'LONGBLOB',
      'LONGTEXT',
      'LOOP',
      'LOW_PRIORITY',
      'MASTER_BIND',
      'MASTER_SSL_VERIFY_SERVER_CERT',
      'MATCH',
      'MAXVALUE',
      'MEDIUMBLOB',
      'MEDIUMINT',
      'MEDIUMTEXT',
      'MIDDLEINT',
      'MINUTE_MICROSECOND',
      'MINUTE_SECOND',
      'MOD',
      'MODIFIES',
      'NATURAL',
      'NOT',
      'NO_WRITE_TO_BINLOG',
      'NULL',
      'NUMERIC',
      'ON',
      'OPTIMIZE',
      'OPTION',
      'OPTIONALLY',
      'OR',
      'ORDER',
      'OUT',
      'OUTER',
      'OUTFILE',
      'PARTITION',
      'PRECISION',
      'PRIMARY',
      'PROCEDURE',
      'PURGE',
      'RANGE',
      'READ',
      'READS',
      'READ_WRITE',
      'REAL',
      'REFERENCES',
      'REGEXP',
      'RELEASE',
      'RENAME',
      'REPEAT',
      'REPLACE',
      'REQUIRE',
      'RESIGNAL',
      'RESTRICT',
      'RETURN',
      'REVOKE',
      'RIGHT',
      'RLIKE',
      'SCHEMA',
      'SCHEMAS',
      'SECOND_MICROSECOND',
      'SELECT',
      'SENSITIVE',
      'SEPARATOR',
      'SET',
      'SHOW',
      'SIGNAL',
      'SMALLINT',
      'SPATIAL',
      'SPECIFIC',
      'SQL',
      'SQLEXCEPTION',
      'SQLSTATE',
      'SQLWARNING',
      'SQL_BIG_RESULT',
      'SQL_CALC_FOUND_ROWS',
      'SQL_SMALL_RESULT',
      'SSL',
      'STARTING',
      'STORED',
      'STRAIGHT_JOIN',
      'TABLE',
      'TERMINATED',
      'TEXT',
      'THEN',
      'TINYBLOB',
      'TINYINT',
      'TINYTEXT',
      'TO',
      'TRAILING',
      'TRIGGER',
      'TRUE',
      'UNDO',
      'UNION',
      'UNIQUE',
      'UNLOCK',
      'UNSIGNED',
      'UPDATE',
      'USAGE',
      'USE',
      'USING',
      'UTC_DATE',
      'UTC_TIME',
      'UTC_TIMESTAMP',
      'VALUES',
      'VARBINARY',
      'VARCHAR',
      'VARCHARACTER',
      'VARYING',
      'VIRTUAL',
      'WHEN',
      'WHERE',
      'WHILE',
      'WITH',
      'WRITE',
      'XOR',
      'YEAR_MONTH',
      'ZEROFILL',
      'END',
      'OPEN',
      'CLOSE',
      'DUPLICATE',
      'COALESCE',
    ]);

    // Use regex to match backticked identifiers, quotes, or regular words.
    // This prevents uppercasing keywords when they are used as column names (e.g., `end`) or inside string literals.
    return query
      .replace(/`[^`]*`|'[^']*'|"[^"]*"|\b[a-zA-Z_]+\b/g, (match) => {
        if (match.startsWith('`') || match.startsWith("'") || match.startsWith('"')) {
          return match; // Keep literals and identifiers untouched
        }
        return keywords.has(match.toUpperCase()) ? match.toUpperCase() : match;
      })
      .replace(/\`(GROUP|USER|GROUPS)\`/ig, (match, p1) => `\`${p1.toLowerCase()}\``)
      .replace(/\t/g, '  ');
  }
  /**
   * Parse CREATE TABLE statement into structured components
   */
  parseTable(tableSQL: string): {
    tableName: string;
    columns: Record<string, string>;
    primaryKey: string[];
    indexes: Record<string, string>;
    foreignKeys: Record<string, string>;
  } | null {
    try {
      const lines = tableSQL.split('\n');
      const tableNameLine = lines.find((line) => line.includes('CREATE TABLE'));
      if (!tableNameLine) return null;

      const tableNameMatch = tableNameLine.match(/`([^`]+)`/);
      if (!tableNameMatch || tableNameMatch.length < 2) {
        return null;
      }
      const tableName = tableNameMatch[1];
      const columnDefs: { name: string; definition: string }[] = [];
      const primaryKey: string[] = [];
      const indexes: Record<string, string> = {};
      const foreignKeys: Record<string, string> = {};
      let insideColumnDefinitions = false;
      let insideIndexDefinitions = false;

      for (const line of lines) {
        if (line.includes('CREATE TABLE')) {
          insideColumnDefinitions = true;
          continue;
        } else if (
          insideColumnDefinitions &&
          (line.trim().includes('ENGINE=') || line.trim().startsWith(')'))
        ) {
          // Reached the end of column definitions
          insideColumnDefinitions = false;
        } else if (
          line.includes('PRIMARY KEY') ||
          line.includes('UNIQUE KEY') ||
          line.includes('FULLTEXT KEY') ||
          line.includes('SPATIAL KEY') ||
          line.includes('CONSTRAINT') ||
          line.includes('INDEX') ||
          (line.trim().startsWith('KEY') && line.includes('`'))
        ) {
          insideIndexDefinitions = true;
          if (line.includes('CONSTRAINT')) {
            const constraintNameMatch = line.match(/CONSTRAINT\s+`([^`]+)`/);
            if (constraintNameMatch && constraintNameMatch.length >= 2) {
              foreignKeys[constraintNameMatch[1]] = line.trim();
            }
          } else {
            const indexNameMatch = line.match(/`([^`]+)`/);
            if (indexNameMatch && indexNameMatch.length >= 2) {
              const indexName = indexNameMatch[1];
              if (line.includes('PRIMARY KEY')) {
                primaryKey.push(indexName);
              } else {
                indexes[indexName] = line.trim();
              }
            }
          }
        } else if (insideColumnDefinitions && line.trim() !== '') {
          // Parse only non-empty lines inside column definitions
          const columnNameMatch = line.match(/`([^`]+)`/);
          if (!columnNameMatch || columnNameMatch.length < 2) {
            continue;
          }
          const columnName = columnNameMatch[1];
          columnDefs.push({
            name: columnName,
            definition: line.trim(),
          });
        } else if (insideIndexDefinitions && line.trim() === ')') {
          insideIndexDefinitions = false;
        }
      }

      const columns: Record<string, string> = {};
      for (const columnDef of columnDefs) {
        columns[columnDef.name] = columnDef.definition;
      }

      return {
        tableName,
        columns,
        primaryKey,
        indexes,
        foreignKeys,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse CREATE TABLE statement into rich structured components for UI visualization
   */
  parseTableDetailed(tableSQL: string): {
    tableName: string;
    columns: any[];
    indexes: any[];
    foreignKeys: any[];
    options: any;
    partitions: string | null;
  } | null {
    try {
      if (!tableSQL || !tableSQL.toUpperCase().includes('CREATE TABLE')) return null;

      const tableNameMatch = tableSQL.match(/CREATE TABLE\s+`?([^`\s(]+)`?/i);
      if (!tableNameMatch) return null;
      const tableName = tableNameMatch[1];

      // Find the first '(' and the last ')' to extract the body
      const firstParen = tableSQL.indexOf('(');
      const lastParen = tableSQL.lastIndexOf(')');
      if (firstParen === -1 || lastParen === -1) return null;
      const body = tableSQL.substring(firstParen + 1, lastParen);

      const lines: string[] = [];
      let current = '';
      let parenLevel = 0;
      let inQuote = false;
      let quoteChar = '';

      for (let i = 0; i < body.length; i++) {
        const char = body[i];
        if (inQuote) {
          current += char;
          if (char === quoteChar && body[i - 1] !== '\\') inQuote = false;
        } else {
          if (char === "'" || char === '"' || char === '`') {
            inQuote = true;
            quoteChar = char;
            current += char;
          } else if (char === '(') {
            parenLevel++;
            current += char;
          } else if (char === ')') {
            parenLevel--;
            current += char;
          } else if (char === ',' && parenLevel === 0) {
            lines.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
      }
      if (current.trim()) lines.push(current.trim());

      const columns: any[] = [];
      const indexes: any[] = [];
      const foreignKeys: any[] = [];
      const pkColumns = new Set<string>();

      for (const line of lines) {
        if (!line) continue;
        const up = line.toUpperCase();

        if (up.startsWith('PRIMARY KEY')) {
          const match = line.match(/PRIMARY KEY\s*\((.*?)\)/i);
          if (match) {
            match[1].split(',').forEach((c) => pkColumns.add(c.trim().replace(/[`"]/g, '')));
            indexes.push({
              name: 'PRIMARY',
              type: 'PRIMARY KEY',
              columns: match[1].trim(),
              definition: line,
            });
          }
          continue;
        }

        if (up.startsWith('CONSTRAINT') && up.includes('FOREIGN KEY')) {
          const nameMatch = line.match(/CONSTRAINT\s+`?([^`\s]+)`?/i);
          const fkMatch = line.match(/FOREIGN KEY\s*\((.*?)\)\s+REFERENCES\s+`?([^`\s(]+)`?\s*\((.*?)\)/i);
          if (fkMatch) {
            foreignKeys.push({
              name: nameMatch ? nameMatch[1] : 'FK_anonymous',
              localColumns: fkMatch[1].trim(),
              referencedTable: fkMatch[2].trim(),
              referencedColumns: fkMatch[3].trim(),
              definition: line,
            });
          }
          continue;
        }

        if (up.startsWith('KEY') || up.startsWith('INDEX') || up.startsWith('UNIQUE KEY')) {
          const type = up.startsWith('UNIQUE') ? 'UNIQUE' : 'INDEX';
          const nameMatch = line.match(/(?:KEY|INDEX)\s+`?([^`\s(]+)`?/i);
          const colMatch = line.match(/\((.*?)\)/);
          indexes.push({
            name: nameMatch ? nameMatch[1] : 'anonymous',
            type,
            columns: colMatch ? colMatch[1].trim() : '',
            definition: line,
          });
          continue;
        }

        const colNameMatch = line.match(/^`?([^`\s]+)`?\s+([a-zA-Z0-9_().,'"\s]+)/i);
        if (colNameMatch) {
          const name = colNameMatch[1];
          let fullType = colNameMatch[2].trim();

          const isPk = pkColumns.has(name) || up.includes('PRIMARY KEY');
          const isNotNull = up.includes('NOT NULL');
          const isUnsigned = up.includes('UNSIGNED');
          const isAutoInc = up.includes('AUTO_INCREMENT');
          const isUnique = up.includes('UNIQUE');

          let defVal = null;
          const defMatch = line.match(/DEFAULT\s+('([^']*)'|([^,\s]+))/i);
          if (defMatch) defVal = defMatch[2] || defMatch[3];

          let comment = '';
          const commentMatch = line.match(/COMMENT\s+'([^']*)'/i);
          if (commentMatch) comment = commentMatch[1];

          columns.push({
            name,
            type: fullType.split(' ')[0],
            pk: isPk,
            notNull: isNotNull,
            unique: isUnique,
            unsigned: isUnsigned,
            autoIncrement: isAutoInc,
            default: defVal,
            comment,
            definition: line,
          });
        }
      }

      const options: any = {};
      const engineMatch = tableSQL.match(/ENGINE=([^`\s;]+)/i);
      if (engineMatch) options.engine = engineMatch[1];

      const charsetMatch = tableSQL.match(/(?:DEFAULT\s+)?CHARSET=([^`\s;]+)/i) || tableSQL.match(/CHARACTER\s+SET\s+([^`\s;]+)/i);
      if (charsetMatch) options.charset = charsetMatch[1];

      const collationMatch = tableSQL.match(/COLLATE=([^`\s;]+)/i);
      if (collationMatch) options.collation = collationMatch[1];

      const tableCommentMatch = tableSQL.match(/COMMENT='([^']*)'/i);
      if (tableCommentMatch) options.comment = tableCommentMatch[1];

      const partitionsMatch = tableSQL.match(/PARTITION BY.*$/is);
      const partitions = partitionsMatch ? partitionsMatch[0].trim() : null;

      return {
        tableName,
        columns,
        indexes,
        foreignKeys,
        options,
        partitions,
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Parse CREATE TRIGGER statement
   */
  parseTrigger(triggerSQL: string): {
    triggerName: string;
    timing: string;
    event: string;
    tableName: string;
    definition: string;
  } | null {
    try {
      const lines = triggerSQL.split('\n');
      const triggerNameLine = lines.find((line) => line.includes('TRIGGER') && line.includes('`'));
      const triggerNameMatch = triggerNameLine?.match(/TRIGGER\s+`([^`]+)`/);

      if (!triggerNameMatch || triggerNameMatch.length < 2) {
        return null;
      }

      const triggerName = triggerNameMatch[1];
      const timing = triggerNameLine?.match(/(BEFORE|AFTER)/i)?.[1] || '';
      const event = triggerNameLine?.match(/(INSERT|UPDATE|DELETE)/i)?.[1] || '';
      const tableName = triggerNameLine?.match(/ON\s+`([^`]+)`/i)?.[1] || '';

      return {
        triggerName,
        timing,
        event,
        tableName,
        definition: triggerSQL,
      };
    } catch (error) {
      return null;
    }
  }
}
