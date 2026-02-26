import {
  IIntrospectionService,
  IDatabaseDriver,
} from '../../../common/interfaces/driver.interface';
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
      return this._normalizeDDL(ddl);
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
}
