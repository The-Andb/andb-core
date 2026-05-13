import { Parser } from 'node-sql-parser';
import { ISqlAstParser } from '../interfaces/sql-ast-parser.interface';
import { ParsedTable, ParsedColumn, ParsedIndex, ParsedForeignKey } from '../interfaces/parsed-table.interface';

export class SqliteAstParser implements ISqlAstParser {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
  }

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

  parseTableDetailed(ddl: string): ParsedTable | null {
    try {
      if (!ddl || !ddl.toUpperCase().includes('CREATE TABLE')) return null;
      
      const ast: any = this.parser.astify(ddl, { database: 'SQLite' });
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
          const defVal = this.unwrapAstValue(def.default_val);
          
          // Reconstruct a basic definition string for the migrator
          let definition = `${dataType}`;
          if (isNotNull) definition += ' NOT NULL';
          if (defVal !== null) definition += ` DEFAULT ${defVal}`;
          if (def.auto_increment) definition += ' AUTOINCREMENT';

          columns.push({
            name: colName,
            dataType: dataType,
            length: def.definition.length,
            nullable: !isNotNull,
            defaultValue: defVal,
            comment: undefined,
            autoIncrement: !!def.auto_increment,
            rawDefinition: definition,
            definition: definition
          } as any);
        } else if (def.resource === 'constraint') {
           if (def.constraint_type === 'foreign key') {
              const name = def.constraint || `fk_${Math.random().toString(36).substring(7)}`;
              const cols = def.definition.map((c: any) => c.column);
              const refTable = def.reference_definition.table[0].table;
              const refCols = def.reference_definition.definition.map((c: any) => c.column);
              
              const definition = `FOREIGN KEY(${cols.join(', ')}) REFERENCES ${refTable}(${refCols.join(', ')})`;

              foreignKeys.push({
                 name,
                 columns: cols,
                 refTable,
                 refColumns: refCols,
                 onDelete: undefined,
                 onUpdate: undefined,
                 rawDefinition: definition,
                 definition: definition
              } as any);
           } else {
              const type = (def.constraint_type || '').toLowerCase();
              const isPk = type === 'primary key';
              const isUnique = type === 'unique' || type === 'unique key';
              const cols = def.definition.map((c: any) => c.column);
              const name = def.index || def.constraint || (isPk ? 'PRIMARY' : `idx_${Math.random().toString(36).substring(7)}`);
              
              let definition = '';
              if (isPk) {
                definition = `PRIMARY KEY (${cols.join(', ')})`;
              } else if (isUnique) {
                definition = `CREATE UNIQUE INDEX "${name}" ON "${tableName}" (${cols.join(', ')})`;
              } else {
                definition = `CREATE INDEX "${name}" ON "${tableName}" (${cols.join(', ')})`;
              }

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
      
      return {
        tableName,
        columns,
        indexes,
        foreignKeys,
        options: {},
        partitions: null,
        rawSql: ddl
      };
    } catch (err) {
      return null;
    }
  }

  cleanDefiner(ddl: string): string {
    return ddl; // SQLite doesn't have DEFINER
  }
}
