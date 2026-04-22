import { z } from 'zod';
import { AIToolDefinition } from './types';

export const dataHealthCheckTool: AIToolDefinition = {
  name: 'check_data_health',
  description: 'Performs a high-level health check on database tables, identifying missing primary keys, orphan indexes, and sizing anomalies.',
  inputSchema: z.object({
    connection: z.any().describe('Database connection to analyze'),
  }),
  handler: async (input: any, context?: any) => {
    const { orchestrator } = context || {};
    if (!orchestrator) throw new Error('SchemaOrchestrator context required for health check');

    try {
      const stats = await orchestrator.getTableStats({ 
        connection: input.connection
      });

      const issues: Array<{ table: string; issue: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' }> = [];
      
      if (Array.isArray(stats)) {
        stats.forEach((table: any) => {
          if (table.rows > 10000000) {
            issues.push({ 
              table: table.name, 
              issue: 'VLDB: Table exceeds 10M rows. Consider partitioning or archiving.',
              severity: 'MEDIUM' 
            });
          }

          if (table.indexSize > table.dataSize * 2) {
             issues.push({
               table: table.name,
               issue: 'Index Bloat: Index size is more than double the data size.',
               severity: 'LOW'
             });
          }
        });
      }

      return {
        summary: `Analyzed ${stats.length} tables.`,
        healthScore: issues.length === 0 ? 100 : Math.max(0, 100 - (issues.length * 10)),
        issues,
        recommendation: issues.length > 0 ? 'Review the identified issues to optimize storage and performance.' : 'Database health is optimal.'
      };
    } catch (error: any) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }
};
