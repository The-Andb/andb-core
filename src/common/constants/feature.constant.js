"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureKey = void 0;
/**
 * Central registry of all toggleable features in TheAndb.
 * Used for both build-time gating and runtime checks.
 */
var FeatureKey;
(function (FeatureKey) {
    FeatureKey["MCP_SERVER"] = "mcpServer";
    FeatureKey["GIT_SYNC"] = "gitSync";
    FeatureKey["SCHEMA_REPORT"] = "schemaReport";
    FeatureKey["DRIFT_DETECTION"] = "driftDetection";
    FeatureKey["BETA_GATE"] = "betaGate";
    FeatureKey["BUG_REPORT"] = "bugReport";
    FeatureKey["FEATURE_SUGGEST"] = "featureSuggest";
    FeatureKey["DB_DESIGNER"] = "dbDesigner";
    FeatureKey["AUTO_BACKUP"] = "autoBackup";
    FeatureKey["FOCUS_COLUMN_MODE"] = "focusColumnMode";
    FeatureKey["ER_DIAGRAM"] = "erDiagram";
    FeatureKey["QUICK_DUMP_COMPARE"] = "quickDumpCompare";
    FeatureKey["LIVE_DEMO"] = "liveDemo";
    FeatureKey["DOMAIN_LOGIC"] = "domainLogic";
    FeatureKey["RESTRICTED_USER"] = "restrictedUser";
    FeatureKey["SNAPSHOT_RESTORE"] = "snapshotRestore";
})(FeatureKey || (exports.FeatureKey = FeatureKey = {}));
