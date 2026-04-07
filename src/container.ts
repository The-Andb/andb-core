import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as BetterSqlite3 from 'better-sqlite3';
const Database = (BetterSqlite3 as any).default || BetterSqlite3;

// SQLite Additions for Dogfooding
import { SqliteDbDriver } from './modules/driver/sqlite/sqlite.driver';
import { SqliteMigrator } from './modules/migrator/sqlite/sqlite.migrator';
import { ConnectionType } from './common/interfaces/connection.interface';

// Services
import { StorageService } from './modules/storage/storage.service';
import { ICoreStorageStrategy } from './modules/storage/interfaces/core-storage-strategy.interface';
import { ProjectConfigService } from './modules/config/project-config.service';
import { YamlImporterService } from './modules/config/yaml-importer.service';
import { ParserService } from './modules/parser/parser.service';
import { schemaTemplateSql } from './modules/storage/schema_template';
import { DriverFactoryService } from './modules/driver/driver-factory.service';
import { ComparatorService } from './modules/comparator/comparator.service';
import { SemanticDiffService } from './modules/comparator/semantic-diff.service';
import { MigratorService } from './modules/migrator/migrator.service';
import { ExporterService } from './modules/exporter/exporter.service';
import { SchemaMirrorService } from './modules/exporter/schema-mirror.service';
import { ReporterService } from './modules/reporter/reporter.service';
import { GitOrchestrator } from './modules/orchestration/git-orchestrator.service';
import { ImpactAnalysisService } from './modules/safety/impact-analysis.service';
import { SecurityOrchestrator } from './modules/orchestration/security-orchestrator.service';
import { SchemaOrchestrator } from './modules/orchestration/schema-orchestrator.service';
import { OrchestrationService } from './modules/orchestration/orchestration.service';
import { featureConfig } from './modules/config/feature.config';
import { DependencySearchService } from './modules/search/dependency-search.service';

/**
 * Structured report from the dogfooding migration.
 */
export interface MigrationChange {
  action: 'CREATED' | 'MODIFIED';
  table: string;
  details: string[];
}

export interface MigrationReport {
  fromVersion?: string;
  toVersion: string;
  changes: MigrationChange[];
  timestamp: string;
}

/**
 * Lightweight DI Container — replaces Framework AppModule + NestFactory.
 * All wiring is explicit. No decorators, no reflection, no magic.
 */
export class Container {
  private static instance: Container | null = null;

  // Migration report from last boot (null = no changes)
  public lastMigrationReport: MigrationReport | null = null;

  // Core services
  public readonly storage: StorageService;
  public readonly config: ProjectConfigService;
  public readonly parser: ParserService;
  public readonly driverFactory: DriverFactoryService;
  public readonly comparator: ComparatorService;
  public readonly semanticDiff: SemanticDiffService;
  public readonly migrator: MigratorService;
  public readonly exporter: ExporterService;
  public readonly mirror: SchemaMirrorService;
  public readonly reporter: ReporterService;
  public readonly impactAnalysis: ImpactAnalysisService;
  public readonly orchestrator: OrchestrationService;
  public readonly dependencySearch: DependencySearchService;

  // Sub-orchestrators
  public readonly gitOrchestrator: GitOrchestrator;
  public readonly securityOrchestrator: SecurityOrchestrator;
  public readonly schemaOrchestrator: SchemaOrchestrator;

  private constructor() {
    this.storage = new StorageService();
    this.config = new ProjectConfigService();
    this.parser = new ParserService();
    this.impactAnalysis = new ImpactAnalysisService();
    this.migrator = new MigratorService(this.config, this.impactAnalysis);
    this.reporter = new ReporterService();

    // 2. Services with deps
    this.driverFactory = new DriverFactoryService(this.parser);
    this.comparator = new ComparatorService(this.parser, this.storage, this.config);
    this.semanticDiff = new SemanticDiffService();
    this.exporter = new ExporterService(this.driverFactory, this.config, this.parser, this.storage);
    this.mirror = new SchemaMirrorService(this.storage);
    this.dependencySearch = new DependencySearchService();

    // 3. Orchestrators
    this.gitOrchestrator = new GitOrchestrator(this.mirror);
    this.securityOrchestrator = new SecurityOrchestrator(this.config, this.driverFactory);
    this.schemaOrchestrator = new SchemaOrchestrator(
      this.config,
      this.storage,
      this.driverFactory,
      this.comparator,
      this.exporter,
      this.migrator,
      this.semanticDiff,
      this.gitOrchestrator,
      this.dependencySearch,
      this.parser,
    );

    // 4. Root orchestrator
    this.orchestrator = new OrchestrationService(
      this.config,
      featureConfig,
      this.securityOrchestrator,
      this.gitOrchestrator,
      this.schemaOrchestrator,
      this.parser,
    );
  }

  /**
   * Async initialization of services (like storage)
   */
  public async init(strategy: ICoreStorageStrategy, dbPath: string, projectBaseDir?: string) {
    if (!strategy) {
      throw new Error('Container.init(): ICoreStorageStrategy is required.');
    }
    const finalDbPath = dbPath;
    await this.storage.initialize(strategy, finalDbPath, projectBaseDir);

    try {
      this.lastMigrationReport = await this.runDogfoodMigration(finalDbPath);
      this.orchestrator.migrationReport = this.lastMigrationReport;
    } catch (e: any) {
      console.error(`[Dogfooding] Internal Migration Failed: ${e.message}`);
    }

    // Migrate any legacy YAML formats directly into the Dogfooding Database
    const importer = new YamlImporterService(this.storage);
    await importer.runImportIfNecessary();

    // Rehydrate synchronous accessors for CLI configurations
    await this.config.init(this.storage);
  }

  private async runDogfoodMigration(targetDbPath: string): Promise<MigrationReport | null> {
    // 1. Create In-Memory DB populated with schema_template.ts
    const memDb = new Database(':memory:');
    memDb.exec(schemaTemplateSql);

    // 2. Wrap them in SqliteDbDrivers to use Introspection Services
    const srcDriver = new SqliteDbDriver({ host: ':memory:' });
    // Hack: manually set db connection for the memory db so it doesn't try to open disk file again
    (srcDriver as any).db = memDb; 
    const destDriver = new SqliteDbDriver({ host: targetDbPath });

    await destDriver.connect();

    const srcIntro = srcDriver.getIntrospectionService();
    const destIntro = destDriver.getIntrospectionService();
    const migrator = destDriver.getMigrator();

    const expectedTables = await srcIntro.listTables('default');
    const actualTables = await destIntro.listTables('default');

    const changes: MigrationChange[] = [];

    // 3. Diff Expected vs Actual
    for (const table of expectedTables) {
       const srcDdl = await srcIntro.getTableDDL('default', table);
       if (!actualTables.includes(table)) {
         // Missing entirely -> Execute CREATE statement verbatim
         console.log(`[Dogfooding] Creating missing table: ${table}`);
         await destDriver.query(srcDdl);

         // Extract column names for the report
         const colNames = this.extractColumnNames(srcDdl);
         changes.push({
           action: 'CREATED',
           table,
           details: colNames.length > 0
             ? [`New table with ${colNames.length} columns: ${colNames.join(', ')}`]
             : ['New table created']
         });
       } else {
         // Existing table -> AST Diff via ComparatorService
         const destDdl = await destIntro.getTableDDL('default', table);
         const diff = this.comparator.compareTables(srcDdl, destDdl);
         if (diff.hasChanges) {
           console.log(`[Dogfooding] Migrating table: ${table}`);
           const stmts = migrator.generateTableAlterSQL(diff);
           const details: string[] = [];
           for (const sql of stmts) {
             if (sql.startsWith('-- WARNING')) {
               console.warn(`[Dogfooding] ${sql}`);
               details.push(sql.replace('-- WARNING: ', '⚠️ '));
             } else {
               await destDriver.query(sql);
               details.push(this.humanizeAlterSQL(sql));
             }
           }
           changes.push({ action: 'MODIFIED', table, details });
         }
       }
    }

    if (changes.length > 0) {
       console.log(`[Dogfooding] Core database migrated: ${changes.length} table(s) affected.`);
    }

    await destDriver.disconnect();

    if (changes.length === 0) return null;

    return {
      toVersion: 'latest',
      changes,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Extract column names from a CREATE TABLE DDL for reporting.
   */
  private extractColumnNames(ddl: string): string[] {
    const match = ddl.match(/\(([\s\S]+)\)/);
    if (!match) return [];
    const body = match[1];
    const columns: string[] = [];
    for (const line of body.split(',')) {
      const trimmed = line.trim();
      // Skip constraints (PRIMARY KEY, UNIQUE, FOREIGN KEY, CHECK)
      if (/^(PRIMARY|UNIQUE|FOREIGN|CHECK|CONSTRAINT)/i.test(trimmed)) continue;
      const colMatch = trimmed.match(/^[`"']?(\w+)[`"']?/); 
      if (colMatch) columns.push(colMatch[1]);
    }
    return columns;
  }

  /**
   * Convert ALTER TABLE SQL to a human-readable string for the changelog.
   */
  private humanizeAlterSQL(sql: string): string {
    const addCol = sql.match(/ALTER TABLE\s+[`"']?(\w+)[`"']?\s+ADD\s+(?:COLUMN\s+)?[`"']?(\w+)[`"']?/i);
    if (addCol) return `Added column \`${addCol[2]}\``;

    const dropCol = sql.match(/ALTER TABLE\s+[`"']?(\w+)[`"']?\s+DROP\s+(?:COLUMN\s+)?[`"']?(\w+)[`"']?/i);
    if (dropCol) return `Removed column \`${dropCol[2]}\``;

    const modCol = sql.match(/ALTER TABLE\s+[`"']?(\w+)[`"']?\s+(?:MODIFY|ALTER)\s+(?:COLUMN\s+)?[`"']?(\w+)[`"']?/i);
    if (modCol) return `Modified column \`${modCol[2]}\``;

    const rename = sql.match(/ALTER TABLE\s+[`"']?(\w+)[`"']?\s+RENAME/i);
    if (rename) return `Renamed table structure`;

    // Fallback: show truncated SQL
    return sql.length > 80 ? sql.substring(0, 77) + '...' : sql;
  }

  /**
   * Create or retrieve singleton container
   */
  static async create(strategy: ICoreStorageStrategy, dbPath: string, projectBaseDir?: string): Promise<Container> {
    if (this.instance) return this.instance;
    const container = new Container();
    await container.init(strategy, dbPath, projectBaseDir);
    this.instance = container;
    return this.instance;
  }

  /**
   * Reset container (for testing)
   */
  static reset(): void {
    if (this.instance) {
      this.instance.storage.close();
      this.instance = null;
    }
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    this.storage.close();
    Container.instance = null;
  }
}
