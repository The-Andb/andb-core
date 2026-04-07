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
      
      const userSettings = await this.storageService.getUserSettings();
      let defaultProject = projects[0];

      if (userSettings && userSettings.default_cli_project_id) {
         const found = projects.find((p: any) => p.id === userSettings.default_cli_project_id);
         if (found) {
            defaultProject = found;
         }
      }

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

  getDomainNormalization(env?: string): { pattern: RegExp, replacement: string }[] {
    const normConfig = this.config.domainNormalization;
    if (!normConfig) return [];

    // Current standard is an array of rules. 
    // Handle single rule legacy support for backward compatibility during transitions.
    const rules = Array.isArray(normConfig) ? normConfig : [normConfig];
    
    return rules.map(norm => {
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
      return null;
    }).filter(r => r !== null) as { pattern: RegExp, replacement: string }[];
  }

  setAutoBackup(enabled: boolean) {
    this.config.autoBackup = enabled;
  }

  getAutoBackup(): boolean {
    if (this.config.autoBackup === undefined) return false;
    return !!this.config.autoBackup;
  }

  setConnection(env: string, config: IDatabaseConfig, type: ConnectionType = ConnectionType.MYSQL) {
    if (!this.config.environments) {
      this.config.environments = {};
    }
    this.config.environments[env] = { ...config, type };
  }

  setDomainNormalization(rules: any | any[]) {
    this.config.domainNormalization = rules;
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

  setIsNotMigrateCondition(condition: string) {
    this.config.isNotMigrateCondition = condition;
  }

  getIsNotMigrateCondition(): string | null {
    return this.config.isNotMigrateCondition || null;
  }

  saveConfig() {
    this.logger.warn('saveConfig() called dynamically. andb.yaml is no longer supported directly.');
  }
}
