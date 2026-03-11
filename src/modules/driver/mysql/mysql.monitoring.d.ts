import { IDatabaseDriver, IMonitoringService } from '../../../common/interfaces/driver.interface';
export declare class MysqlMonitoringService implements IMonitoringService {
    private readonly driver;
    constructor(driver: IDatabaseDriver);
    getProcessList(): Promise<any[]>;
    getStatus(): Promise<any>;
    getVariables(): Promise<any>;
    getVersion(): Promise<string>;
    getConnections(): Promise<any>;
    getTransactions(): Promise<any>;
}
