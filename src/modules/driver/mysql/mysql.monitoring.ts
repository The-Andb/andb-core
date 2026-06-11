import { IDatabaseDriver, IMonitoringService } from '../../../common/interfaces/driver.interface';
import { RowDataPacket } from 'mysql2';

export class MysqlMonitoringService implements IMonitoringService {
  constructor(private readonly driver: IDatabaseDriver) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getProcessList(): Promise<any[]> {
    return this.driver.query('SHOW FULL PROCESSLIST');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getStatus(variables?: string[]): Promise<any> {
    if (variables && variables.length > 0) {
      const inClause = variables.map(v => `'${v}'`).join(', ');
      return this.driver.query(`SHOW STATUS WHERE Variable_name IN (${inClause})`);
    }
    return this.driver.query('SHOW STATUS');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getVariables(): Promise<any> {
    return this.driver.query('SHOW VARIABLES');
  }

  async getVersion(): Promise<string> {
    const result = await this.driver.query<RowDataPacket[]>('SELECT VERSION() AS version');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (result[0] as any).version;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getConnections(): Promise<any> {
    return this.driver.query(`
        SELECT COUNT(*) connections, pl.* 
          FROM information_schema.PROCESSLIST pl
         GROUP BY pl.user
         ORDER BY 1 DESC;
      `);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getTransactions(): Promise<any> {
    return this.driver.query(`
        SELECT * 
          FROM information_schema.innodb_trx 
         WHERE trx_state IS NOT NULL;
      `);
  }

  async getPulse(): Promise<{ threadsRunning: number; lockWaits: number }> {
    const rows = await this.getStatus(['Threads_running', 'Innodb_row_lock_waits', 'Innodb_current_row_locks']);
    let threadsRunning = 0;
    let lockWaits = 0;
    if (Array.isArray(rows)) {
      for (const row of rows) {
        const name = String(row.Variable_name || row.variable_name || '').toLowerCase();
        const value = parseInt(row.Value || row.value || '0', 10);
        if (name === 'threads_running') {
          threadsRunning = value;
        } else if (name === 'innodb_row_lock_waits' || name === 'innodb_current_row_locks') {
          lockWaits = value;
        }
      }
    }
    return { threadsRunning, lockWaits };
  }

  async killThread(threadId: number): Promise<void> {
    await this.driver.query(`KILL ${parseInt(threadId as any, 10)}`);
  }
}
