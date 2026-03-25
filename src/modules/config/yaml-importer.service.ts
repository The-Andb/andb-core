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
    const cwd = process.cwd();
    const yamlPaths: string[] = [];

    // 1. Check root
    const rootCwdConfig = path.join(cwd, 'andb.yaml');
    const rootLegacyConfig = path.join(cwd, 'config', 'andb.yaml');
    if (fs.existsSync(rootCwdConfig)) yamlPaths.push(rootCwdConfig);
    else if (fs.existsSync(rootLegacyConfig)) yamlPaths.push(rootLegacyConfig);

    // 2. Scan immediate subdirectories for legacy project setups
    try {
      const entries = fs.readdirSync(cwd, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          const subBase = path.join(cwd, entry.name, 'andb.yaml');
          const subLegacy = path.join(cwd, entry.name, 'config', 'andb.yaml');
          if (fs.existsSync(subBase)) {
            yamlPaths.push(subBase);
          } else if (fs.existsSync(subLegacy)) {
            yamlPaths.push(subLegacy);
          }
        }
      }
    } catch (e) {}

    if (yamlPaths.length === 0) {
      return; // No legacy config found to import
    }

    try {
      // Do we already have this imported? Let's check projects.
      const existingProjects = await this.storageService.getProjects();
      if (existingProjects && existingProjects.length > 0) {
        this.logger.info(`Projects already exist in SQLite. Skipping YAML import to prevent overwriting.`);
        // Note: we selectively let it skip if db is already populated.
        return;
      }

      for (const targetPath of yamlPaths) {
        this.logger.info(`Found legacy configuration at ${targetPath}. Starting YAML to SQLite dogfooding import...`);
        try {
          const rawFile = fs.readFileSync(targetPath, 'utf8');
          const doc = yaml.load(rawFile) as any || {};

          // Deduce project name from directory
          let dirPath = path.dirname(targetPath);
          if (path.basename(dirPath) === 'config') {
             dirPath = path.dirname(dirPath);
          }
          const parentDirName = path.basename(dirPath);

          await this._importToSqlite(doc, parentDirName);
          
          this.logger.info(`Successfully imported legacy YAML configuration into SQLite.`);
          this._backupYamlFile(targetPath);
        } catch (e: any) {
          this.logger.error(`YAML Import Failed for ${targetPath}: ${e.message}`);
        }
      }
    } catch (e: any) {
      this.logger.error(`YAML Import Scan Failed: ${e.message}`);
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

  private async _importToSqlite(doc: any, fallbackName?: string) {
    // 1. Create a Default Project for the imported config
    const projectId = crypto.randomUUID();
    const projectName = doc.name || fallbackName || path.basename(process.cwd()) || 'Imported Legacy Project';
    
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
