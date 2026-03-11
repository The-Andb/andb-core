import Database = require('better-sqlite3');
export declare class StorageService {
    private readonly logger;
    private db;
    private dbPath;
    initialize(dbPath: string): void;
    private _initSchema;
    close(): void;
    saveDDL(environment: string, database: string, type: string, name: string, content: string): Promise<Database.RunResult>;
    saveDDLBatch(environment: string, database: string, type: string, items: {
        name: string;
        content: string;
    }[]): Promise<void>;
    getDDL(environment: string, database: string, type: string, name: string): Promise<any>;
    getDDLObjects(environment: string, database: string, type: string): Promise<unknown[]>;
    getDDLList(environment: string, database: string, type: string): Promise<any[]>;
    getEnvironments(): Promise<any[]>;
    getDatabases(environment: string): Promise<any[]>;
    getLastUpdated(environment: string, database: string): Promise<any>;
    saveComparison(comp: {
        srcEnv: string;
        destEnv: string;
        database: string;
        type: string;
        name: string;
        status: string;
        ddl?: any;
        alterStatements?: any;
        diffSummary?: string;
    }): Promise<Database.RunResult>;
    getComparisons(srcEnv: string, destEnv: string, database: string, type: string): Promise<{
        name: any;
        status: any;
        type: any;
        ddl: any[];
        alterStatements: any[];
        diffSummary: any;
        updatedAt: any;
    }[]>;
    getComparisonsByStatus(srcEnv: string, destEnv: string, database: string, type: string, status: string): Promise<{
        name: any;
        status: any;
        type: any;
        ddl: any[];
        alterStatements: any[];
        diffSummary: any;
        updatedAt: any;
    }[]>;
    private _mapComparisonToUI;
    getLatestComparisons(limit?: number): Promise<unknown[]>;
    saveSnapshot(environment: string, database: string, type: string, name: string, ddl: string, tag?: string): Promise<Database.RunResult>;
    getSnapshots(environment: string, database: string, type: string, name: string): Promise<unknown[]>;
    getAllSnapshots(limit?: number): Promise<unknown[]>;
    saveMigration(history: {
        srcEnv: string;
        destEnv: string;
        database: string;
        type: string;
        name: string;
        operation: string;
        status: string;
        error?: string;
    }): Promise<Database.RunResult>;
    getMigrationHistory(limit?: number): Promise<unknown[]>;
    clearConnectionData(environment: string, database: string): Promise<{
        ddlCount: number;
        comparisonCount: number;
    }>;
    clearAll(): Promise<{
        ddl: number;
        comparison: number;
        snapshot: number;
        migration: number;
    }>;
    getStats(): Promise<{
        ddlExports?: undefined;
        comparisons?: undefined;
        snapshots?: undefined;
        dbPath?: undefined;
    } | {
        ddlExports: any;
        comparisons: any;
        snapshots: any;
        dbPath: string;
    }>;
}
