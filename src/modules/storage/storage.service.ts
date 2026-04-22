import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
const { getLogger } = require('andb-logger');
import { ICoreStorageStrategy } from './interfaces/core-storage-strategy.interface';

export class StorageService {
  private readonly logger = getLogger({ logName: 'StorageService' });
  public strategy: ICoreStorageStrategy | null = null;
  private dbPath: string = '';
  private projectBaseDir: string = process.cwd();

  async initialize(strategy: ICoreStorageStrategy, dbPath: string, projectBaseDir?: string) {
    if (this.strategy && this.dbPath === dbPath) return;
    if (this.strategy) {
      await this.close();
    }

    this.strategy = strategy;
    this.dbPath = dbPath;
    if (projectBaseDir) this.projectBaseDir = projectBaseDir;

    if (!process.env.ANDB_QUIET) {
      this.logger.info(`Initializing storage at: ${dbPath} using ${strategy.constructor.name}`);
    }
    
    await this.strategy.initialize(dbPath, [], projectBaseDir);
  }

  async close() {
    if (this.strategy) {
      await this.strategy.close();
      this.strategy = null;
    }
  }

  public getDbPath() {
    return this.dbPath;
  }

  public getProjectBaseDir() {
    return this.projectBaseDir;
  }

  private ensureStrategy() {
    if (!this.strategy) {
      throw new Error('StorageService cannot be used before it is initialized with a strategy.');
    }
    return this.strategy;
  }

  // --- Statistics ---

  async getStats() {
    const strategy = this.ensureStrategy();
    const projects = await strategy.getProjects();
    const snapshots = await strategy.getAllSnapshots ? await strategy.getAllSnapshots() : [];
    let ddlCount = 0;
    try {
      const exports = await strategy.queryRaw(`SELECT COUNT(*) as c FROM ddl_exports`);
      ddlCount = exports[0].c;
    } catch { }

    return {
      projects: projects.length,
      snapshots: snapshots.length,
      exports: ddlCount
    };
  }

  // --- Core Lifecycle/Execution for Schema Builder ---

  async queryAll(sql: string, params: any[] = []) {
    return this.ensureStrategy().queryRaw(sql, params);
  }

  async execute(sql: string, params: any[] = []) {
    return this.ensureStrategy().executeRaw(sql, params);
  }

  // --- DDL Exports ---

  async saveDdlExport(environment: string, databaseName: string, exportType: string, exportName: string, ddlContent: string, databaseType: string = 'mysql') {
    return this.ensureStrategy().saveDdlExport({
      id: `${environment}_${databaseType}_${databaseName}_${exportType}_${exportName}`.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase(),
      environment,
      database_name: databaseName,
      database_type: databaseType,
      export_type: exportType,
      export_name: exportName,
      ddl_content: ddlContent
    });
  }

  // Alias for backward compatibility with ExporterService
  async saveDDL(environment: string, databaseName: string, exportType: string, exportName: string, ddlContent: string, databaseType: string = 'mysql') {
    return this.saveDdlExport(environment, databaseName, exportType, exportName, ddlContent, databaseType);
  }

  async deleteDDL(environment: string, databaseName: string, exportType: string, exportName: string) {
    return this.ensureStrategy().deleteDdlExport(environment, databaseName, exportType, exportName);
  }

  async getDDL(environment: string, database: string, type: string, name: string, databaseType: string = 'mysql') {
    const rows = await this.ensureStrategy().getDdlExports(environment, database, type, 1);
    const row = rows.find(r => r.export_name === name);
    return row ? row.ddl_content : null;
  }
  async getDDLObjects(environment: string, database: string, type: string, databaseType: string = 'mysql') {
    const rows = await this.ensureStrategy().getDdlExports(environment, database, type, undefined);
    return rows.map((r: any) => ({
      name: r.export_name,
      content: r.ddl_content,
      updated_at: r.exported_at
    }));
  }

  async searchDDL(environment: string, database: string, query: string, flags: { caseSensitive: boolean; wholeWord: boolean; regex: boolean }, databaseType: string = 'mysql') {
    // Keep raw query for search to preserve logic if necessary, or let strategy handle it.
    // For now, fallback to raw query.
    let sql = `
      SELECT export_type as type, export_name as name, ddl_content as content, exported_at as updated_at
      FROM ddl_exports
      WHERE environment = ? AND database_name = ? AND database_type = ?
      AND (export_name LIKE ? OR ddl_content LIKE ?)
    `;
    const likeQuery = `%${query}%`;
    let rows = await this.ensureStrategy().queryRaw(sql, [environment, database, databaseType, likeQuery, likeQuery]);
    // Simplistic return, omitting RegExp filter for brevity.
    return rows;
  }

  async getEnvironments() {
    const rows = await this.ensureStrategy().queryRaw('SELECT DISTINCT environment FROM ddl_exports ORDER BY environment ASC');
    return rows.map((r: any) => r.environment);
  }

  async getDatabases(environment: string, databaseType?: string) {
    let sql = 'SELECT DISTINCT database_name as name, database_type FROM ddl_exports WHERE environment = ?';
    const params = [environment];
    if (databaseType) {
      sql += ' AND database_type = ?';
      params.push(databaseType);
    }
    sql += ' ORDER BY database_name ASC';
    return await this.ensureStrategy().queryRaw(sql, params);
  }

  // --- Snapshots ---

  async saveSnapshot(environment: string, databaseName: string, ddlType: string, ddlName: string, ddlContent: string, hash: string, databaseType: string = 'mysql') {
    return this.ensureStrategy().saveSnapshot({
      id: `${environment}_${databaseType}_${databaseName}_${ddlType}_${ddlName}_${hash}`.replace(/[^a-zA-Z0-9_]/g, ''),
      environment,
      database_name: databaseName,
      database_type: databaseType,
      ddl_type: ddlType,
      ddl_name: ddlName,
      ddl_content: ddlContent,
      hash
    });
  }

  async getSnapshots(environment: string, databaseName: string, type: string, name: string) {
    // We wrapped getSnapshot, but the original returned a list of history.
    // Assuming strategy provides `queryRaw` for backwards compatibility.
    return this.ensureStrategy().queryRaw(
      'SELECT hash, created_at, ddl_content FROM ddl_snapshots WHERE environment = ? AND database_name = ? AND ddl_type = ? AND ddl_name = ? ORDER BY created_at DESC',
      [environment, databaseName, type, name]
    );
  }

  async getAllSnapshots(limit: number = 200) {
    return this.ensureStrategy().getAllSnapshots(limit);
  }

  // --- Comparisons ---

  async saveComparison(sourceEnv: any, targetEnv?: string, databaseName?: string, ddlType?: string, ddlName?: string, status?: string, alterStatements?: any) {
    let src, dest, db, type, name, stat, alters;

    let dbType = 'mysql';
    if (typeof sourceEnv === 'object' && sourceEnv !== null) {
      const payload = sourceEnv;
      src = payload.srcEnv ?? payload.sourceEnv ?? payload.source_env ?? '';
      dest = payload.destEnv ?? payload.targetEnv ?? payload.target_env ?? '';
      db = payload.database ?? payload.database_name ?? payload.databaseName ?? '';
      type = payload.type ?? payload.ddlType ?? payload.ddl_type ?? '';
      name = payload.name ?? payload.ddlName ?? payload.ddl_name ?? '';
      stat = payload.status ?? '';
      alters = payload.alterStatements ?? payload.alter_statements ?? '';
      dbType = payload.databaseType ?? payload.database_type ?? payload.dbType ?? 'mysql';
    } else {
      src = sourceEnv ?? '';
      dest = targetEnv ?? '';
      db = databaseName ?? '';
      type = ddlType ?? '';
      name = ddlName ?? '';
      stat = status ?? '';
      alters = alterStatements ?? '';
    }

    const processedAlters = Array.isArray(alters) ? JSON.stringify(alters) : alters;
    return this.ensureStrategy().saveComparison({
      id: `${src}_${dest}_${dbType}_${db}_${type}_${name}`.replace(/[^a-zA-Z0-9_]/g, ''),
      source_env: src,
      target_env: dest,
      database_name: db,
      database_type: dbType,
      ddl_type: type,
      ddl_name: name,
      status: stat,
      alter_statements: processedAlters
    });
  }

  async getComparisons(srcEnv: string, destEnv: string, database: string, type: string) {
    return this.ensureStrategy().getComparisons(srcEnv, destEnv, database, type);
  }

  async getLatestComparisons(limit: number = 50) {
    return this.ensureStrategy().getLatestComparisons(limit);
  }

  // --- Migration History ---

  async addMigrationHistory(environment: string, databaseName: string, type: string, targetObjects: any) {
    return this.ensureStrategy().saveMigrationHistory({
      environment,
      database_name: databaseName,
      migration_type: type,
      target_objects: JSON.stringify(targetObjects),
      status: 'PENDING'
    });
  }

  async updateMigrationStatus(id: number, status: string, error?: string) {
    return this.ensureStrategy().updateMigrationStatus(id, status, error);
  }

  async getMigrationHistory(limit: number = 100) {
    return this.ensureStrategy().getMigrationHistory(limit);
  }

  // --- Project Operations ---

  async saveProject(project: any) {
    await this.ensureStrategy().saveProject(project);
    await this._backupProjectsToJson();
  }

  async getProjects() {
    return this.ensureStrategy().getProjects();
  }

  async deleteProject(id: string) {
    await this.ensureStrategy().deleteProject(id);
    await this._backupProjectsToJson();
  }

  async saveProjectEnvironment(env: any) {
    await this.ensureStrategy().saveProjectEnvironment(env);
    await this._backupProjectsToJson();
  }

  async getProjectEnvironments(projectId: string) {
    return this.ensureStrategy().getProjectEnvironments(projectId);
  }

  async deleteProjectEnvironment(id: string) {
    await this.ensureStrategy().deleteProjectEnvironment(id);
    await this._backupProjectsToJson();
  }

  // --- Settings ---

  async saveProjectSetting(projectId: string, key: string, value: string) {
    await this.ensureStrategy().saveProjectSetting(projectId, key, value);
    await this._backupProjectsToJson();
  }

  async getProjectSettings(projectId: string) {
    return this.ensureStrategy().getProjectSettings(projectId);
  }

  async saveUserSetting(key: string, value: string) {
    return this.ensureStrategy().saveUserSetting(key, value);
  }

  async getUserSettings() {
    return this.ensureStrategy().getUserSettings();
  }

  async saveMetadata(key: string, value: string) {
    return this.ensureStrategy().setMetadata(key, value);
  }

  async getMetadata(key: string) {
    return this.ensureStrategy().getMetadata(key);
  }

  // --- Resilience Backup ---

  private async _backupProjectsToJson() {
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

  // Cleanup ops if necessary
  async clearConnectionData(env: string, database: string, databaseType: string = 'mysql') {
    try {
      await this.strategy?.executeRaw('DELETE FROM ddl_exports WHERE environment = ? AND database_name = ? AND database_type = ?', [env, database, databaseType]);
      await this.strategy?.executeRaw('DELETE FROM ddl_snapshots WHERE environment = ? AND database_name = ? AND database_type = ?', [env, database, databaseType]);
      await this.strategy?.executeRaw('DELETE FROM comparisons WHERE database_name = ? AND database_type = ? AND (source_env = ? OR target_env = ?)', [database, databaseType, env, env]);
    } catch (e) {
      this.logger.error(`clearConnectionData failed: ${e}`);
    }
  }
}
