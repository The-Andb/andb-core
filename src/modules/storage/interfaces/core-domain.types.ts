export interface Project {
  id: string;
  name: string;
  description?: string;
  is_favorite?: number;
  order_index?: number;
  created_at?: Date;
  updated_at?: Date;
  environments?: ProjectEnvironment[];
  settings?: ProjectSetting[];
}

export interface ProjectEnvironment {
  id: string;
  project_id: string;
  env_name: string;
  source_type: string;
  path?: string;
  host?: string;
  port?: number;
  username?: string;
  database_name?: string;
  use_ssh_tunnel?: number;
  ssh_host?: string;
  ssh_port?: number;
  ssh_username?: string;
  ssh_key_path?: string;
  use_ssl?: number;
  is_read_only?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface ProjectSetting {
  project_id: string;
  setting_key: string;
  setting_value: string;
  updated_at?: Date;
}

export interface CliSetting {
  key: string;
  value: string;
  updated_at?: Date;
}

export interface Metadata {
  key: string;
  value: string;
  updated_at?: Date;
}

export interface DdlExport {
  id: string;
  environment: string;
  database_name: string;
  export_type: string;
  export_name: string;
  ddl_content: string;
  exported_at?: Date;
}

export interface DdlSnapshot {
  id: string;
  environment: string;
  database_name: string;
  ddl_type: string;
  ddl_name: string;
  ddl_content: string;
  hash: string;
  created_at?: Date;
}

export interface ComparisonResult {
  id: string;
  source_env: string;
  target_env: string;
  database_name: string;
  ddl_type: string;
  ddl_name: string;
  status: string; // 'NEW' | 'MODIFIED' | 'IDENTICAL' | 'MISSING'
  alter_statements?: string; // JSON array string
  compared_at?: Date;
}

export interface MigrationHistory {
  id?: number;
  environment: string;
  database_name: string;
  migration_type: string; // 'MANUAL' | 'SYNC'
  target_objects: string; // JSON
  status: string; // 'PENDING' | 'SUCCESS' | 'FAILED'
  error_message?: string;
  executed_at?: Date;
  executed_by?: string;
}
