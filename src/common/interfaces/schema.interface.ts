export interface ITableDefinition {
  name: string;
  schema?: string;
  columns: IColumnDefinition[];
  indexes: IIndexDefinition[];
  foreignKeys: IForeignKeyDefinition[];
  options?: ITableOptions;
  ddl?: string;
}

export interface IColumnDefinition {
  name: string;
  type: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  defaultValue?: string | null;
  comment?: string;
  autoIncrement?: boolean;
  charset?: string;
  collation?: string;
  extra?: string;
}

export interface IIndexDefinition {
  name: string;
  columns: string[];
  isUnique: boolean;
  type?: string;
  algorythm?: string;
  comment?: string;
}

export interface IForeignKeyDefinition {
  constraintName: string;
  columnName: string;
  referencedSchema?: string;
  referencedTable: string;
  referencedColumn: string;
  onUpdate?: string;
  onDelete?: string;
}

export interface ITableOptions {
  engine?: string;
  charset?: string;
  collation?: string;
  rowFormat?: string;
  autoIncrement?: number;
  comment?: string;
}

export interface IViewDefinition {
  name: string;
  schema?: string;
  ddl: string;
  algorithm?: string;
  definer?: string;
  securityType?: string;
  checkOption?: string;
}

export interface IRoutineDefinition {
  name: string;
  schema?: string;
  type: 'PROCEDURE' | 'FUNCTION';
  ddl: string;
  definer?: string;
  deterministic?: boolean;
  dataAccess?: 'CONTAINS SQL' | 'NO SQL' | 'READS SQL DATA' | 'MODIFIES SQL DATA';
  securityType?: string;
  comment?: string;
  params?: string;
  returns?: string;
}

export interface ITriggerDefinition {
  name: string;
  schema?: string;
  ddl: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  timing: 'BEFORE' | 'AFTER';
  table: string;
}

export interface IEventDefinition {
  name: string;
  schema?: string;
  ddl: string;
  definer?: string;
  schedule?: string;
  status?: 'ENABLE' | 'DISABLE' | 'SLAVESIDE_DISABLED';
  onCompletion?: 'PRESERVE' | 'NOT PRESERVE';
}

export enum SafetyLevel {
  SAFE = 'SAFE',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export interface ISafetyReport {
  level: SafetyLevel;
  summary: {
    safe: string[];
    warning: string[];
    critical: string[];
  };
  hasDestructive: boolean;
}

// Diff related
export interface IDiffOperation {
  type: 'ADD' | 'DROP' | 'MODIFY' | 'CHANGE';
  target:
  | 'TABLE'
  | 'COLUMN'
  | 'INDEX'
  | 'FOREIGN_KEY'
  | 'OPTION'
  | 'TRIGGER'
  | 'VIEW'
  | 'PROCEDURE'
  | 'FUNCTION'
  | 'EVENT';
  name: string;
  tableName?: string;
  definition?: string;
  oldDefinition?: string;
}

export interface ITableDiff {
  tableName: string;
  operations: IDiffOperation[];
  hasChanges: boolean;
}

export interface IObjectDiff {
  type: 'VIEW' | 'PROCEDURE' | 'FUNCTION' | 'EVENT' | 'TRIGGER';
  name: string;
  operation: 'CREATE' | 'DROP' | 'REPLACE';
  definition?: string;
}

export interface ISchemaDiff {
  tables: Record<string, ITableDiff>;
  droppedTables: string[];
  objects: IObjectDiff[];
  summary: {
    totalChanges: number;
    tablesChanged: number;
    objectsChanged: number;
  };
}

// Semantic Diffing (Phase 2)
export interface ISemanticChange {
  type: string; // e.g., 'DATATYPE_CHANGE', 'NULLABILITY_CHANGE', 'DEFAULT_VALUE_CHANGE'
  property?: string; // e.g., 'type', 'isNullable', 'defaultValue'
  oldValue?: any;
  newValue?: any;
  description: string;
}

export interface ISemanticObjectDiff {
  name: string;
  type: string; // 'TABLE', 'COLUMN', 'INDEX', etc.
  changes: ISemanticChange[];
}

export interface ISemanticReport {
  tables: Record<string, ISemanticObjectDiff>;
  summary: string[]; // High-level human readable strings
}

// Table Inspector & Meta-Cache (AI DBA Super Mode - Phase 1)
export interface ITableStats {
  tableName: string;
  rowCount: number;
  dataLengthMB: number;
  indexLengthMB: number;
  engine: string;
  autoIncrement: number | null;
  collation: string;
  createTime: string | null;
  updateTime: string | null;
}

export interface IServerInfo {
  version: string;
  versionMajor: number;
  versionMinor: number;
  hasInstantDDL: boolean;   // MySQL 8.0.12+
  hasOnlineDDL: boolean;    // MySQL 5.6+
}

export interface IFKGraphEntry {
  tableName: string;
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
  constraintName: string;
  onDelete: string;
  onUpdate: string;
}
