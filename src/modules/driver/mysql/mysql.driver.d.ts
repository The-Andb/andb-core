import { IDatabaseDriver, IDatabaseConfig, IIntrospectionService, IMonitoringService, IMigrator } from '../../../common/interfaces/driver.interface';
export declare class MysqlDriver implements IDatabaseDriver {
    private readonly config;
    private connection;
    private sshTunnel;
    private readonly logger;
    private introspectionService?;
    private monitoringService?;
    private migrator?;
    private parserService;
    constructor(config: IDatabaseConfig);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    query<T = any>(sql: string, params?: any[]): Promise<T>;
    getIntrospectionService(): IIntrospectionService;
    getMonitoringService(): IMonitoringService;
    getMigrator(): IMigrator;
    getSessionContext(): Promise<any>;
    setForeignKeyChecks(enabled: boolean): Promise<void>;
    generateUserSetupScript(params: {
        username: string;
        password?: string;
        database?: string;
        host?: string;
        permissions: any;
        isReconfigure?: boolean;
    }): Promise<string>;
}
