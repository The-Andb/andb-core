const { getLogger } = require('andb-logger');
import { IStorageDriver } from './interfaces/storage-driver.interface';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class StorageService {
  private readonly logger = getLogger({ logName: 'StorageService' });
  private driver: IStorageDriver | null = null;

  async initialize(driver: IStorageDriver, dbPath: string) {
    if (this.driver) {
      if (this.driver.getDbPath() === dbPath) return;
      await this.close();
    }

    this.driver = driver;
    if (!process.env.ANDB_QUIET) {
      this.logger.info(`Initializing storage at: ${dbPath} using ${driver.constructor.name}`);
    }
    await this.driver.initialize(dbPath);
  }



  async close() {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
    }
  }

  // --- DDL Operations ---

  async saveDDL(
    environment: string,
    database: string,
    type: string,
    name: string,
    content: string,
  ) {
    if (!this.driver) return;
    type = type.toUpperCase(); // Normalize: always store as TABLES, VIEWS, etc.
    const checksum = crypto.createHash('md5').update(content).digest('hex');
    const sql = `
      INSERT INTO ddl_exports (environment, database_name, ddl_type, ddl_name, ddl_content, checksum, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(environment, database_name, ddl_type, ddl_name) DO UPDATE SET
        ddl_content = excluded.ddl_content,
        checksum = excluded.checksum,
        updated_at = CURRENT_TIMESTAMP,
        exported_to_file = 0
    `;
    return this.driver.execute(sql, [environment, database, type, name, content, checksum]);
  }

  async saveDDLBatch(environment: string, database: string, type: string, items: { name: string; content: string }[]) {
    if (!this.driver) return;
    const sql = `
      INSERT INTO ddl_exports (environment, database_name, ddl_type, ddl_name, ddl_content, checksum, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(environment, database_name, ddl_type, ddl_name) DO UPDATE SET
        ddl_content = excluded.ddl_content,
        checksum = excluded.checksum,
        updated_at = CURRENT_TIMESTAMP,
        exported_to_file = 0
    `;

    return this.driver.transaction(async (driver) => {
      for (const item of items) {
        const checksum = crypto.createHash('md5').update(item.content).digest('hex');
        await driver.execute(sql, [environment, database, type, item.name, item.content, checksum]);
      }
    });
  }

  async getDDL(environment: string, database: string, type: string, name: string) {
    if (!this.driver) return null;
    const sql = `
      SELECT ddl_content FROM ddl_exports 
      WHERE environment = ? AND database_name = ? AND ddl_type = ? AND ddl_name = ?
    `;
    const row = await this.driver.queryOne(sql, [environment, database, type, name]) as any;
    return row ? row.ddl_content : null;
  }

  async getDDLObjects(environment: string, database: string, type: string) {
    if (!this.driver) return [];
    type = type.toUpperCase(); // Normalize: match saved format
    const sql = `
      SELECT ddl_name as name, ddl_content as content, updated_at 
      FROM ddl_exports 
      WHERE environment = ? AND database_name = ? AND ddl_type = ?
      ORDER BY ddl_name ASC
    `;
    return this.driver.queryAll(sql, [environment, database, type]);
  }

  async getDDLList(environment: string, database: string, type: string) {
    if (!this.driver) return [];
    const sql = `
      SELECT ddl_name FROM ddl_exports 
      WHERE environment = ? AND database_name = ? AND ddl_type = ?
      ORDER BY ddl_name ASC
    `;
    const rows = await this.driver.queryAll(sql, [environment, database, type]) as any[];
    return rows.map(r => r.ddl_name);
  }

  async getEnvironments() {
    if (!this.driver) return [];
    const sql = 'SELECT DISTINCT environment FROM ddl_exports ORDER BY environment ASC';
    const rows = await this.driver.queryAll(sql) as any[];
    return rows.map((r: any) => r.environment);
  }

  async getDatabases(environment: string) {
    if (!this.driver) return [];
    const sql = 'SELECT DISTINCT database_name FROM ddl_exports WHERE environment = ? ORDER BY database_name ASC';
    const rows = await this.driver.queryAll(sql, [environment]) as any[];
    return rows.map((r: any) => r.database_name);
  }

  async getLastUpdated(environment: string, database: string) {
    if (!this.driver) return null;
    const sql = 'SELECT MAX(updated_at) as last_updated FROM ddl_exports WHERE environment = ? AND database_name = ?';
    const row = await this.driver.queryOne(sql, [environment, database]) as any;
    return row ? row.last_updated : null;
  }

  // --- Comparison Operations ---

  async saveComparison(comp: {
    srcEnv: string;
    destEnv: string;
    database: string;
    type: string;
    name: string;
    status: string;
    ddl?: any;
    alterStatements?: any;
    diffSummary?: string;
  }) {
    if (!this.driver) return;
    const sql = `
      INSERT INTO comparisons (src_environment, dest_environment, database_name, ddl_type, ddl_name, status, alter_statements, diff_summary, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(src_environment, dest_environment, database_name, ddl_type, ddl_name) DO UPDATE SET
        status = excluded.status,
        alter_statements = excluded.alter_statements,
        diff_summary = excluded.diff_summary,
        updated_at = CURRENT_TIMESTAMP
    `;

    let alters = comp.alterStatements || comp.ddl || [];
    if (typeof alters === 'string') {
      try {
        if (alters.startsWith('[') || alters.startsWith('{')) {
          alters = JSON.parse(alters);
        } else {
          alters = [alters];
        }
      } catch (e) {
        alters = [alters];
      }
    }

    return this.driver.execute(sql, [
      comp.srcEnv,
      comp.destEnv,
      comp.database,
      comp.type,
      comp.name,
      comp.status,
      JSON.stringify(alters),
      comp.diffSummary || null,
    ]);
  }

  async getComparisons(srcEnv: string, destEnv: string, database: string, type: string) {
    if (!this.driver) return [];
    const sql = `
      SELECT * FROM comparisons
      WHERE src_environment = ? AND dest_environment = ? AND database_name = ? AND ddl_type = ?
      ORDER BY status ASC, ddl_name ASC
    `;
    const rows = await this.driver.queryAll(sql, [srcEnv, destEnv, database, type]) as any[];
    return rows.map((row) => this._mapComparisonToUI(row));
  }

  async getComparisonsByStatus(
    srcEnv: string,
    destEnv: string,
    database: string,
    type: string,
    status: string,
  ) {
    if (!this.driver) return [];
    const sql = `
      SELECT * FROM comparisons
      WHERE src_environment = ? AND dest_environment = ? AND database_name = ? AND ddl_type = ? AND status = ?
      ORDER BY ddl_name ASC
    `;
    const rows = await this.driver.queryAll(sql, [srcEnv, destEnv, database, type, status]) as any[];
    return rows.map((row) => this._mapComparisonToUI(row));
  }

  private _mapComparisonToUI(row: any) {
    let alters = [];
    if (row.alter_statements) {
      try {
        alters = JSON.parse(row.alter_statements);
      } catch (e) {
        alters = [row.alter_statements];
      }
    }
    return {
      name: row.ddl_name,
      status: row.status,
      type: row.ddl_type,
      ddl: alters,
      alterStatements: alters,
      diffSummary: row.diff_summary,
      updatedAt: row.updated_at,
    };
  }

  async getLatestComparisons(limit: number = 50) {
    if (!this.driver) return [];
    const sql = `
      SELECT DISTINCT src_environment, dest_environment, database_name, ddl_type, updated_at
      FROM comparisons
      ORDER BY updated_at DESC
      LIMIT ?
    `;
    return this.driver.queryAll(sql, [limit]);
  }

  // --- Snapshot Operations ---

  async saveSnapshot(
    environment: string,
    database: string,
    type: string,
    name: string,
    ddl: string,
    tag?: string,
  ) {
    if (!this.driver) return;
    const checksum = crypto.createHash('md5').update(ddl || '').digest('hex');
    const sql = `
      INSERT INTO ddl_snapshots (environment, database_name, ddl_type, ddl_name, ddl_content, checksum, version_tag)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    return this.driver.execute(sql, [environment, database, type, name, ddl, checksum, tag || null]);
  }

  async getSnapshots(environment: string, database: string, type: string, name: string) {
    if (!this.driver) return [];
    const sql = `
      SELECT id, ddl_content, version_tag, created_at, checksum
      FROM ddl_snapshots
      WHERE environment = ? AND database_name = ? AND ddl_type = ? AND ddl_name = ?
      ORDER BY created_at DESC
    `;
    return this.driver.queryAll(sql, [environment, database, type, name]);
  }

  async getAllSnapshots(limit: number = 200) {
    if (!this.driver) return [];
    const sql = `
       SELECT * FROM ddl_snapshots ORDER BY created_at DESC LIMIT ?
     `;
    return this.driver.queryAll(sql, [limit]);
  }

  // --- Migration Operations ---

  async saveMigration(history: {
    srcEnv: string;
    destEnv: string;
    database: string;
    type: string;
    name: string;
    operation: string;
    status: string;
    error?: string;
  }) {
    if (!this.driver) return;
    const sql = `
      INSERT INTO migration_history (src_environment, dest_environment, database_name, ddl_type, ddl_name, operation, status, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    return this.driver.execute(sql, [
      history.srcEnv,
      history.destEnv,
      history.database,
      history.type,
      history.name,
      history.operation,
      history.status,
      history.error || null,
    ]);
  }

  async getMigrationHistory(limit: number = 100) {
    if (!this.driver) return [];
    const sql = 'SELECT * FROM migration_history ORDER BY executed_at DESC LIMIT ?';
    return this.driver.queryAll(sql, [limit]);
  }

  // --- Maintenance ---

  async clearConnectionData(environment: string, database: string) {
    if (!this.driver) return { ddlCount: 0, comparisonCount: 0 };

    return this.driver.transaction(async (driver) => {
      const ddl = await driver.execute(
        'DELETE FROM ddl_exports WHERE environment = ? AND database_name = ?',
        [environment, database]
      );
      const comp = await driver.execute(
        'DELETE FROM comparisons WHERE (src_environment = ? OR dest_environment = ?) AND database_name = ?',
        [environment, environment, database]
      );
      return { ddlCount: ddl.changes, comparisonCount: comp.changes };
    });
  }

  async clearAll() {
    if (!this.driver) return { ddl: 0, comparison: 0, snapshot: 0, migration: 0 };
    return this.driver.transaction(async (driver) => {
      const ddl = await driver.execute('DELETE FROM ddl_exports');
      const comp = await driver.execute('DELETE FROM comparisons');
      const snap = await driver.execute('DELETE FROM ddl_snapshots');
      const mig = await driver.execute('DELETE FROM migration_history');
      return {
        ddl: ddl.changes,
        comparison: comp.changes,
        snapshot: snap.changes,
        migration: mig.changes,
      };
    });
  }

  async getStats() {
    if (!this.driver) return {};
    const ddlRow = await this.driver.queryOne('SELECT COUNT(*) as count FROM ddl_exports');
    const compRow = await this.driver.queryOne('SELECT COUNT(*) as count FROM comparisons');
    const snapRow = await this.driver.queryOne('SELECT COUNT(*) as count FROM ddl_snapshots');
    
    return {
      ddlExports: (ddlRow as any).count,
      comparisons: (compRow as any).count,
      snapshots: (snapRow as any).count,
      dbPath: this.driver.getDbPath(),
    };
  }

  /**
   * Search across all stored DDLs in a specific environment/database
   */
  async searchDDL(environment: string, database: string, query: string, flags: { caseSensitive: boolean; wholeWord: boolean; regex: boolean }) {
    if (!this.driver) return [];

    const sql = `
      SELECT ddl_type as type, ddl_name as name, ddl_content as content, updated_at
      FROM ddl_exports
      WHERE environment = ? AND database_name = ?
      AND (ddl_name LIKE ? OR ddl_content LIKE ?)
    `;

    const likeQuery = `%${query}%`;
    const rows = await this.driver.queryAll(sql, [environment, database, likeQuery, likeQuery]) as any[];

    // If flags require specific matching (regex, case sensitive), we filter here
    if (flags.regex || flags.caseSensitive || flags.wholeWord) {
      let re: RegExp;
      try {
        if (flags.regex) {
          re = new RegExp(query, flags.caseSensitive ? 'g' : 'gi');
        } else {
          const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (flags.wholeWord) {
            re = new RegExp(`\\b${escaped}\\b`, flags.caseSensitive ? 'g' : 'gi');
          } else {
            re = new RegExp(escaped, flags.caseSensitive ? 'g' : 'gi');
          }
        }
      } catch (e) {
        re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      }

      return rows.filter(row => {
        const nameMatch = re.test(row.name);
        re.lastIndex = 0;
        const contentMatch = re.test(row.content);
        re.lastIndex = 0;
        return nameMatch || contentMatch;
      });
    }

    return rows;
  }

  // --- Project Operations (TheAndb Core Domain) ---

  async saveProject(project: any) {
    if (!this.driver) return;
    const sql = `
      INSERT INTO projects (id, name, description, is_favorite, order_index, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        is_favorite = excluded.is_favorite,
        order_index = excluded.order_index,
        updated_at = CURRENT_TIMESTAMP
    `;
    await this.driver.execute(sql, [
      project.id, project.name, project.description, project.is_favorite ? 1 : 0, project.order_index || 0
    ]);
    await this._backupProjectsToJson();
  }

  async getProjects() {
    if (!this.driver) return [];
    return this.driver.queryAll('SELECT * FROM projects ORDER BY order_index ASC, created_at DESC');
  }

  async deleteProject(id: string) {
    if (!this.driver) return;
    await this.driver.execute('DELETE FROM projects WHERE id = ?', [id]);
    await this._backupProjectsToJson();
  }

  async saveProjectEnvironment(env: any) {
    if (!this.driver) return;
    const sql = `
      INSERT INTO project_environments (
        id, project_id, env_name, source_type, path, host, port, username, database_name,
        use_ssh_tunnel, ssh_host, ssh_port, ssh_username, ssh_key_path, use_ssl, is_read_only, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        project_id = excluded.project_id,
        env_name = excluded.env_name,
        source_type = excluded.source_type,
        path = excluded.path,
        host = excluded.host,
        port = excluded.port,
        username = excluded.username,
        database_name = excluded.database_name,
        use_ssh_tunnel = excluded.use_ssh_tunnel,
        ssh_host = excluded.ssh_host,
        ssh_port = excluded.ssh_port,
        ssh_username = excluded.ssh_username,
        ssh_key_path = excluded.ssh_key_path,
        use_ssl = excluded.use_ssl,
        is_read_only = excluded.is_read_only,
        updated_at = CURRENT_TIMESTAMP
    `;
    await this.driver.execute(sql, [
      env.id, env.project_id, env.env_name, env.source_type, env.path, env.host, env.port, env.username, env.database_name,
      env.use_ssh_tunnel ? 1 : 0, env.ssh_host, env.ssh_port, env.ssh_username, env.ssh_key_path, env.use_ssl ? 1 : 0, env.is_read_only ? 1 : 0
    ]);
    await this._backupProjectsToJson();
  }

  async getProjectEnvironments(projectId: string) {
    if (!this.driver) return [];
    return this.driver.queryAll('SELECT * FROM project_environments WHERE project_id = ? ORDER BY created_at ASC', [projectId]);
  }

  async deleteProjectEnvironment(id: string) {
    if (!this.driver) return;
    await this.driver.execute('DELETE FROM project_environments WHERE id = ?', [id]);
    await this._backupProjectsToJson();
  }

  // --- Settings Operations ---

  async saveProjectSetting(projectId: string, key: string, value: string) {
    if (!this.driver) return;
    const sql = `
      INSERT INTO project_settings (project_id, setting_key, setting_value, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(project_id, setting_key) DO UPDATE SET
        setting_value = excluded.setting_value,
        updated_at = CURRENT_TIMESTAMP
    `;
    await this.driver.execute(sql, [projectId, key, value]);
    await this._backupProjectsToJson();
  }

  async getProjectSettings(projectId: string) {
    if (!this.driver) return {};
    const rows = await this.driver.queryAll('SELECT setting_key, setting_value FROM project_settings WHERE project_id = ?', [projectId]);
    const settings: any = {};
    (rows as any[]).forEach((r) => settings[r.setting_key] = r.setting_value);
    return settings;
  }

  async saveUserSetting(key: string, value: string) {
    if (!this.driver) return;
    const sql = `
      INSERT INTO user_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `;
    await this.driver.execute(sql, [key, value]);
  }

  async getUserSettings() {
    if (!this.driver) return {};
    const rows = await this.driver.queryAll('SELECT * FROM user_settings');
    const settings: any = {};
    (rows as any[]).forEach((r) => settings[r.key] = r.value);
    return settings;
  }

  // --- Resilience Migration Tool (BaseOne Standard) ---

  private async _backupProjectsToJson() {
    if (!this.driver) return;
    try {
      const projects = await this.getProjects();
      for (const p of projects as any[]) {
        p.environments = await this.getProjectEnvironments(p.id);
        p.settings = await this.getProjectSettings(p.id);
      }
      
      const backupDir = path.join(os.homedir(), '.andb', 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      const backupPath = path.join(backupDir, 'projects_backup.json');
      fs.writeFileSync(backupPath, JSON.stringify(projects, null, 2), 'utf-8');
    } catch (e: any) {
      this.logger.error(`Failed to backup projects: ${e.message}`);
    }
  }

  public async restoreFromBackup() {
    if (!this.driver) return;
    try {
      const backupPath = path.join(os.homedir(), '.andb', 'backups', 'projects_backup.json');
      if (!fs.existsSync(backupPath)) return;
      
      const content = fs.readFileSync(backupPath, 'utf-8');
      const projects = JSON.parse(content);
      
      await this.driver.transaction(async (drv) => {
        for (const p of projects) {
          await drv.execute(`
            INSERT OR IGNORE INTO projects (id, name, description, is_favorite, order_index)
            VALUES (?, ?, ?, ?, ?)
          `, [p.id, p.name, p.description, p.is_favorite, p.order_index]);
          
          if (p.environments) {
            for (const env of p.environments) {
              await drv.execute(`
                INSERT OR IGNORE INTO project_environments (
                  id, project_id, env_name, source_type, path, host, port, username, database_name,
                  use_ssh_tunnel, ssh_host, ssh_port, ssh_username, ssh_key_path, use_ssl, is_read_only
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                env.id, env.project_id, env.env_name, env.source_type, env.path,
                env.host, env.port, env.username, env.database_name,
                env.use_ssh_tunnel, env.ssh_host, env.ssh_port, env.ssh_username,
                env.ssh_key_path, env.use_ssl, env.is_read_only
              ]);
            }
          }
          
          if (p.settings) {
            for (const key of Object.keys(p.settings)) {
              await drv.execute(`
                INSERT OR IGNORE INTO project_settings (project_id, setting_key, setting_value)
                VALUES (?, ?, ?)
              `, [p.id, key, p.settings[key]]);
            }
          }
        }
      });
      this.logger.info('BaseOne data resilience: Successfully restored projects from JSON backup');
    } catch (e: any) {
      this.logger.error(`Failed to restore projects from backup: ${e.message}`);
    }
  }

}
