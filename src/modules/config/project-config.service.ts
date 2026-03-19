const { getLogger } = require('andb-logger');
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { IDatabaseConfig, ConnectionType } from '../../common/interfaces/connection.interface';

export class ProjectConfigService {
  private readonly logger = getLogger({ logName: 'ProjectConfigService' });
  private config: any = {};
  private activeProjectId: string | null = null;
  private storageService?: any; // Late-bound StorageService

  constructor() {
    // Configs are now late-loaded by init()
  }

  /**
   * Called exactly once during Container boot lifecycle.
   */
  public async init(storageService: any) {
    this.storageService = storageService;

    try {
      // 1. Fetch the default/first project
      const projects = await this.storageService.getProjects();
      if (!projects || projects.length === 0) {
         this.logger.warn(`ProjectConfigService.init(): No projects found in SQLite DB.`);
         return;
      }
      
      const defaultProject = projects[0];
      this.activeProjectId = defaultProject.id;
      
      // 2. Fetch all environments 
      const envs = await this.storageService.getProjectEnvironments(defaultProject.id);
      const settings = await this.storageService.getProjectSettings(defaultProject.id);

      // Reconstruct the legacy config structure so existing getters do not break
      this.config = {
         projects: projects,
         environments: {}, // mapped below
         domainNormalization: {},
         FEATURE_FLAGS: {} // Fallback generic
      };

      for (const env of envs) {
        this.config.environments[env.env_name] = {
           id: env.id,
           type: env.source_type,
           path: env.path,
           host: env.host,
           port: env.port,
           user: env.username,
           password: '', // We don't save passwords in Config anymore by design
           database: env.database_name,
           ssh: env.use_ssh_tunnel ? {
             host: env.ssh_host,
             port: env.ssh_port,
             username: env.ssh_username,
             privateKey: env.ssh_key_path
           } : undefined,
           ssl: env.use_ssl === 1,
           readonly: env.is_read_only === 1
        };
      }

      if (settings['domain_normalization_pattern']) {
         this.config.domainNormalization = {
            pattern: settings['domain_normalization_pattern'],
            replacement: settings['domain_normalization_replacement'] || ''
         };
      }

    } catch (e: any) {
      this.logger.error(`Error loading configuration from SQLite: ${e.message}`);
    }
  }

  getEnvironments(): string[] {
    const envMap = this.config.environments;
    if (envMap && typeof envMap === 'object') {
      return Object.keys(envMap);
    }
    return [];
  }

  getDBDestination(env: string): IDatabaseConfig | null {
    const destinations = this.config.environments;
    if (!destinations) {
      this.logger.warn(`getDBDestination: No destinations found in config.`);
      return null;
    }
    const config = destinations[env] || null;
    return config;
  }

  getDBName(env: string): string {
    const config = this.getDBDestination(env);
    return config?.database || 'unknown';
  }

  getConnection(env: string): { type: ConnectionType; config: IDatabaseConfig } | null {
    const dbConfig = this.getDBDestination(env);
    if (!dbConfig) return null;

    return {
      type: (dbConfig as any).type || ConnectionType.MYSQL,
      config: dbConfig,
    };
  }

  getDomainNormalization(env?: string) {
    const normConfig = this.config.domainNormalization;
    if (!normConfig) return { pattern: /(?!)/, replacement: '' };

    // If environment specific config exists, use it
    const norm = (env && normConfig[env]) ? normConfig[env] : normConfig;

    if (norm && norm.pattern) {
      try {
        const pattern = typeof norm.pattern === 'string'
          ? new RegExp(norm.pattern, 'g')
          : norm.pattern;
        return { pattern, replacement: norm.replacement || '' };
      } catch (e) {
        this.logger.error(`Invalid domain normalization pattern: ${norm.pattern}`);
      }
    }
    return { pattern: /(?!)/, replacement: '' };
  }

  getAutoBackup(): boolean {
    // Default to false if not specified (safer for CLI/tests)
    if (this.config.autoBackup === undefined) return false;
    return !!this.config.autoBackup;
  }

  setConnection(env: string, config: IDatabaseConfig, type: ConnectionType = ConnectionType.MYSQL) {
    if (!this.config.environments) {
      this.config.environments = {};
    }
    this.config.environments[env] = { ...config, type };
    // We do NOT physically save here because the desktop UI directly calls StorageService now.
    // This is just a memory fallback if CLI manipulates something live.
  }

  setDomainNormalization(pattern: RegExp, replacement: string) {
    this.config.domainNormalization = { pattern, replacement };
  }

  setAutoBackup(enabled: boolean) {
    this.config.autoBackup = enabled;
  }

  getFeatureFlags(): Record<string, boolean> {
    return this.config.FEATURE_FLAGS || {};
  }

  isFeatureEnabled(key: string): boolean {
    const flags = this.getFeatureFlags();
    if (flags[key] !== undefined) return !!flags[key];

    // Fallback to process.env if not in YAML
    const envKey = `FEATURE_${key.toUpperCase().replace(/\./g, '_')}`;
    return process.env[envKey] === 'true';
  }

  setFeatureFlag(key: string, enabled: boolean) {
    if (!this.config.FEATURE_FLAGS) {
      this.config.FEATURE_FLAGS = {};
    }
    this.config.FEATURE_FLAGS[key] = enabled;
  }

  saveConfig() {
    this.logger.warn('saveConfig() called dynamically. andb.yaml is no longer supported directly.');
  }
}
