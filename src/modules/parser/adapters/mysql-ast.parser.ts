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
          const colName = def.column.column;
          const dataType = def.definition.dataType;
          const isNotNull = def.nullable ? def.nullable.value === 'not null' : false;
          const defVal = this.extractDefaultValue(def.default_val);
          
          let definition = `${dataType}`;
          if (dataType.toUpperCase() === 'ENUM' || dataType.toUpperCase() === 'SET') {
             if (def.definition.expr && Array.isArray(def.definition.expr.value)) {
                const enumVals = def.definition.expr.value.map((v: any) => `'${this.unwrapAstValue(v)}'`).join(',');
                definition += `(${enumVals})`;
             }
          } else if (def.definition.length != null) {
             definition += `(${def.definition.length}`;
             if (def.definition.scale != null) {
                definition += `,${def.definition.scale}`;
             }
             definition += `)`;
          }

          if (Array.isArray(def.definition.suffix) && def.definition.suffix.length > 0) {
             definition += ' ' + def.definition.suffix.join(' ');
          }

          if (def.generated) {
             const genType = (def.generated.value || 'GENERATED ALWAYS AS').toUpperCase();
             const exprSql = this.parser.exprToSQL(def.generated.expr, { database: 'MySQL' });
             const storage = (def.generated.storage_type || '').toUpperCase();
             definition += ` ${genType} (${exprSql})`;
             if (storage) {
                definition += ` ${storage}`;
             }
          } else {
             if (isNotNull) definition += ' NOT NULL';
             if (defVal !== null) {
                const isStringDefault = def.default_val && def.default_val.value &&
                   ['single_quote_string', 'double_quote_string', 'string'].includes(def.default_val.value.type);
                if (isStringDefault && !defVal.startsWith("'") && !defVal.startsWith('"')) {
                   definition += ` DEFAULT '${defVal.replace(/'/g, "''")}'`;
                } else {
                   definition += ` DEFAULT ${defVal}`;
                }
             }
             if (def.auto_increment) definition += ' AUTO_INCREMENT';
          }

          const comment = this.extractCommentValue(def.comment);
          if (comment) {
             definition += ` COMMENT '${comment.replace(/'/g, "''")}'`;
          }

          const isUnsigned = Array.isArray(def.definition.suffix) && 
                             def.definition.suffix.some((s: any) => String(s).toUpperCase() === 'UNSIGNED');

          const collateVal = def.collate?.collate?.name || def.default_val?.value?.collate?.collate?.name || null;

          columns.push({
            name: colName,
            dataType: dataType,
            length: def.definition.length,
            scale: def.definition.scale,
            nullable: !isNotNull,
            defaultValue: defVal,
            comment: comment,
            autoIncrement: !!def.auto_increment,
            unsigned: isUnsigned,
            collate: collateVal,
            rawDefinition: definition,
            definition: definition
          } as any);
        } else if (def.resource === 'constraint' || def.resource === 'index') {
           if (def.constraint_type === 'FOREIGN KEY') {
              let onDelete: string | undefined, onUpdate: string | undefined;
              if (def.reference_definition.on_action) {
                 def.reference_definition.on_action.forEach((action: any) => {
                    if (action.type === 'on delete') onDelete = action.value?.value;
                    if (action.type === 'on update') onUpdate = action.value?.value;
                 });
              }

              const cols = def.definition.map((c: any) => c.column);
              const refTable = def.reference_definition.table[0].table;
              const refCols = def.reference_definition.definition.map((c: any) => c.column);
              const name = def.constraint || `fk_${Math.random().toString(36).substring(7)}`;

              let definition = `CONSTRAINT \`${name}\` FOREIGN KEY (\`${cols.join('`, `')}\`) REFERENCES \`${refTable}\` (\`${refCols.join('`, `')}\`)`;
              if (onDelete) definition += ` ON DELETE ${onDelete.toUpperCase()}`;
              if (onUpdate) definition += ` ON UPDATE ${onUpdate.toUpperCase()}`;

              foreignKeys.push({
                 name,
                 columns: cols,
                 refTable,
                 refColumns: refCols,
                 onDelete,
                 onUpdate,
                 rawDefinition: definition,
                 definition: definition
              } as any);
           } else {
              const type = (def.constraint_type || def.keyword || '').toLowerCase();
              const isPk = type === 'primary key';
              const isUnique = type === 'unique' || type === 'unique key' || type === 'unique index';
              const cols = def.definition.map((c: any) => c.column);
              const name = def.index || def.constraint || (isPk ? 'PRIMARY' : `idx_${Math.random().toString(36).substring(7)}`);

              let definition = '';
              if (isPk) definition = `PRIMARY KEY (\`${cols.join('`, `')}\`)`;
              else if (isUnique) definition = `UNIQUE KEY \`${name}\` (\`${cols.join('`, `')}\`)`;
              else definition = `KEY \`${name}\` (\`${cols.join('`, `')}\`)`;

              indexes.push({
                 name,
                 type: isPk ? 'PRIMARY' : (isUnique ? 'UNIQUE' : 'INDEX'),
                 columns: cols,
                 rawDefinition: definition,
                 definition: definition
              } as any);
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
    const definerPattern = `DEFINER\\s*=\\s*(?:'[^']*'|"[^"]*"|\`[^\`]*\`|[^\\s@]+)+(?:@(?:'[^']*'|"[^"]*"|\`[^\`]*\`|[^\\s@\\(\\);]+)+)?`;
    
    const beginMatch = ddl.match(/(\s)BEGIN(\s|$)/i);
    if (beginMatch && beginMatch.index !== undefined) {
      let header = ddl.substring(0, beginMatch.index).trim();
      const body = ddl.substring(beginMatch.index).trim();
      const re = new RegExp(definerPattern, 'gi');
      header = header.replace(re, '').replace(/[ \t]{2,}/g, ' ');
      return header + ' ' + body;
    }
    
    const reFallback = new RegExp(definerPattern, 'gi');
    return ddl.replace(reFallback, '');
  }
}
