import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  ANDB_ORCHESTRATOR,
  STORAGE_SERVICE,
  EXPORTER_SERVICE,
  COMPARATOR_SERVICE,
  MIGRATOR_SERVICE,
  PROJECT_CONFIG_SERVICE
} from './common/constants/tokens';

export class CoreBridge {
  private static app: any = null;
  private static orchestrator: any = null;
  private static storage: any = null;
  private static config: any = null;
  private static services: any = {};

  /**
   * Initialize the Core Engine (Singleton)
   */
  public static async init(userDataPath?: string) {
    if (!this.app) {
      console.log('🚀 [CoreBridge] Initializing NestJS Engine...');
      this.app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn'],
      });

      this.orchestrator = this.app.get(ANDB_ORCHESTRATOR);
      this.storage = this.app.get(STORAGE_SERVICE);
      this.config = this.app.get(PROJECT_CONFIG_SERVICE);

      // Services for legacy compatibility
      this.services = {
        exporter: this.app.get(EXPORTER_SERVICE),
        comparator: this.app.get(COMPARATOR_SERVICE),
        migrator: this.app.get(MIGRATOR_SERVICE),
      };

      if (userDataPath) {
        const path = require('path');
        const dbPath = path.join(userDataPath, 'andb-storage.db');
        this.storage.initialize(dbPath);
      }
      console.log('✅ [CoreBridge] Engine Ready.');
    }
    return this.app;
  }

  /**
   * Direct service access
   */
  public static getApp() { return this.app; }
  public static getOrchestrator() { return this.orchestrator; }
  public static getStorage() { return this.storage; }
  public static getConfig() { return this.config; }

  /**
   * Execute an operation via Orchestrator
   */
  public static async execute(operation: string, payload: any) {
    if (!this.orchestrator) await this.init();
    return await this.orchestrator.execute(operation, payload);
  }

  /**
   * Legacy Container Compatibility Layer
   */
  public static getLegacyContainer(config: any) {
    return new Container(config);
  }
}

/**
 * Legacy Container class to support older UI/CLI versions
 */
export class Container {
  constructor(private config: any) {
    const bridgeConfig = CoreBridge.getConfig();
    if (bridgeConfig && config) {
      // Synchronize connections from legacy config object
      if (typeof config.getDBDestination === 'function') {
        const environments = config.ENVIRONMENTS || [];
        for (const env of Object.keys(environments)) {
          const dbConfig = config.getDBDestination(env);
          if (dbConfig) {
            bridgeConfig.setConnection(env, dbConfig, dbConfig.type || 'mysql');
          }
        }
      }
    }
  }

  public getServices() {
    return {
      exporter: (type: string, name: string) => async (env: string) => {
        return await CoreBridge.execute('export', { env, type, name });
      },
      comparator: (type: string, name: string) => async (destEnv: string) => {
        const config = CoreBridge.getConfig();
        const srcEnv = config.getSourceEnv ? config.getSourceEnv(destEnv) : 'DEV'; // Fallback logic
        return await CoreBridge.execute('compare', { srcEnv, destEnv, type, name });
      },
      migrator: (type: string, status: string, name: string) => async (destEnv: string, options: any) => {
        const config = CoreBridge.getConfig();
        const srcEnv = options.sourceEnv || (config.getSourceEnv ? config.getSourceEnv(destEnv) : 'DEV');
        return await CoreBridge.execute('migrate', {
          srcEnv,
          destEnv,
          type,
          name,
          status,
          ...options
        });
      }
    };
  }
}
