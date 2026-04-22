import { z } from 'zod';
import { AIToolDefinition } from './types';

export const diffSemanticTool: AIToolDefinition = {
  name: 'diff_semantic',
  description: 'Perform a deep, semantic comparison between two tables using AST analysis. Identifies specifically what changed (datatype, nullability, defaults) in a human-readable way.',
  inputSchema: z.object({
    source: z.string().describe('Source environment name (e.g. DEV)'),
    target: z.string().describe('Target environment name (e.g. PROD)'),
    tableName: z.string().describe('The name of the table to compare'),
  }),
  handler: async (input: any, context?: any) => {
    const { orchestrator } = context || {};
    if (!orchestrator) throw new Error('SchemaOrchestrator context required');

    const result = await orchestrator.semanticCompare({
      srcEnv: input.source,
      destEnv: input.target,
      name: input.tableName,
      type: 'TABLE'
    });

    return result;
  }
};
