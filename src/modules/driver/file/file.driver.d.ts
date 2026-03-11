import { IDatabaseDriver, IIntrospectionService, IMonitoringService, IDatabaseConfig, IMigrator } from '../../../common/interfaces/driver.interface';
export declare class FileDriver implements IDatabaseDriver {
    private readonly config;
    private readonly logger;
    private introspectionService?;
    private migrator?;
    private basePath;
    constructor(config: IDatabaseConfig);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    query<T = any>(sql: string): Promise<T>;
    getIntrospectionService(): IIntrospectionService;
    getMigrator(): IMigrator;
    getMonitoringService(): IMonitoringService;
    getSessionContext(): Promise<unknown>;
    setForeignKeyChecks(_enabled: boolean): Promise<void>;
    generateUserSetupScript(_params: any): Promise<string>;
    listObjects(folder: string): Promise<string[]>;
    readObject(folder: string, name: string): Promise<string>;
}
