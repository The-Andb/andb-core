import { Parser } from 'node-sql-parser';
import {
  ISemanticReport,
  ISemanticObjectDiff,
  ISemanticChange,
  IColumnDefinition,
  ITableDefinition
} from '../../common/interfaces/schema.interface';

export class SemanticDiffService {
  private parser = new Parser();

  /**
   * Compare two DDL strings (Source vs Target) and return a semantic report
   */
  async compare(sourceDDL: string, targetDDL: string, dialect: string = 'mysql'): Promise<ISemanticReport> {
    const report: ISemanticReport = {
      tables: {},
      summary: [],
    };

    try {
      const sourceAst = this.parser.astify(sourceDDL, { database: dialect });
      const targetAst = this.parser.astify(targetDDL, { database: dialect });

      // For simplicity in Phase 2, we assume single-table DDLs for playground/comparison
      // In a full schema diff, this would loop over all detected tables
      const sourceTable = Array.isArray(sourceAst) ? sourceAst[0] : sourceAst;
      const targetTable = Array.isArray(targetAst) ? targetAst[0] : targetAst;

      if (sourceTable && targetTable && sourceTable.type === 'create' && targetTable.type === 'create') {
        const tableName = this.getTableName(sourceTable);
        const diff = this.compareTableAst(sourceTable, targetTable);
        if (diff.changes.length > 0) {
          report.tables[tableName] = diff;
          report.summary.push(...diff.changes.map(c => `Table '${tableName}': ${c.description}`));
        }
      }
    } catch (err: any) {
      report.summary.push(`Semantic analysis failed: ${err.message}`);
    }

    return report;
  }

  private compareTableAst(source: any, target: any): ISemanticObjectDiff {
    const tableName = this.getTableName(source);
    const diff: ISemanticObjectDiff = {
      name: tableName,
      type: 'TABLE',
      changes: [],
    };

    const sourceCols = this.extractColumns(source);
    const targetCols = this.extractColumns(target);

    // 1. Column Diffs
    for (const [colName, sourceCol] of Object.entries(sourceCols)) {
      const targetCol = targetCols[colName];
      if (targetCol) {
        this.diffColumns(sourceCol, targetCol, diff.changes);
      }
    }

    return diff;
  }

  private extractColumns(ast: any): Record<string, any> {
    const cols: Record<string, any> = {};
    if (!ast.create_definitions) return cols;

    for (const def of ast.create_definitions) {
      if (def.resource === 'column') {
        cols[def.column.column] = def;
      }
    }
    return cols;
  }

  private diffColumns(source: any, target: any, changes: ISemanticChange[]) {
    const colName = source.column.column;

    // Type Change
    const sourceType = this.formatType(source.definition);
    const targetType = this.formatType(target.definition);
    if (sourceType !== targetType) {
      changes.push({
        type: 'DATATYPE_CHANGE',
        property: 'type',
        oldValue: sourceType,
        newValue: targetType,
        description: `Column '${colName}' type changed: ${sourceType} -> ${targetType}`,
      });
    }

    // Nullability
    const sourceNull = source.nullable?.value !== 'not null';
    const targetNull = target.nullable?.value !== 'not null';
    if (sourceNull !== targetNull) {
      changes.push({
        type: 'NULLABILITY_CHANGE',
        property: 'isNullable',
        oldValue: sourceNull,
        newValue: targetNull,
        description: `Column '${colName}' nullability changed: ${sourceNull ? 'NULL' : 'NOT NULL'} -> ${targetNull ? 'NULL' : 'NOT NULL'}`,
      });
    }

    // Default Value
    const sourceDefault = source.default_val?.value?.value;
    const targetDefault = target.default_val?.value?.value;
    if (sourceDefault !== targetDefault) {
      changes.push({
        type: 'DEFAULT_VALUE_CHANGE',
        property: 'defaultValue',
        oldValue: sourceDefault,
        newValue: targetDefault,
        description: `Column '${colName}' default changed: ${sourceDefault ?? 'NONE'} -> ${targetDefault ?? 'NONE'}`,
      });
    }
  }

  private formatType(def: any): string {
    if (!def) return 'unknown';
    let type = def.dataType;
    if (def.length) type += `(${def.length})`;
    return type.toUpperCase();
  }

  private getTableName(ast: any): string {
    if (!ast.table) return 'unknown';
    if (Array.isArray(ast.table)) {
      return ast.table[0].table || 'unknown';
    }
    return ast.table.table || ast.table || 'unknown';
  }
}
