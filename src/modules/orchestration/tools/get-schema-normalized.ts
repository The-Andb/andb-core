import { z } from 'zod';
import { AIToolDefinition } from './types';

export const getSchemaNormalizedTool: AIToolDefinition = {
  name: 'get_schema_normalized',
  description: 'Fetch the entire database schema in a normalized SQL format. This is optimized for AI agents to reason about the database structure efficiently.',
  inputSchema: z.object({
    env: z.string().describe('Environment name from andb.yaml'),
    database: z.string().optional().describe('Database name (default: default)'),
  }),
  handler: async (input: any, context?: any) => {
    const { orchestrator } = context || {};
    if (!orchestrator) throw new Error('SchemaOrchestrator context required');

    const result = await orchestrator.getSchemaNormalized({
      env: input.env,
      db: input.database || 'default',
    });

    return result;
  }
};
