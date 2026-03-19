const { getLogger } = require('andb-logger');
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as crypto from 'crypto';
import { StorageService } from '../storage/storage.service';

export class YamlImporterService {
  private readonly logger = getLogger({ logName: 'YamlImporterService' });

  constructor(private readonly storageService: StorageService) {}

  public async runImportIfNecessary(): Promise<void> {
    const cwdConfigPath = path.join(process.cwd(), 'andb.yaml');
    const legacyConfigPath = path.join(process.cwd(), 'config', 'andb.yaml');
    
    let targetPath = '';
    if (fs.existsSync(cwdConfigPath)) {
      targetPath = cwdConfigPath;
    } else if (fs.existsSync(legacyConfigPath)) {
      targetPath = legacyConfigPath;
    }

    if (!targetPath) {
      return; // No legacy config found to import
    }

    try {
      this.logger.info(`Found legacy configuration at ${targetPath}. Starting YAML to SQLite dogfooding import...`);
      const rawFile = fs.readFileSync(targetPath, 'utf8');
      const doc = yaml.load(rawFile) as any || {};

      // Do we already have this imported? Let's check projects.
      const existingProjects = await this.storageService.getProjects();
      if (existingProjects && existingProjects.length > 0) {
        this.logger.info(`Projects already exist in SQLite. Skipping YAML import to prevent overwriting.`);
        this._backupYamlFile(targetPath);
        return;
      }

      await this._importToSqlite(doc);
      
      this.logger.info(`Successfully imported legacy YAML configuration into SQLite.`);
      this._backupYamlFile(targetPath);

    } catch (e: any) {
      this.logger.error(`YAML Import Failed: ${e.message}`);
    }
  }

  private _backupYamlFile(originalPath: string) {
    try {
      const backupPath = `${originalPath}.backup`;
      fs.renameSync(originalPath, backupPath);
      this.logger.info(`Renamed legacy andb.yaml to andb.yaml.backup`);
    } catch (e: any) {
      this.logger.warn(`Could not rename andb.yaml to backup: ${e.message}`);
    }
  }

  private async _importToSqlite(doc: any) {
    // 1. Create a Default Project for the imported config
    const projectId = crypto.randomUUID();
    const projectName = doc.name || path.basename(process.cwd()) || 'Imported Legacy Project';
    
    await this.storageService.saveProject({
      id: projectId,
      name: projectName,
      description: 'Auto-imported from legacy andb.yaml',
      is_favorite: 1,
      order_index: 0
    });

    // 2. Parse Connections / Environments 
    const envs = doc.getDBDestination || doc.environments || doc.ENVIRONMENTS || {};
    for (const envKey of Object.keys(envs)) {
      const dbConfig = envs[envKey];
      const envId = crypto.randomUUID();
      
      // Attempt to infer source type. Default to mysql for backwards compat
      let sourceType = 'mysql';
      if (dbConfig.type) {
         sourceType = dbConfig.type.toLowerCase();
      } else if (dbConfig.path || dbConfig.host === 'file') {
         sourceType = 'dump';
      }

      await this.storageService.saveProjectEnvironment({
        id: envId,
        project_id: projectId,
        env_name: envKey.toUpperCase(),
        source_type: sourceType,
        path: dbConfig.path || null,
        host: dbConfig.host || null,
        port: dbConfig.port || (sourceType === 'mysql' ? 3306 : null),
        username: dbConfig.user || dbConfig.username || null,
        database_name: dbConfig.database || dbConfig.database_name || null,
        // TheAndb SQLite natively supports SSH tunnel configs, parse them if present
        use_ssh_tunnel: dbConfig.ssh ? 1 : 0,
        ssh_host: dbConfig.ssh?.host || null,
        ssh_port: dbConfig.ssh?.port || 22,
        ssh_username: dbConfig.ssh?.username || null,
        ssh_key_path: dbConfig.ssh?.privateKey || null,
        // Skip passwords
        use_ssl: dbConfig.ssl ? 1 : 0,
        is_read_only: dbConfig.readonly ? 1 : 0
      });
    }

    // 3. Optional: Parse any specific settings
    if (doc.domainNormalizationPattern) {
      await this.storageService.saveProjectSetting(projectId, 'domain_normalization_pattern', String(doc.domainNormalizationPattern));
    }
  }
}
