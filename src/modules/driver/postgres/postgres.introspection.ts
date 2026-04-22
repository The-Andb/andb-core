import { IIntrospectionService } from "../../../common/interfaces/driver.interface";
import { ParserService } from "../../parser/parser.service";

export class PostgresIntrospectionService implements IIntrospectionService {
  constructor(
    private readonly driver: any,
    private readonly parser: ParserService
  ) { }

  async listTables(dbName: string): Promise<string[]> {
    const rows = await this.driver.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    return rows.map((r: any) => r.table_name);
  }

  async listViews(dbName: string): Promise<string[]> {
    const rows = await this.driver.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    return rows.map((r: any) => r.table_name);
  }

  async listProcedures(dbName: string): Promise<string[]> {
    const rows = await this.driver.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_type = 'PROCEDURE'
      ORDER BY routine_name
    `);
    return rows.map((r: any) => r.routine_name);
  }

  async listFunctions(dbName: string): Promise<string[]> {
    const rows = await this.driver.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_type = 'FUNCTION'
      ORDER BY routine_name
    `);
    return rows.map((r: any) => r.routine_name);
  }

  async listTriggers(dbName: string): Promise<string[]> {
    const rows = await this.driver.query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public'
      ORDER BY trigger_name
    `);
    return rows.map((r: any) => r.trigger_name);
  }

  async listEvents(dbName: string): Promise<string[]> {
    return []; // Postgres doesn't have "Events" like MySQL
  }

  async getTableDDL(dbName: string, tableName: string): Promise<string> {
    const columns = await this.driver.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [tableName]);

    const pks = await this.driver.query(`
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
    `, [tableName]);

    const pkColumns = pks.map((p: any) => p.column_name);

    let ddl = `CREATE TABLE ${tableName} (\n`;
    const colDefs = columns.map((c: any) => {
      let type = c.data_type.toUpperCase();
      if (c.character_maximum_length) type += `(${c.character_maximum_length})`;
      else if (c.numeric_precision && c.numeric_scale) type += `(${c.numeric_precision}, ${c.numeric_scale})`;

      let def = `  ${c.column_name} ${type}`;
      if (c.is_nullable === 'NO') def += ' NOT NULL';
      if (c.column_default) {
        // Simple mapping for SERIAL
        if (c.column_default.includes('nextval')) {
          def = `  ${c.column_name} SERIAL`;
          if (c.is_nullable === 'NO') def += ' NOT NULL';
        } else {
          def += ` DEFAULT ${c.column_default}`;
        }
      }
      return def;
    });

    if (pkColumns.length > 0) {
      colDefs.push(`  PRIMARY KEY (${pkColumns.join(', ')})`);
    }

    ddl += colDefs.join(',\n');
    ddl += '\n);';

    // Add Indexes
    const indexes = await this.driver.query(`
      SELECT indexdef 
      FROM pg_indexes 
      WHERE tablename = $1 AND schemaname = 'public'
    `, [tableName]);

    for (const idx of indexes) {
      if (!idx.indexdef.includes('_pkey')) { // Skip PK index as it's in CREATE TABLE
        ddl += `\n${idx.indexdef};`;
      }
    }

    return ddl;
  }

  async getViewDDL(dbName: string, viewName: string): Promise<string> {
    const rows = await this.driver.query(`
      SELECT view_definition 
      FROM information_schema.views 
      WHERE table_name = $1 AND table_schema = 'public'
    `, [viewName]);
    return rows[0] ? `CREATE VIEW ${viewName} AS\n${rows[0].view_definition}` : "";
  }

  async getProcedureDDL(dbName: string, procName: string): Promise<string> {
    return this.getRoutineDDL(procName);
  }

  async getFunctionDDL(dbName: string, funcName: string): Promise<string> {
    return this.getRoutineDDL(funcName);
  }

  private async getRoutineDDL(name: string): Promise<string> {
    const rows = await this.driver.query(`
      SELECT pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE p.proname = $1 AND n.nspname = 'public'
    `, [name]);
    return rows[0] ? rows[0].definition : "";
  }

  async getTriggerDDL(dbName: string, triggerName: string): Promise<string> {
    const rows = await this.driver.query(`
      SELECT pg_get_triggerdef(t.oid) as definition
      FROM pg_trigger t
      WHERE t.tgname = $1
    `, [triggerName]);
    return rows[0] ? rows[0].definition : "";
  }

  async getEventDDL(dbName: string, eventName: string): Promise<string> {
    return "";
  }

  async getChecksums(dbName: string): Promise<Record<string, string>> {
    return {};
  }

  async getObjectDDL(dbName: string, type: string, name: string): Promise<string> {
    switch (type.toUpperCase()) {
      case 'TABLE': return this.getTableDDL(dbName, name);
      case 'VIEW': return this.getViewDDL(dbName, name);
      case 'PROCEDURE': return this.getProcedureDDL(dbName, name);
      case 'FUNCTION': return this.getFunctionDDL(dbName, name);
      case 'TRIGGER': return this.getTriggerDDL(dbName, name);
      default: return "";
    }
  }

  async getTableColumns(dbName: string, tableName: string): Promise<any[]> {
    const rows = await this.driver.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [tableName]);
    return rows.map((r: any) => ({
      name: r.column_name,
      type: r.data_type,
      nullable: r.is_nullable === 'YES',
      default: r.column_default
    }));
  }

  async getTableStats(dbName: string): Promise<any[]> {
    const rows = await this.driver.query(`
      SELECT 
        relname as table_name, 
        n_live_tup as row_count,
        pg_total_relation_size(relid) as total_size
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC
    `);
    return rows.map((r: any) => ({
      name: r.table_name,
      rowCount: parseInt(r.row_count),
      sizeBytes: parseInt(r.total_size)
    }));
  }

  async getServerInfo(): Promise<any> {
    const rows = await this.driver.query("SELECT version()");
    return {
      version: rows[0].version,
      versionMajor: parseInt(rows[0].version.match(/(\d+)\./)?.[1] || "0"),
      hasInstantDDL: true,
      hasOnlineDDL: true
    };
  }

  async getFKGraph(dbName: string): Promise<any[]> {
    const rows = await this.driver.query(`
      SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS referenced_table_name,
        ccu.column_name AS referenced_column_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    `);
    return rows;
  }
}
