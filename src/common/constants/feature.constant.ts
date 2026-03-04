/**
 * Central registry of all toggleable features in The Andb.
 * Used for both build-time gating and runtime checks.
 */
export enum FeatureKey {
  MCP_SERVER = 'mcpServer', // [COMPLETED] Core MCP Bridge & UI card
  GIT_SYNC = 'gitSync', // [COMPLETED] Hybrid Git Model & Integrations card
  SCHEMA_REPORT = 'schemaReport', // [COMPLETED] HTML Report generation
  DRIFT_DETECTION = 'driftDetection', // [COMPLETED] Git-based sync detection
  BETA_GATE = 'betaGate', // [COMPLETED] Public beta access control
  BUG_REPORT = 'bugReport', // [PLANNED] Automatic error reporting
  FEATURE_SUGGEST = 'featureSuggest', // [PLANNED] User feedback loop
  DB_DESIGNER = 'dbDesigner', // [IN-PROGRESS] Visual DB modeling
  AUTO_BACKUP = 'autoBackup', // [COMPLETED] Automatic snapshot before migration
  FOCUS_COLUMN_MODE = 'focusColumnMode', // [COMPLETED] Miller Columns auto-collapse
  ER_DIAGRAM = 'erDiagram', // [COMPLETED] Interactive Canvas ERD
  QUICK_DUMP_COMPARE = 'quickDumpCompare', // [COMPLETED] CLI-based fast structural diff
  LIVE_DEMO = 'liveDemo', // [PLANNED] Sandboxed trial environments
  DOMAIN_LOGIC = 'domainLogic', // [PLANNED] Custom SQL business rules
  RESTRICTED_USER = 'restrictedUser', // [COMPLETED] Secure user setup & probing
  SNAPSHOT_RESTORE = 'snapshotRestore', // [COMPLETED] Database point-in-time snapshots
}
