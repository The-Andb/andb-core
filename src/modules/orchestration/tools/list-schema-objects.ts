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

export const listSchemaObjectsTool: AIToolDefinition = {
  name: 'list_schema_objects',
  description: 'List all database objects (tables, views, procedures, functions, triggers, events) in a database. Provide an environment name (e.g. DEV) or inline connection details.',
  inputSchema: ConnectionInputSchema,
  handler: async (input: any, context?: any) => {
    const { orchestrator } = context || {};
    if (!orchestrator) throw new Error('SchemaOrchestrator context required');

    const env = 'env' in input ? input.env : '__AI_INLINE__';
    const targetConfig = 'connection' in input ? input.connection : undefined;

    const result = await orchestrator.getSchemaObjects({
      destEnv: env,
      targetConfig,
    });

    return result;
  }
};
