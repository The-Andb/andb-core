import { ITableDiff, ISchemaDiff, IObjectDiff, SafetyLevel, ISafetyReport } from '../../common/interfaces/schema.interface';
import { IMigrator } from '../../common/interfaces/driver.interface';
import { ImpactAnalysisService } from '../safety/impact-analysis.service';
export declare class MigratorService {
    private readonly impactAnalysis;
    constructor(impactAnalysis?: ImpactAnalysisService);
    generateAlterSQL(diff: ITableDiff, migrator: IMigrator): string[];
    generateObjectSQL(obj: IObjectDiff, migrator: IMigrator): string[];
    generateSchemaSQL(schemaDiff: ISchemaDiff, migrator: IMigrator): string[];
    getSafetyLevel(sql: string): SafetyLevel;
    isDestructive(sql: string): boolean;
    checkSafety(statements: string[], force?: boolean): void;
    disableForeignKeyChecks(): string;
    enableForeignKeyChecks(): string;
    isNotMigrateCondition(name: string): boolean;
    summarizeMigration(statements: string[]): {
        safe: string[];
        destructive: string[];
    };
    getSafetyReport(statements: string[], dialect?: string): Promise<ISafetyReport>;
    validateMigration(destEnv: string, safetyReport: ISafetyReport, options?: {
        force?: boolean;
    }): void;
    isProduction(env: string): boolean;
}
