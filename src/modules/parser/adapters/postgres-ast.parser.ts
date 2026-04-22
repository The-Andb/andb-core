import { Parser } from 'node-sql-parser';
import { ISqlAstParser } from '../interfaces/sql-ast-parser.interface';
import { ParsedTable, ParsedColumn, ParsedIndex, ParsedForeignKey } from '../interfaces/parsed-table.interface';

export class PostgresAstParser implements ISqlAstParser {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
  }

  private extractDefaultValue(defVal: any): string | null {
    if (!defVal || defVal.value === undefined) return null;
    return this.unwrapAstValue(defVal.value);
  }

  /**
   * Recursively unwrap AST node values from node-sql-parser.
   */
  private unwrapAstValue(node: any): string | null {
    if (node === null || node === undefined) return null;
    if (typeof node === 'string') return node;
    if (typeof node === 'number' || typeof node === 'boolean') return String(node);

    if (node && typeof node === 'object' && node.type) {
      if (node.type === 'null') return 'NULL';
      if (node.type === 'bool') return node.value ? 'TRUE' : 'FALSE';
      if (['single_quote_string', 'double_quote_string', 'string'].includes(node.type)) {
        return node.value != null ? String(node.value) : '';
      }
      if (node.type === 'number') return String(node.value);
      if (node.type === 'function') {
        const funcName = node.name?.name?.[0]?.value || 'FUNC';
        return `${funcName}()`;
      }
      if (node.value !== undefined) return this.unwrapAstValue(node.value);
    }

    return null;
  }

  private extractCommentValue(comment: any): string | undefined {
    if (!comment) return undefined;
    const result = this.unwrapAstValue(comment);
    return result ?? undefined;
  }

  parseTableDetailed(ddl: string): ParsedTable | null {
    try {
      if (!ddl || !ddl.toUpperCase().includes('CREATE TABLE')) return null;
      
      const ast: any = this.parser.astify(ddl, { database: 'PostgreSQL' });
      const createTableAst = Array.isArray(ast) ? ast[0] : ast;
      
      if (createTableAst.type !== 'create' || createTableAst.keyword !== 'table') {
        return null;
      }
      
      const tableName = createTableAst.table[0].table;
      const columns: ParsedColumn[] = [];
      const indexes: ParsedIndex[] = [];
      const foreignKeys: ParsedForeignKey[] = [];
      
      for (const def of createTableAst.create_definitions) {
        if (def.resource === 'column') {
          columns.push({
            name: def.column.column,
            dataType: def.definition.dataType,
            length: def.definition.length,
            nullable: def.nullable ? def.nullable.value !== 'not null' : true,
            defaultValue: this.extractDefaultValue(def.default_val),
            comment: this.extractCommentValue(def.comment),
            autoIncrement: (def.definition.dataType || '').toLowerCase() === 'serial' || (def.definition.dataType || '').toLowerCase() === 'bigserial',
            rawDefinition: ''
          });
        } else if (def.resource === 'constraint') {
           if (def.constraint_type === 'FOREIGN KEY') {
              let onDelete, onUpdate;
              if (def.reference_definition.on_action) {
                 def.reference_definition.on_action.forEach((action: any) => {
                    if (action.type === 'on delete') onDelete = action.value?.value;
                    if (action.type === 'on update') onUpdate = action.value?.value;
                 });
              }

              foreignKeys.push({
                 name: def.constraint,
                 columns: def.definition.map((c: any) => c.column),
                 refTable: def.reference_definition.table[0].table,
                 refColumns: def.reference_definition.definition.map((c: any) => c.column),
                 onDelete,
                 onUpdate
              });
           } else {
              indexes.push({
                 name: def.index || def.constraint || 'PRIMARY',
                 type: def.constraint_type === 'primary key' ? 'PRIMARY' : (def.constraint_type === 'unique key' ? 'UNIQUE' : 'INDEX'),
                 columns: def.definition.map((c: any) => c.column)
              });
           }
        }
      }
      
      const options: any = {};
      
      return {
        tableName,
        columns,
        indexes,
        foreignKeys,
        options,
        partitions: null,
        rawSql: ddl
      };
    } catch (err) {
      return null;
    }
  }

  cleanDefiner(ddl: string): string {
    // Defininer isn't a native Postgres concept in the same way it is for MySQL
    // Postgres uses "SECURITY DEFINER" or "SECURITY INVOKER" for functions.
    // For now, we return as is or handle specific routine cleaning if needed.
    return ddl;
  }
}
