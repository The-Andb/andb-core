import { IDatabaseConfig, ConnectionType } from '../../common/interfaces/connection.interface';
export declare class ProjectConfigService {
    private readonly logger;
    private config;
    constructor();
    private loadConfig;
    private _interpolate;
    getEnvironments(): string[];
    getDBDestination(env: string): IDatabaseConfig | null;
    getDBName(env: string): string;
    getConnection(env: string): {
        type: ConnectionType;
        config: IDatabaseConfig;
    } | null;
    getDomainNormalization(env?: string): {
        pattern: any;
        replacement: any;
    };
    getAutoBackup(): boolean;
    setConnection(env: string, config: IDatabaseConfig, type?: ConnectionType): void;
    setDomainNormalization(pattern: RegExp, replacement: string): void;
    setAutoBackup(enabled: boolean): void;
    getFeatureFlags(): Record<string, boolean>;
    isFeatureEnabled(key: string): boolean;
    setFeatureFlag(key: string, enabled: boolean): void;
    saveConfig(): void;
}
