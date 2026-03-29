import {
  IIntrospectionService,
  IDatabaseDriver,
} from '../../../common/interfaces/driver.interface';
import { ITableStats, IServerInfo, IFKGraphEntry } from '../../../common/interfaces/schema.interface';
import { ParserService } from '../../parser/parser.service';
import { RowDataPacket } from 'mysql2';

export class MysqlIntrospectionService implements IIntrospectionService {
  constructor(
    private readonly driver: IDatabaseDriver,
    private readonly parser: ParserService,
  ) { }

  async listTables(dbName: string): Promise<string[]> {
    const results = await this.driver.query<RowDataPacket[]>(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
      [dbName],
    );
    return results.map((row) => row.TABLE_NAME);
  }

  async listViews(dbName: string): Promise<string[]> {
    const results = await this.driver.query<RowDataPacket[]>(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'VIEW' ORDER BY TABLE_NAME",
      [dbName],
    );
    return results.map((row) => row.TABLE_NAME);
  }

  async listProcedures(dbName: string): Promise<string[]> {
    const results = await this.driver.query<RowDataPacket[]>(
      "SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE' ORDER BY ROUTINE_NAME",
      [dbName],
    );
    return results.map((row) => row.ROUTINE_NAME);
  }

  async listFunctions(dbName: string): Promise<string[]> {
    const results = await this.driver.query<RowDataPacket[]>(
      "SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'FUNCTION' ORDER BY ROUTINE_NAME",
      [dbName],
    );
    return results.map((row) => row.ROUTINE_NAME);
  }

  async listTriggers(dbName: string): Promise<string[]> {
    const results = await this.driver.query<RowDataPacket[]>(
      'SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = ? ORDER BY TRIGGER_NAME',
      [dbName],
    );
    return results.map((row) => row.TRIGGER_NAME);
  }

  async listEvents(dbName: string): Promise<string[]> {
    const results = await this.driver.query<RowDataPacket[]>(
      'SELECT EVENT_NAME FROM information_schema.EVENTS WHERE EVENT_SCHEMA = ? ORDER BY EVENT_NAME',
      [dbName],
    );
    return results.map((row) => row.EVENT_NAME);
  }

  // --- DDL Retrieval ---

  private _normalizeDDL(ddl: string): string {
    return this.parser.cleanDefiner(ddl); // Basic cleaning for now, extend if needed
  }

  /**
   * Safely extract DDL content from a SHOW CREATE result row.
   * MySQL returns columns like 'Create Table', 'Create Procedure', etc.
   * The casing can vary by MySQL version/driver config, so we do case-insensitive lookup.
   * If the DDL column value is NULL (e.g., insufficient privileges), returns empty string.
   */
  private _extractDDLFromRow(row: any, expectedKey: string, objectType: string, objectName: string): string {
    if (!row) return '';
    const keys = Object.keys(row);
    const key = keys.find(k => k.toLowerCase() === expectedKey.toLowerCase());
    if (!key) {
      console.warn(`[Introspection] ${objectType} "${objectName}": expected column "${expectedKey}" not found. Available keys: [${keys.join(', ')}]`);
      return '';
    }
    const value = row[key];
    if (value === null || value === undefined) {
      console.warn(`[Introspection] ${objectType} "${objectName}": column "${key}" is NULL (likely insufficient privileges)`);
      return '';
    }
    return String(value);
  }

  async getTableDDL(dbName: string, tableName: string): Promise<string> {
    try {
      const result = await this.driver.query<RowDataPacket[]>(`SHOW CREATE TABLE \`${tableName}\``);
      const row = result[0] as any;
      if (!row) return '';
      let ddl = this._extractDDLFromRow(row, 'Create Table', 'TABLE', tableName);
      if (ddl) {
        ddl = ddl.replace(/AUTO_INCREMENT=\d+\s/, '');
      }

      let normalizedDdl = this._normalizeDDL(ddl);

      // Sort indexes to avoid false positive text diffs on index reordering
      const lines = normalizedDdl.split('\n');
      const standardLines: string[] = [];
      const indexLines: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const _line = lines[i];
        if (
          _line.trim().startsWith('KEY `') ||
          _line.trim().startsWith('UNIQUE KEY `') ||
          _line.trim().startsWith('FULLTEXT KEY `') ||
          _line.trim().startsWith('SPATIAL KEY `') ||
          _line.trim().startsWith('INDEX `')
        ) {
          // If the previous line ended with a comma, we might need to be careful, but MySQL SHOW CREATE TABLE 
          // usually formats one constraint per line ending with comma except the last.
          // To sort safely, we strip trailing comma, sort, and add them back.
          indexLines.push(_line);
        } else {
          standardLines.push(_line);
        }
      }

      if (indexLines.length > 0) {
        // Find where index lines were (usually before CONSTRAINT or `) ENGINE=`)
        // To be safe, we collect all index lines, and replace the block where the first index started.
        // Identify the exact insertion point (right after the last column or primary key before the first index line was found).
        // Since we extracted them, `standardLines` has the table without those specific indexes.

        // Strip trailing commas from all index lines, sort them.
        indexLines.sort((a, b) => {
          const aName = a.trim().match(/KEY\s+`([^`]+)`/)?.[1] || a;
          const bName = b.trim().match(/KEY\s+`([^`]+)`/)?.[1] || b;
          return aName.localeCompare(bName);
        });

        // Find the index of the first line that starts with ')' or 'CONSTRAINT' searching from the end of standardLines
        let insertAt = standardLines.length - 1;
        for (let i = standardLines.length - 1; i >= 0; i--) {
          if (standardLines[i].trim().startsWith(')')) {
            insertAt = i;
          } else if (standardLines[i].trim().startsWith('CONSTRAINT')) {
            insertAt = i;
          } else if (standardLines[i].trim().startsWith('PRIMARY KEY')) {
            // Usually PK is before other keys, so we insert after
            insertAt = i + 1;
            break;
          } else if (standardLines[i].trim() !== ')' && !standardLines[i].trim().startsWith('CONSTRAINT')) {
            // Found a column definition, break
            insertAt = i + 1;
            break;
          }
        }

        // Ensure trailing comma logic is sound. We will apply commas to all lines before the last line inside the definition.
        standardLines.splice(insertAt, 0, ...indexLines);

        // Re-evaluate trailing commas inside the CREATE TABLE parenthesis.
        let insideParen = false;
        for (let i = 0; i < standardLines.length; i++) {
          if (standardLines[i].includes('CREATE TABLE')) {
            insideParen = true;
          } else if (insideParen && standardLines[i].trim().startsWith(')')) {
            insideParen = false;
            // Remove comma from the line right before the closing paren if it exists
            if (i > 0 && standardLines[i - 1].trim().endsWith(',')) {
              standardLines[i - 1] = standardLines[i - 1].replace(/,$/, '');
            }
          } else if (insideParen && standardLines[i].trim().length > 0 && standardLines[i + 1] && !standardLines[i + 1].trim().startsWith(')')) {
            // ensure it has a comma if it's not the last item
            if (!standardLines[i].trim().endsWith(',')) {
              standardLines[i] = standardLines[i] + ',';
            }
          }
        }
      }
      return standardLines.join('\n');
    } catch (err: any) {
      console.error(`[Introspection] Failed to get TABLE DDL for "${tableName}": ${err.message}`);
      return '';
    }
  }

  async getViewDDL(dbName: string, viewName: string): Promise<string> {
    try {
      const result = await this.driver.query<RowDataPacket[]>(`SHOW CREATE VIEW \`${viewName}\``);
      const row = result[0] as any;
      const ddl = this._extractDDLFromRow(row, 'Create View', 'VIEW', viewName);
      return this._normalizeDDL(ddl);
    } catch (err: any) {
      console.error(`[Introspection] Failed to get VIEW DDL for "${viewName}": ${err.message}`);
      return '';
    }
  }

  async getProcedureDDL(dbName: string, procName: string): Promise<string> {
    try {
      const result = await this.driver.query<RowDataPacket[]>(
        `SHOW CREATE PROCEDURE \`${procName}\``,
      );
      const row = result[0] as any;
      const ddl = this._extractDDLFromRow(row, 'Create Procedure', 'PROCEDURE', procName);
      return this._normalizeDDL(ddl);
    } catch (err: any) {
      console.error(`[Introspection] Failed to get PROCEDURE DDL for "${procName}": ${err.message}`);
      return '';
    }
  }

  async getFunctionDDL(dbName: string, funcName: string): Promise<string> {
    try {
      const result = await this.driver.query<RowDataPacket[]>(`SHOW CREATE FUNCTION \`${funcName}\``);
      const row = result[0] as any;
      const ddl = this._extractDDLFromRow(row, 'Create Function', 'FUNCTION', funcName);
      return this._normalizeDDL(ddl);
    } catch (err: any) {
      console.error(`[Introspection] Failed to get FUNCTION DDL for "${funcName}": ${err.message}`);
      return '';
    }
  }

  async getTriggerDDL(dbName: string, triggerName: string): Promise<string> {
    try {
      const result = await this.driver.query<RowDataPacket[]>(
        `SHOW CREATE TRIGGER \`${triggerName}\``,
      );
      const row = result[0] as any;
      if (!row) return '';

      const rawDDL = this._extractDDLFromRow(row, 'SQL Original Statement', 'TRIGGER', triggerName);
      if (!rawDDL) return '';

      // Trigger cleanup (Naive regex port from legacy)
      const ddl = rawDDL
        .replace(/\sDEFINER=`[^`]+`@`[^`]+`\s/g, ' ')
        .replace(/\sCOLLATE\s+\w+\s/, ' ')
        .replace(/\sCHARSET\s+\w+\s/, ' ');

      return this._normalizeDDL(ddl);
    } catch (err: any) {
      console.error(`[Introspection] Failed to get TRIGGER DDL for "${triggerName}": ${err.message}`);
      return '';
    }
  }

  async getEventDDL(dbName: string, eventName: string): Promise<string> {
    try {
      const result = await this.driver.query<RowDataPacket[]>(`SHOW CREATE EVENT \`${eventName}\``);
      const row = result[0] as any;
      const ddl = this._extractDDLFromRow(row, 'Create Event', 'EVENT', eventName);
      return this._normalizeDDL(ddl);
    } catch (err: any) {
      console.error(`[Introspection] Failed to get EVENT DDL for "${eventName}": ${err.message}`);
      return '';
    }
  }

  async getChecksums(dbName: string): Promise<Record<string, string>> {
    const results = await this.driver.query<RowDataPacket[]>(
      `
      SELECT TABLE_NAME, CHECKSUM, UPDATE_TIME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ?
    `,
      [dbName],
    );

    // Convert to Record<string, string>
    const map: Record<string, string> = {};
    for (const row of results) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = row as any;
      map[r.TABLE_NAME] = `${r.CHECKSUM || ''}|${r.UPDATE_TIME || ''}`;
    }
    return map;
  }

  async getObjectDDL(dbName: string, type: string, name: string): Promise<string> {
    const t = type.toUpperCase().replace(/S$/, ''); // Normalize: TABLES -> TABLE, PROCEDURES -> PROCEDURE
    if (t === 'TABLE') return this.getTableDDL(dbName, name);
    if (t === 'VIEW') return this.getViewDDL(dbName, name);
    if (t === 'PROCEDURE') return this.getProcedureDDL(dbName, name);
    if (t === 'FUNCTION') return this.getFunctionDDL(dbName, name);
    if (t === 'TRIGGER') return this.getTriggerDDL(dbName, name);
    if (t === 'EVENT') return this.getEventDDL(dbName, name);
    return '';
  }

  async getTableColumns(dbName: string, tableName: string): Promise<any[]> {
    const results = await this.driver.query<RowDataPacket[]>(
      `SELECT 
        COLUMN_NAME as name, 
        DATA_TYPE as type, 
        IS_NULLABLE as isNullable, 
        COLUMN_DEFAULT as defaultValue, 
        EXTRA as extra, 
        COLUMN_COMMENT as comment
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION`,
      [dbName, tableName],
    );

    return results.map(row => ({
      name: row.name,
      type: row.type,
      isNullable: row.isNullable === 'YES',
      defaultValue: row.defaultValue,
      extra: row.extra,
      comment: row.comment,
    }));
  }

  // --- Table Inspector (AI DBA Super Mode) ---

  async getTableStats(dbName: string): Promise<ITableStats[]> {
    try {
      const results = await this.driver.query<RowDataPacket[]>(
        `SHOW TABLE STATUS FROM \`${dbName}\``
      );
      return results
        .filter((row: any) => row.Engine !== null) // Skip views (Engine = null)
        .map((row: any) => ({
          tableName: row.Name,
          rowCount: Number(row.Rows) || 0,
          dataLengthMB: Math.round(((Number(row.Data_length) || 0) / 1024 / 1024) * 100) / 100,
          indexLengthMB: Math.round(((Number(row.Index_length) || 0) / 1024 / 1024) * 100) / 100,
          engine: row.Engine || 'unknown',
          autoIncrement: row.Auto_increment ? Number(row.Auto_increment) : null,
          collation: row.Collation || '',
          createTime: row.Create_time ? String(row.Create_time) : null,
          updateTime: row.Update_time ? String(row.Update_time) : null,
        }));
    } catch (err: any) {
      console.error(`[Introspection] Failed to get table stats for "${dbName}": ${err.message}`);
      return [];
    }
  }

  async getServerInfo(): Promise<IServerInfo> {
    try {
      const results = await this.driver.query<RowDataPacket[]>('SELECT VERSION() as version');
      const versionStr = results[0]?.version || '0.0.0';
      const parts = versionStr.split('.');
      const major = parseInt(parts[0]) || 0;
      const minor = parseInt(parts[1]) || 0;
      const patch = parseInt(parts[2]) || 0;

      return {
        version: versionStr,
        versionMajor: major,
        versionMinor: minor,
        // MySQL 8.0.12+ supports INSTANT DDL for ADD COLUMN
        hasInstantDDL: major > 8 || (major === 8 && minor > 0) || (major === 8 && minor === 0 && patch >= 12),
        // MySQL 5.6+ supports online DDL (ALGORITHM=INPLACE)
        hasOnlineDDL: major > 5 || (major === 5 && minor >= 6),
      };
    } catch (err: any) {
      console.error(`[Introspection] Failed to get server info: ${err.message}`);
      return {
        version: 'unknown',
        versionMajor: 0,
        versionMinor: 0,
        hasInstantDDL: false,
        hasOnlineDDL: false,
      };
    }
  }

  async getFKGraph(dbName: string): Promise<IFKGraphEntry[]> {
    try {
      const results = await this.driver.query<RowDataPacket[]>(
        `SELECT 
          TABLE_NAME as tableName,
          COLUMN_NAME as columnName,
          REFERENCED_TABLE_NAME as referencedTable,
          REFERENCED_COLUMN_NAME as referencedColumn,
          CONSTRAINT_NAME as constraintName
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = ? 
          AND REFERENCED_TABLE_NAME IS NOT NULL
        ORDER BY TABLE_NAME, CONSTRAINT_NAME`,
        [dbName]
      );

      // Enrich with ON DELETE / ON UPDATE from REFERENTIAL_CONSTRAINTS
      const refConstraints = await this.driver.query<RowDataPacket[]>(
        `SELECT 
          CONSTRAINT_NAME as constraintName,
          DELETE_RULE as onDelete,
          UPDATE_RULE as onUpdate
        FROM information_schema.REFERENTIAL_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = ?`,
        [dbName]
      );

      const refMap = new Map<string, { onDelete: string; onUpdate: string }>();
      for (const rc of refConstraints) {
        refMap.set((rc as any).constraintName, {
          onDelete: (rc as any).onDelete || 'RESTRICT',
          onUpdate: (rc as any).onUpdate || 'RESTRICT',
        });
      }

      return results.map((row: any) => {
        const ref = refMap.get(row.constraintName);
        return {
          tableName: row.tableName,
          columnName: row.columnName,
          referencedTable: row.referencedTable,
          referencedColumn: row.referencedColumn,
          constraintName: row.constraintName,
          onDelete: ref?.onDelete || 'RESTRICT',
          onUpdate: ref?.onUpdate || 'RESTRICT',
        };
      });
    } catch (err: any) {
      console.error(`[Introspection] Failed to get FK graph for "${dbName}": ${err.message}`);
      return [];
    }
  }
}
