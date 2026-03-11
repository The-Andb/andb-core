import { IIntrospectionService, IDatabaseDriver } from '../../../common/interfaces/driver.interface';
import { ParserService } from '../../parser/parser.service';
export declare class MysqlIntrospectionService implements IIntrospectionService {
    private readonly driver;
    private readonly parser;
    constructor(driver: IDatabaseDriver, parser: ParserService);
    listTables(dbName: string): Promise<string[]>;
    listViews(dbName: string): Promise<string[]>;
    listProcedures(dbName: string): Promise<string[]>;
    listFunctions(dbName: string): Promise<string[]>;
    listTriggers(dbName: string): Promise<string[]>;
    listEvents(dbName: string): Promise<string[]>;
    private _normalizeDDL;
    private _extractDDLFromRow;
    getTableDDL(dbName: string, tableName: string): Promise<string>;
    getViewDDL(dbName: string, viewName: string): Promise<string>;
    getProcedureDDL(dbName: string, procName: string): Promise<string>;
    getFunctionDDL(dbName: string, funcName: string): Promise<string>;
    getTriggerDDL(dbName: string, triggerName: string): Promise<string>;
    getEventDDL(dbName: string, eventName: string): Promise<string>;
    getChecksums(dbName: string): Promise<Record<string, string>>;
    getObjectDDL(dbName: string, type: string, name: string): Promise<string>;
    getTableColumns(dbName: string, tableName: string): Promise<any[]>;
}
