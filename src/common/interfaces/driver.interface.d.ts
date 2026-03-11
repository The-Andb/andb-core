import { ITableDiff, IObjectDiff } from './diff.interface';
export interface IDatabaseConfig {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
    socketPath?: string;
    [key: string]: any;
}
export interface IColumnMetadata {
    name: string;
    type: string;
    isNullable: boolean;
    defaultValue: string | null;
    extra: string;
    comment: string;
}
export interface IDatabaseDriver {
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
    }): Promise<string>;
}
export interface IIntrospectionService {
    listTables(dbName: string): Promise<string[]>;
    listViews(dbName: string): Promise<string[]>;
    listProcedures(dbName: string): Promise<string[]>;
    listFunctions(dbName: string): Promise<string[]>;
    listTriggers(dbName: string): Promise<string[]>;
    listEvents(dbName: string): Promise<string[]>;
    getTableDDL(dbName: string, tableName: string): Promise<string>;
    getViewDDL(dbName: string, viewName: string): Promise<string>;
    getProcedureDDL(dbName: string, procName: string): Promise<string>;
    getFunctionDDL(dbName: string, funcName: string): Promise<string>;
    getTriggerDDL(dbName: string, triggerName: string): Promise<string>;
    getEventDDL(dbName: string, eventName: string): Promise<string>;
    getChecksums(dbName: string): Promise<Record<string, string>>;
    getObjectDDL(dbName: string, type: string, name: string): Promise<string>;
    getTableColumns(dbName: string, tableName: string): Promise<IColumnMetadata[]>;
}
export interface IMonitoringService {
    getProcessList(): Promise<any[]>;
    getStatus(): Promise<any>;
    getVariables(): Promise<any>;
    getVersion(): Promise<string>;
    getConnections(): Promise<any>;
    getTransactions(): Promise<any>;
}
export interface IMigrator {
    generateObjectSQL(diff: IObjectDiff): string[];
    generateTableAlterSQL(diff: ITableDiff): string[];
}
