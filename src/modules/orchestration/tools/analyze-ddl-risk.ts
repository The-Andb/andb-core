import { z } from 'zod';
import { ImpactAnalysisService } from '../../safety/impact-analysis.service';
import { AIToolDefinition } from './types';

export const analyzeDDLRiskTool: AIToolDefinition = {
  name: 'analyze_ddl_risk',
  description: 'Analyze a SQL DDL statement for potential risks (data loss, downtime, performance impact).',
  inputSchema: z.object({
    sql: z.string().describe('The SQL DDL statement to analyze'),
    tableSize: z.number().optional().describe('Estimated row count of the target table, if known'),
  }),
  handler: async (input: { sql: string; tableSize?: number }) => {
    const { sql } = input;
    const impactAnalysis = new ImpactAnalysisService();

    const report = await impactAnalysis.analyze([sql]);
    const { impact } = report as any;

    return {
      assessment: report.level,
      hasDestructive: report.hasDestructive,
      summary: {
        tables: impact.tablesAffected,
        destructiveOps: impact.destructiveOps,
        columnsAdded: impact.columnsAdded,
        columnsDropped: impact.columnsDropped,
        rebuildRisk: impact.rebuildRisk,
      },
      recommendation: report.level === 'CRITICAL'
        ? 'HIGH RISK: Do not execute without verified backup.'
        : report.level === 'WARNING'
          ? 'CAUTION: Potential table locks or performance impact.'
          : 'SAFE: Minimal risk detected.',
    };
  }
};
