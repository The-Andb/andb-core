export const schemaTemplateSql = `
-- schema_template.sql
-- TheAndb Internal Database Golden Template (Target Schema V2)
-- Used by the Dogfooding Auto-migration Engine.

CREATE TABLE ddl_exports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  environment TEXT NOT NULL COLLATE NOCASE,
  database_name TEXT NOT NULL COLLATE NOCASE,
  ddl_type TEXT NOT NULL COLLATE NOCASE,
  ddl_name TEXT NOT NULL COLLATE NOCASE,
  ddl_content TEXT NOT NULL,
  checksum TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  exported_to_file INTEGER DEFAULT 0,
  file_path TEXT,
  UNIQUE(environment, database_name, ddl_type, ddl_name)
);

CREATE TABLE comparisons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  src_environment TEXT NOT NULL COLLATE NOCASE,
  dest_environment TEXT NOT NULL COLLATE NOCASE,
  database_name TEXT NOT NULL COLLATE NOCASE,
  ddl_type TEXT NOT NULL COLLATE NOCASE,
  ddl_name TEXT NOT NULL COLLATE NOCASE,
  status TEXT NOT NULL,
  src_ddl_id INTEGER,
  dest_ddl_id INTEGER,
  diff_summary TEXT,
  alter_statements TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  exported_to_file INTEGER DEFAULT 0,
  file_path TEXT,
  UNIQUE(src_environment, dest_environment, database_name, ddl_type, ddl_name)
);

CREATE TABLE migration_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  src_environment TEXT NOT NULL COLLATE NOCASE,
  dest_environment TEXT NOT NULL COLLATE NOCASE,
  database_name TEXT NOT NULL COLLATE NOCASE,
  ddl_type TEXT NOT NULL COLLATE NOCASE,
  ddl_name TEXT NOT NULL COLLATE NOCASE,
  operation TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  executed_by TEXT
);

CREATE TABLE ddl_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  environment TEXT NOT NULL COLLATE NOCASE,
  database_name TEXT NOT NULL COLLATE NOCASE,
  ddl_type TEXT NOT NULL COLLATE NOCASE,
  ddl_name TEXT NOT NULL COLLATE NOCASE,
  ddl_content TEXT NOT NULL,
  checksum TEXT,
  version_tag TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE metadata (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_favorite INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE project_environments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  env_name TEXT NOT NULL,
  source_type TEXT DEFAULT 'mysql',
  path TEXT,
  host TEXT,
  port INTEGER,
  username TEXT,
  database_name TEXT,
  use_ssh_tunnel INTEGER DEFAULT 0,
  ssh_host TEXT,
  ssh_port INTEGER,
  ssh_username TEXT,
  ssh_key_path TEXT,
  use_ssl INTEGER DEFAULT 0,
  is_read_only INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE project_settings (
  project_id TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(project_id, setting_key),
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE user_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ddl_lookup ON ddl_exports(environment, database_name);
CREATE INDEX idx_comp_lookup ON comparisons(src_environment, dest_environment);
CREATE INDEX idx_snapshot_lookup ON ddl_snapshots(environment, database_name, ddl_type, ddl_name);
`;
