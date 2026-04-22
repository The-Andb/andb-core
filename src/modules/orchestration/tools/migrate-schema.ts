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
  z.object({ env: z.string().describe('Environment name from andb.yaml (e.g. DEV, PROD)') }),
  z.object({ connection: ConnectionConfigSchema.describe('Inline database connection configuration') }),
]);

export const migrateSchemaTool: AIToolDefinition = {
  name: 'migrate_schema',
  description: 'Compare two environments and generate migration SQL to sync the target with the source. By default, this only PREVIEWS the SQL without executing. Set dryRun to false to execute.',
  inputSchema: z.object({
    source: ConnectionInputSchema.describe('Source database (the reference/truth)'),
    target: ConnectionInputSchema.describe('Target database (the one to be migrated)'),
    dryRun: z.boolean().optional().default(true).describe('If true (default), only return the migration SQL without executing. Set to false to execute migration.'),
    force: z.boolean().optional().default(false).describe('If true, bypass safety guards for destructive operations (DROP, TRUNCATE, etc.).'),
  }),
  handler: async (input: any, context?: any) => {
    const { orchestrator, config } = context || {};
    if (!orchestrator || !config) throw new Error('SchemaOrchestrator and config context required');

    const { source, target, dryRun, force } = input;

    // Resolve source
    let srcEnv: string;
    if ('env' in source) {
      srcEnv = source.env;
    } else {
      srcEnv = '__AI_SRC__';
      config.setConnection(srcEnv, source.connection, source.connection.type || 'mysql');
    }

    // Resolve target
    let destEnv: string;
    if ('env' in target) {
      destEnv = target.env;
    } else {
      destEnv = '__AI_DEST__';
      config.setConnection(destEnv, target.connection, target.connection.type || 'mysql');
    }

    const result = await orchestrator.execute('migrate', {
      srcEnv,
      destEnv,
      sourceConfig: 'connection' in source ? source.connection : undefined,
      targetConfig: 'connection' in target ? target.connection : undefined,
      dryRun: dryRun !== false, // Default to true
      force: force === true,
    });

    return result;
  }
};
