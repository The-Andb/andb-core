const { getLogger } = require('andb-logger');
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { IDatabaseConfig, ConnectionType } from '../../common/interfaces/connection.interface';

export class ProjectConfigService {
  private readonly logger = getLogger({ logName: 'ProjectConfigService' });
  private config: any = {};

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    const configPath = path.join(process.cwd(), 'andb.yaml');
    if (fs.existsSync(configPath)) {
      try {
        const rawConfig = yaml.load(fs.readFileSync(configPath, 'utf8')) || {};
        this.config = this._interpolate(rawConfig);
        // Normalize YAML key "environments" to internal getDBDestination
        if (this.config.environments && !this.config.getDBDestination) {
          this.config.getDBDestination = this.config.environments;
        }
        this.logger.info('Loaded configuration from andb.yaml (with env interpolation)');
      } catch (e: any) {
        this.logger.error(`Error parsing andb.yaml: ${e.message}`);
      }
    }
  }

  private _interpolate(obj: any): any {
    if (typeof obj === 'string') {
      return obj.replace(/\${([^}]+)}/g, (_, v) => process.env[v] || '');
    }
    if (Array.isArray(obj)) {
      return obj.map((i) => this._interpolate(i));
    }
    if (obj !== null && typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        result[key] = this._interpolate(obj[key]);
      }
      return result;
    }
    return obj;
  }

  getEnvironments(): string[] {
    const envMap = this.config.getDBDestination || this.config.environments || this.config.ENVIRONMENTS;
    if (envMap && typeof envMap === 'object') {
      return Object.keys(envMap);
    }
    return ['LOCAL', 'DEV', 'UAT', 'STAGE', 'PROD'];
  }

  getDBDestination(env: string): IDatabaseConfig | null {
    const destinations = this.config.getDBDestination || this.config.environments || this.config.ENVIRONMENTS;
    if (!destinations) {
      this.logger.warn(`getDBDestination: No destinations found in config. Keys: ${Object.keys(this.config)}`);
      return null;
    }
    const config = destinations[env] || null;
    if (!config) {
      this.logger.warn(`getDBDestination: Env "${env}" not found in destinations. Available: ${Object.keys(destinations)}`);
    }
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
    if (!this.config.getDBDestination) {
      this.config.getDBDestination = {};
    }
    this.config.getDBDestination[env] = { ...config, type };
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
    const configPath = path.join(process.cwd(), 'andb.yaml');
    try {
      const yamlStr = yaml.dump(this.config);
      fs.writeFileSync(configPath, yamlStr, 'utf8');
      this.logger.info('Saved configuration to andb.yaml');
    } catch (e: any) {
      this.logger.error(`Error saving andb.yaml: ${e.message}`);
      throw e;
    }
  }
}
