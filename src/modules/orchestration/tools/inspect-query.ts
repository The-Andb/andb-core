import { z } from 'zod';
import { AIToolDefinition } from './types';

export const inspectQueryTool: AIToolDefinition = {
  name: 'inspect_query',
  description: 'Deeply analyzes SQL queries for risks, performance bottlenecks, and security patterns (e.g., SQL injection, missing WHERE clauses).',
  inputSchema: z.object({
    sql: z.string().describe('The SQL query (SELECT, UPDATE, DELETE) to inspect'),
  }),
  handler: async (input: { sql: string }) => {
    const { sql } = input;
    const risks: string[] = [];
    const suggestions: string[] = [];
    let safetyLevel: 'SAFE' | 'WARNING' | 'CRITICAL' = 'SAFE';

    const normalizedSql = sql.toLowerCase().trim();

    // 1. Check for missing WHERE clause in destructive operations
    if ((normalizedSql.startsWith('delete') || normalizedSql.startsWith('update')) && !normalizedSql.includes('where')) {
      risks.push('CRITICAL: Missing WHERE clause in destructive operation. This will affect ALL rows in the table.');
      safetyLevel = 'CRITICAL';
    }

    // 2. Check for SQL Injection patterns (basic)
    if (normalizedSql.includes('or 1=1') || normalizedSql.includes('or "1"="1"')) {
      risks.push('CRITICAL: Potential SQL Injection pattern detected (OR 1=1).');
      safetyLevel = 'CRITICAL';
    }

    // 3. Performance: Check for SELECT *
    if (normalizedSql.startsWith('select *')) {
      suggestions.push('Performance: Avoid "SELECT *". Specify required columns to reduce I/O and network overhead.');
      if (safetyLevel === 'SAFE') safetyLevel = 'WARNING';
    }

    // 4. Performance: Check for LIKE with leading wildcard
    if (normalizedSql.includes("like '%")) {
      suggestions.push('Performance: Leading wildcard in LIKE clause prevents index usage. Consider Full-Text search if applicable.');
    }

    // 5. Check for Cross Joins
    if (normalizedSql.includes('cross join') || (normalizedSql.includes(',') && !normalizedSql.includes('join') && !normalizedSql.includes('where'))) {
      risks.push('WARNING: Potential Cartesian product (Cross Join) detected. This can lead to massive result sets.');
      if (safetyLevel !== 'CRITICAL') safetyLevel = 'WARNING';
    }

    return {
      safetyLevel,
      risks,
      suggestions,
      summary: `Analyzed query: ${sql.substring(0, 50)}${sql.length > 50 ? '...' : ''}`
    };
  }
};
