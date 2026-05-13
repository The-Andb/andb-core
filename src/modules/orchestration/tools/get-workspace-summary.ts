import * as z from 'zod';
import { AIToolDefinition } from './types';

export const getWorkspaceSummaryTool: AIToolDefinition = {
  name: 'get_workspace_summary',
  description: 'Returns a summary of the current workspace, including the number of projects, environments, and configured database connections.',
  inputSchema: z.object({
    refresh: z.boolean().optional()
  }),
  handler: async (_input: any, context?: any) => {
    const { config } = (context || {}) as { config: any };
    if (!config) throw new Error('ProjectConfigService context required');

    // Force reload projects from storage to avoid stale cache (e.g. newly created projects)
    if (typeof config.reload === 'function') {
      await config.reload();
    }

    const projects = typeof config.getProjects === 'function' ? config.getProjects() : [];
    const currentProject = typeof config.getCurrentProject === 'function' ? config.getCurrentProject() : null;
    
    // Use getEnvironments() to get list from ProjectConfigService
    const environments = typeof config.getEnvironments === 'function' ? config.getEnvironments() : [];
    const connectionsCount = environments.length; // Simplified: 1 connection per env in current model

    return {
      projectsCount: projects.length,
      currentProject: currentProject?.name || 'Default',
      connectionsCount: connectionsCount,
      environmentsCount: environments.length,
      environmentsList: environments,
      projectsList: projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        icon: p.icon
      })),
      summary: `Workspace has ${projects.length} projects. Current project "${currentProject?.name || 'Default'}" has ${environments.length} configured environments: ${environments.join(', ')}.`
    };
  }
};
