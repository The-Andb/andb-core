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
        this.config = yaml.load(fs.readFileSync(configPath, 'utf8')) || {};
        this.logger.info('Loaded configuration from andb.yaml');
      } catch (e: any) {
        this.logger.error(`Error parsing andb.yaml: ${e.message}`);
      }
    }
  }

  getEnvironments(): string[] {
    return this.config.ENVIRONMENTS || ['LOCAL', 'DEV', 'UAT', 'STAGE', 'PROD'];
  }

  getDBDestination(env: string): IDatabaseConfig | null {
    if (!this.config.getDBDestination) return null;

    // Legacy mapping: andb.yaml usually has a map of envs to configs
    // or a function. In the YAML case, it's just a mapping.
    const destinations = this.config.getDBDestination;
    return destinations[env] || null;
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

  getDomainNormalization() {
    return this.config.domainNormalization || { pattern: /(?!)/, replacement: '' };
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
