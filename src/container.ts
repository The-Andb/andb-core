import * as path from 'path';

// Services
import { StorageService } from './modules/storage/storage.service';
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

  private constructor(dbPath?: string) {
    // 1. Leaf services (no deps)
    this.storage = new StorageService();
    this.storage.initialize(dbPath || path.join(process.cwd(), 'andb-storage.db'));

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
   * Create or retrieve singleton container
   */
  static create(dbPath?: string): Container {
    if (this.instance) return this.instance;
    this.instance = new Container(dbPath);
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
