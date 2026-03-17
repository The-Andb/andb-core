import { IDatabaseDriver, IMonitoringService } from '../../../common/interfaces/driver.interface';

export class SqliteMonitoringService implements IMonitoringService {
  constructor(private readonly driver: IDatabaseDriver) {}

  async getProcessList(): Promise<any[]> {
    return []; // Embedded DB, no active process lists usually tracked
  }

  async getStatus(): Promise<any> {
    return {};
  }

  async getVariables(): Promise<any> {
    return {};
  }

  async getVersion(): Promise<string> {
    try {
      const result = await this.driver.query('SELECT sqlite_version() AS version');
      return result[0]?.version || '3.x';
    } catch {
      return '3.x';
    }
  }

  async getConnections(): Promise<any> {
    return [{ connections: 1, user: 'local' }];
  }

  async getTransactions(): Promise<any> {
    return [];
  }
}
