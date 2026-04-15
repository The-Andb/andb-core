import { ITableDiff, ISchemaDiff, IObjectDiff, SafetyLevel, ISafetyReport } from '../../common/interfaces/schema.interface';
import { IMigrator } from '../../common/interfaces/driver.interface';
import { ImpactAnalysisService } from '../safety/impact-analysis.service';
import { ProjectConfigService } from '../config/project-config.service';

export class MigratorService {
  constructor(
    private readonly configService: ProjectConfigService,
    private readonly impactAnalysis: ImpactAnalysisService = new ImpactAnalysisService()
  ) { }

  generateAlterSQL(diff: ITableDiff, migrator: IMigrator): string[] {
    return migrator.generateTableAlterSQL(diff);
  }

  generateObjectSQL(obj: IObjectDiff, migrator: IMigrator): string[] {
    return migrator.generateObjectSQL(obj);
  }

  generateSchemaSQL(schemaDiff: ISchemaDiff, migrator: IMigrator): string[] {
    const allStatements: string[] = [];

    // 1. Drop Objects (Views, Procedures, etc.) - To avoid dependency issues if replaced
    // and Tables (Dropped)
    for (const tableName of schemaDiff.droppedTables) {
      // TODO: Dialect quoting should be handled by the Migrator as well eventually
      allStatements.push(`DROP TABLE IF EXISTS \`${tableName}\`;`);
    }

    const dropOperations = schemaDiff.objects.filter((obj) => obj.operation === 'DROP');
    for (const obj of dropOperations) {
      allStatements.push(...migrator.generateObjectSQL(obj));
    }

    // 2. Table Alters
    for (const tableName in schemaDiff.tables) {
      const tableDiff = schemaDiff.tables[tableName];
      allStatements.push(...migrator.generateTableAlterSQL(tableDiff));
    }

    // 3. Create/Replace Objects
    const createReplaceOperations = schemaDiff.objects.filter((obj) => obj.operation !== 'DROP');
    for (const obj of createReplaceOperations) {
      allStatements.push(...migrator.generateObjectSQL(obj));
    }

    return allStatements;
  }

  /**
   * Determine the safety level of a statement using AST analysis
   */
  getSafetyLevel(sql: string): SafetyLevel {
    // Note: This is now a synchronous-looking wrapper for backward compatibility
    // In a real high-performance app, we should use the async 'analyze' method
    // For now, we'll implement a simplified logic or use the service's fallback if needed
    // But ideally, the caller should use getSafetyReport(statements) which is more accurate.
    const upper = sql.trim().toUpperCase();
    if (upper.startsWith('DROP TABLE') || upper.startsWith('TRUNCATE') || upper.includes('DROP COLUMN')) {
      return SafetyLevel.CRITICAL;
    }
    if (upper.includes('MODIFY') || upper.includes('CHANGE')) {
      return SafetyLevel.WARNING;
    }
    return SafetyLevel.SAFE;
  }

  /**
   * Check if a statement is potentially destructive (CRITICAL level only).
   * WARNING-level operations (MODIFY, CHANGE) are standard schema changes
   * and should not be blocked by the safety guard.
   */
  isDestructive(sql: string): boolean {
    return this.getSafetyLevel(sql) === SafetyLevel.CRITICAL;
  }

  /**
   * Enforce safety guards
   */
  checkSafety(statements: string[], force = false): void {
    if (force) return;

    for (const sql of statements) {
      if (this.isDestructive(sql)) {
        throw new Error(
          `Safety Guard: Destructive operation detected: "${sql.substring(0, 50)}...". ` +
          `Use "force: true" to bypass this protection.`
        );
      }
    }
  }

  disableForeignKeyChecks(): string {
    return 'SET FOREIGN_KEY_CHECKS = 0;';
  }

  enableForeignKeyChecks(): string {
    return 'SET FOREIGN_KEY_CHECKS = 1;';
  }

  isNotMigrateCondition(name: string): boolean {
    const n = name.toLowerCase();
    
    // 1. Hardcoded system exclusions (legacy safety)
    if (n.startsWith('pt_')) return true;

    // 2. Custom exclusions from config
    const condition = this.configService.getIsNotMigrateCondition();
    if (condition) {
      try {
        const regex = new RegExp(condition, 'i');
        if (regex.test(name)) return true;
      } catch (err) {
        // Fallback to basic match if regex fails
        if (n.includes('ote_') || n.includes('test')) return true;
      }
    } else {
      // 3. Fallback to default hardcoded logic if no custom condition provided
      if (n.includes('ote_') || n.includes('test')) return true;
    }

    return false;
  }

  /**
   * Summarize migration statements for safety reporting
   */
  summarizeMigration(statements: string[]): { safe: string[]; destructive: string[] } {
    const summary = { safe: [] as string[], destructive: [] as string[] };
    for (const sql of statements) {
      if (this.isDestructive(sql)) {
        summary.destructive.push(sql);
      } else {
        summary.safe.push(sql);
      }
    }
    return summary;
  }

  /**
   * Get a structured safety report for the UI using the deep AST analysis service
   */
  async getSafetyReport(statements: string[], dialect: string = 'mysql'): Promise<ISafetyReport> {
    return await this.impactAnalysis.analyze(statements, dialect);
  }

  /**
   * Validate if the migration can proceed based on environment and safety rules
   */
  validateMigration(destEnv: string, safetyReport: ISafetyReport, options: { force?: boolean } = {}): void {
    const isProd = this.isProduction(destEnv);

    if (isProd && safetyReport.level === SafetyLevel.CRITICAL && !options.force) {
      throw new Error(
        `CRITICAL SAFETY: You are attempting to run CRITICAL operations on PRODUCTION (${destEnv}). ` +
        `This requires "force: true" or disabling Safe Mode. Statements: ${safetyReport.summary.critical.length}`
      );
    }

    if (isProd && safetyReport.level === SafetyLevel.WARNING && !options.force) {
      // In prod, we could also warn about warnings, but for now we block CRITICAL strictly.
      // Maybe we just log it.
    }
  }

  /**
   * Heuristic to determine if an environment is production
   */
  isProduction(env: string): boolean {
    const e = env.toLowerCase();
    return e.includes('prod') || e.includes('production') || e.includes('live') || e.includes('main');
  }
}
