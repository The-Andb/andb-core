import { z } from 'zod';

// Tool 1: app_navigate
export const appNavigateTool = {
  name: 'app_navigate',
  description: 'Navigate the Desktop app to a specific view or project. Use this when the user asks to see a project or dashboard.',
  inputSchema: z.object({
    view: z.enum(['Dashboard', 'ProjectDetail', 'GlobalSchema', 'Settings']).describe('The view to navigate to'),
    projectId: z.number().optional().describe('The project ID if navigating to a specific project'),
  }),
  handler: async (input: { view: string, projectId?: number }, context: any) => {
    if (context.emitAppEvent) {
      context.emitAppEvent({
        type: 'APP_CONTROL',
        action: 'NAVIGATE',
        payload: input
      });
      return `Emitted navigation event to ${input.view}`;
    }
    return `Simulation: Navigated to ${input.view}`;
  }
};

// Tool 2: app_trigger_compare
export const appTriggerCompareTool = {
  name: 'app_trigger_compare',
  description: 'Trigger a schema comparison between two environments and open the MirrorDiffView so the user can see the visual differences.',
  inputSchema: z.object({
    sourceEnv: z.string().describe('Source environment name (e.g. LOCAL, STAGE)'),
    targetEnv: z.string().describe('Target environment name (e.g. STAGE, PROD)'),
    objectName: z.string().optional().describe('Optional object name to focus on after comparing'),
  }),
  handler: async (input: { sourceEnv: string, targetEnv: string, objectName?: string }, context: any) => {
    if (context.emitAppEvent) {
      context.emitAppEvent({
        type: 'APP_CONTROL',
        action: 'TRIGGER_COMPARE',
        payload: input
      });
      return `Emitted trigger compare event between ${input.sourceEnv} and ${input.targetEnv}`;
    }
    return `Simulation: Triggered compare between ${input.sourceEnv} and ${input.targetEnv}`;
  }
};

// Tool 3: app_focus_object
export const appFocusObjectTool = {
  name: 'app_focus_object',
  description: 'Open the DDL Viewer for a specific database object (table, view, etc.) in a specific environment so the user can inspect it.',
  inputSchema: z.object({
    env: z.string().describe('Environment name (e.g. LOCAL, STAGE)'),
    objectName: z.string().describe('Name of the table or view to focus on'),
  }),
  handler: async (input: { env: string, objectName: string }, context: any) => {
    if (context.emitAppEvent) {
      context.emitAppEvent({
        type: 'APP_CONTROL',
        action: 'FOCUS_OBJECT',
        payload: input
      });
      return `Emitted focus object event for ${input.objectName} in ${input.env}`;
    }
    return `Simulation: Focused on ${input.objectName} in ${input.env}`;
  }
};

// Tool 4: app_show_toast
export const appShowToastTool = {
  name: 'app_show_toast',
  description: 'Show a temporary toast notification to the user in the bottom corner of the screen.',
  inputSchema: z.object({
    type: z.enum(['success', 'error', 'info', 'warning']).describe('Type of toast'),
    message: z.string().describe('The message to display'),
  }),
  handler: async (input: { type: string, message: string }, context: any) => {
    if (context.emitAppEvent) {
      context.emitAppEvent({
        type: 'APP_CONTROL',
        action: 'SHOW_TOAST',
        payload: input
      });
      return `Emitted toast: ${input.message}`;
    }
    return `Simulation: Toast -> ${input.message}`;
  }
};
// Tool 5: app_create_project
export const appCreateProjectTool = {
  name: 'app_create_project',
  description: 'Create a new project in the Desktop app. Use this when the user wants to organize a new set of databases.',
  inputSchema: z.object({
    name: z.string().describe('The name of the new project'),
    description: z.string().optional().describe('Optional description of the project'),
    icon: z.string().optional().describe('Lucide icon name (e.g. Database, Box, Globe)'),
    color: z.string().optional().describe('Hex color for the project icon'),
  }),
  handler: async (input: any, context: any) => {
    if (context.emitAppEvent) {
      context.emitAppEvent({
        type: 'APP_CONTROL',
        action: 'CREATE_PROJECT',
        payload: input
      });
      return `Emitted project creation event for "${input.name}"`;
    }
    return `Simulation: Created project "${input.name}"`;
  }
};

// Tool 6: app_switch_project
export const appSwitchProjectTool = {
  name: 'app_switch_project',
  description: 'Switch the active project in the Desktop app. Use this when the user asks to "open" or "switch to" another project.',
  inputSchema: z.object({
    projectId: z.string().describe('The ID of the project to switch to'),
  }),
  handler: async (input: { projectId: string }, context: any) => {
    if (context.emitAppEvent) {
      context.emitAppEvent({
        type: 'APP_CONTROL',
        action: 'SWITCH_PROJECT',
        payload: input
      });
      
      // Update core config as well so subsequent tools use the correct context
      if (context.config) {
        context.config.setActiveProjectId(input.projectId);
      }
      
      return `Emitted project switch event to ${input.projectId}`;
    }
    return `Simulation: Switched to project ${input.projectId}`;
  }
};
