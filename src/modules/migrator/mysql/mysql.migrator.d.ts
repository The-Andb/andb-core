import { ITableDiff, IObjectDiff } from '../../../common/interfaces/diff.interface';
export declare class MysqlMigrator {
    generateObjectSQL(diff: IObjectDiff): string[];
    generateTableAlterSQL(diff: ITableDiff): string[];
    isNotMigrateCondition(name: string): boolean;
    disableForeignKeyChecks(): string;
    enableForeignKeyChecks(): string;
}
