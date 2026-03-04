const { getLogger } = require('andb-logger');
import { ProjectConfigService } from '../config/project-config.service';
import { FeatureConfigStore } from '../config/feature.config';
import { SecurityOrchestrator } from './security-orchestrator.service';
import { GitOrchestrator } from './git-orchestrator.service';
import { SchemaOrchestrator } from './schema-orchestrator.service';

export class OrchestrationService {
  private readonly logger = getLogger({ logName: 'OrchestrationService' });

  constructor(
    private readonly configService: ProjectConfigService,
    private readonly features: FeatureConfigStore,
    private readonly securityOrchestrator: SecurityOrchestrator,
    private readonly gitOrchestrator: GitOrchestrator,
    private readonly schemaOrchestrator: SchemaOrchestrator,
  ) { }

  async execute(operation: string, payload: any) {
    this.logger.info(`Executing operation: ${operation}`);

    // Ensure config is synced before dispatching
    this.syncConfigWithPayload(payload);

    switch (operation) {
      case 'getSchemaObjects':
        return await this.schemaOrchestrator.getSchemaObjects(payload);
      case 'export':
        return await this.schemaOrchestrator.exportSchema(payload);
      case 'mcp-server-start':
        if (!this.features.mcpServer) {
          throw new Error('Feature MCP_SERVER is disabled in configuration.');
        }
        return { success: true };
      case 'compare':
        return await this.schemaOrchestrator.compareSchema(payload);
      case 'migrate':
        return await this.schemaOrchestrator.migrateSchema(payload);
      case 'setup-restricted-user':
        return await this.securityOrchestrator.setupRestrictedUser(payload);
      case 'generate-user-setup-script':
        return await this.securityOrchestrator.generateUserSetupScript(payload);
      case 'probe-restricted-user':
        return await this.securityOrchestrator.probeRestrictedUser(payload);
      case 'test-connection':
        return await this.securityOrchestrator.testConnection(payload);
      case 'git-status':
        return await this.gitOrchestrator.gitStatus(payload);
      case 'git-init':
        return await this.gitOrchestrator.gitInit(payload);
      case 'git-sync':
        return await this.gitOrchestrator.gitSync(payload);
      case 'git-pull':
        return await this.gitOrchestrator.gitPull(payload);
      case 'updateFeatureFlag':
        return await this.updateFeatureFlag(payload);
      case 'getFeaturesStatus':
        return await this.getFeaturesStatus();
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  private syncConfigWithPayload(payload: any) {
    if (payload.sourceConfig && payload.srcEnv) {
      this.configService.setConnection(
        payload.srcEnv,
        payload.sourceConfig,
        payload.sourceConfig.type,
      );
    }
    if (payload.targetConfig && payload.destEnv) {
      this.configService.setConnection(
        payload.destEnv,
        payload.targetConfig,
        payload.targetConfig.type,
      );
    }
    if (payload.domainNormalization) {
      this.configService.setDomainNormalization(
        new RegExp(payload.domainNormalization.pattern),
        payload.domainNormalization.replacement,
      );
    }
  }

  async getFeaturesStatus(): Promise<FeatureConfigStore> {
    const allFlags: any = { ...this.features };
    const yamlFlags = this.configService.getFeatureFlags();
    return { ...allFlags, ...yamlFlags };
  }

  async updateFeatureFlag(payload: any) {
    const { key, enabled } = payload;
    this.configService.setFeatureFlag(key, enabled);
    this.configService.saveConfig();
    return { success: true, key, enabled };
  }
}
