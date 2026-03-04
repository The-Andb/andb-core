import { FeatureKey } from '../../common/constants/feature.constant';

/**
 * Maps FEATURE_<UPPER_SNAKE> environment variables to FeatureKey enum values.
 * A feature is ONLY enabled if the environment variable is exactly 'true' (string).
 * This manual mapping reads environment variables for feature flags.
 */
export const featureConfig = {
  [FeatureKey.MCP_SERVER]: process.env.FEATURE_MCP_SERVER === 'true',
  [FeatureKey.GIT_SYNC]: process.env.FEATURE_GIT_SYNC === 'true',
  [FeatureKey.SCHEMA_REPORT]: process.env.FEATURE_SCHEMA_REPORT === 'true',
  [FeatureKey.DRIFT_DETECTION]: process.env.FEATURE_DRIFT_DETECTION === 'true',
  [FeatureKey.BETA_GATE]: process.env.FEATURE_BETA_GATE === 'true',
  [FeatureKey.BUG_REPORT]: process.env.FEATURE_BUG_REPORT === 'true',
  [FeatureKey.FEATURE_SUGGEST]: process.env.FEATURE_FEATURE_SUGGEST === 'true',
  [FeatureKey.DB_DESIGNER]: process.env.FEATURE_DB_DESIGNER === 'true',
  [FeatureKey.AUTO_BACKUP]: process.env.FEATURE_AUTO_BACKUP === 'true',
  [FeatureKey.FOCUS_COLUMN_MODE]: process.env.FEATURE_FOCUS_MODE === 'true',
  [FeatureKey.ER_DIAGRAM]: process.env.FEATURE_ER_DIAGRAM === 'true',
  [FeatureKey.QUICK_DUMP_COMPARE]: process.env.FEATURE_QUICK_DUMP === 'true',
  [FeatureKey.LIVE_DEMO]: process.env.FEATURE_LIVE_DEMO === 'true',
  [FeatureKey.DOMAIN_LOGIC]: process.env.FEATURE_DOMAIN_LOGIC === 'true',
  [FeatureKey.RESTRICTED_USER]: process.env.FEATURE_RESTRICTED_USER === 'true',
  [FeatureKey.SNAPSHOT_RESTORE]: process.env.FEATURE_SNAPSHOT_RESTORE === 'true',
};

export type FeatureConfigStore = typeof featureConfig;
export const FEATURE_CONFIG_TOKEN = 'FEATURE_CONFIG';
