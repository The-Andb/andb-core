import { z } from 'zod';
import { AIToolDefinition } from './types';

export const compareSchemaTool: AIToolDefinition = {
  name: 'compare_schema',
  description: 'Compare schemas between two database environments. Returns differences and generates migration SQL.',
  inputSchema: z.object({
    source: z.any().describe('Source environment name or connection config'),
    target: z.any().describe('Target environment name or connection config'),
    objectTypes: z.array(z.string()).optional().describe('Filter to specific object types'),
  }),
  handler: async (input: any, context?: any) => {
    const { orchestrator } = context || {};
    if (!orchestrator) throw new Error('SchemaOrchestrator context required for compare_schema');

    // Logic here is simplified compared to MCP wrapper to be more direct for internal AI
    const result = await orchestrator.compareSchema({
      srcEnv: typeof input.source === 'string' ? input.source : '__AI_SRC__',
      destEnv: typeof input.target === 'string' ? input.target : '__AI_DEST__',
      sourceConfig: typeof input.source === 'object' ? input.source : undefined,
      targetConfig: typeof input.target === 'object' ? input.target : undefined,
      objectTypes: input.objectTypes
    });

    return result;
  }
};
