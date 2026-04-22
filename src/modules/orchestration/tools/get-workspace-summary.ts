import { z } from 'zod';
import { AIToolDefinition } from './types';

export const getWorkspaceSummaryTool: AIToolDefinition = {
  name: 'get_workspace_summary',
  description: 'Returns a summary of the current workspace, including the number of projects, environments, and configured database connections.',
  inputSchema: z.object({}),
  handler: async (_input: any, context?: any) => {
    const { config } = context || {};
    if (!config) throw new Error('ProjectConfigService context required');

    const projects = config.getProjects ? config.getProjects() : [];
    const currentProject = config.getCurrentProject ? config.getCurrentProject() : null;
    
    // In @the-andb/core, connections are managed via project config
    const connections = currentProject?.connections || [];
    const environments = currentProject?.environments || [];

    return {
      projectsCount: projects.length,
      currentProject: currentProject?.name || 'Default',
      connectionsCount: connections.length,
      environmentsCount: environments.length,
      environmentsList: environments.map((e: any) => e.name),
      summary: `Workspace has ${projects.length} projects. Current project "${currentProject?.name}" has ${connections.length} connections across ${environments.length} environments.`
    };
  }
};
