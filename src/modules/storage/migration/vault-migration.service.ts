import * as fs from 'fs';
import * as path from 'path';
const { getLogger } = require('andb-logger');
import { ProjectConfigService } from '../../config/project-config.service';

export class VaultMigrationService {
  private readonly logger = getLogger({ logName: 'VaultMigrationService' });
  private baseDir: string;

  constructor(
    private readonly configService: ProjectConfigService,
    projectBaseDir: string
  ) {
    this.baseDir = path.join(projectBaseDir, 'db');
  }

  /**
   * Migrate legacy vault structure to engine-isolated structure
   * Old: db/{env}/{dbName}/...
   * New: db/{env}/{engine}/{dbName}/...
   */
  async migrate() {
    if (!fs.existsSync(this.baseDir)) return;

    this.logger.info(`🔍 Scanning for legacy Vault data in ${this.baseDir}...`);
    
    const envs = fs.readdirSync(this.baseDir);
    const engines = ['mysql', 'postgres', 'sqlite', 'oracle', 'sqlserver', 'mssql'];

    for (const envName of envs) {
      const envPath = path.join(this.baseDir, envName);
      if (!fs.statSync(envPath).isDirectory()) continue;

      const items = fs.readdirSync(envPath);
      for (const itemName of items) {
        const itemPath = path.join(envPath, itemName);
        if (!fs.statSync(itemPath).isDirectory()) continue;

        // If itemName is an engine, skip it (already migrated or new)
        if (engines.includes(itemName.toLowerCase())) continue;

        // legacy folder found: db/{env}/{dbName}
        const dbName = itemName;
        const connection = this.configService.getConnection(envName);
        const engine = connection?.type || 'mysql'; // Default to mysql for legacy

        const targetDir = path.join(this.baseDir, envName, engine);
        const finalPath = path.join(targetDir, dbName);

        this.logger.info(`📦 Migrating legacy vault: ${itemPath} -> ${finalPath}`);

        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        try {
          // If the target already exists (unlikely unless partially migrated), we might need to merge
          if (fs.existsSync(finalPath)) {
             this.logger.warn(`⚠️ Target path already exists, skipping move: ${finalPath}`);
             continue;
          }
          
          fs.renameSync(itemPath, finalPath);
          this.logger.info(`✅ Migration successful for ${dbName}`);
        } catch (err: any) {
          this.logger.error(`❌ Migration failed for ${dbName}: ${err.message}`);
        }
      }
    }
  }
}
