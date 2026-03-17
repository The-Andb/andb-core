import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as Database from 'better-sqlite3';

// SQLite Additions for Dogfooding
import { SqliteDbDriver } from './modules/driver/sqlite/sqlite.driver';
import { SqliteMigrator } from './modules/migrator/sqlite/sqlite.migrator';
import { ConnectionType } from './common/interfaces/connection.interface';

// Services
import { StorageService } from './modules/storage/storage.service';
import { SqliteStorageDriver } from './modules/storage/drivers/sqlite-storage.driver';
import { ProjectConfigService } from './modules/config/project-config.service';
import { ParserService } from './modules/parser/parser.service';
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
 * Lightweight DI Container — replaces Framework AppModule + NestFactory.
 * All wiring is explicit. No decorators, no reflection, no magic.
 */
export class Container {
  private static instance: Container | null = null;

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
    this.migrator = new MigratorService(this.impactAnalysis);
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
    );

    // 4. Root orchestrator
    this.orchestrator = new OrchestrationService(
      this.config,
      featureConfig,
      this.securityOrchestrator,
      this.gitOrchestrator,
      this.schemaOrchestrator,
    );
  }

  /**
   * Async initialization of services (like storage)
   */
  public async init(dbPath?: string) {
    const defaultGlobalPath = path.join(os.homedir(), '.andb', 'data', 'andb_core.sqlite');
    const finalDbPath = dbPath || defaultGlobalPath;
    // Default to SQLite driver for now. 
    // In the future, this can be passed from the outside (e.g. CLI vs Desktop)
    const driver = new SqliteStorageDriver();
    await this.storage.initialize(driver, finalDbPath);

    try {
      await this.runDogfoodMigration(finalDbPath);
    } catch (e: any) {
      console.error(`[Dogfooding] Internal Migration Failed: ${e.message}`);
    }
  }

  private async runDogfoodMigration(targetDbPath: string) {
    // 1. Create In-Memory DB populated with schema_template.sql
    const templatePath = path.join(__dirname, 'modules', 'storage', 'schema_template.sql');
    if (!fs.existsSync(templatePath)) {
       console.log('[Dogfooding] Template schema not found, skipping self-migration.');
       return;
    }
    const templateSql = fs.readFileSync(templatePath, 'utf8');
    const memDb = new Database(':memory:');
    memDb.exec(templateSql);

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

    let migratedSomething = false;

    // 3. Diff Expected vs Actual
    for (const table of expectedTables) {
       const srcDdl = await srcIntro.getTableDDL('default', table);
       if (!actualTables.includes(table)) {
         // Missing entirely -> Execute CREATE statement verbatim
         console.log(`[Dogfooding] Creating missing table: ${table}`);
         await destDriver.query(srcDdl);
         migratedSomething = true;
       } else {
         // Existing table -> AST Diff via ComparatorService
         const destDdl = await destIntro.getTableDDL('default', table);
         // compareTables returns pure AST IDiffOperations
         const diff = this.comparator.compareTables(srcDdl, destDdl);
         if (diff.hasChanges) {
           console.log(`[Dogfooding] Migrating table: ${table}`);
           const stmts = migrator.generateTableAlterSQL(diff);
           for (const sql of stmts) {
             if (sql.startsWith('-- WARNING')) {
               console.warn(`[Dogfooding] ${sql}`);
             } else {
               await destDriver.query(sql);
               migratedSomething = true;
             }
           }
         }
       }
    }

    if (migratedSomething) {
       console.log('[Dogfooding] Core database successfully migrated up to Golden Template.');
    }

    await destDriver.disconnect();
    // memDb will close upon garbage collection since it's :memory:
  }

  /**
   * Create or retrieve singleton container
   */
  static async create(dbPath?: string): Promise<Container> {
    if (this.instance) return this.instance;
    const container = new Container();
    await container.init(dbPath);
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
