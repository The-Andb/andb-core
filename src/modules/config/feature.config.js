"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEATURE_CONFIG_TOKEN = exports.featureConfig = void 0;
var feature_constant_1 = require("../../common/constants/feature.constant");
/**
 * Maps FEATURE_<UPPER_SNAKE> environment variables to FeatureKey enum values.
 * A feature is ONLY enabled if the environment variable is exactly 'true' (string).
 * This manual mapping reads environment variables for feature flags.
 */
exports.featureConfig = (_a = {},
    _a[feature_constant_1.FeatureKey.MCP_SERVER] = process.env.FEATURE_MCP_SERVER === 'true',
    _a[feature_constant_1.FeatureKey.GIT_SYNC] = process.env.FEATURE_GIT_SYNC === 'true',
    _a[feature_constant_1.FeatureKey.SCHEMA_REPORT] = process.env.FEATURE_SCHEMA_REPORT === 'true',
    _a[feature_constant_1.FeatureKey.DRIFT_DETECTION] = process.env.FEATURE_DRIFT_DETECTION === 'true',
    _a[feature_constant_1.FeatureKey.BETA_GATE] = process.env.FEATURE_BETA_GATE === 'true',
    _a[feature_constant_1.FeatureKey.BUG_REPORT] = process.env.FEATURE_BUG_REPORT === 'true',
    _a[feature_constant_1.FeatureKey.FEATURE_SUGGEST] = process.env.FEATURE_FEATURE_SUGGEST === 'true',
    _a[feature_constant_1.FeatureKey.DB_DESIGNER] = process.env.FEATURE_DB_DESIGNER === 'true',
    _a[feature_constant_1.FeatureKey.AUTO_BACKUP] = process.env.FEATURE_AUTO_BACKUP === 'true',
    _a[feature_constant_1.FeatureKey.FOCUS_COLUMN_MODE] = process.env.FEATURE_FOCUS_MODE === 'true',
    _a[feature_constant_1.FeatureKey.ER_DIAGRAM] = process.env.FEATURE_ER_DIAGRAM === 'true',
    _a[feature_constant_1.FeatureKey.QUICK_DUMP_COMPARE] = process.env.FEATURE_QUICK_DUMP === 'true',
    _a[feature_constant_1.FeatureKey.LIVE_DEMO] = process.env.FEATURE_LIVE_DEMO === 'true',
    _a[feature_constant_1.FeatureKey.DOMAIN_LOGIC] = process.env.FEATURE_DOMAIN_LOGIC === 'true',
    _a[feature_constant_1.FeatureKey.RESTRICTED_USER] = process.env.FEATURE_RESTRICTED_USER === 'true',
    _a[feature_constant_1.FeatureKey.SNAPSHOT_RESTORE] = process.env.FEATURE_SNAPSHOT_RESTORE === 'true',
    _a);
exports.FEATURE_CONFIG_TOKEN = 'FEATURE_CONFIG';
