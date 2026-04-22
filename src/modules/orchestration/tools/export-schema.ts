import { z } from 'zod';
import { AIToolDefinition } from './types';

const ConnectionConfigSchema = z.object({
  host: z.string().describe('Database host or path to SQL dump file'),
  port: z.number().optional().default(3306).describe('Database port'),
  user: z.string().optional().describe('Database username'),
  password: z.string().optional().describe('Database password'),
  database: z.string().describe('Database name'),
  type: z.enum(['mysql', 'dump']).optional().default('mysql').describe('Database type'),
  socketPath: z.string().optional().describe('Unix socket path (alternative to host/port)'),
});

const ConnectionInputSchema = z.union([
  z.object({
    env: z.string().describe('Environment name from andb.yaml (e.g. DEV, PROD)'),
  }),
  z.object({
    connection: ConnectionConfigSchema.describe('Inline database connection configuration'),
  }),
]);

export const exportSchemaTool: AIToolDefinition = {
  name: 'export_schema',
  description: 'Export database schema DDL to local files. Exports all object definitions from the specified environment.',
  inputSchema: z.intersection(
    ConnectionInputSchema,
    z.object({
      objectType: z
        .enum(['table', 'view', 'procedure', 'function', 'trigger', 'event'])
        .optional()
        .describe('Export only specific object type (default: all types)'),
    })
  ),
  handler: async (input: any, context?: any) => {
    const { orchestrator } = context || {};
    if (!orchestrator) throw new Error('SchemaOrchestrator context required');

    const env = 'env' in input ? input.env : '__AI_EXPORT__';
    const targetConfig = 'connection' in input ? input.connection : undefined;

    const result = await orchestrator.exportSchema({
      env,
      type: input.objectType,
      targetConfig
    });

    return result;
  }
};
