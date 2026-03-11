import { SchemaMirrorService } from '../exporter/schema-mirror.service';
import { IGitStatus } from '../../common/interfaces/git.interface';
export declare class GitOrchestrator {
    private readonly mirrorService;
    private readonly logger;
    private gitService;
    constructor(mirrorService: SchemaMirrorService);
    private getGitService;
    gitInit(payload: any): Promise<{
        success: boolean;
    }>;
    gitStatus(payload: any): Promise<any>;
    gitSync(payload: any): Promise<{
        success: boolean;
        message: string;
        commitMessage?: undefined;
    } | {
        success: boolean;
        message: string;
        commitMessage: any;
    } | {
        success: boolean;
        commitMessage: any;
        message?: undefined;
    }>;
    gitPull(payload: any): Promise<{
        success: boolean;
        message: string;
    }>;
    generateSemanticMessage(status: IGitStatus, env: string, db: string): string;
}
