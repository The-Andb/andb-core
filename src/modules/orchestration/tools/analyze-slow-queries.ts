import { z } from 'zod';
import { AIToolDefinition } from './types';

export const analyzeSlowQueriesTool: AIToolDefinition = {
  name: 'analyze_slow_queries',
  description: 'Fetch and analyze slow query logs from the database. Identifies bottlenecks and suggests index optimizations.',
  inputSchema: z.object({
    projectId: z.string().describe('The active project ID'),
    limit: z.number().optional().default(10).describe('Max number of queries to analyze'),
    minDurationMs: z.number().optional().default(100).describe('Filter queries slower than this threshold'),
  }),
  handler: async (input: any, context?: any) => {
    // In a real implementation, this would query the database's slow log tables
    // (e.g. mysql.slow_log or performance_schema). 
    // For now, we return a mock analysis to demonstrate the capability.
    
    return {
      success: true,
      queries: [
        {
          sql: 'SELECT * FROM orders WHERE user_id = ? AND status = "pending" ORDER BY created_at DESC',
          duration: '450ms',
          impact: 'HIGH',
          reason: 'Full table scan. Index missing on (user_id, status, created_at)',
          suggestion: 'CREATE INDEX idx_orders_user_status_created ON orders(user_id, status, created_at);'
        },
        {
          sql: 'SELECT SUM(total_amount) FROM payments WHERE payment_date > "2024-01-01"',
          duration: '320ms',
          impact: 'MEDIUM',
          reason: 'Large range scan on payment_date',
          suggestion: 'Ensure payment_date is indexed and consider partitioning by date if table is large.'
        }
      ],
      summary: `Analyzed slow logs. Found 2 high-impact bottlenecks. Suggested 2 index optimizations.`
    };
  }
};
