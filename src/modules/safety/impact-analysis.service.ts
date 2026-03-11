const { getLogger } = require('andb-logger');
import { Parser } from 'node-sql-parser';
import { SafetyLevel, ISafetyReport } from '../../common/interfaces/schema.interface';

export interface IImpactSummary {
  tablesAffected: string[];
  columnsAdded: number;
  columnsDropped: number;
  indexesCreated: number;
  indexesDropped: number;
  destructiveOps: number;
  rebuildRisk: boolean; // Indicates if a table might be fully rebuilt
}

export interface IAnalysisContext {
  tableStats?: Record<string, { rowCount: number }>;
}

export class ImpactAnalysisService {
  private readonly logger = getLogger({ logName: 'ImpactAnalysisService' });
  private readonly parser = new Parser();

  /**
   * Deeply analyze a list of SQL statements to determine safety and impact summary
   */
  async analyze(
    statements: string[],
    dialect: string = 'mysql',
    context: IAnalysisContext = {}
  ): Promise<ISafetyReport & { impact: IImpactSummary }> {
    const report: ISafetyReport = {
      level: SafetyLevel.SAFE,
      summary: {
        safe: [],
        warning: [],
        critical: [],
      },
      hasDestructive: false,
    };

    const impact: IImpactSummary = {
      tablesAffected: [],
      columnsAdded: 0,
      columnsDropped: 0,
      indexesCreated: 0,
      indexesDropped: 0,
      destructiveOps: 0,
      rebuildRisk: false,
    };

    const tablesSet = new Set<string>();

    for (const sql of statements) {
      if (!sql || sql.trim() === '') continue;

      try {
        const ast = this.parser.astify(sql, { database: dialect === 'postgres' ? 'Postgresql' : 'MySQL' });
        const asts = Array.isArray(ast) ? ast : [ast];

        for (const singleAst of asts) {
          const risk = this.detectRisk(singleAst);
          this.updateReport(report, risk, sql);
          this.updateImpact(impact, singleAst, tablesSet);
        }
      } catch (err: any) {
        this.logger.warn(`Failed to parse SQL for impact analysis: ${err.message}. SQL snippet: ${sql.substring(0, 50)}...`);
        // Fallback to basic keyword check for unparseable SQL (e.g. some complex stored procedures)
        const fallbackRisk = this.fallbackRiskCheck(sql);
        this.updateReport(report, fallbackRisk, sql);
      }
    }

    impact.tablesAffected = Array.from(tablesSet);
    report.hasDestructive = report.level === SafetyLevel.CRITICAL;

    return {
      ...report,
      impact,
    };
  }

  private detectRisk(ast: any): SafetyLevel {
    const type = ast.type?.toLowerCase();

    // 1. Destructive Operations (CRITICAL)
    if (type === 'drop' || type === 'truncate') {
      return SafetyLevel.CRITICAL;
    }

    if (type === 'delete' && !ast.where) {
      return SafetyLevel.CRITICAL; // DELETE without WHERE is deadly
    }

    if (type === 'alter') {
      const actions = Array.isArray(ast.expr) ? ast.expr : [ast.expr];
      for (const action of actions) {
        // DROP column/index
        if (action.action === 'drop') {
          return SafetyLevel.CRITICAL;
        }

        // MODIFY/CHANGE column - DBA Knowledge Layer
        if (action.action === 'modify' || action.action === 'change') {
          // Rule: Narrowing Varchar is destructive (can truncate data)
          // Rule: Changing data types is high risk (rebuild + lock)
          return SafetyLevel.WARNING;
        }

        // ADD PRIMARY KEY or CONSTRAINT - Very high risk on large tables
        if (action.action === 'add' && (action.resource === 'primary key' || (action.resource === 'constraint' && action.create_definitions?.constraint_type === 'primary key'))) {
          return SafetyLevel.CRITICAL;
        }

        // DROP PRIMARY KEY
        if (action.action === 'drop' && (action.resource === 'primary key' || action.resource === 'constraint')) {
          return SafetyLevel.CRITICAL;
        }
      }
    }

    // 2. High Impact / Structural Changes (WARNING)
    if (type === 'create' && ast.keyword === 'index') {
      return SafetyLevel.WARNING; // Index creation on large tables can be risky
    }

    if (type === 'create' && ast.keyword === 'table') {
      return SafetyLevel.SAFE;
    }

    // 3. Defaults to SAFE
    return SafetyLevel.SAFE;
  }

  private updateReport(report: ISafetyReport, risk: SafetyLevel, sql: string) {
    if (risk === SafetyLevel.CRITICAL) {
      report.summary.critical.push(sql);
      report.level = SafetyLevel.CRITICAL;
    } else if (risk === SafetyLevel.WARNING) {
      report.summary.warning.push(sql);
      if (report.level !== SafetyLevel.CRITICAL) {
        report.level = SafetyLevel.WARNING;
      }
    } else {
      report.summary.safe.push(sql);
    }
  }

  private updateImpact(impact: IImpactSummary, ast: any, tablesSet: Set<string>) {
    const type = ast.type?.toLowerCase();

    // Table Tracking
    if (ast.table && Array.isArray(ast.table)) {
      ast.table.forEach((t: any) => {
        if (typeof t === 'string') tablesSet.add(t);
        else if (t.table) tablesSet.add(t.table);
      });
    } else if (ast.table) {
      if (typeof ast.table === 'string') tablesSet.add(ast.table);
      else if (ast.table.table) tablesSet.add(ast.table.table);
    }

    // Operation Summarization
    if (type === 'alter') {
      const actions = Array.isArray(ast.expr) ? ast.expr : [ast.expr];
      for (const action of actions) {
        if (action.action === 'add') {
          if (action.resource === 'column') impact.columnsAdded++;
          if (action.resource === 'index') impact.indexesCreated++;
        } else if (action.action === 'change' || action.action === 'modify') {
          impact.rebuildRisk = true;
        } else if (action.action === 'drop') {
          if (action.resource === 'column') {
            impact.columnsDropped++;
            impact.destructiveOps++;
          }
          if (action.resource === 'index') impact.indexesDropped++;
        }
      }
    }

    if (type === 'create' && ast.keyword === 'index') {
      impact.indexesCreated++;
    }

    if (type === 'drop') {
      impact.destructiveOps++;
    }
  }

  private fallbackRiskCheck(sql: string): SafetyLevel {
    const upper = sql.toUpperCase();
    if (upper.includes('DROP ') || upper.includes('TRUNCATE ')) return SafetyLevel.CRITICAL;
    if (upper.includes('DELETE ') && !upper.includes('WHERE')) return SafetyLevel.CRITICAL;
    if (upper.includes('ALTER ') && (upper.includes(' DROP ') || upper.includes(' MODIFY ') || upper.includes(' CHANGE '))) return SafetyLevel.WARNING;
    return SafetyLevel.SAFE;
  }
}
