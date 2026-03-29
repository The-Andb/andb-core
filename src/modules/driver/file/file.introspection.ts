import { IIntrospectionService } from '../../../common/interfaces/driver.interface';

/**
 * Interface for FileDriver internal methods needed by Introspection
 */
interface IFileDriver {
  listObjects(type: string): Promise<string[]>;
  readObject(type: string, name: string): Promise<string>;
}

/**
 * Introspection service that reads DDLs from the filesystem.
 * Mapping: {plural_type}/{object_name}.sql
 */
export class FileIntrospectionService implements IIntrospectionService {
  constructor(private readonly driver: IFileDriver) { }

  private async _list(type: string): Promise<string[]> {
    return this.driver.listObjects(type);
  }

  async listTables(): Promise<string[]> {
    return this._list('tables');
  }
  async listViews(): Promise<string[]> {
    return this._list('views');
  }
  async listProcedures(): Promise<string[]> {
    return this._list('procedures');
  }
  async listFunctions(): Promise<string[]> {
    return this._list('functions');
  }
  async listTriggers(): Promise<string[]> {
    return this._list('triggers');
  }
  async listEvents(): Promise<string[]> {
    return this._list('events');
  }

  async getTableDDL(db: string, name: string): Promise<string> {
    return this.driver.readObject('tables', name);
  }
  async getViewDDL(db: string, name: string): Promise<string> {
    return this.driver.readObject('views', name);
  }
  async getProcedureDDL(db: string, name: string): Promise<string> {
    return this.driver.readObject('procedures', name);
  }
  async getFunctionDDL(db: string, name: string): Promise<string> {
    return this.driver.readObject('functions', name);
  }
  async getTriggerDDL(db: string, name: string): Promise<string> {
    return this.driver.readObject('triggers', name);
  }
  async getEventDDL(db: string, name: string): Promise<string> {
    return this.driver.readObject('events', name);
  }

  async getChecksums(): Promise<Record<string, string>> {
    // For now, return empty. In the future, we could hash file contents.
    return {};
  }

  async getObjectDDL(db: string, type: string, name: string): Promise<string> {
    const t = type.toLowerCase();
    // Normalize type for folder mapping (e.g., 'table' -> 'tables')
    const folder = t.endsWith('s') ? t : `${t}s`;
    return this.driver.readObject(folder, name);
  }

  async getTableColumns(db: string, tableName: string): Promise<any[]> {
    return [];
  }

  // Table Inspector stubs (not available for file-based drivers)
  async getTableStats(): Promise<any[]> { return []; }
  async getServerInfo(): Promise<any> {
    return { version: 'file', versionMajor: 0, versionMinor: 0, hasInstantDDL: false, hasOnlineDDL: false };
  }
  async getFKGraph(): Promise<any[]> { return []; }
}
