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

export const testConnectionTool: AIToolDefinition = {
  name: 'test_connection',
  description: 'Test database connectivity and credentials. Provide an environment name or inline connection configuration.',
  inputSchema: ConnectionInputSchema,
  handler: async (input: any, context?: any) => {
    const { orchestrator, config } = context || {};
    if (!orchestrator || !config) throw new Error('Context required');

    const env = 'env' in input ? input.env : '__AI_TEST_CONN__';
    
    // Support inline connection
    if ('connection' in input) {
      config.setConnection(env, input.connection, input.connection.type || 'mysql');
    }

    const connection = config.getConnection(env);
    if (!connection) {
      throw new Error(`No connection configured for environment: ${env}`);
    }

    const result = await orchestrator.testConnection({ connection });
    return result;
  }
};
