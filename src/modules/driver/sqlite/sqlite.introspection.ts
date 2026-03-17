import {
  IIntrospectionService,
  IDatabaseDriver,
} from '../../../common/interfaces/driver.interface';
import { ParserService } from '../../parser/parser.service';
import * as crypto from 'crypto';

export class SqliteIntrospectionService implements IIntrospectionService {
  constructor(
    private readonly driver: IDatabaseDriver,
    private readonly parser: ParserService,
  ) {}

  async listTables(_dbName: string): Promise<string[]> {
    const results = await this.driver.query(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
    );
    return results.map((row: any) => row.name);
  }

  async listViews(_dbName: string): Promise<string[]> {
    const results = await this.driver.query(
      `SELECT name FROM sqlite_master WHERE type='view'`
    );
    return results.map((row: any) => row.name);
  }

  async listProcedures(_dbName: string): Promise<string[]> {
    return [];
  }

  async listFunctions(_dbName: string): Promise<string[]> {
    return [];
  }

  async listTriggers(_dbName: string): Promise<string[]> {
    const results = await this.driver.query(
      `SELECT name FROM sqlite_master WHERE type='trigger'`
    );
    return results.map((row: any) => row.name);
  }

  async listEvents(_dbName: string): Promise<string[]> {
    return [];
  }

  private _normalizeDDL(ddl: string): string {
    return this.parser.cleanDefiner(ddl || '');
  }

  async getTableDDL(_dbName: string, tableName: string): Promise<string> {
    const result: any[] = await this.driver.query(
      `SELECT sql FROM sqlite_master WHERE type='table' AND name = ?`,
      [tableName]
    );
    if (!result || result.length === 0) return '';
    return this._normalizeDDL(result[0].sql);
  }

  async getViewDDL(_dbName: string, viewName: string): Promise<string> {
    const result: any[] = await this.driver.query(
      `SELECT sql FROM sqlite_master WHERE type='view' AND name = ?`,
      [viewName]
    );
    if (!result || result.length === 0) return '';
    return this._normalizeDDL(result[0].sql);
  }

  async getProcedureDDL(_dbName: string, _procName: string): Promise<string> {
    return '';
  }

  async getFunctionDDL(_dbName: string, _funcName: string): Promise<string> {
    return '';
  }

  async getTriggerDDL(_dbName: string, triggerName: string): Promise<string> {
    const result: any[] = await this.driver.query(
      `SELECT sql FROM sqlite_master WHERE type='trigger' AND name = ?`,
      [triggerName]
    );
    if (!result || result.length === 0) return '';
    return this._normalizeDDL(result[0].sql);
  }

  async getEventDDL(_dbName: string, _eventName: string): Promise<string> {
    return '';
  }

  async getChecksums(dbName: string): Promise<Record<string, string>> {
    const tables = await this.listTables(dbName);
    const map: Record<string, string> = {};
    for (const name of tables) {
      const ddl = await this.getTableDDL(dbName, name);
      const hash = crypto.createHash('md5').update(ddl || '').digest('hex');
      map[name] = `${hash}|`;
    }
    return map;
  }

  async getObjectDDL(dbName: string, type: string, name: string): Promise<string> {
    const t = type.toUpperCase().replace(/S$/, '');
    if (t === 'TABLE') return this.getTableDDL(dbName, name);
    if (t === 'VIEW') return this.getViewDDL(dbName, name);
    if (t === 'TRIGGER') return this.getTriggerDDL(dbName, name);
    return '';
  }

  async getTableColumns(_dbName: string, tableName: string): Promise<any[]> {
    // PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
    const results: any[] = await this.driver.query(`PRAGMA table_info("${tableName}")`);
    
    return results.map(row => ({
      name: row.name,
      type: row.type,
      isNullable: row.notnull === 0,
      defaultValue: row.dflt_value,
      extra: row.pk ? 'PRIMARY KEY' : '',
      comment: '',
    }));
  }
}
