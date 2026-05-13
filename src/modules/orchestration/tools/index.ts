export * from './get-db-status';
export * from './test-connection';
export * from './export-schema';
export * from './migrate-schema';
export * from './diff-semantic';
export * from './get-schema-normalized';
export * from './app-control';
export * from './draft-migration';
export * from './analyze-slow-queries';
export * from './validate-safety';

import { inspectQueryTool } from './inspect-query';
import { analyzeDDLRiskTool } from './analyze-ddl-risk';
import { suggestIndexesTool } from './suggest-indexes';
import { dataHealthCheckTool } from './data-health-check';
import { compareSchemaTool } from './compare-schema';
import { draftMigrationTool } from './draft-migration';
import { analyzeSlowQueriesTool } from './analyze-slow-queries';
import { validateSafetyTool } from './validate-safety';
import { getWorkspaceSummaryTool } from './get-workspace-summary';
import { listSchemaObjectsTool } from './list-schema-objects';
import { getObjectDDLTool } from './get-object-ddl';
import { getDBStatusTool } from './get-db-status';
import { testConnectionTool } from './test-connection';
import { exportSchemaTool } from './export-schema';
import { migrateSchemaTool } from './migrate-schema';
import { diffSemanticTool } from './diff-semantic';
import { getSchemaNormalizedTool } from './get-schema-normalized';
import {
  appNavigateTool,
  appTriggerCompareTool,
  appFocusObjectTool,
  appShowToastTool,
  appCreateProjectTool,
  appSwitchProjectTool
} from './app-control';

export const allAITools = [
  inspectQueryTool,
  analyzeDDLRiskTool,
  suggestIndexesTool,
  dataHealthCheckTool,
  compareSchemaTool,
  draftMigrationTool,
  analyzeSlowQueriesTool,
  validateSafetyTool,
  getWorkspaceSummaryTool,
  listSchemaObjectsTool,
  getObjectDDLTool,
  getDBStatusTool,
  testConnectionTool,
  exportSchemaTool,
  migrateSchemaTool,
  diffSemanticTool,
  getSchemaNormalizedTool,
  appNavigateTool,
  appTriggerCompareTool,
  appFocusObjectTool,
  appShowToastTool,
  appCreateProjectTool,
  appSwitchProjectTool
];
