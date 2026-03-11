import { ProjectConfigService } from '../config/project-config.service';
import { FeatureConfigStore } from '../config/feature.config';
import { SecurityOrchestrator } from './security-orchestrator.service';
import { GitOrchestrator } from './git-orchestrator.service';
import { SchemaOrchestrator } from './schema-orchestrator.service';
export declare class OrchestrationService {
    private readonly configService;
    private readonly features;
    readonly securityOrchestrator: SecurityOrchestrator;
    readonly gitOrchestrator: GitOrchestrator;
    readonly schemaOrchestrator: SchemaOrchestrator;
    private readonly logger;
    constructor(configService: ProjectConfigService, features: FeatureConfigStore, securityOrchestrator: SecurityOrchestrator, gitOrchestrator: GitOrchestrator, schemaOrchestrator: SchemaOrchestrator);
    execute(operation: string, payload: any): Promise<any>;
    private syncConfigWithPayload;
    getFeaturesStatus(): Promise<FeatureConfigStore>;
    updateFeatureFlag(payload: any): Promise<{
        success: boolean;
        key: any;
        enabled: any;
    }>;
}
