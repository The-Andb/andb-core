import { ITableDiff, ISchemaDiff, IObjectDiff, SafetyLevel, ISafetyReport } from '../../common/interfaces/diff.interface';
import { IMigrator } from '../../common/interfaces/driver.interface';

export class MigratorService {
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
   * Determine the safety level of a statement
   */
  getSafetyLevel(sql: string): SafetyLevel {
    const normalized = sql.trim().toUpperCase();

    // CRITICAL: Irreversible or catastrophic data loss
    if (normalized.startsWith('DROP TABLE') || normalized.startsWith('TRUNCATE')) {
      return SafetyLevel.CRITICAL;
    }

    // WARNING: Potential partial data loss or schema restructuring
    if (
      normalized.includes('DROP COLUMN') ||
      normalized.includes('MODIFY') ||
      normalized.includes('CHANGE') ||
      normalized.startsWith('DROP VIEW') ||
      normalized.startsWith('DROP PROCEDURE') ||
      normalized.startsWith('DROP FUNCTION') ||
      normalized.startsWith('DROP TRIGGER') ||
      normalized.startsWith('DROP EVENT')
    ) {
      return SafetyLevel.WARNING;
    }

    // SAFE: Additive or non-destructive
    return SafetyLevel.SAFE;
  }

  /**
   * Check if a statement is potentially destructive
   */
  isDestructive(sql: string): boolean {
    return this.getSafetyLevel(sql) !== SafetyLevel.SAFE;
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
    if (n.includes('ote_') || n.startsWith('pt_') || n.includes('test')) return true;
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
   * Get a structured safety report for the UI
   */
  getSafetyReport(statements: string[]): ISafetyReport {
    const summary = {
      safe: [] as string[],
      warning: [] as string[],
      critical: [] as string[],
    };

    let maxLevel = SafetyLevel.SAFE;

    for (const sql of statements) {
      const level = this.getSafetyLevel(sql);
      if (level === SafetyLevel.CRITICAL) {
        summary.critical.push(sql);
        maxLevel = SafetyLevel.CRITICAL;
      } else if (level === SafetyLevel.WARNING) {
        summary.warning.push(sql);
        if (maxLevel !== SafetyLevel.CRITICAL) maxLevel = SafetyLevel.WARNING;
      } else {
        summary.safe.push(sql);
      }
    }

    return {
      level: maxLevel,
      summary,
      hasDestructive: maxLevel !== SafetyLevel.SAFE,
    };
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
