import { Parser } from 'node-sql-parser';
import { ISqlAstParser } from '../interfaces/sql-ast-parser.interface';
import { ParsedTable, ParsedColumn, ParsedIndex, ParsedForeignKey } from '../interfaces/parsed-table.interface';

export class MysqlAstParser implements ISqlAstParser {
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
   * Handles: { type: 'null' }, { type: 'single_quote_string', value: '...' },
   *          { type: 'number', value: 123 }, { type: 'bool', value: true }, etc.
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
      if (node.type === 'expr_list' || node.type === 'origin') {
        return node.value != null ? String(node.value) : '';
      }
      // Last resort: if value exists, try to unwrap it
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
      
      const ast: any = this.parser.astify(ddl, { database: 'MySQL' });
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
            autoIncrement: !!def.auto_increment,
            rawDefinition: '' // Omitted because AST abstracts it
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
      if (createTableAst.table_options) {
        for (const opt of createTableAst.table_options) {
           options[opt.keyword.toLowerCase()] = opt.value?.value || opt.value;
        }
      }
      
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
      // Gracefully fallback to regex parser
      // console.debug('AST parser failed for table, falling back to regex. Error:', (err as Error).message);
      return null;
    }
  }

  cleanDefiner(ddl: string): string {
    if (!ddl) return '';
    const userPart = `(?:'[^']+'|\`[^\`]+\`|"[^"]+"|[a-zA-Z0-9_]+)`;
    const hostPart = `(?:@(?:'[^']+'|\`[^\`]+\`|"[^"]+"|[a-zA-Z0-9_\\.\%]+))?`;
    const definerPattern = `DEFINER\\s*=\\s*${userPart}${hostPart}`;
    
    const beginMatch = ddl.match(/(\s)BEGIN(\s|$)/i);
    if (beginMatch && beginMatch.index !== undefined) {
      let header = ddl.substring(0, beginMatch.index).trim();
      const body = ddl.substring(beginMatch.index).trim();
      const re = new RegExp(definerPattern, 'gi');
      header = header.replace(re, '').replace(/\s{2,}/g, ' ');
      return header + ' ' + body;
    }
    
    const reFallback = new RegExp(definerPattern, 'gi');
    return ddl.replace(reFallback, '');
  }
}
