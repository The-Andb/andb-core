import { z } from 'zod';
import { AIToolDefinition } from './types';

export const validateSafetyTool: AIToolDefinition = {
  name: 'validate_migration_safety',
  description: 'Analyze a SQL migration script for potential destructive operations and data loss risks. Returns a safety report with risk levels.',
  inputSchema: z.object({
    sqlContent: z.string().describe('The SQL script to analyze'),
  }),
  handler: async (input: any, context?: any) => {
    const { sqlContent } = input;
    const risks: { level: 'LOW' | 'MEDIUM' | 'HIGH'; message: string; type: string }[] = [];
    
    const lowerSql = sqlContent.toLowerCase();
    
    // 1. Destructive Commands
    if (lowerSql.includes('drop table')) {
      risks.push({ level: 'HIGH', message: 'Contains DROP TABLE statement. This will permanently delete data and schema.', type: 'DESTRUCTIVE' });
    }
    if (lowerSql.includes('truncate ')) {
      risks.push({ level: 'HIGH', message: 'Contains TRUNCATE statement. This will wipe all data in the table.', type: 'DESTRUCTIVE' });
    }
    
    // 2. Unsafe DELETES/UPDATES
    if (lowerSql.includes('delete from ') && !lowerSql.includes('where')) {
      risks.push({ level: 'HIGH', message: 'Contains DELETE FROM without a WHERE clause. This will delete ALL rows.', type: 'UNSAFE' });
    }
    if (lowerSql.includes('update ') && !lowerSql.includes('set ') && !lowerSql.includes('where')) {
       // Simple check, might be false positive if multi-line, but good for safety
    }

    // 3. Schema Alterations
    if (lowerSql.includes('drop column') || lowerSql.includes('alter table') && lowerSql.includes('drop ')) {
      risks.push({ level: 'MEDIUM', message: 'Contains DROP COLUMN or similar alteration. Potential data loss.', type: 'DATA_LOSS' });
    }

    const overallLevel = risks.some(r => r.level === 'HIGH') ? 'HIGH' : (risks.length > 0 ? 'MEDIUM' : 'LOW');

    return {
      success: true,
      overallLevel,
      riskCount: risks.length,
      risks,
      isSafe: overallLevel === 'LOW',
      recommendation: overallLevel === 'HIGH' ? 'CRITICAL: DO NOT execute without full backup and manual verification.' : (overallLevel === 'MEDIUM' ? 'Proceed with caution. Backup recommended.' : 'Script appears safe for routine execution.')
    };
  }
};
