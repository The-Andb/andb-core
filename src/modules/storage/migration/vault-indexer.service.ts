import * as fs from 'fs';
import * as path from 'path';
const { getLogger } = require('andb-logger');
import { StorageService } from '../storage.service';

export class VaultIndexerService {
  private readonly logger = getLogger({ logName: 'VaultIndexerService' });
  private baseDir: string;

  constructor(
    private readonly storage: StorageService,
    projectBaseDir: string
  ) {
    this.baseDir = path.join(projectBaseDir, 'db');
  }

  /**
   * Scan project Vault directory structure and reconstruct the SQLite mapping cache automatically.
   * Prevents forcing online fetches when offline files already exist.
   */
  async index() {
    if (!fs.existsSync(this.baseDir)) return;

    try {
      // Enforce zero-state boundary to prevent accidental overrides
      const stats = await this.storage.getStats();
      if (stats.exports > 0) {
        // Already mapped in SQLite, skip auto-sync
        return;
      }

      this.logger.info(`⚡ SQLite maps are empty but physical vault exists at ${this.baseDir}. Rebuilding offline metadata...`);

      let indexedCount = 0;
      const envs = fs.readdirSync(this.baseDir);

      for (const envName of envs) {
        const envPath = path.join(this.baseDir, envName);
        if (!fs.statSync(envPath).isDirectory()) continue;

        const engines = fs.readdirSync(envPath);
        for (const engineName of engines) {
          const enginePath = path.join(envPath, engineName);
          if (!fs.statSync(enginePath).isDirectory()) continue;

          const databases = fs.readdirSync(enginePath);
          for (const dbName of databases) {
            const dbPath = path.join(enginePath, dbName);
            if (!fs.statSync(dbPath).isDirectory()) continue;

            const types = fs.readdirSync(dbPath);
            for (const typeName of types) {
              // Ignore system folders like .snapshots
              if (typeName.startsWith('.')) continue;

              const typePath = path.join(dbPath, typeName);
              if (!fs.statSync(typePath).isDirectory()) continue;

              const files = fs.readdirSync(typePath);
              for (const fileName of files) {
                if (!fileName.endsWith('.sql')) continue;

                const filePath = path.join(typePath, fileName);
                if (!fs.statSync(filePath).isFile()) continue;

                const objectName = path.basename(fileName, '.sql');
                try {
                  const content = fs.readFileSync(filePath, 'utf8');
                  await this.storage.saveDdlExport(
                    envName,
                    dbName,
                    typeName,
                    objectName,
                    content,
                    engineName
                  );
                  indexedCount++;
                } catch (err: any) {
                  this.logger.warn(`⚠️ Failed to map offline entity ${objectName}: ${err.message}`);
                }
              }
            }
          }
        }
      }

      if (indexedCount > 0) {
        this.logger.info(`✅ Rebuilt offline Vault maps. Auto-indexed ${indexedCount} DDL records from filesystem.`);
      }
    } catch (err: any) {
      this.logger.error(`❌ Fail to scan and auto-index physical Vault: ${err.message}`);
    }
  }
}
