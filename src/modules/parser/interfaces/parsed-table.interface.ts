export interface ParsedColumn {
  name: string;
  dataType: string;
  length?: number | string;
  nullable: boolean;
  defaultValue: any | null;
  comment?: string;
  unsigned?: boolean;
  zerofill?: boolean;
  autoIncrement?: boolean;
  charset?: string;
  collate?: string;
  onUpdate?: string;
  rawDefinition?: string; // fallback for raw SQL slice
}

export interface ParsedIndex {
  name: string;
  type: 'PRIMARY' | 'UNIQUE' | 'INDEX' | 'FULLTEXT' | 'SPATIAL';
  columns: string[];
  comment?: string;
  rawDefinition?: string;
}

export interface ParsedForeignKey {
  name: string;
  columns: string[];
  refTable: string;
  refColumns: string[];
  onDelete?: string;
  onUpdate?: string;
  rawDefinition?: string;
}

export interface ParsedTableOptions {
  engine?: string;
  charset?: string;
  collate?: string;
  comment?: string;
  autoIncrement?: number;
  rowFormat?: string;
  [key: string]: any;
}

export interface ParsedTable {
  tableName: string;
  columns: ParsedColumn[];
  indexes: ParsedIndex[];
  foreignKeys: ParsedForeignKey[];
  options: ParsedTableOptions;
  partitions: string | null;
  rawSql: string;
}
