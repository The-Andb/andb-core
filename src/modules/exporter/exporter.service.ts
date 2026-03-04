const { getLogger } = require('andb-logger');
import { DriverFactoryService } from '../driver/driver-factory.service';
import { ProjectConfigService } from '../config/project-config.service';
import { ParserService } from '../parser/parser.service';
import * as fs from 'fs';
import * as path from 'path';
import { ConnectionType } from '../../common/interfaces/connection.interface';

export class ExporterService {
  private readonly logger = getLogger({ logName: 'ExporterService' });

  constructor(
    private readonly driverFactory: DriverFactoryService,
    private readonly configService: ProjectConfigService,
    private readonly parser: ParserService,
    private readonly storageService: any,
  ) { }

  async exportSchema(
    envName: string,
    specificName?: string,
    typeFilter?: string,
    onProgress?: (progress: { type: string; current: number; total: number; objectName: string }) => void
  ) {
    console.log(`📦 [Exporter] exportSchema called: env=${envName}, name=${specificName || 'ALL'}, typeFilter=${typeFilter || 'ALL'}`);

    const connection = this.configService.getConnection(envName);
    if (!connection) {
      console.log(`❌ [Exporter] Connection NOT found for env: ${envName}`);
      throw new Error(`Connection not found for env: ${envName}`);
    }
    console.log(`✅ [Exporter] Connection found: type=${connection.type}, host=${connection.config?.host}, db=${connection.config?.database}`);

    const driver = await this.driverFactory.create(connection.type, connection.config);
    try {
      console.log(`🔌 [Exporter] Connecting to ${connection.type}...`);
      await driver.connect();
      console.log(`✅ [Exporter] Connected successfully`);
      const introspection = driver.getIntrospectionService();
      const dbName = connection.config.database || 'default';

      const baseDir = path.join(process.cwd(), 'db', envName, dbName);
      this._ensureDir(baseDir);
      this._ensureDir(path.join(baseDir, 'current-ddl'));

      const allTypes = ['TABLE', 'VIEW', 'PROCEDURE', 'FUNCTION', 'TRIGGER', 'EVENT'] as const;
      // If typeFilter is provided and not 'all', only process matching type(s)
      const normalizedFilter = (typeFilter && typeFilter.toLowerCase() !== 'all')
        ? typeFilter.toUpperCase().replace(/S$/, '') // 'procedures' -> 'PROCEDURE'
        : undefined;
      const types = normalizedFilter
        ? allTypes.filter(t => t === normalizedFilter)
        : allTypes;
      console.log(`📋 [Exporter] Filter: "${typeFilter}" → normalized: "${normalizedFilter || 'ALL'}" → types: [${types.join(', ')}]`);
      const summary: Record<string, number> = {};

      for (const type of types) {
        const pluralType = `${type}S` as const;
        const dir = path.join(baseDir, pluralType.toLowerCase());
        this._ensureDir(dir);

        const list = await this._listObjects(introspection, dbName, type, specificName);
        console.log(`📊 [Exporter] ${pluralType}: found ${list.length} objects`);
        summary[pluralType] = list.length;

        const exportedNames: string[] = [];
        let savedCount = 0;
        let emptyDDLCount = 0;
        let errorCount = 0;

        for (const name of list) {
          if (this.isSkipObject(name)) continue;

          try {
            let ddl = await this._getDDL(introspection, dbName, type, name);

            if (!ddl) {
              emptyDDLCount++;
            }

            // Legacy parity: Normalize SQL keywords to UPPERCASE before saving
            // This prevents false-positive diffs from keyword casing differences
            // e.g., 'where' vs 'WHERE', 'end if' vs 'END IF'
            if (ddl) {
              ddl = this.parser.uppercaseKeywords(ddl);
            }

            // Save to file — always write, even if DDL is empty
            fs.writeFileSync(path.join(dir, `${name}.sql`), ddl || '');
            exportedNames.push(name);

            // Save to storage — always save so it appears in sidebar list
            await this.storageService.saveDDL(envName, dbName, pluralType, name, ddl || '');
            savedCount++;

            if (onProgress) {
              onProgress({
                type: pluralType,
                current: savedCount,
                total: list.length,
                objectName: name
              });
            }
          } catch (err: any) {
            errorCount++;
            this.logger.error(`[Export] Failed to export ${type} "${name}": ${err.message}`);
          }
        }

        // Diagnostic summary per type
        if (list.length > 0) {
          this.logger.info(
            `[Export] ${pluralType}: listed=${list.length}, saved=${savedCount}, emptyDDL=${emptyDDLCount}, errors=${errorCount}`,
          );
        }

        // Save list file for parity with legacy
        if (!specificName) {
          fs.writeFileSync(
            path.join(baseDir, 'current-ddl', `${pluralType.toLowerCase()}.list`),
            exportedNames.join('\n'),
          );
        }
      }


      this.logger.info(`Exported schema for ${envName}: ${JSON.stringify(summary)}`);
      return summary;
    } finally {
      await driver.disconnect();
    }
  }

  private isSkipObject(name: string): boolean {
    const skipList = ['information_schema', 'performance_schema', 'mysql', 'sys'];
    return skipList.includes(name.toLowerCase());
  }

  private _ensureDir(p: string) {
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
    }
  }

  private async _listObjects(
    introspection: any,
    dbName: string,
    type: string,
    specificName?: string,
  ): Promise<string[]> {
    if (specificName) return [specificName];

    switch (type) {
      case 'TABLE':
        return introspection.listTables(dbName);
      case 'VIEW':
        return introspection.listViews(dbName);
      case 'PROCEDURE':
        return introspection.listProcedures(dbName);
      case 'FUNCTION':
        return introspection.listFunctions(dbName);
      case 'TRIGGER':
        return introspection.listTriggers(dbName);
      case 'EVENT':
        return introspection.listEvents(dbName);
      default:
        return [];
    }
  }

  private async _getDDL(
    introspection: any,
    dbName: string,
    type: string,
    name: string,
  ): Promise<string> {
    switch (type) {
      case 'TABLE':
        return introspection.getTableDDL(dbName, name);
      case 'VIEW':
        return introspection.getViewDDL(dbName, name);
      case 'PROCEDURE':
        return introspection.getProcedureDDL(dbName, name);
      case 'FUNCTION':
        return introspection.getFunctionDDL(dbName, name);
      case 'TRIGGER':
        return introspection.getTriggerDDL(dbName, name);
      case 'EVENT':
        return introspection.getEventDDL(dbName, name);
      default:
        return '';
    }
  }
}
