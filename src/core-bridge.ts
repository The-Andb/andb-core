import { Container } from './container';
import { ParserService } from './modules/parser/parser.service';

export class CoreBridge {
  private static container: Container | null = null;
  private static initPromise: Promise<any> | null = null;

  /**
   * Initialize the Core Engine (Singleton with Lock)
   */
  public static async init(userDataPath?: string) {
    if (this.container) return this.container;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      console.log('🚀 [CoreBridge] Initializing Engine...');
      const path = require('path');
      const dbPath = userDataPath
        ? path.join(userDataPath, 'andb-storage.db')
        : undefined;

      this.container = Container.create(dbPath);
      console.log('✅ [CoreBridge] Engine Ready.');
      return this.container;
    })();

    return this.initPromise;
  }

  /**
   * Direct service access
   */
  public static getApp() {
    return this.container;
  }
  public static getOrchestrator() {
    return this.container?.orchestrator;
  }
  public static getStorage() {
    return this.container?.storage;
  }
  public static getConfig() {
    return this.container?.config;
  }

  /**
   * Execute an operation via Orchestrator
   */
  public static async execute(operation: string, payload: any) {
    if (!this.container) await this.init();
    return await this.container!.orchestrator.execute(operation, payload);
  }

  /**
   * Legacy Container Compatibility Layer
   */
  public static getLegacyContainer(config: any) {
    return new LegacyContainer(config);
  }
}

/**
 * Legacy Container class to support older UI/CLI versions
 */
export class LegacyContainer {
  constructor(private config: any) {
    const bridgeConfig = CoreBridge.getConfig();
    if (bridgeConfig && config) {
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
        const srcEnv = config?.getSourceEnv ? config.getSourceEnv(destEnv) : 'DEV';
        return await CoreBridge.execute('compare', { srcEnv, destEnv, type, name });
      },
      migrator:
        (type: string, status: string, name: string) => async (destEnv: string, options: any) => {
          const config = CoreBridge.getConfig();
          const srcEnv =
            options.sourceEnv || (config?.getSourceEnv ? config.getSourceEnv(destEnv) : 'DEV');
          return await CoreBridge.execute('migrate', {
            srcEnv,
            destEnv,
            type,
            name,
            status,
            ...options,
          });
        },
    };
  }
}
