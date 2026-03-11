import { ISafetyReport } from '../../common/interfaces/schema.interface';
export interface IImpactSummary {
    tablesAffected: string[];
    columnsAdded: number;
    columnsDropped: number;
    indexesCreated: number;
    indexesDropped: number;
    destructiveOps: number;
    rebuildRisk: boolean;
}
export interface IAnalysisContext {
    tableStats?: Record<string, {
        rowCount: number;
    }>;
}
export declare class ImpactAnalysisService {
    private readonly logger;
    private readonly parser;
    analyze(statements: string[], dialect?: string, context?: IAnalysisContext): Promise<ISafetyReport & {
        impact: IImpactSummary;
    }>;
    private detectRisk;
    private updateReport;
    private updateImpact;
    private fallbackRiskCheck;
}
