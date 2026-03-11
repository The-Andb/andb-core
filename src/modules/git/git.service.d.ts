import { IGitConfig, IGitCommitOptions, IGitStatus } from '../../common/interfaces/git.interface';
export declare class GitService {
    private readonly logger;
    private git;
    private currentConfig;
    initialize(config: IGitConfig): Promise<void>;
    private setupRemote;
    getStatus(): Promise<IGitStatus>;
    fetch(): Promise<void>;
    checkDrift(branch?: string): Promise<{
        ahead: number;
        behind: number;
    }>;
    commit(options: IGitCommitOptions): Promise<void>;
    push(): Promise<void>;
    pull(): Promise<void>;
}
