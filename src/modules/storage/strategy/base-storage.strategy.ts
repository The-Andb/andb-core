import { DataSource } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import { ICoreStorageStrategy } from '../interfaces/core-storage-strategy.interface';
import { Project, ProjectEnvironment, ProjectSetting, CliSetting, DdlExport, DdlSnapshot, ComparisonResult, MigrationHistory } from '../interfaces/core-domain.types';

// We import the entities that exist in Core
import {
  ProjectEntity,
  ProjectEnvironmentEntity,
  ProjectSettingEntity,
  CliSettingEntity,
  DdlExportEntity,
  DdlSnapshotEntity,
  ComparisonEntity,
  MigrationHistoryEntity
} from '../entities/core';

export abstract class BaseStorageStrategy implements ICoreStorageStrategy {
  protected dataSource: DataSource | null = null;
  protected dbPath: string = '';
  protected projectBaseDir: string = process.cwd();
  protected activeProjectName: string = 'default';
  protected isProjectScoped: boolean = false;

  public getDataSource() {
    return this.dataSource;
  }


  /**
   * Initialize the SQLite Data Source.
   * Host applications (CLI, Desktop) can inject extra entities.
   */
  async initialize(dbPath: string, extraEntities: any[] = [], projectBaseDir?: string): Promise<void> {
    this.dbPath = dbPath;
    if (projectBaseDir) {
      this.setProjectBaseDir(projectBaseDir);
    }

    // Ensure dir exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    this.dataSource = new DataSource({
      type: 'better-sqlite3',
      database: dbPath,
      entities: [
        ProjectEntity, ProjectEnvironmentEntity, ProjectSettingEntity,
        CliSettingEntity, DdlExportEntity, DdlSnapshotEntity,
        ComparisonEntity, MigrationHistoryEntity,
        ...extraEntities
      ],
      synchronize: true,
      logging: false
    });

    await this.dataSource.initialize();
    await this.healMalformedColumns();
    await this.runDataMigrations();
  }

  private async healMalformedColumns(): Promise<void> {
    if (!this.dataSource) return;
    try {
      // Check if the dreaded '[object Object]' column exists in ddl_exports
      const tableInfo = await this.dataSource.query("PRAGMA table_info(ddl_exports)");
      const hasBadCol = tableInfo.some((col: any) => col.name === '[object Object]' || col.name === 'object Object');
      
      if (hasBadCol) {
        console.warn('⚠️ [Healing] Malformed column detected in ddl_exports. Attempting to repair table...');
        // SQLite doesn't support DROP COLUMN on older versions (pre 3.35), 
        // but Since better-sqlite3 usually uses modern SQLite, we can try.
        // If not, we'd need to recreate the table. Let's try the modern way first.
        try {
          await this.dataSource.query('ALTER TABLE "ddl_exports" DROP COLUMN "[object Object]"');
        } catch (e) {
          try {
            await this.dataSource.query('ALTER TABLE "ddl_exports" DROP COLUMN "object Object"');
          } catch (e2) {}
        }
        console.log('✅ [Healing] Table ddl_exports repaired.');
      }
    } catch (e: any) {
      console.error('[Healing] Failed to repair table:', e.message);
    }
  }

  protected async runDataMigrations(): Promise<void> {
    if (!this.dataSource) return;
    try {
      // Phase 3: Storage Dogfooding Standardization
      // Fix legacy ddl_exports records where export_type or export_name are empty

      // Update export_type based on ddl_content keyword matching
      await this.dataSource.query(`
        UPDATE ddl_exports 
        SET export_type = 'TABLES' 
        WHERE (export_type = '' OR export_type IS NULL) 
          AND ddl_content LIKE '%CREATE TABLE%'
      `);
      await this.dataSource.query(`
        UPDATE ddl_exports 
        SET export_type = 'VIEWS' 
        WHERE (export_type = '' OR export_type IS NULL) 
          AND ddl_content LIKE '%CREATE VIEW%'
      `);
      await this.dataSource.query(`
        UPDATE ddl_exports 
        SET export_type = 'PROCEDURES' 
        WHERE (export_type = '' OR export_type IS NULL) 
          AND ddl_content LIKE '%CREATE PROCEDURE%'
      `);
      await this.dataSource.query(`
        UPDATE ddl_exports 
        SET export_type = 'FUNCTIONS' 
        WHERE (export_type = '' OR export_type IS NULL) 
          AND ddl_content LIKE '%CREATE FUNCTION%'
      `);
      await this.dataSource.query(`
        UPDATE ddl_exports 
        SET export_type = 'TRIGGERS' 
        WHERE (export_type = '' OR export_type IS NULL) 
          AND ddl_content LIKE '%CREATE TRIGGER%'
      `);

      // Try to backfill export_name if it's empty, possibly restoring from old 'ddl_name' column if it still exists in sqlite_master
      try {
        const tableInfo = await this.dataSource.query("PRAGMA table_info(ddl_exports)");
        const hasDdlName = tableInfo.some((col: any) => col.name === 'ddl_name');
        if (hasDdlName) {
          await this.dataSource.query(`
             UPDATE ddl_exports 
             SET export_name = ddl_name 
             WHERE (export_name = '' OR export_name IS NULL) AND ddl_name IS NOT NULL
           `);
        }
      } catch (e) {
        // Ignore column check error
      }

      // Self-check & Heal: Delete critically broken rows (null refs)
      await this.dataSource.query(`
        DELETE FROM ddl_exports 
        WHERE environment IS NULL OR environment = '' 
           OR database_name IS NULL OR database_name = ''
      `);

      // Vault Database Type Isolation Migration
      await this.migrateLegacyVaultStructure();

    } catch (e: any) {
      console.error('[BaseStorageStrategy] Data Migration Failed:', e.message);
    }
  }

  /**
   * Data Migration: Vault Database Type Isolation
   * Relocates legacy "flat" storage to engine-specific subfolders.
   */
  private async migrateLegacyVaultStructure(): Promise<void> {
    if (!this.dataSource) return;

    // 1. Backfill NULL/empty database_type for existing records (default to 'mysql')
    await this.dataSource.query("UPDATE ddl_exports SET database_type = 'mysql' WHERE database_type IS NULL OR database_type = ''");
    await this.dataSource.query("UPDATE ddl_snapshots SET database_type = 'mysql' WHERE database_type IS NULL OR database_type = ''");
    await this.dataSource.query("UPDATE comparisons SET database_type = 'mysql' WHERE database_type IS NULL OR database_type = ''");

    // 2. Relocate DDL Exports
    const exports = await this.ds.getRepository(DdlExportEntity).find();
    for (const r of exports) {
      const dbType = (r.database_type || 'mysql').toLowerCase();
      // Only relocate if path exists and doesn't already contain the engine subfolder
      if (r.file_path && !r.file_path.includes(`/${dbType}/`)) {
        const oldPath = path.join(this.projectBaseDir, r.file_path);
        const extType = (r.export_type || 'unknown').toLowerCase();
        const newRelPath = `db/${r.environment}/${dbType}/${r.database_name}/${extType}/${r.export_name}.sql`;
        const newPath = path.join(this.projectBaseDir, newRelPath);

        if (fs.existsSync(oldPath)) {
          console.log(`[Migration] Relocating DDL export: ${r.file_path} -> ${newRelPath}`);
          const newDir = path.dirname(newPath);
          if (!fs.existsSync(newDir)) fs.mkdirSync(newDir, { recursive: true });
          fs.renameSync(oldPath, newPath);
          r.file_path = newRelPath;
          await this.ds.getRepository(DdlExportEntity).save(r);
        }
      }
    }

    // 3. Relocate Snapshots
    const snapshots = await this.ds.getRepository(DdlSnapshotEntity).find();
    for (const r of snapshots) {
      const dbType = (r.database_type || 'mysql').toLowerCase();
      if (r.file_path && !r.file_path.includes(`/${dbType}/`)) {
        const oldPath = path.join(this.projectBaseDir, r.file_path);
        const extType = (r.ddl_type || 'unknown').toLowerCase();
        const newRelPath = `db/${r.environment}/${dbType}/${r.database_name}/.snapshots/${extType}/${r.ddl_name}.sql`;
        const newPath = path.join(this.projectBaseDir, newRelPath);

        if (fs.existsSync(oldPath)) {
          console.log(`[Migration] Relocating Snapshot: ${r.file_path} -> ${newRelPath}`);
          const newDir = path.dirname(newPath);
          if (!fs.existsSync(newDir)) fs.mkdirSync(newDir, { recursive: true });
          fs.renameSync(oldPath, newPath);
          r.file_path = newRelPath;
          await this.ds.getRepository(DdlSnapshotEntity).save(r);
        }
      }
    }

    // 4. Relocate Comparisons
    const comparisons = await this.ds.getRepository(ComparisonEntity).find();
    for (const r of comparisons) {
      const dbType = (r.database_type || 'mysql').toLowerCase();
      if (r.file_path && r.file_path.includes('map-migrate') && !r.file_path.includes(`/${dbType}/`)) {
        // file_path for comparisons is often a directory: map-migrate/src-to-dest/db_name/tables/alters
        // We want: map-migrate/src-to-dest/db_type/db_name/tables/alters
        const oldPath = path.join(this.projectBaseDir, r.file_path);
        const parts = r.file_path.split('/');
        // parts: [map-migrate, src-to-dest, db_name, type, alters]
        // or: [map-migrate, src-to-dest, db_name, type, alters, columns, name.sql] (less likely in DB)
        
        // Find the environment transition part (e.g. DEV-to-PROD)
        const transitionIdx = parts.findIndex(p => p.includes('-to-'));
        if (transitionIdx !== -1) {
          const newParts = [...parts];
          newParts.splice(transitionIdx + 1, 0, dbType);
          const newRelPath = newParts.join('/');
          const newPath = path.join(this.projectBaseDir, newRelPath);

          if (fs.existsSync(oldPath)) {
            console.log(`[Migration] Relocating Comparison directory: ${r.file_path} -> ${newRelPath}`);
            const newParent = path.dirname(newPath);
            if (!fs.existsSync(newParent)) fs.mkdirSync(newParent, { recursive: true });
            fs.renameSync(oldPath, newPath);
            r.file_path = newRelPath;
            await this.ds.getRepository(ComparisonEntity).save(r);
          }
        }
      }
    }
  }


  public setProjectBaseDir(dir: string, isProjectScoped: boolean = false): void {
    if (dir) {
      this.projectBaseDir = dir;
      this.isProjectScoped = isProjectScoped;
    }
  }

  public setActiveProject(name: string): void {
    if (name) {
      // Sanitize for filesystem pathing
      this.activeProjectName = name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
    } else {
      this.activeProjectName = 'default';
    }
  }

  protected _getScopedPath(relativePath: string): string {
    // Deterministic short-circuit: If strategy is flagged as running INSIDE an isolated folder,
    // NEVER scope it, write to current folder directly.
    if (this.isProjectScoped) {
       return relativePath;
    }

    // Central router for filesystem paths scoped by Project
    if (this.activeProjectName && this.activeProjectName !== 'default') {
       const scopedSegment = path.join('projects', this.activeProjectName);
       
       // Safety normalization fallback check (Legacy Safeguard)
       const normalizedBase = this.projectBaseDir.replace(/[\\\/]/g, '/').replace(/\/$/, '');
       const normalizedSegment = scopedSegment.replace(/[\\\/]/g, '/').replace(/\/$/, '');
       
       if (normalizedBase.endsWith(normalizedSegment)) {
         return relativePath;
       }
       
       return path.join(scopedSegment, relativePath);
    }
    return relativePath;
  }

  async close(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }

  protected get ds() {
    if (!this.dataSource || !this.dataSource.isInitialized) {
      throw new Error('BaseStorageStrategy DataSource is not initialized');
    }
    return this.dataSource;
  }

  protected _writeSqlFile(relativePath: string, content: string): void {
    if (!content) return;
    const fullPath = path.join(this.projectBaseDir, relativePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    // Normalize newlines to LF for consistency across OS
    fs.writeFileSync(fullPath, content.replace(/\r\n/g, '\n'), 'utf8');
  }

  protected _readSqlFile(relativePath: string): string {
    if (!relativePath) return '';

    // 1. Primary Direct Read (Relative to projectBaseDir)
    let fullPath = path.join(this.projectBaseDir, relativePath);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf8');
    }

    // 2. Absolute Path Rescue (Fallback if serialized path was absolute)
    if (path.isAbsolute(relativePath) && fs.existsSync(relativePath)) {
      return fs.readFileSync(relativePath, 'utf8');
    }

    // 3. Dynamic Rescue: Handle mismatched isProjectScoped isolation states
    if (this.activeProjectName && this.activeProjectName !== 'default') {
      const normRel = relativePath.replace(/[\\\/]/g, '/');
      
      // Case A: Base dir is isolated (ends with projectName), but path is NOT trimmed
      // (e.g., projectBaseDir = ".../projects/foo", relativePath = "projects/foo/STAGE/...")
      const prefix = `projects/${this.activeProjectName}/`;
      if (this.isProjectScoped && normRel.startsWith(prefix)) {
        const trimmedRel = normRel.substring(prefix.length);
        const rescuePath = path.join(this.projectBaseDir, trimmedRel);
        if (fs.existsSync(rescuePath)) {
          return fs.readFileSync(rescuePath, 'utf8');
        }
      }

      // Case B: Base dir is NOT isolated (vault root), but path is NOT scoped
      // (e.g., projectBaseDir = ".../TheAndbData", relativePath = "STAGE/...")
      if (!this.isProjectScoped && !normRel.startsWith('projects/')) {
        const fixedRel = path.join('projects', this.activeProjectName, relativePath);
        const rescuePath = path.join(this.projectBaseDir, fixedRel);
        if (fs.existsSync(rescuePath)) {
          return fs.readFileSync(rescuePath, 'utf8');
        }
      }
    }

    return '';
  }

  // --- Projects ---
  async saveProject(project: Project): Promise<void> {
    const repo = this.ds.getRepository(ProjectEntity);
    await repo.save({ ...project, updated_at: new Date() });
  }

  async getProjects(): Promise<Project[]> {
    if (!this.ds || !this.ds.isInitialized) return [];

    // Attempt to load from GUI preferences first (Desktop mode)
    try {
      const guiPrefRows = await this.ds.query("SELECT value FROM gui_preferences WHERE key = 'projects'");
      if (guiPrefRows && guiPrefRows.length > 0) {
        const guiProjects = JSON.parse(guiPrefRows[0].value);
        if (Array.isArray(guiProjects) && guiProjects.length > 0) {
          // Map GUI projects to Core Project interface for compatibility
          return guiProjects.map(gp => ({
            id: gp.id,
            name: gp.name,
            description: gp.description || '',
            is_favorite: gp.isActive ? 1 : 0,
            ...gp // Pass everything through
          })) as any[];
        }
      }
    } catch (e) {
      // gui_preferences table might not exist in CLI-only mode or first run
    }

    const repo = this.ds.getRepository(ProjectEntity);
    return await repo.find({ order: { order_index: 'ASC', created_at: 'DESC' } }) as any[];
  }

  async deleteProject(id: string): Promise<void> {
    await this.ds.getRepository(ProjectEntity).delete(id);
  }

  // --- Environments ---
  async saveProjectEnvironment(env: ProjectEnvironment): Promise<void> {
    await this.ds.getRepository(ProjectEnvironmentEntity).save({ ...env, updated_at: new Date() });
  }

  async getProjectEnvironments(projectId: string): Promise<ProjectEnvironment[]> {
    return await this.ds.getRepository(ProjectEnvironmentEntity).find({
      where: { project_id: projectId },
      order: { created_at: 'ASC' }
    });
  }

  async deleteProjectEnvironment(id: string): Promise<void> {
    await this.ds.getRepository(ProjectEnvironmentEntity).delete(id);
  }

  // --- Settings ---
  async saveProjectSetting(projectId: string, key: string, value: string): Promise<void> {
    await this.ds.getRepository(ProjectSettingEntity).save({
      project_id: projectId,
      setting_key: key,
      setting_value: value,
      updated_at: new Date()
    });
  }

  async getProjectSettings(projectId: string): Promise<Record<string, string>> {
    const rows = await this.ds.getRepository(ProjectSettingEntity).find({ where: { project_id: projectId } });
    const acc: Record<string, string> = {};
    rows.forEach(r => acc[r.setting_key] = r.setting_value);
    return acc;
  }

  async saveUserSetting(key: string, value: string): Promise<void> {
    await this.ds.getRepository(CliSettingEntity).save({ key, value, updated_at: new Date() });
  }

  async getUserSettings(): Promise<Record<string, string>> {
    const rows = await this.ds.getRepository(CliSettingEntity).find();
    const acc: Record<string, string> = {};
    rows.forEach(r => acc[r.key] = r.value);
    return acc;
  }

  async getMetadata(key: string): Promise<string | null> {
    const row = await this.ds.getRepository(CliSettingEntity).findOne({ where: { key: `META_${key}` } });
    return row ? row.value : null;
  }

  async setMetadata(key: string, value: string): Promise<void> {
    await this.ds.getRepository(CliSettingEntity).save({ key: `META_${key}`, value, updated_at: new Date() });
  }

  // --- Exports ---
  async saveDdlExport(exportData: DdlExport): Promise<void> {
    // Enforce lowercase data-hygiene inside the SQLite metadata record
    if (exportData.export_type) exportData.export_type = exportData.export_type.toLowerCase();
    if (exportData.database_type) exportData.database_type = exportData.database_type.toLowerCase();

    const extType = (exportData.export_type || 'unknown').toLowerCase();
    const dbType = (exportData.database_type || 'mysql').toLowerCase();
    const baseRelPath = `${exportData.environment}/${dbType}/${exportData.database_name}/${extType}/${exportData.export_name}.sql`;
    const relPath = this._getScopedPath(baseRelPath);

    if (exportData.ddl_content) {
      this._writeSqlFile(relPath, exportData.ddl_content);
      (exportData as any).file_path = relPath;
      exportData.ddl_content = ''; // Clear so we don't save massive text to SQLite
    }

    await this.ds.getRepository(DdlExportEntity).upsert(
      { ...exportData, updated_at: new Date() } as any,
      ['environment', 'database_name', 'export_type', 'export_name', 'database_type']
    );
  }

  async getDdlExports(env: string, dbName: string, type?: string, limit?: number, databaseType?: string): Promise<DdlExport[]> {
    const query = this.ds.getRepository(DdlExportEntity).createQueryBuilder('e');
    
    // Case-insensitive query matching to guarantee robust loads for legacy/restored database casing
    query.where('LOWER(e.environment) = LOWER(:env)', { env })
         .andWhere('LOWER(e.database_name) = LOWER(:dbName)', { dbName });
         
    if (type) {
      query.andWhere('LOWER(e.export_type) = LOWER(:type)', { type });
    }
    if (databaseType) {
      query.andWhere('LOWER(e.database_type) = LOWER(:databaseType)', { databaseType });
    }
    
    query.orderBy('e.exported_at', 'DESC');
    
    if (limit) {
      query.take(limit);
    }

    const results = await query.getMany();
    // Re-hydrate ddl_content from file
    for (const r of results) {
      if ((r as any).file_path) {
        let content = this._readSqlFile((r as any).file_path);
        if (content) r.ddl_content = content;
      }
    }
    return results;
  }

  async deleteDdlExport(env: string, dbName: string, type: string, name: string, databaseType: string = 'mysql'): Promise<void> {
    await this.ds.getRepository(DdlExportEntity).createQueryBuilder()
      .delete()
      .where('LOWER(environment) = LOWER(:env)', { env })
      .andWhere('LOWER(database_name) = LOWER(:dbName)', { dbName })
      .andWhere('LOWER(export_type) = LOWER(:type)', { type })
      .andWhere('LOWER(export_name) = LOWER(:name)', { name })
      .andWhere('LOWER(database_type) = LOWER(:databaseType)', { databaseType })
      .execute();
  }

  // --- Snapshots ---
  async saveSnapshot(snapshot: DdlSnapshot): Promise<void> {
    const extType = (snapshot.ddl_type || 'unknown').toLowerCase();
    const dbType = (snapshot.database_type || 'mysql').toLowerCase();
    const baseRelPath = `${snapshot.environment}/${dbType}/${snapshot.database_name}/.snapshots/${extType}/${snapshot.ddl_name}.sql`;
    const relPath = this._getScopedPath(baseRelPath);

    if (snapshot.ddl_content) {
      this._writeSqlFile(relPath, snapshot.ddl_content);
      (snapshot as any).file_path = relPath;
      snapshot.ddl_content = '';
    }
    await this.ds.getRepository(DdlSnapshotEntity).save({ ...snapshot, created_at: new Date() } as any);
  }

  async getSnapshot(env: string, dbName: string, type: string, name: string, databaseType: string = 'mysql'): Promise<DdlSnapshot | null> {
    const snap = await this.ds.getRepository(DdlSnapshotEntity).findOne({
      where: { environment: env, database_name: dbName, ddl_type: type, ddl_name: name, database_type: databaseType },
      order: { created_at: 'DESC' }
    });
    if (snap && (snap as any).file_path) {
      let content = this._readSqlFile((snap as any).file_path);
      if (content) snap.ddl_content = content;
    }
    return snap;
  }

  async getAllSnapshots(limit: number = 200): Promise<DdlSnapshot[]> {
    const results = await this.ds.getRepository(DdlSnapshotEntity).find({
      order: { created_at: 'DESC' },
      take: limit
    });
    for (const r of results) {
      if ((r as any).file_path) {
        let content = this._readSqlFile((r as any).file_path);
        if (content) r.ddl_content = content;
      }
    }
    return results;
  }

  // --- Comparisons ---
  async saveComparison(comparison: ComparisonResult): Promise<void> {
    const extType = (comparison.ddl_type || 'unknown').toLowerCase();
    const dbType = (comparison.database_type || 'mysql').toLowerCase();

    let stmts: string[] = [];
    if (comparison.alter_statements) {
      try {
        const parsed = JSON.parse(comparison.alter_statements);
        if (Array.isArray(parsed)) stmts = parsed;
        else stmts = [comparison.alter_statements];
      } catch {
        // Fallback if it's just raw SQL
        stmts = comparison.alter_statements.split(';').map(s => s.trim()).filter(s => !!s).map(s => s + ';');
      }
    }

    console.log(`[StorageStrategy] saveComparison for ${comparison.database_name}/${extType}/${comparison.ddl_name}`);
    console.log(`[StorageStrategy] Raw alter_statements length: ${comparison.alter_statements?.length || 0}`);
    console.log(`[StorageStrategy] Parsed stmts array length: ${stmts.length}`);

    if (stmts.length > 0) {
      let colAlters: string[] = [];
      let idxAlters: string[] = [];
      let rmvColAlters: string[] = [];

      stmts.forEach(s => {
        const stmt = s.trim();
        if (!stmt) return;

        // Ensure trailing semicolon
        const normalizedStmt = stmt.endsWith(';') ? stmt : stmt + ';';

        const isDropCol = stmt.match(/ALTER TABLE\s+.*?DROP\s+(?:COLUMN\s+)?/i);
        const isAddIdx = stmt.match(/ALTER TABLE\s+.*?ADD\s+(?:CONSTRAINT\s+.*?|UNIQUE\s+|FULLTEXT\s+|SPATIAL\s+)?INDEX/i) || stmt.match(/CREATE\s+(?:UNIQUE\s+|FULLTEXT\s+|SPATIAL\s+)?INDEX/i) || stmt.match(/ALTER TABLE\s+.*?ADD\s+FOREIGN KEY/i) || stmt.match(/ALTER TABLE\s+.*?ADD\s+PRIMARY KEY/i);
        const isDropIdx = stmt.match(/ALTER TABLE\s+.*?DROP\s+INDEX/i) || stmt.match(/DROP\s+INDEX/i) || stmt.match(/ALTER TABLE\s+.*?DROP\s+FOREIGN KEY/i) || stmt.match(/ALTER TABLE\s+.*?DROP\s+PRIMARY KEY/i);

        if (isAddIdx || isDropIdx) {
          idxAlters.push(normalizedStmt);
        } else if (isDropCol) {
          rmvColAlters.push(normalizedStmt);
        } else {
          colAlters.push(normalizedStmt);
        }
      });

      console.log(`[StorageStrategy] Extracted alters - col: ${colAlters.length}, idx: ${idxAlters.length}, rmvCol: ${rmvColAlters.length}`);

      const baseMigrationPath = `map-migrate/${comparison.source_env}-to-${comparison.target_env}/${dbType}/${comparison.database_name}/${extType}/alters`;
      const basePath = this._getScopedPath(baseMigrationPath);

      if (extType === 'tables') {
        if (colAlters.length > 0) {
          console.log(`[StorageStrategy] Calling _writeSqlFile for colAlters`);
          this._writeSqlFile(`${basePath}/columns/${comparison.ddl_name}.sql`, colAlters.join('\n'));
        }
        if (idxAlters.length > 0) this._writeSqlFile(`${basePath}/indexes/${comparison.ddl_name}.sql`, idxAlters.join('\n'));
        if (rmvColAlters.length > 0) this._writeSqlFile(`${basePath}/rmv-columns/${comparison.ddl_name}.sql`, rmvColAlters.join('\n'));
      } else {
        // For views, procedures, functions, triggers, events
        this._writeSqlFile(`${basePath}/${comparison.ddl_name}.sql`, stmts.map(s => s.trim().endsWith(';') ? s.trim() : s.trim() + ';').join('\n'));
      }

      (comparison as any).file_path = basePath;
      comparison.alter_statements = '';
    }

    await this.ds.getRepository(ComparisonEntity).upsert(
      { ...comparison, compared_at: new Date() } as any,
      ['source_env', 'target_env', 'database_name', 'ddl_type', 'ddl_name', 'database_type']
    );
  }

  private _hydrateComparisonTarget(r: any) {
    if (r.file_path && r.file_path.includes('map-migrate')) {
      // Legacy files might be single sql dump (.sql extension attached to file_path)
      if (r.file_path.endsWith('.sql')) {
        const content = this._readSqlFile(r.file_path);
        if (content) {
          r.alter_statements = JSON.stringify(content.split(';').map(s => s.trim()).filter(s => !!s).map(s => s + ';'));
        }
      } else {
        // New multi-folder structure or unified file structure for non-tables
        const basePath = r.file_path;
        const ddlName = r.ddl_name;

        if (r.ddl_type?.toLowerCase() === 'tables') {
          const c1 = this._readSqlFile(`${basePath}/columns/${ddlName}.sql`);
          const c2 = this._readSqlFile(`${basePath}/indexes/${ddlName}.sql`);
          const c3 = this._readSqlFile(`${basePath}/rmv-columns/${ddlName}.sql`);

          const arr: string[] = [];

          if (c1) arr.push(...c1.split(';').map(s => s.trim()).filter(s => !!s).map(s => s + ';'));
          if (c2) arr.push(...c2.split(';').map(s => s.trim()).filter(s => !!s).map(s => s + ';'));
          if (c3) arr.push(...c3.split(';').map(s => s.trim()).filter(s => !!s).map(s => s + ';'));

          if (arr.length > 0) r.alter_statements = JSON.stringify(arr);
        } else {
          const cUnified = this._readSqlFile(`${basePath}/${ddlName}.sql`);
          if (cUnified) {
            r.alter_statements = JSON.stringify(cUnified.split(';').map(s => s.trim()).filter(s => !!s).map(s => s + ';'));
          }
        }
      }
    }
  }

  async getComparisons(srcEnv: string, destEnv: string, dbName: string, type?: string, databaseType: string = 'mysql'): Promise<ComparisonResult[]> {
    const where: any = { source_env: srcEnv, target_env: destEnv, database_name: dbName, database_type: databaseType };
    if (type && type !== 'ALL') where.ddl_type = type;
    const results = await this.ds.getRepository(ComparisonEntity).find({
      where,
      order: { compared_at: 'DESC' }
    });
    for (const r of results) {
      this._hydrateComparisonTarget(r);
    }
    return results;
  }

  async getLatestComparisons(limit: number = 50): Promise<ComparisonResult[]> {
    const results = await this.ds.getRepository(ComparisonEntity).find({
      order: { compared_at: 'DESC' },
      take: limit
    });
    for (const r of results) {
      this._hydrateComparisonTarget(r);
    }
    return results;
  }

  // --- Migration History ---
  async saveMigrationHistory(history: MigrationHistory): Promise<number> {
    const result = await this.ds.getRepository(MigrationHistoryEntity).save(history);
    return result.id || 0;
  }

  async updateMigrationStatus(id: number, status: string, error?: string): Promise<void> {
    await this.ds.getRepository(MigrationHistoryEntity).update(id, { status, error_message: error });
  }

  async getMigrationHistory(limit: number = 100): Promise<MigrationHistory[]> {
    return await this.ds.getRepository(MigrationHistoryEntity).find({
      order: { executed_at: 'DESC' },
      take: limit
    });
  }

  // --- Raw Executions ---
  async queryRaw(sql: string, params: any[] = []): Promise<any[]> {
    return await this.ds.query(sql, params);
  }

  async executeRaw(sql: string, params: any[] = []): Promise<any> {
    return await this.ds.query(sql, params);
  }
}
