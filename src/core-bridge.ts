import * as path from 'path';
import * as fs from 'fs';
import { Container } from './container';
import { ParserService } from './modules/parser/parser.service';
import { ICoreStorageStrategy } from './modules/storage/interfaces/core-storage-strategy.interface';

export class CoreBridge {
  private static container: Container | null = null;
  private static initPromise: Promise<any> | null = null;
  private static resolvedDbPath: string = '';

  /**
   * Initialize the Core Engine (Singleton with Lock)
   */
  public static async init(userDataPath: string, customDbPath?: string, strategy?: ICoreStorageStrategy, projectBaseDir?: string) {
    if (this.container) return this.container;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      let dbPath = customDbPath;
      if (!dbPath && userDataPath) {
        dbPath = path.join(userDataPath, 'andb-storage.db');
      }

      if (!dbPath) {
        throw new Error('CoreBridge.init(): dbPath could not be resolved. Either userDataPath or customDbPath must be provided.');
      }
      
      if (!strategy) {
        throw new Error('CoreBridge.init(): ICoreStorageStrategy MUST be provided by the runtime environment (Desktop/CLI).');
      }

      this.resolvedDbPath = dbPath;

      if (userDataPath && fs.existsSync(userDataPath)) {
        try {
          process.chdir(userDataPath);
          console.log(`📂 [CoreBridge] CWD changed to: ${userDataPath}`);
        } catch (e) {
          console.warn(`⚠️ [CoreBridge] Failed to change CWD to ${userDataPath}:`, e);
        }
      }

      this.container = await Container.create(strategy, dbPath, projectBaseDir);
      console.log('✅ [CoreBridge] Engine Ready.');
      return this.container;
    })();

    return this.initPromise;
  }

  public static getDbPath() {
    return this.resolvedDbPath;
  }

  public static getStoragePath() {
    return this.resolvedDbPath;
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
  public static getSchemaOrchestrator() {
    return this.container?.schemaOrchestrator;
  }
  public static getSecurityOrchestrator() {
    return this.container?.securityOrchestrator;
  }
  public static getAIOrchestrator() {
    return this.container?.aiOrchestrator;
  }
  public static getStorage() {
    return this.container?.storage;
  }
  public static getConfig() {
    return this.container?.config;
  }
  public static getLastMigrationReport() {
    return this.container?.lastMigrationReport ?? null;
  }

  /**
   * Execute an operation via Orchestrator
   */
  public static async execute(operation: string, payload: any) {
    if (!this.container) {
      throw new Error('CoreBridge.execute(): Core Engine is not initialized. Call CoreBridge.init() first.');
    }

    // Auto-register connections if provided in payload (important for Desktop/RPC)
    const config = this.getConfig();
    if (config) {
      if (payload.connection && payload.env) {
        console.log(`[CoreBridge] Registering connection for env: ${payload.env}`);
        config.setConnection(payload.env, payload.connection, payload.connection.type || 'mysql');
      }
      if (payload.sourceConnection && payload.srcEnv) {
        console.log(`[CoreBridge] Registering source connection for env: ${payload.srcEnv}`);
        config.setConnection(payload.srcEnv, payload.sourceConnection, payload.sourceConnection.type || 'mysql');
      }
      if (payload.targetConnection && payload.destEnv) {
        console.log(`[CoreBridge] Registering target connection for env: ${payload.destEnv}`);
        config.setConnection(payload.destEnv, payload.targetConnection, payload.targetConnection.type || 'mysql');
      }
    }

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
        const srcEnv = (config as any)?.getSourceEnv?.(destEnv) ?? 'DEV';
        return await CoreBridge.execute('compare', { srcEnv, destEnv, type, name });
      },
      migrator:
        (type: string, status: string, name: string) => async (destEnv: string, options: any) => {
          const config = CoreBridge.getConfig();
          const srcEnv =
            options.sourceEnv || ((config as any)?.getSourceEnv?.(destEnv) ?? 'DEV');
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
