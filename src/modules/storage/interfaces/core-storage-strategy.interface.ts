import {
  Project,
  ProjectEnvironment,
  ProjectSetting,
  CliSetting,
  Metadata,
  DdlExport,
  DdlSnapshot,
  ComparisonResult,
  MigrationHistory
} from './core-domain.types';

export interface ICoreStorageStrategy {
  // --- Lifecycle ---
  initialize(dbPath: string, extraEntities?: any[], projectBaseDir?: string): Promise<void>;
  close(): Promise<void>;

  // --- Projects ---
  saveProject(project: Project): Promise<void>;
  getProjects(): Promise<Project[]>;
  deleteProject(id: string): Promise<void>;

  // --- Environments ---
  saveProjectEnvironment(env: ProjectEnvironment): Promise<void>;
  getProjectEnvironments(projectId: string): Promise<ProjectEnvironment[]>;
  deleteProjectEnvironment(id: string): Promise<void>;

  // --- Settings ---
  saveProjectSetting(projectId: string, key: string, value: string): Promise<void>;
  getProjectSettings(projectId: string): Promise<Record<string, string>>;
  saveUserSetting(key: string, value: string): Promise<void>;
  getUserSettings(): Promise<Record<string, string>>;

  // --- Metadata ---
  getMetadata(key: string): Promise<string | null>;
  setMetadata(key: string, value: string): Promise<void>;

  // --- Exports ---
  saveDdlExport(exportData: DdlExport): Promise<void>;
  getDdlExports(env: string, dbName: string, type?: string, limit?: number): Promise<DdlExport[]>;
  deleteDdlExport(env: string, dbName: string, type: string, name: string): Promise<void>;

  // --- Snapshots ---
  saveSnapshot(snapshot: DdlSnapshot): Promise<void>;
  getSnapshot(env: string, dbName: string, type: string, name: string): Promise<DdlSnapshot | null>;
  getAllSnapshots(limit?: number): Promise<DdlSnapshot[]>;

  // --- Comparisons ---
  saveComparison(comparison: ComparisonResult): Promise<void>;
  getComparisons(srcEnv: string, destEnv: string, dbName: string, type?: string): Promise<ComparisonResult[]>;
  getLatestComparisons(limit?: number): Promise<ComparisonResult[]>;

  // --- Migration History ---
  saveMigrationHistory(history: MigrationHistory): Promise<number>; // Returns newly inserted ID
  updateMigrationStatus(id: number, status: string, error?: string): Promise<void>;
  getMigrationHistory(limit?: number): Promise<MigrationHistory[]>;

  // --- Utility / Raw ---
  queryRaw(sql: string, params?: any[]): Promise<any[]>;
  executeRaw(sql: string, params?: any[]): Promise<any>;
}
