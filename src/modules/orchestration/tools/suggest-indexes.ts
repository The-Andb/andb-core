import { z } from 'zod';
import { AIToolDefinition } from './types';

export const suggestIndexesTool: AIToolDefinition = {
  name: 'suggest_indexes',
  description: 'Analyze a SQL query and suggest optimal indexes to improve performance.',
  inputSchema: z.object({
    query: z.string().describe('The SELECT/UPDATE/DELETE query to analyze'),
  }),
  handler: async (input: { query: string }) => {
    const { query } = input;
    const suggestions: Array<{ table: string; columns: string[]; type: string; reason: string }> = [];

    const normalizedQuery = query.replace(/\s+/g, ' ');

    // 1. Extract Table Name (Simplified)
    const tableMatch = normalizedQuery.match(/FROM\s+`?(\w+)`?(?:\s+AS\s+\w+)?/i) ||
      normalizedQuery.match(/UPDATE\s+`?(\w+)`?/i) ||
      normalizedQuery.match(/DELETE\s+FROM\s+`?(\w+)`?/i);

    const mainTable = tableMatch ? tableMatch[1] : 'unknown_table';

    // 2. Extract JOIN tables
    const joinMatches = normalizedQuery.matchAll(/JOIN\s+`?(\w+)`?/gi);
    const tables = [mainTable, ...Array.from(joinMatches).map(m => m[1])];

    // 3. Extract WHERE columns
    const wherePart = normalizedQuery.split(/WHERE/i)[1]?.split(/GROUP BY|ORDER BY|LIMIT|;/i)[0];
    if (wherePart) {
      const colMatches = wherePart.matchAll(/`?(\w+)`?\s*(?:=|>|<|>=|<=|IN|LIKE)/gi);
      const whereCols = Array.from(new Set(Array.from(colMatches).map(m => m[1])));

      if (whereCols.length > 0) {
        suggestions.push({
          table: mainTable,
          columns: whereCols,
          type: whereCols.length > 1 ? 'COMPOSITE INDEX' : 'INDEX',
          reason: `Highly effective for filtering in WHERE clause: ${whereCols.join(', ')}`,
        });
      }
    }

    // 4. Extract ORDER BY columns
    const orderPart = normalizedQuery.split(/ORDER BY/i)[1]?.split(/LIMIT|;/i)[0];
    if (orderPart) {
      const colMatches = orderPart.matchAll(/`?(\w+)`?(?:\s+ASC|\s+DESC)?/gi);
      const orderCols = Array.from(new Set(Array.from(colMatches).map(m => m[1])));

      if (orderCols.length > 0) {
        suggestions.push({
          table: mainTable,
          columns: orderCols,
          type: 'INDEX',
          reason: `Improves sorting performance for ORDER BY: ${orderCols.join(', ')}`,
        });
      }
    }

    // 5. Extract JOIN columns (ON clause)
    const onMatches = normalizedQuery.matchAll(/ON\s+.*?`?(\w+)`?\s*=\s*.*?`?(\w+)`?/gi);
    for (const match of onMatches) {
      const col1 = match[1];
      const col2 = match[2];
      suggestions.push({
        table: 'multiple',
        columns: [col1, col2],
        type: 'INDEX',
        reason: `Critical for optimizing JOIN performance between tables.`,
      });
    }

    return {
      querySummary: `Analyzed query on table: ${mainTable}`,
      suggestions,
      tip: 'Composite indexes (multiple columns) are often better than multiple single-column indexes for complex WHERE clauses.'
    };
  }
};
