import { IIntrospectionService } from '../../../common/interfaces/driver.interface';
import { DumpDriver } from './dump.driver';
export declare class DumpIntrospectionService implements IIntrospectionService {
    private readonly driver;
    constructor(driver: DumpDriver);
    private _list;
    private _get;
    listTables(): Promise<string[]>;
    listViews(): Promise<string[]>;
    listProcedures(): Promise<string[]>;
    listFunctions(): Promise<string[]>;
    listTriggers(): Promise<string[]>;
    listEvents(): Promise<string[]>;
    getTableDDL(db: string, name: string): Promise<string>;
    getViewDDL(db: string, name: string): Promise<string>;
    getProcedureDDL(db: string, name: string): Promise<string>;
    getFunctionDDL(db: string, name: string): Promise<string>;
    getTriggerDDL(db: string, name: string): Promise<string>;
    getEventDDL(db: string, name: string): Promise<string>;
    getChecksums(): Promise<Record<string, string>>;
    getObjectDDL(db: string, type: string, name: string): Promise<string>;
    getTableColumns(db: string, tableName: string): Promise<any[]>;
}
