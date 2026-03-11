import { ProjectConfigService } from '../config/project-config.service';
import { GitOrchestrator } from './git-orchestrator.service';
import { SafetyLevel } from '../../common/interfaces/schema.interface';
export declare class SchemaOrchestrator {
    private readonly configService;
    private storageService;
    private driverFactory;
    private comparator;
    private exporter;
    private migrator;
    private semanticDiff;
    private readonly gitOrchestrator;
    private readonly logger;
    constructor(configService: ProjectConfigService, storageService: any, driverFactory: any, comparator: any, exporter: any, migrator: any, semanticDiff: any, gitOrchestrator: GitOrchestrator);
    exportSchema(payload: any): Promise<any>;
    getSchemaObjects(payload: any): Promise<any>;
    compareSchema(payload: any): Promise<any>;
    semanticCompare(payload: any): Promise<any>;
    migrateSchema(payload: any): Promise<{
        success: boolean;
        successful: any[];
        failed: any[];
        dryRun: boolean;
        safetyLevel: SafetyLevel;
        impact: any;
    } | {
        success: boolean;
        successful: any[];
        failed: any[];
        dryRun: any;
        safetyLevel: string;
        totalStatements: number;
        skippedDrops?: undefined;
        safetyReport?: undefined;
        objects?: undefined;
    } | {
        success: boolean;
        successful: any[];
        failed: any[];
        dryRun: any;
        safetyLevel: string;
        totalStatements: number;
        skippedDrops: number;
        safetyReport?: undefined;
        objects?: undefined;
    } | {
        success: boolean;
        dryRun: boolean;
        safetyReport: any;
        totalStatements: number;
        objects: {
            name: any;
            type: any;
            status: any;
            safetyLevel: any;
        }[];
        successful?: undefined;
        failed?: undefined;
        safetyLevel?: undefined;
        skippedDrops?: undefined;
    }>;
    private performLiveMigration;
    private requiresBackup;
    private handleObjectBackup;
    private handleGitSync;
    isTableExists(env: string, tableName: string): Promise<boolean>;
    getDriverFromConnection(connection: any): Promise<any>;
    getSchemaNormalized(payload: any): Promise<Record<string, any>>;
}
