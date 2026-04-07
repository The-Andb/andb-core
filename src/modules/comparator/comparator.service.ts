const { getLogger } = require('andb-logger');
import { ParserService } from '../parser/parser.service';
import {
  IDiffOperation,
  ITableDiff,
  IObjectDiff,
  ISchemaDiff,
} from '../../common/interfaces/diff.interface';
import { IIntrospectionService } from '../../common/interfaces/driver.interface';
import { MysqlMigrator } from '../migrator/mysql/mysql.migrator';

export class ComparatorService {
  private readonly logger = getLogger({ logName: 'ComparatorService' });
  private readonly migrator = new MysqlMigrator();
  private readonly TRIGGERS = 'TRIGGERS';
  private readonly TABLES = 'TABLES';

  constructor(
    private readonly parser: ParserService,
    private readonly storageService: any,
    private readonly configService: any,
  ) { }

  /**
   * Compare two CREATE TABLE statements and return differences
   */
  compareTables(srcDDL: string, destDDL: string): ITableDiff {
    const srcTable = this.parser.parseTable(srcDDL);
    const destTable = this.parser.parseTable(destDDL);

    // Fallback if parsing fails: do literal comparison
    if (!srcTable || !destTable) {
      const isDiff = this.parser.normalize(srcDDL, { ignoreDefiner: true, ignoreWhitespace: true }) !==
        this.parser.normalize(destDDL, { ignoreDefiner: true, ignoreWhitespace: true });
      return {
        tableName: 'unknown',
        operations: isDiff ? [{ type: 'MODIFY', target: 'TABLE', name: 'structure' }] : [],
        hasChanges: isDiff
      };
    }

    const tableName = srcTable.tableName;
    const operations: IDiffOperation[] = [];

    // 1. Compare Columns
    const { alterColumns, missingColumns } = this.compareColumns(srcTable, destTable);

    // Convert logic results to IDiffOperations
    alterColumns.forEach((op) => {
      if (op.type === 'ADD') {
        operations.push({
          type: 'ADD',
          target: 'COLUMN',
          name: op.name,
          tableName,
          definition: op.def,
        });
      } else if (op.type === 'MODIFY') {
        operations.push({
          type: 'MODIFY',
          target: 'COLUMN',
          name: op.name,
          tableName,
          definition: op.def,
        });
      }
    });

    missingColumns.forEach((colName) => {
      operations.push({ type: 'DROP', target: 'COLUMN', name: colName, tableName });
    });

    // 2. Compare Indexes
    const indexOps = this.compareIndexes(srcTable, destTable);
    indexOps.forEach((op) => {
      operations.push({ ...op, tableName });
    });

    // 3. Compare Foreign Keys
    const fkOps = this.compareForeignKeys(srcTable, destTable);
    fkOps.forEach((op) => {
      operations.push({ ...op, tableName });
    });

    return {
      tableName,
      operations,
      hasChanges: operations.length > 0,
    };
  }

  /**
   * Normalize a definition for comparison
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _normalizeDef(def: string, env?: string): string {
    if (!def) return '';

    // 0. Apply Domain Normalization (Variables/Schemas/etc)
    let processed = this._applyNormalization(def, env);

    processed = processed.replace(/,$/, '').trim();

    // 1. Normalize Integer Types (MySQL 8.0 ignores display width)
    processed = processed.replace(/(TINYINT|SMALLINT|MEDIUMINT|INT|INTEGER|BIGINT)\(\d+\)/gi, '$1');

    // 2. Clear MySQL Version Comments
    processed = processed.replace(/\/\*!\d+\s*([^/]+)\*\//g, '$1');

    // 3. Remove default index algorithms added implicitly by MySQL
    processed = processed.replace(/ USING BTREE/ig, '');

    // 4. Remove truly implicit default collation (latin1_swedish_ci, utf8mb4_0900_ai_ci)
    // Other collations (utf8mb4_unicode_ci, utf8mb4_general_ci, etc.) are preserved as meaningful differences
    processed = processed.replace(/\s+COLLATE\s+(latin1_swedish_ci|utf8mb4_0900_ai_ci)/gi, '');
    const defaultCharsets = ['utf8mb4', 'utf8', 'latin1'];
    defaultCharsets.forEach(cs => {
      processed = processed.replace(new RegExp(`\\s+CHARACTER SET ${cs}`, 'gi'), '');
    });

    // 5. Normalize spacing and casing
    processed = processed.toUpperCase().replace(/\s+/g, ' ').trim();
    return processed;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private compareColumns(srcTable: any, destTable: any) {
    const alterColumns: { type: 'ADD' | 'MODIFY'; name: string; def: string }[] = [];
    const missingColumns: string[] = [];
    // Track the last column that exists in BOTH src and dest, so AFTER `col`
    // always references a column the target database actually has.
    let prevExistingColumnName: string | null = null;

    // Check for ADD / MODIFY
    for (const columnName in srcTable.columns) {
      if (!destTable.columns[columnName]) {
        // ADD
        const colDef = srcTable.columns[columnName].replace(/[,;]$/, '');
        const position = prevExistingColumnName ? `AFTER \`${prevExistingColumnName}\`` : 'FIRST';
        const def = `${colDef} ${position}`;
        alterColumns.push({ type: 'ADD', name: columnName, def: def });
      } else {
        // Check MODIFY
        const srcColumnDef = srcTable.columns[columnName];
        const destColumnDef = destTable.columns[columnName];

        const normSrc = this._normalizeDef(srcColumnDef);
        const normDest = this._normalizeDef(destColumnDef);

        if (normSrc !== normDest) {
          alterColumns.push({ type: 'MODIFY', name: columnName, def: srcColumnDef });
        }
        prevExistingColumnName = columnName;
      }
    }

    // Check for DROP
    for (const destColName in destTable.columns) {
      if (!srcTable.columns[destColName]) {
        missingColumns.push(destColName);
      }
    }

    return { alterColumns, missingColumns };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private compareIndexes(srcTable: any, destTable: any): IDiffOperation[] {
    const ops: IDiffOperation[] = [];

    // 1. Check for new or changed indexes
    for (const indexName in srcTable.indexes) {
      const srcDef = srcTable.indexes[indexName].replace(/,$/, '').trim();

      if (!destTable.indexes[indexName]) {
        // ADD
        ops.push({ type: 'ADD', target: 'INDEX', name: indexName, definition: srcDef });
      } else {
        // COMPARE
        const destDef = destTable.indexes[indexName].replace(/,$/, '').trim();
        const normSrc = this._normalizeDef(srcDef);
        const normDest = this._normalizeDef(destDef);

        if (normSrc !== normDest) {
          // DROP + ADD (Modify)
          // Legacy logic was: push DROP then push ADD string.
          // Here we return explicit ops
          ops.push({ type: 'DROP', target: 'INDEX', name: indexName });
          ops.push({ type: 'ADD', target: 'INDEX', name: indexName, definition: srcDef });
        }
      }
    }

    // 2. Check for deprecated indexes
    for (const indexName in destTable.indexes) {
      if (!srcTable.indexes[indexName]) {
        ops.push({ type: 'DROP', target: 'INDEX', name: indexName });
      }
    }

    return ops;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private compareForeignKeys(srcTable: any, destTable: any): IDiffOperation[] {
    const ops: IDiffOperation[] = [];

    // 1. Check for new or changed foreign keys
    for (const fkName in srcTable.foreignKeys) {
      const srcDef = srcTable.foreignKeys[fkName].replace(/,$/, '').trim();

      if (!destTable.foreignKeys[fkName]) {
        // ADD
        ops.push({ type: 'ADD', target: 'FOREIGN_KEY', name: fkName, definition: srcDef });
      } else {
        // COMPARE
        const destDef = destTable.foreignKeys[fkName].replace(/,$/, '').trim();
        const normSrc = this._normalizeDef(srcDef);
        const normDest = this._normalizeDef(destDef);

        if (normSrc !== normDest) {
          // DROP + ADD
          ops.push({ type: 'DROP', target: 'FOREIGN_KEY', name: fkName });
          ops.push({ type: 'ADD', target: 'FOREIGN_KEY', name: fkName, definition: srcDef });
        }
      }
    }

    // 2. Check for deprecated foreign keys
    for (const fkName in destTable.foreignKeys) {
      if (!srcTable.foreignKeys[fkName]) {
        ops.push({ type: 'DROP', target: 'FOREIGN_KEY', name: fkName });
      }
    }

    return ops;
  }

  /**
   * Compare generic DDL objects (Views, Procedures, Functions, Events)
   */
  compareGenericDDL(
    type: 'VIEW' | 'PROCEDURE' | 'FUNCTION' | 'EVENT',
    name: string,
    srcDDL: string,
    destDDL: string,
  ): IObjectDiff | null {
    if (!srcDDL && !destDDL) return null;

    if (srcDDL && !destDDL) {
      return { type, name, operation: 'CREATE', definition: srcDDL };
    }

    if (!srcDDL && destDDL) {
      return { type, name, operation: 'DROP' };
    }

    const normSrc = this.parser.normalize(this._unescapeHtml(srcDDL), { ignoreDefiner: true, ignoreWhitespace: true }).toLowerCase();
    const normDest = this.parser.normalize(this._unescapeHtml(destDDL), {
      ignoreDefiner: true,
      ignoreWhitespace: true,
    }).toLowerCase();

    if (normSrc !== normDest) {
      return { type, name, operation: 'REPLACE', definition: srcDDL };
    }

    return null;
  }

  /**
   * Compare two TRIGGERS
   */
  compareTriggers(name: string, srcDDL: string, destDDL: string): IObjectDiff | null {
    if (!srcDDL && !destDDL) return null;
    if (srcDDL && !destDDL)
      return { type: 'TRIGGER', name, operation: 'CREATE', definition: srcDDL };
    if (!srcDDL && destDDL) return { type: 'TRIGGER', name, operation: 'DROP' };

    const srcTrigger = this.parser.parseTrigger(srcDDL);
    const destTrigger = this.parser.parseTrigger(destDDL);

    if (!srcTrigger || !destTrigger) {
      // Fallback to string compare
      return this.compareGenericDDL('TRIGGER' as any, name, srcDDL, destDDL);
    }

    // Specialized compare logic from Legacy
    const hasChanges =
      srcTrigger.timing !== destTrigger.timing ||
      srcTrigger.event !== destTrigger.event ||
      srcTrigger.tableName !== destTrigger.tableName ||
      this.parser.normalize(srcDDL, { ignoreDefiner: true, ignoreWhitespace: true }) !==
      this.parser.normalize(destDDL, { ignoreDefiner: true, ignoreWhitespace: true });

    if (hasChanges) {
      return { type: 'TRIGGER', name, operation: 'REPLACE', definition: srcDDL };
    }

    return null;
  }

  /**
   * Compare full schema between source and destination
   */
  async compareSchema(
    src: IIntrospectionService,
    dest: IIntrospectionService,
    srcDbName: string,
    destDbName?: string,
    destEnv?: string,
  ): Promise<ISchemaDiff> {
    const targetDbName = destDbName || srcDbName;
    const diff: ISchemaDiff = {
      tables: {},
      droppedTables: [],
      objects: [],
      summary: {
        totalChanges: 0,
        tablesChanged: 0,
        objectsChanged: 0,
      },
    };

    // 1. Compare Tables
    const srcTables = await src.listTables(srcDbName);
    const destTables = await dest.listTables(targetDbName);

    // New or Change
    for (const tableName of srcTables) {
      let srcDDL = await src.getTableDDL(srcDbName, tableName);
      let destDDL = await dest.getTableDDL(targetDbName, tableName);

      srcDDL = this._applyNormalization(srcDDL, destEnv);
      destDDL = this._applyNormalization(destDDL, destEnv);

      if (!destDDL) {
        // New table - for now handled by Migrator if we just send the diff
        // But for parity, we should probably represent this as a CREATE statement or TableDiff
        // In our current design, ITableDiff represents ALTERS.
        // Let's use a special "status" or just empty destDDL for CREATE?
        // Actually, let's just use compareTables.
      }

      const tableDiff = this.compareTables(srcDDL, destDDL);
      if (tableDiff.hasChanges) {
        diff.tables[tableName] = tableDiff;
        diff.summary.tablesChanged++;
        diff.summary.totalChanges += tableDiff.operations.length;
      }
    }

    // Dropped
    for (const tableName of destTables) {
      if (!srcTables.includes(tableName)) {
        diff.droppedTables.push(tableName);
        diff.summary.totalChanges++;
      }
    }

    // 2. Compare Generic Objects
    const types: ('VIEW' | 'PROCEDURE' | 'FUNCTION' | 'EVENT')[] = [
      'VIEW',
      'PROCEDURE',
      'FUNCTION',
      'EVENT',
    ];

    for (const type of types) {
      const srcList = await this._listObjects(src, type, srcDbName);
      const destList = await this._listObjects(dest, type, targetDbName);

      const allNames = new Set([...srcList, ...destList]);

      for (const name of allNames) {
        let srcDDL = srcList.includes(name) ? await this._getDDL(src, type, srcDbName, name) : '';
        let destDDL = destList.includes(name) ? await this._getDDL(dest, type, targetDbName, name) : '';

        srcDDL = this._applyNormalization(srcDDL, destEnv);
        destDDL = this._applyNormalization(destDDL, destEnv);

        const objDiff = this.compareGenericDDL(type, name, srcDDL, destDDL);
        if (objDiff) {
          diff.objects.push(objDiff);
          diff.summary.objectsChanged++;
          diff.summary.totalChanges++;
        }
      }
    }

    // 3. Compare Triggers
    const srcTriggers = await src.listTriggers(srcDbName);
    const destTriggers = await dest.listTriggers(targetDbName);
    const allTriggers = new Set([...srcTriggers, ...destTriggers]);

    for (const name of allTriggers) {
      let srcDDL = srcTriggers.includes(name) ? await src.getTriggerDDL(srcDbName, name) : '';
      let destDDL = destTriggers.includes(name) ? await dest.getTriggerDDL(targetDbName, name) : '';

      srcDDL = this._applyNormalization(srcDDL, destEnv);
      destDDL = this._applyNormalization(destDDL, destEnv);

      const objDiff = this.compareTriggers(name, srcDDL, destDDL);
      if (objDiff) {
        diff.objects.push(objDiff);
        diff.summary.objectsChanged++;
        diff.summary.totalChanges++;
      }
    }

    return diff;
  }

  private async _listObjects(
    service: IIntrospectionService,
    type: string,
    dbName: string,
  ): Promise<string[]> {
    switch (type) {
      case 'VIEW':
        return service.listViews(dbName);
      case 'PROCEDURE':
        return service.listProcedures(dbName);
      case 'FUNCTION':
        return service.listFunctions(dbName);
      case 'EVENT':
        return service.listEvents(dbName);
      default:
        return [];
    }
  }

  private async _getDDL(
    service: IIntrospectionService,
    type: string,
    dbName: string,
    name: string,
  ): Promise<string> {
    switch (type) {
      case 'VIEW':
        return service.getViewDDL(dbName, name);
      case 'PROCEDURE':
        return service.getProcedureDDL(dbName, name);
      case 'FUNCTION':
        return service.getFunctionDDL(dbName, name);
      case 'EVENT':
        return service.getEventDDL(dbName, name);
      default:
        return '';
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // OFFLINE COMPARE: Read from Storage (Rule #1)
  // Mirrors legacy: loadDDLContent → markNewDDL/markChangeDDL/markDeprecatedDDL
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Compare DDLs between two environments using STORAGE (offline).
   * This is the primary compare method for desktop/UI flow.
   * Legacy equivalent: compare() → reportDLLChange() → markNewDDL/markChangeDDL/markDeprecatedDDL
   */
  async compareFromStorage(
    srcEnv: string,
    destEnv: string,
    srcDbName: string,
    destDbName: string,
    ddlType: string,
    specificName?: string,
  ): Promise<any[]> {
    const storageType = ddlType.toUpperCase(); // 'TABLES', 'PROCEDURES', etc.

    // Load DDL lists from storage (like legacy loadDDLContent)
    const srcObjects: any[] = await this.storageService.getDDLObjects(srcEnv, srcDbName, storageType);
    const destObjects: any[] = await this.storageService.getDDLObjects(destEnv, destDbName, storageType);

    if (srcObjects.length === 0 && destObjects.length === 0) {
      this.logger.warn(`[Compare] No exported DDLs for ${storageType}. Run export first.`);
      return [];
    }

    // Build name → content maps (like legacy loadDDLContent)
    const srcMap = new Map<string, string>();
    for (const obj of srcObjects) srcMap.set(obj.name, obj.content || '');
    const destMap = new Map<string, string>();
    for (const obj of destObjects) destMap.set(obj.name, obj.name === 'OTE_DATA' ? '' : obj.content || ''); // Mock OTE handling

    // Filter to specific name if provided
    const srcNames = specificName ? [specificName].filter(n => srcMap.has(n)) : Array.from(srcMap.keys());
    const destNames = specificName ? [specificName].filter(n => destMap.has(n)) : Array.from(destMap.keys());
    const allNames = new Set([...srcNames, ...destNames]);

    const results: any[] = [];
    const singularType = storageType.replace(/S$/, ''); // TABLES → TABLE

    for (const name of allNames) {
      if (this.isSkipObject(name)) continue;

      let srcDDL = srcMap.get(name) || '';
      let destDDL = destMap.get(name) || '';

      // OTE Prefix Detection (Rule #1 parity)
      const isOTE = name.startsWith('OTE_') || srcDDL.includes('OTE_') || destDDL.includes('OTE_');

      // Apply domain normalization (Rule #1 parity)
      srcDDL = this._applyNormalization(srcDDL, destEnv);
      destDDL = this._applyNormalization(destDDL, destEnv);

      let status: string;
      let alterStatements: string[] = [];
      let diffSummary: string | null = null;

      if (srcDDL && !destDDL) {
        // NEW — exists in source, missing in target
        status = 'missing_in_target';
        alterStatements = [srcDDL];
        diffSummary = `[NEW] ${singularType} ${name}`;
      } else if (!srcDDL && destDDL) {
        // DEPRECATED — missing in source
        status = 'missing_in_source';
        if (singularType !== 'TABLE') {
          alterStatements = [`DROP ${singularType} IF EXISTS \`${name}\`;`];
        }
        diffSummary = `[DEPRECATED] ${singularType} ${name}`;
      } else {
        // BOTH EXIST — check for real changes
        const hasChange = this._hasRealChange(srcDDL, destDDL, storageType);

        if (hasChange) {
          status = 'different';
          if (storageType === 'TABLES') {
            const tableDiff = this.compareTables(srcDDL, destDDL);
            alterStatements = this.migrator.generateTableAlterSQL(tableDiff);
            const colCount = tableDiff.operations.filter(op => op.target === 'COLUMN').length;
            const idxCount = tableDiff.operations.filter(op => op.target === 'INDEX').length;
            diffSummary = `[UPDATED] ${name}: col=${colCount}, idx=${idxCount}`;
          } else {
            const objDiff = (storageType === 'TRIGGERS')
              ? this.compareTriggers(name, srcDDL, destDDL)
              : this.compareGenericDDL(singularType as any, name, srcDDL, destDDL);

            if (objDiff) {
              alterStatements = this.migrator.generateObjectSQL(objDiff);
              diffSummary = `[UPDATED] ${name}`;
            } else {
              status = 'equal';
            }
          }
        } else {
          status = 'equal';
        }
      }

      if (isOTE && status !== 'equal') {
        diffSummary = `[OTE] ${diffSummary || name}`;
      }

      if (status !== 'skip') {
        const result = {
          name, status,
          type: storageType,
          ddl: alterStatements,
          alterStatements,
          diffSummary,
          diff: { source: srcDDL || null, target: destDDL || null },
        };
        results.push(result);

        // Save comparison to storage (like legacy _saveComparison)
        await this.storageService.saveComparison({
          id: require('crypto').randomUUID(),
          source_env: srcEnv,
          target_env: destEnv,
          database_name: srcDbName,
          ddl_type: storageType,
          ddl_name: name,
          status: status,
          alter_statements: alterStatements.length ? JSON.stringify(alterStatements) : '',
        });
      }
    }

    // Summary log (Parity with legacy reportDLLChange summary)
    const counts = {
      new: results.filter(r => r.status === 'missing_in_target').length,
      updated: results.filter(r => r.status === 'different').length,
      deprecated: results.filter(r => r.status === 'missing_in_source').length,
      equal: results.filter(r => r.status === 'equal').length,
    };

    console.log(`\n📊 [${storageType}] Comparison Summary (${srcEnv} -> ${destEnv})`);
    console.table([
      { Status: 'NEW (Missing in Target)', Count: counts.new },
      { Status: 'UPDATED (Different Content)', Count: counts.updated },
      { Status: 'DEPRECATED (Missing in Source)', Count: counts.deprecated },
      { Status: 'EQUAL (No Change)', Count: counts.equal },
    ]);

    return results;
  }

  /**
   * Apply domain normalization patterns to DDL content.
   * Legacy: _applyNormalization
   */
  private _applyNormalization(content: string, env?: string): string {
    if (!content) return '';
    const norms = this.configService.getDomainNormalization(env);
    let result = content;
    for (const norm of norms) {
      // Use a more robust check than instanceof RegExp for IPC compatibility
      const pattern = norm?.pattern;
      if (pattern && (pattern instanceof RegExp || typeof pattern.test === 'function')) {
        result = result.replace(pattern, norm.replacement || '');
      }
    }
    return result;
  }

  private _unescapeHtml(s: string): string {
    if (!s) return '';
    return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  }

  /**
   * Literal Parity Methods for LEGACY_PARITY_MAP.md
   */

  async reportDLLChange(srcEnv: string, type: string, destEnv: string, specificName?: string) {
    const srcConn = this.configService.getConnection(srcEnv);
    const destConn = this.configService.getConnection(destEnv);
    return this.compareFromStorage(
      srcEnv,
      destEnv,
      srcConn?.config?.database || 'default',
      destConn?.config?.database || 'default',
      type,
      specificName,
    );
  }

  async reportTriggerChange(srcEnv: string, destEnv: string, specificName?: string) {
    const srcConn = this.configService.getConnection(srcEnv);
    const destConn = this.configService.getConnection(destEnv);
    return this.handleTriggerComparison(
      srcEnv,
      destEnv,
      srcConn?.config?.database || 'default',
      destConn?.config?.database || 'default',
      specificName,
    );
  }

  async loadDDLContent(srcEnv: string, destEnv: string, type: string, name?: string) {
    const srcConn = this.configService.getConnection(srcEnv);
    const destConn = this.configService.getConnection(destEnv);
    const srcLines = await this.storageService.getDDLObjects(srcEnv, srcConn?.config?.database || 'default', type);
    const destLines = await this.storageService.getDDLObjects(destEnv, destConn?.config?.database || 'default', type);
    return {
      srcLines: name ? srcLines.filter((l: any) => l.name === name) : srcLines,
      destLines: name ? destLines.filter((l: any) => l.name === name) : destLines,
    };
  }

  async _getDDLContent(env: string, type: string, name: string) {
    const conn = this.configService.getConnection(env);
    return this.storageService.getDDL(env, conn?.config?.database || 'default', type, name);
  }

  async checkDiffAndGenAlter(tableName: string, env: string) {
    // Legacy: compares storage vs storage for a single table
    const srcEnv = this.configService.getSourceEnv() || 'local';
    const conn = this.configService.getConnection(env);
    const db = conn?.config?.database || 'default';
    const results = await this.compareFromStorage(srcEnv, env, db, db, this.TABLES, tableName);
    return results[0]?.ddl || [];
  }

  async findDDLChanged2Migrate(srcEnv: string, type: string, destEnv: string) {
    const results = await this.reportDLLChange(srcEnv, type, destEnv);
    return results.filter((r) => r.status === 'different' || r.status === 'missing_in_target');
  }

  private _processUpdatedLines(results: any[]): any[] {
    return results.filter((r) => r.status === 'different');
  }

  private _processEqualLines(results: any[]): any[] {
    return results.filter((r) => r.status === 'equal');
  }

  /**
   * Check if an object should be skipped (system tables, etc.)
   * Legacy: isNotMigrateCondition
   */
  /**
   * Specialized trigger comparison (Structural + content)
   * Legacy: handleTriggerComparison
   */
  async handleTriggerComparison(
    srcEnv: string,
    destEnv: string,
    srcDbName: string,
    destDbName: string,
    specificName?: string,
  ): Promise<any[]> {
    const srcObjects = await this.storageService.getDDLObjects(srcEnv, srcDbName, this.TRIGGERS);
    const destObjects = await this.storageService.getDDLObjects(destEnv, destDbName, this.TRIGGERS);

    const srcTriggers = await this.parseTriggerList(srcObjects);
    const destTriggers = await this.parseTriggerList(destObjects);

    const triggerChanges = this.compareTriggerLists(srcTriggers, destTriggers);

    if (triggerChanges.length > 0) {
      this.logger.warn(`[Compare] Found ${triggerChanges.length} trigger structural changes/duplicates`);
    }

    return triggerChanges;
  }

  private async parseTriggerList(objects: any[]): Promise<any[]> {
    const list: any[] = [];
    for (const obj of objects) {
      const parsed = this.parser.parseTrigger(obj.content || '');
      if (parsed) list.push(parsed);
    }
    return list;
  }

  private compareTriggerLists(srcTriggers: any[], destTriggers: any[]): any[] {
    const triggerChanges: any[] = [];
    const duplicateWarnings: any[] = [];

    const srcDuplicates = this.findDuplicateTriggers(srcTriggers);
    if (srcDuplicates.length > 0)
      duplicateWarnings.push({ type: 'SOURCE', duplicates: srcDuplicates });

    const destDuplicates = this.findDuplicateTriggers(destTriggers);
    if (destDuplicates.length > 0)
      duplicateWarnings.push({ type: 'DESTINATION', duplicates: destDuplicates });

    for (const srcTrigger of srcTriggers) {
      const destTrigger = destTriggers.find((t) => t.triggerName === srcTrigger.triggerName);
      if (destTrigger) {
        const diff = this.compareTriggers(srcTrigger.triggerName, srcTrigger.definition, destTrigger.definition);
        if (diff) {
          triggerChanges.push({ triggerName: srcTrigger.triggerName, diff });
        }
      }
    }

    if (duplicateWarnings.length > 0) {
      this.logDuplicateTriggerWarnings(duplicateWarnings);
    }

    return triggerChanges;
  }

  private findDuplicateTriggers(triggers: any[]): any[] {
    const duplicates: any[] = [];
    const groups: Record<string, any[]> = {};

    for (const trigger of triggers) {
      const key = `${trigger.tableName}_${trigger.event}_${trigger.timing}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(trigger);
    }

    for (const [key, list] of Object.entries(groups)) {
      if (list.length > 1) {
        const [tableName, event, timing] = key.split('_');
        duplicates.push({
          tableName,
          event,
          timing,
          triggers: list.map((t) => t.triggerName),
          count: list.length,
        });
      }
    }
    return duplicates;
  }

  private logDuplicateTriggerWarnings(warnings: any[]) {
    for (const warning of warnings) {
      this.logger.warn(`⚠️ DUPLICATE TRIGGERS in ${warning.type}:`);
      for (const d of warning.duplicates) {
        this.logger.warn(`  Table: ${d.tableName}, Event: ${d.timing} ${d.event}, Found: ${d.triggers.join(', ')}`);
      }
    }
  }

  /**
   * Log word-level diff (Parity with legacy logDiff)
   */
  logDiff(src: string, dest: string) {
    this.logger.info('--- DIFF START ---');
    this.logger.info(`Source: ${src.substring(0, 100)}...`);
    this.logger.info(`Target: ${dest.substring(0, 100)}...`);
    // In a real terminal we'd use 'diff' or a library. For now, basic logging.
    this.logger.info('--- DIFF END ---');
  }

  private _logDetailedDiff(srcEnv: string, destEnv: string, type: string, name: string, src: string, dest: string) {
    this.logger.info(`Detailed Diff for ${type} "${name}" (${srcEnv} -> ${destEnv}):`);
    this.logDiff(src, dest);
  }

  /**
   * Filter false-positive changes (Legacy parity)
   */
  private _hasRealChange(src: string, dest: string, type: string): boolean {
    // Standardize: Remove HTML entities, normalize SQL, remove comments, apply normalization, remove backticks, and lowercase
    const cleanFn = (text: string) => {
      let cleaned = this._unescapeHtml(text);
      cleaned = this.parser.normalize(cleaned, { ignoreDefiner: true, ignoreWhitespace: true });
      // Aggressive comment removal for environmental parity
      cleaned = cleaned.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      cleaned = this._applyNormalization(cleaned);
      // Remove CHARACTER SET and COLLATE to avoid environmental noise
      cleaned = cleaned.replace(/CHARACTER SET [a-zA-Z0-9_]+/gi, '').replace(/COLLATE [a-zA-Z0-9_]+/gi, '');
      return cleaned.replace(/[`'"]/g, '').replace(/\s+/g, '').toLowerCase();
    };

    const ns = cleanFn(src);
    const nd = cleanFn(dest);

    if (ns === nd) return false;

    // DEBUG: Write mismatch to file to see what remains
    try {
      const fs = require('fs');
      const logContent = `--- SRC CLEANED ---\n${ns}\n--- DEST CLEANED ---\n${nd}\n------------------\n`;
      fs.appendFileSync('/Volumes/FlexibleWorkplace/The-Andb/mismatch.txt', logContent);
    } catch(e) {}

    // For tables, we can do a deeper check via compareTables if needed
    if (type === 'TABLES' || type === 'TABLE') {
      const diff = this.compareTables(src, dest);
      return diff.hasChanges;
    }

    return true;
  }

  /**
   * Compare two arbitrary DDL strings
   */
  async compareArbitraryDDL(srcDDL: string, destDDL: string, type?: string): Promise<any> {
    const detectedType = type || this.parser.detectObjectType(srcDDL);
    const storageType = (detectedType === 'TABLE' ? 'TABLES' :
      (detectedType === 'UNKNOWN' ? 'SQL' : detectedType + 'S')) as any;

    if (detectedType === 'TABLE') {
      const tableDiff = this.compareTables(srcDDL, destDDL);
      // Handle arbitrary table generation properly
      const alterStatements = tableDiff.hasChanges ? this.migrator.generateTableAlterSQL(tableDiff) : [];
      if (!tableDiff.hasChanges && srcDDL.trim() !== destDDL.trim()) {
        alterStatements.push(srcDDL);
      } else if (tableDiff.hasChanges && alterStatements.length === 0) {
        alterStatements.push(srcDDL);
      }

      return {
        name: tableDiff.tableName || 'arbitrary',
        status: tableDiff.hasChanges ? 'different' : (srcDDL.trim() !== destDDL.trim() ? 'different' : 'equal'),
        type: 'TABLES',
        alterStatements,
        diff: { source: srcDDL, target: destDDL }
      };
    }

    const diff = (detectedType === 'TRIGGER')
      ? this.compareTriggers('arbitrary', srcDDL, destDDL)
      : this.compareGenericDDL(detectedType as any, 'arbitrary', srcDDL, destDDL);

    const isDifferent = diff !== null || (srcDDL.trim() !== destDDL.trim() && detectedType === 'UNKNOWN');

    const result = {
      name: diff ? diff.name : 'arbitrary',
      status: isDifferent ? 'different' : (srcDDL && destDDL ? 'equal' : (!srcDDL && !destDDL ? 'missing' : (srcDDL ? 'missing_in_target' : 'missing_in_source'))),
      type: storageType,
      ddl: diff ? this.migrator.generateObjectSQL(diff) : (isDifferent ? [srcDDL] : []),
      alterStatements: diff ? this.migrator.generateObjectSQL(diff) : (isDifferent ? [srcDDL] : []),
      diff: { source: srcDDL || null, target: destDDL || null }
    };
    return result;
  }

  /**
   * Compare two specific objects from storage, possibly with different names/envs
   */
  async compareCustomSelection(
    src: { env: string; db: string; type: string; name: string },
    dest: { env: string; db: string; type: string; name: string }
  ): Promise<any> {
    const srcDDL = await this.storageService.getDDL(src.env, src.db, src.type, src.name);
    const destDDL = await this.storageService.getDDL(dest.env, dest.db, dest.type, dest.name);

    const result = await this.compareArbitraryDDL(srcDDL, destDDL, src.type.replace(/S$/, ''));

    // Override name to be more descriptive for custom selection
    result.name = `${src.name} vs ${dest.name}`;
    return result;
  }

  /**
   * Report table structure changes (Legacy parity)
   */
  async reportTableStructureChange(envName: string, tables: string[], specificName?: string) {
    // This in legacy generates the alter-columns.list and alter-indexes.list
    // In Framework, we return this as part of the compare result.
    this.logger.info(`Reporting structure changes for ${envName}...`);
  }

  /**
   * setupMigrationFolder (Legacy parity)
   */
  setupMigrationFolder(srcEnv: string, destEnv: string, dbName: string): string {
    const folder = `map-migrate/${srcEnv}-to-${destEnv}/${dbName}`;
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
    return folder;
  }

  private isSkipObject(name: string): boolean {
    const skipList = ['information_schema', 'performance_schema', 'mysql', 'sys'];
    const lowerName = name.toLowerCase();
    
    if (skipList.includes(lowerName)) return true;

    // Check custom exclusion regex from config
    const condition = this.configService.getIsNotMigrateCondition();
    if (condition) {
      try {
        const regex = new RegExp(condition, 'i');
        if (regex.test(name)) {
          this.logger.info(`Skipping object by custom rule: ${name}`);
          return true;
        }
      } catch (err) {
        this.logger.error(`Invalid isNotMigrateCondition regex: ${condition}`);
      }
    }

    return false;
  }
}
import * as fs from 'fs';
