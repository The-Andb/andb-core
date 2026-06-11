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
    onProgress?: (progress: { env: string; type: string; current: number; total: number; objectName: string; state?: string }) => void
  ) {
    console.log(`📦 [Exporter] exportSchema called: env=${envName}, name=${specificName || 'ALL'}, typeFilter=${typeFilter || 'ALL'}`);

    const connection = this.configService.getConnection(envName);
    if (!connection) {
      console.log(`❌ [Exporter] Connection NOT found for env: ${envName}`);
      throw new Error(`Connection not found for env: ${envName}`);
    }
    console.log(`✅ [Exporter] Connection found: type=${connection.type}, host=${connection.config?.host}, db=${connection.config?.database}`);
    console.log(`[Exporter] Full connection config: ${JSON.stringify(connection.config)}`);

    const driver = await this.driverFactory.create(connection.type, connection.config);
    try {
      console.log(`🔌 [Exporter] Connecting to ${connection.type}...`);
      await driver.connect();
      console.log(`✅ [Exporter] Connected successfully`);
      const introspection = driver.getIntrospectionService();
      const dbName = connection.config.database || 'default';

      let schemaCharset = '';
      let schemaCollation = '';
      try {
        const schemaInfo = await driver.query(
          "SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?",
          [dbName]
        );
        if (schemaInfo && schemaInfo[0]) {
          schemaCharset = schemaInfo[0].DEFAULT_CHARACTER_SET_NAME || '';
          schemaCollation = schemaInfo[0].DEFAULT_COLLATION_NAME || '';
        }
      } catch (err: any) {
        this.logger.warn(`Failed to retrieve database schema charset/collation: ${err.message}`);
      }

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

        const list = await this._listObjects(introspection, dbName, type, specificName);
        console.log(`📊 [Exporter] ${pluralType}: found ${list.length} objects`);
        summary[pluralType] = list.length;

        if (list.length > 0 && onProgress) {
          onProgress({ env: envName, type: pluralType, current: 0, total: list.length, objectName: '', state: 'starting_type' });
        }

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

            let ddlCharset = '';
            let ddlCollation = '';
            if (type === 'TABLE' && ddl) {
              try {
                const parsed = this.parser.parseTableDetailed(ddl);
                if (parsed && parsed.options) {
                  ddlCharset = parsed.options.charset || '';
                  ddlCollation = parsed.options.collation || '';
                }
              } catch (e) {}
            }

            exportedNames.push(name);
            // Save to storage — always save so it appears in sidebar list
            await this.storageService.saveDDL(
              envName,
              dbName,
              pluralType,
              name,
              ddl || '',
              connection.type,
              undefined,
              schemaCharset,
              schemaCollation,
              ddlCharset || null,
              ddlCollation || null
            );
            savedCount++;

            if (onProgress) {
              onProgress({
                env: envName,
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

        // Memory tracker summary
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

  async exportTableData(
    envName: string,
    tableName: string,
    format: 'csv' | 'json',
    outputPath?: string
  ) {
    this.logger.info(`📊 [Exporter] exportTableData: table=${tableName}, format=${format}, env=${envName}`);

    const connection = this.configService.getConnection(envName);
    if (!connection) throw new Error(`Connection not found for env: ${envName}`);

    const driver = await this.driverFactory.create(connection.type, connection.config);
    try {
      await driver.connect();
      const data = await driver.query(`SELECT * FROM ${tableName} LIMIT 10000`); // Safety limit for now

      let content = '';
      if (format === 'json') {
        content = JSON.stringify(data, null, 2);
      } else {
        content = this._convertToCSV(data);
      }

      const projectBaseDir = this.storageService.getProjectBaseDir ? this.storageService.getProjectBaseDir() : process.cwd();
      const currentProject = this.configService.getCurrentProject();
      const projectName = currentProject?.name ? currentProject.name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase() : 'default';
      
      const finalPath = outputPath || path.join(projectBaseDir, 'projects', projectName, 'exports', `${tableName}.${format}`);
      this._ensureDir(path.dirname(finalPath));
      fs.writeFileSync(finalPath, content);

      this.logger.info(`✅ [Exporter] Exported ${data.length} rows to ${finalPath}`);
      return { path: finalPath, count: data.length };
    } finally {
      await driver.disconnect();
    }
  }

  private _convertToCSV(data: any[]): string {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(row => {
      return headers.map(header => {
        let val = row[header];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string') {
          // Escape quotes and wrap in quotes
          return `"${val.replace(/"/g, '""')}"`;
        }
        if (val instanceof Date) {
          return val.toISOString();
        }
        return val;
      }).join(',');
    });
    return [headers.join(','), ...rows].join('\n');
  }
}
