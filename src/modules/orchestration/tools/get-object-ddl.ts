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

export const getObjectDDLTool: AIToolDefinition = {
  name: 'get_object_ddl',
  description: 'Get the DDL (CREATE statement) of a specific database object. Specify the object type and name.',
  inputSchema: z.intersection(
    ConnectionInputSchema,
    z.object({
      objectType: z
        .enum(['table', 'view', 'procedure', 'function', 'trigger', 'event'])
        .describe('Type of database object'),
      objectName: z.string().describe('Name of the database object'),
    })
  ),
  handler: async (input: any, context?: any) => {
    const { orchestrator, config } = context || {};
    if (!orchestrator || !config) throw new Error('Context required');

    const env = 'env' in input ? input.env : '__AI_INLINE__';
    
    // Support inline connection
    if ('connection' in input) {
      config.setConnection(env, input.connection, input.connection.type || 'mysql');
    }

    const connection = config.getConnection(env);
    if (!connection) {
      throw new Error(`No connection configured for environment: ${env}`);
    }

    const result = await orchestrator.getObjectDDL({
      connection,
      objectType: input.objectType,
      objectName: input.objectName,
    });

    return result || `No DDL found for ${input.objectType} '${input.objectName}'`;
  }
};
