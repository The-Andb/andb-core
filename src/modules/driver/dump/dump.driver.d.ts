import { IDatabaseDriver, IIntrospectionService, IMonitoringService, IDatabaseConfig, IMigrator } from '../../../common/interfaces/driver.interface';
import { ParserService } from '../../parser/parser.service';
export declare class DumpDriver implements IDatabaseDriver {
    private readonly config;
    private readonly parserService;
    private readonly logger;
    data: Record<string, Map<string, string>>;
    private introspectionService?;
    private migrator?;
    constructor(config: IDatabaseConfig, parserService: ParserService);
    connect(): Promise<void>;
    loadFromStorage(ddlObjects: Array<{
        name: string;
        content: string;
    }>, ddlType: string): void;
    disconnect(): Promise<void>;
    query<T = any>(sql: string): Promise<T>;
    getIntrospectionService(): IIntrospectionService;
    getMigrator(): IMigrator;
    getMonitoringService(): IMonitoringService;
    getSessionContext(): Promise<unknown>;
    setForeignKeyChecks(_enabled: boolean): Promise<void>;
    generateUserSetupScript(_params: any): Promise<string>;
    private _parseDump;
    private _processStatement;
    private _extractName;
}
