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

  async getPulse(): Promise<{
    threadsRunning: number;
    lockWaits: number;
    queriesPerSec: number;
    activeConnections: number;
    maxConnections: number;
    uptimeSeconds: number;
  }> {
    const statusRows = await this.getStatus([
      'Threads_running',
      'Threads_connected',
      'Innodb_row_lock_waits',
      'Innodb_current_row_locks',
      'Queries',
      'Uptime',
    ]);

    let threadsRunning = 0;
    let lockWaits = 0;
    let queriesTotal = 0;
    let uptimeSeconds = 1;
    let activeConnections = 0;

    if (Array.isArray(statusRows)) {
      for (const row of statusRows) {
        const name = String(row.Variable_name || row.variable_name || '').toLowerCase();
        const value = parseInt(row.Value || row.value || '0', 10);
        if (name === 'threads_running') threadsRunning = value;
        else if (name === 'threads_connected') activeConnections = value;
        else if (name === 'innodb_row_lock_waits' || name === 'innodb_current_row_locks') lockWaits = value;
        else if (name === 'queries') queriesTotal = value;
        else if (name === 'uptime') uptimeSeconds = value || 1;
      }
    }

    // Fetch max_connections from VARIABLES
    let maxConnections = 151; // MySQL default
    try {
      const varRows = await this.driver.query<RowDataPacket[]>(
        `SHOW VARIABLES WHERE Variable_name = 'max_connections'`
      );
      if (Array.isArray(varRows) && varRows[0]) {
        maxConnections = parseInt((varRows[0] as any).Value || '151', 10);
      }
    } catch (_e) { /* ignore */ }

    const queriesPerSec = uptimeSeconds > 0 ? Math.round(queriesTotal / uptimeSeconds) : 0;

    return { threadsRunning, lockWaits, queriesPerSec, activeConnections, maxConnections, uptimeSeconds };
  }

  /**
   * Full monitoring snapshot: pulse stats + processlist (with trx enrichment) + lock tree.
   * Uses a single open connection — call this instead of calling getPulse + getProcessList separately.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getFullSnapshot(): Promise<{
    pulse: Awaited<ReturnType<MysqlMonitoringService['getPulse']>>;
    processList: any[];
    lockTree: any[];
  }> {
    // 1. Pulse stats
    const pulse = await this.getPulse();

    // 2. Processlist
    const rawProcessList: any[] = await this.getProcessList();

    // 3. Active transactions (for Idle Trx detection)
    const activeTrxThreadIds = new Set<number>();
    try {
      const trxRows: any[] = await this.getTransactions();
      if (Array.isArray(trxRows)) {
        for (const t of trxRows) {
          const tid = t.trx_mysql_thread_id ?? t.trx_id;
          if (tid) activeTrxThreadIds.add(Number(tid));
        }
      }
    } catch (_e) { /* ignore — no performance_schema access */ }

    // 4. Lock tree from innodb_trx cross-join (MySQL 5.7/8 compat)
    const lockTree: any[] = [];
    try {
      const lockRows: any[] = await this.driver.query(`
        SELECT
          r.trx_id AS waiting_trx_id,
          r.trx_mysql_thread_id AS waiting_thread_id,
          r.trx_query AS waiting_query,
          r.trx_state AS waiting_state,
          b.trx_id AS blocking_trx_id,
          b.trx_mysql_thread_id AS blocking_thread_id,
          b.trx_query AS blocking_query,
          b.trx_state AS blocking_state
        FROM information_schema.innodb_trx b
        JOIN information_schema.innodb_trx r
          ON b.trx_id != r.trx_id
         AND r.trx_state = 'LOCK WAIT'
        LIMIT 20
      `);
      lockTree.push(...(Array.isArray(lockRows) ? lockRows : []));
    } catch (_e) { /* ignore */ }

    // 5. Enrich processlist with has_active_trx flag
    const enrichedProcessList = (Array.isArray(rawProcessList) ? rawProcessList : []).map((p: any) => ({
      ID: p.Id ?? p.id ?? p.ID ?? 0,
      USER: p.User ?? p.user ?? p.USER ?? '',
      HOST: p.Host ?? p.host ?? p.HOST ?? '',
      DB: p.Db ?? p.db ?? p.DB ?? '',
      COMMAND: p.Command ?? p.command ?? p.COMMAND ?? '',
      TIME: p.Time ?? p.time ?? p.TIME ?? 0,
      STATE: p.State ?? p.state ?? p.STATE ?? '',
      INFO: p.Info ?? p.info ?? p.INFO ?? '',
      has_active_trx: activeTrxThreadIds.has(Number(p.Id ?? p.id ?? p.ID ?? 0)) ? 1 : 0,
      trx_started: null,
    }));

    return { pulse, processList: enrichedProcessList, lockTree };
  }

  async killThread(threadId: number): Promise<void> {
    await this.driver.query(`KILL ${parseInt(threadId as any, 10)}`);
  }
}
