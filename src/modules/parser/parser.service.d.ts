export declare class ParserService {
    cleanDefiner(ddl: string): string;
    splitRoutine(ddl: string): {
        header: string;
        body: string;
    } | null;
    normalize(ddl: string, options?: {
        ignoreDefiner?: boolean;
        ignoreWhitespace?: boolean;
    }): string;
    uppercaseKeywords(query: string): string;
    parseTable(tableSQL: string): {
        tableName: string;
        columns: Record<string, string>;
        primaryKey: string[];
        indexes: Record<string, string>;
        foreignKeys: Record<string, string>;
    } | null;
    parseTableDetailed(tableSQL: string): {
        tableName: string;
        columns: any[];
        indexes: any[];
        foreignKeys: any[];
        options: any;
        partitions: string | null;
    } | null;
    parseTrigger(triggerSQL: string): {
        triggerName: string;
        timing: string;
        event: string;
        tableName: string;
        definition: string;
    } | null;
}
