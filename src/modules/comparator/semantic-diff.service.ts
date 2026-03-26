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
      } else {
        diff.changes.push({
          type: 'COLUMN_MISSING',
          property: 'name',
          newValue: colName,
          description: `Column '${colName}' exists in source but missing in target (Will be ADDED)`,
        });
      }
    }

    // Check for dropped columns
    for (const colName of Object.keys(targetCols)) {
      if (!sourceCols[colName]) {
        diff.changes.push({
          type: 'COLUMN_DEPRECATED',
          property: 'name',
          oldValue: colName,
          description: `Column '${colName}' missing in source but exists in target (Will be DROPPED)`,
        });
      }
    }

    // 2. Table Options (Engine, Charset, Collation)
    this.diffTableOptions(source, target, diff.changes);

    // 3. Constraints
    this.diffConstraints(source, target, diff.changes);

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

    // Unsigned
    const sourceUnsigned = (source.definition.suffix || []).some((s: string) => s.toUpperCase() === 'UNSIGNED');
    const targetUnsigned = (target.definition.suffix || []).some((s: string) => s.toUpperCase() === 'UNSIGNED');
    if (sourceUnsigned !== targetUnsigned) {
      changes.push({
        type: 'UNSIGNED_CHANGE',
        property: 'unsigned',
        oldValue: sourceUnsigned,
        newValue: targetUnsigned,
        description: `Column '${colName}' unsigned attribute changed: ${sourceUnsigned} -> ${targetUnsigned}`,
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
    if (String(sourceDefault) !== String(targetDefault)) {
      changes.push({
        type: 'DEFAULT_VALUE_CHANGE',
        property: 'defaultValue',
        oldValue: sourceDefault,
        newValue: targetDefault,
        description: `Column '${colName}' default changed: ${sourceDefault ?? 'NONE'} -> ${targetDefault ?? 'NONE'}`,
      });
    }

    // Auto Increment
    const sourceAI = !!source.auto_increment;
    const targetAI = !!target.auto_increment;
    if (sourceAI !== targetAI) {
      changes.push({
        type: 'AUTO_INCREMENT_CHANGE',
        property: 'autoIncrement',
        oldValue: sourceAI,
        newValue: targetAI,
        description: `Column '${colName}' auto_increment changed: ${sourceAI} -> ${targetAI}`,
      });
    }

    // Comment
    const sourceComment = this.formatComment(source.comment);
    const targetComment = this.formatComment(target.comment);
    if (sourceComment !== targetComment) {
      changes.push({
        type: 'COMMENT_CHANGE',
        property: 'comment',
        oldValue: sourceComment,
        newValue: targetComment,
        description: `Column '${colName}' comment changed: ${sourceComment ?? 'NONE'} -> ${targetComment ?? 'NONE'}`,
      });
    }
  }

  private formatComment(comment: any): string | null {
    if (!comment) return null;
    if (typeof comment === 'string') return comment;
    if (comment.value && typeof comment.value === 'object') {
      return comment.value.value || null;
    }
    return comment.value || null;
  }

  private diffTableOptions(source: any, target: any, changes: ISemanticChange[]) {
    const srcOptions = this.extractTableOptions(source);
    const targetOptions = this.extractTableOptions(target);

    for (const [key, srcVal] of Object.entries(srcOptions)) {
      const targetVal = targetOptions[key];
      if (targetVal && String(srcVal).toUpperCase() !== String(targetVal).toUpperCase()) {
        changes.push({
          type: 'TABLE_OPTION_CHANGE',
          property: key,
          oldValue: srcVal,
          newValue: targetVal,
          description: `Table option '${key.toUpperCase()}' changed: ${srcVal} -> ${targetVal}`,
        });
      }
    }
  }

  private extractTableOptions(ast: any): Record<string, any> {
    const options: Record<string, any> = {};
    if (!ast.table_options) return options;

    for (const opt of ast.table_options) {
      const key = opt.keyword.toLowerCase();
      let value = opt.value;
      if (typeof value === 'object' && value.value) value = value.value;
      options[key] = value;
    }
    return options;
  }

  private diffConstraints(source: any, target: any, changes: ISemanticChange[]) {
    const srcConstraints = this.extractConstraints(source);
    const targetConstraints = this.extractConstraints(target);

    // Primary Key
    if (srcConstraints.primaryKey !== targetConstraints.primaryKey) {
      changes.push({
        type: 'PRIMARY_KEY_CHANGE',
        property: 'primaryKey',
        oldValue: srcConstraints.primaryKey,
        newValue: targetConstraints.primaryKey,
        description: `Primary Key changed: ${srcConstraints.primaryKey || 'NONE'} -> ${targetConstraints.primaryKey || 'NONE'}`,
      });
    }

    // Unique Keys
    for (const [name, srcDef] of Object.entries(srcConstraints.uniqueKeys)) {
      const targetDef = targetConstraints.uniqueKeys[name];
      if (!targetDef) {
        changes.push({ type: 'UNIQUE_KEY_ADDED', description: `Unique Index '${name}' added: ${srcDef}` });
      } else if (srcDef !== targetDef) {
        changes.push({ type: 'UNIQUE_KEY_CHANGED', description: `Unique Index '${name}' changed: ${srcDef} -> ${targetDef}` });
      }
    }

    // Foreign Keys
    for (const [name, srcDef] of Object.entries(srcConstraints.foreignKeys)) {
      const targetDef = targetConstraints.foreignKeys[name];
      if (!targetDef) {
        changes.push({ type: 'FOREIGN_KEY_ADDED', description: `Foreign Key '${name}' added: ${srcDef}` });
      } else if (srcDef !== targetDef) {
        changes.push({ type: 'FOREIGN_KEY_CHANGED', description: `Foreign Key '${name}' changed: ${srcDef} -> ${targetDef}` });
      }
    }
  }

  private extractConstraints(ast: any): { primaryKey: string; uniqueKeys: Record<string, string>; foreignKeys: Record<string, string> } {
    const result = {
      primaryKey: '',
      uniqueKeys: {} as Record<string, string>,
      foreignKeys: {} as Record<string, string>,
    };

    if (!ast.create_definitions) return result;

    for (const def of ast.create_definitions) {
      if (def.resource !== 'constraint') continue;

      const type = def.constraint_type.toUpperCase();
      if (type === 'PRIMARY KEY') {
        result.primaryKey = def.definition.map((c: any) => c.column).join(',');
      } else if (type === 'UNIQUE KEY' || type === 'UNIQUE INDEX') {
        const name = def.index || 'unnamed';
        result.uniqueKeys[name] = def.definition.map((c: any) => c.column).join(',');
      } else if (type === 'FOREIGN KEY') {
        const name = def.constraint || 'unnamed';
        const cols = def.definition.map((c: any) => c.column).join(',');
        const refTable = this.getTableName(def.reference_definition);
        const refCols = def.reference_definition.definition.map((c: any) => c.column).join(',');
        result.foreignKeys[name] = `${cols} REFERENCES ${refTable}(${refCols})`;
      }
    }
    return result;
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
