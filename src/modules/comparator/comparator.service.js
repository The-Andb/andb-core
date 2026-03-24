"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComparatorService = void 0;
var getLogger = require('andb-logger').getLogger;
var mysql_migrator_1 = require("../migrator/mysql/mysql.migrator");
var ComparatorService = /** @class */ (function () {
    function ComparatorService(parser, storageService, configService) {
        this.parser = parser;
        this.storageService = storageService;
        this.configService = configService;
        this.logger = getLogger({ logName: 'ComparatorService' });
        this.migrator = new mysql_migrator_1.MysqlMigrator();
        this.TRIGGERS = 'TRIGGERS';
        this.TABLES = 'TABLES';
    }
    /**
     * Compare two CREATE TABLE statements and return differences
     */
    ComparatorService.prototype.compareTables = function (srcDDL, destDDL) {
        var srcTable = this.parser.parseTable(srcDDL);
        var destTable = this.parser.parseTable(destDDL);
        // Fallback if parsing fails: do literal comparison
        if (!srcTable || !destTable) {
            var isDiff = this.parser.normalize(srcDDL, { ignoreDefiner: true, ignoreWhitespace: true }) !==
                this.parser.normalize(destDDL, { ignoreDefiner: true, ignoreWhitespace: true });
            return {
                tableName: 'unknown',
                operations: isDiff ? [{ type: 'MODIFY', target: 'TABLE', name: 'structure' }] : [],
                hasChanges: isDiff
            };
        }
        var tableName = srcTable.tableName;
        var operations = [];
        // 1. Compare Columns
        var _a = this.compareColumns(srcTable, destTable), alterColumns = _a.alterColumns, missingColumns = _a.missingColumns;
        // Convert logic results to IDiffOperations
        alterColumns.forEach(function (op) {
            if (op.type === 'ADD') {
                operations.push({
                    type: 'ADD',
                    target: 'COLUMN',
                    name: op.name,
                    tableName: tableName,
                    definition: op.def,
                });
            }
            else if (op.type === 'MODIFY') {
                operations.push({
                    type: 'MODIFY',
                    target: 'COLUMN',
                    name: op.name,
                    tableName: tableName,
                    definition: op.def,
                });
            }
        });
        missingColumns.forEach(function (colName) {
            operations.push({ type: 'DROP', target: 'COLUMN', name: colName, tableName: tableName });
        });
        // 2. Compare Indexes
        var indexOps = this.compareIndexes(srcTable, destTable);
        indexOps.forEach(function (op) {
            operations.push(__assign(__assign({}, op), { tableName: tableName }));
        });
        // 3. Compare Foreign Keys
        var fkOps = this.compareForeignKeys(srcTable, destTable);
        fkOps.forEach(function (op) {
            operations.push(__assign(__assign({}, op), { tableName: tableName }));
        });
        return {
            tableName: tableName,
            operations: operations,
            hasChanges: operations.length > 0,
        };
    };
    /**
     * Normalize a definition for comparison
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ComparatorService.prototype._normalizeDef = function (def) {
        if (!def)
            return '';
        var processed = def.replace(/,$/, '').trim();
        // 1. Normalize Integer Types (MySQL 8.0 ignores display width)
        processed = processed.replace(/(TINYINT|SMALLINT|MEDIUMINT|INT|INTEGER|BIGINT)\(\d+\)/gi, '$1');
        // 2. Clear MySQL Version Comments
        processed = processed.replace(/\/\*!\d+\s*([^/]+)\*\//g, '$1');
        // 3. Remove default index algorithms added implicitly by MySQL
        processed = processed.replace(/ USING BTREE/ig, '');
        // 4. Remove truly implicit default collation (latin1_swedish_ci, utf8mb4_0900_ai_ci)
        // Other collations (utf8mb4_unicode_ci, utf8mb4_general_ci, etc.) are preserved as meaningful differences
        processed = processed.replace(/\s+COLLATE\s+(latin1_swedish_ci|utf8mb4_0900_ai_ci)/gi, '');
        var defaultCharsets = ['utf8mb4', 'utf8', 'latin1'];
        defaultCharsets.forEach(function (cs) {
            processed = processed.replace(new RegExp("\\s+CHARACTER SET ".concat(cs), 'gi'), '');
        });
        // 5. Normalize spacing and casing
        processed = processed.toUpperCase().replace(/\s+/g, ' ').trim();
        return processed;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ComparatorService.prototype.compareColumns = function (srcTable, destTable) {
        var alterColumns = [];
        var missingColumns = [];
        // Track the last column that exists in BOTH src and dest, so AFTER `col`
        // always references a column the target database actually has.
        var prevExistingColumnName = null;
        // Check for ADD / MODIFY
        for (var columnName in srcTable.columns) {
            if (!destTable.columns[columnName]) {
                // ADD
                var colDef = srcTable.columns[columnName].replace(/[,;]$/, '');
                var position = prevExistingColumnName ? "AFTER `".concat(prevExistingColumnName, "`") : 'FIRST';
                var def = "".concat(colDef, " ").concat(position);
                alterColumns.push({ type: 'ADD', name: columnName, def: def });
            }
            else {
                // Check MODIFY
                var srcColumnDef = srcTable.columns[columnName];
                var destColumnDef = destTable.columns[columnName];
                var normSrc = this._normalizeDef(srcColumnDef);
                var normDest = this._normalizeDef(destColumnDef);
                if (normSrc !== normDest) {
                    alterColumns.push({ type: 'MODIFY', name: columnName, def: srcColumnDef });
                }
                prevExistingColumnName = columnName;
            }
        }
        // Check for DROP
        for (var destColName in destTable.columns) {
            if (!srcTable.columns[destColName]) {
                missingColumns.push(destColName);
            }
        }
        return { alterColumns: alterColumns, missingColumns: missingColumns };
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ComparatorService.prototype.compareIndexes = function (srcTable, destTable) {
        var ops = [];
        // 1. Check for new or changed indexes
        for (var indexName in srcTable.indexes) {
            var srcDef = srcTable.indexes[indexName].replace(/,$/, '').trim();
            if (!destTable.indexes[indexName]) {
                // ADD
                ops.push({ type: 'ADD', target: 'INDEX', name: indexName, definition: srcDef });
            }
            else {
                // COMPARE
                var destDef = destTable.indexes[indexName].replace(/,$/, '').trim();
                var normSrc = this._normalizeDef(srcDef);
                var normDest = this._normalizeDef(destDef);
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
        for (var indexName in destTable.indexes) {
            if (!srcTable.indexes[indexName]) {
                ops.push({ type: 'DROP', target: 'INDEX', name: indexName });
            }
        }
        return ops;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ComparatorService.prototype.compareForeignKeys = function (srcTable, destTable) {
        var ops = [];
        // 1. Check for new or changed foreign keys
        for (var fkName in srcTable.foreignKeys) {
            var srcDef = srcTable.foreignKeys[fkName].replace(/,$/, '').trim();
            if (!destTable.foreignKeys[fkName]) {
                // ADD
                ops.push({ type: 'ADD', target: 'FOREIGN_KEY', name: fkName, definition: srcDef });
            }
            else {
                // COMPARE
                var destDef = destTable.foreignKeys[fkName].replace(/,$/, '').trim();
                var normSrc = this._normalizeDef(srcDef);
                var normDest = this._normalizeDef(destDef);
                if (normSrc !== normDest) {
                    // DROP + ADD
                    ops.push({ type: 'DROP', target: 'FOREIGN_KEY', name: fkName });
                    ops.push({ type: 'ADD', target: 'FOREIGN_KEY', name: fkName, definition: srcDef });
                }
            }
        }
        // 2. Check for deprecated foreign keys
        for (var fkName in destTable.foreignKeys) {
            if (!srcTable.foreignKeys[fkName]) {
                ops.push({ type: 'DROP', target: 'FOREIGN_KEY', name: fkName });
            }
        }
        return ops;
    };
    /**
     * Compare generic DDL objects (Views, Procedures, Functions, Events)
     */
    ComparatorService.prototype.compareGenericDDL = function (type, name, srcDDL, destDDL) {
        if (!srcDDL && !destDDL)
            return null;
        if (srcDDL && !destDDL) {
            return { type: type, name: name, operation: 'CREATE', definition: srcDDL };
        }
        if (!srcDDL && destDDL) {
            return { type: type, name: name, operation: 'DROP' };
        }
        var normSrc = this.parser.normalize(this._unescapeHtml(srcDDL), { ignoreDefiner: true, ignoreWhitespace: true }).toLowerCase();
        var normDest = this.parser.normalize(this._unescapeHtml(destDDL), {
            ignoreDefiner: true,
            ignoreWhitespace: true,
        }).toLowerCase();
        if (normSrc !== normDest) {
            return { type: type, name: name, operation: 'REPLACE', definition: srcDDL };
        }
        return null;
    };
    /**
     * Compare two TRIGGERS
     */
    ComparatorService.prototype.compareTriggers = function (name, srcDDL, destDDL) {
        if (!srcDDL && !destDDL)
            return null;
        if (srcDDL && !destDDL)
            return { type: 'TRIGGER', name: name, operation: 'CREATE', definition: srcDDL };
        if (!srcDDL && destDDL)
            return { type: 'TRIGGER', name: name, operation: 'DROP' };
        var srcTrigger = this.parser.parseTrigger(srcDDL);
        var destTrigger = this.parser.parseTrigger(destDDL);
        if (!srcTrigger || !destTrigger) {
            // Fallback to string compare
            return this.compareGenericDDL('TRIGGER', name, srcDDL, destDDL);
        }
        // Specialized compare logic from Legacy
        var hasChanges = srcTrigger.timing !== destTrigger.timing ||
            srcTrigger.event !== destTrigger.event ||
            srcTrigger.tableName !== destTrigger.tableName ||
            this.parser.normalize(srcDDL, { ignoreDefiner: true, ignoreWhitespace: true }) !==
                this.parser.normalize(destDDL, { ignoreDefiner: true, ignoreWhitespace: true });
        if (hasChanges) {
            return { type: 'TRIGGER', name: name, operation: 'REPLACE', definition: srcDDL };
        }
        return null;
    };
    /**
     * Compare full schema between source and destination
     */
    ComparatorService.prototype.compareSchema = function (src, dest, srcDbName, destDbName, destEnv) {
        return __awaiter(this, void 0, void 0, function () {
            var targetDbName, diff, srcTables, destTables, _i, srcTables_1, tableName, srcDDL, destDDL, tableDiff, _a, destTables_1, tableName, types, _b, types_1, type, srcList, destList, allNames, _c, allNames_1, name_1, srcDDL, _d, destDDL, _e, objDiff, srcTriggers, destTriggers, allTriggers, _f, allTriggers_1, name_2, srcDDL, _g, destDDL, _h, objDiff;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        targetDbName = destDbName || srcDbName;
                        diff = {
                            tables: {},
                            droppedTables: [],
                            objects: [],
                            summary: {
                                totalChanges: 0,
                                tablesChanged: 0,
                                objectsChanged: 0,
                            },
                        };
                        return [4 /*yield*/, src.listTables(srcDbName)];
                    case 1:
                        srcTables = _j.sent();
                        return [4 /*yield*/, dest.listTables(targetDbName)];
                    case 2:
                        destTables = _j.sent();
                        _i = 0, srcTables_1 = srcTables;
                        _j.label = 3;
                    case 3:
                        if (!(_i < srcTables_1.length)) return [3 /*break*/, 7];
                        tableName = srcTables_1[_i];
                        return [4 /*yield*/, src.getTableDDL(srcDbName, tableName)];
                    case 4:
                        srcDDL = _j.sent();
                        return [4 /*yield*/, dest.getTableDDL(targetDbName, tableName)];
                    case 5:
                        destDDL = _j.sent();
                        srcDDL = this._applyDomainNormalization(srcDDL, destEnv);
                        destDDL = this._applyDomainNormalization(destDDL, destEnv);
                        if (!destDDL) {
                            // New table - for now handled by Migrator if we just send the diff
                            // But for parity, we should probably represent this as a CREATE statement or TableDiff
                            // In our current design, ITableDiff represents ALTERS.
                            // Let's use a special "status" or just empty destDDL for CREATE?
                            // Actually, let's just use compareTables.
                        }
                        tableDiff = this.compareTables(srcDDL, destDDL);
                        if (tableDiff.hasChanges) {
                            diff.tables[tableName] = tableDiff;
                            diff.summary.tablesChanged++;
                            diff.summary.totalChanges += tableDiff.operations.length;
                        }
                        _j.label = 6;
                    case 6:
                        _i++;
                        return [3 /*break*/, 3];
                    case 7:
                        // Dropped
                        for (_a = 0, destTables_1 = destTables; _a < destTables_1.length; _a++) {
                            tableName = destTables_1[_a];
                            if (!srcTables.includes(tableName)) {
                                diff.droppedTables.push(tableName);
                                diff.summary.totalChanges++;
                            }
                        }
                        types = [
                            'VIEW',
                            'PROCEDURE',
                            'FUNCTION',
                            'EVENT',
                        ];
                        _b = 0, types_1 = types;
                        _j.label = 8;
                    case 8:
                        if (!(_b < types_1.length)) return [3 /*break*/, 20];
                        type = types_1[_b];
                        return [4 /*yield*/, this._listObjects(src, type, srcDbName)];
                    case 9:
                        srcList = _j.sent();
                        return [4 /*yield*/, this._listObjects(dest, type, targetDbName)];
                    case 10:
                        destList = _j.sent();
                        allNames = new Set(__spreadArray(__spreadArray([], srcList, true), destList, true));
                        _c = 0, allNames_1 = allNames;
                        _j.label = 11;
                    case 11:
                        if (!(_c < allNames_1.length)) return [3 /*break*/, 19];
                        name_1 = allNames_1[_c];
                        if (!srcList.includes(name_1)) return [3 /*break*/, 13];
                        return [4 /*yield*/, this._getDDL(src, type, srcDbName, name_1)];
                    case 12:
                        _d = _j.sent();
                        return [3 /*break*/, 14];
                    case 13:
                        _d = '';
                        _j.label = 14;
                    case 14:
                        srcDDL = _d;
                        if (!destList.includes(name_1)) return [3 /*break*/, 16];
                        return [4 /*yield*/, this._getDDL(dest, type, targetDbName, name_1)];
                    case 15:
                        _e = _j.sent();
                        return [3 /*break*/, 17];
                    case 16:
                        _e = '';
                        _j.label = 17;
                    case 17:
                        destDDL = _e;
                        srcDDL = this._applyDomainNormalization(srcDDL, destEnv);
                        destDDL = this._applyDomainNormalization(destDDL, destEnv);
                        objDiff = this.compareGenericDDL(type, name_1, srcDDL, destDDL);
                        if (objDiff) {
                            diff.objects.push(objDiff);
                            diff.summary.objectsChanged++;
                            diff.summary.totalChanges++;
                        }
                        _j.label = 18;
                    case 18:
                        _c++;
                        return [3 /*break*/, 11];
                    case 19:
                        _b++;
                        return [3 /*break*/, 8];
                    case 20: return [4 /*yield*/, src.listTriggers(srcDbName)];
                    case 21:
                        srcTriggers = _j.sent();
                        return [4 /*yield*/, dest.listTriggers(targetDbName)];
                    case 22:
                        destTriggers = _j.sent();
                        allTriggers = new Set(__spreadArray(__spreadArray([], srcTriggers, true), destTriggers, true));
                        _f = 0, allTriggers_1 = allTriggers;
                        _j.label = 23;
                    case 23:
                        if (!(_f < allTriggers_1.length)) return [3 /*break*/, 31];
                        name_2 = allTriggers_1[_f];
                        if (!srcTriggers.includes(name_2)) return [3 /*break*/, 25];
                        return [4 /*yield*/, src.getTriggerDDL(srcDbName, name_2)];
                    case 24:
                        _g = _j.sent();
                        return [3 /*break*/, 26];
                    case 25:
                        _g = '';
                        _j.label = 26;
                    case 26:
                        srcDDL = _g;
                        if (!destTriggers.includes(name_2)) return [3 /*break*/, 28];
                        return [4 /*yield*/, dest.getTriggerDDL(targetDbName, name_2)];
                    case 27:
                        _h = _j.sent();
                        return [3 /*break*/, 29];
                    case 28:
                        _h = '';
                        _j.label = 29;
                    case 29:
                        destDDL = _h;
                        srcDDL = this._applyDomainNormalization(srcDDL, destEnv);
                        destDDL = this._applyDomainNormalization(destDDL, destEnv);
                        objDiff = this.compareTriggers(name_2, srcDDL, destDDL);
                        if (objDiff) {
                            diff.objects.push(objDiff);
                            diff.summary.objectsChanged++;
                            diff.summary.totalChanges++;
                        }
                        _j.label = 30;
                    case 30:
                        _f++;
                        return [3 /*break*/, 23];
                    case 31: return [2 /*return*/, diff];
                }
            });
        });
    };
    ComparatorService.prototype._listObjects = function (service, type, dbName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (type) {
                    case 'VIEW':
                        return [2 /*return*/, service.listViews(dbName)];
                    case 'PROCEDURE':
                        return [2 /*return*/, service.listProcedures(dbName)];
                    case 'FUNCTION':
                        return [2 /*return*/, service.listFunctions(dbName)];
                    case 'EVENT':
                        return [2 /*return*/, service.listEvents(dbName)];
                    default:
                        return [2 /*return*/, []];
                }
                return [2 /*return*/];
            });
        });
    };
    ComparatorService.prototype._getDDL = function (service, type, dbName, name) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (type) {
                    case 'VIEW':
                        return [2 /*return*/, service.getViewDDL(dbName, name)];
                    case 'PROCEDURE':
                        return [2 /*return*/, service.getProcedureDDL(dbName, name)];
                    case 'FUNCTION':
                        return [2 /*return*/, service.getFunctionDDL(dbName, name)];
                    case 'EVENT':
                        return [2 /*return*/, service.getEventDDL(dbName, name)];
                    default:
                        return [2 /*return*/, ''];
                }
                return [2 /*return*/];
            });
        });
    };
    // ═══════════════════════════════════════════════════════════════════
    // OFFLINE COMPARE: Read from Storage (Rule #1)
    // Mirrors legacy: loadDDLContent → markNewDDL/markChangeDDL/markDeprecatedDDL
    // ═══════════════════════════════════════════════════════════════════
    /**
     * Compare DDLs between two environments using STORAGE (offline).
     * This is the primary compare method for desktop/UI flow.
     * Legacy equivalent: compare() → reportDLLChange() → markNewDDL/markChangeDDL/markDeprecatedDDL
     */
    ComparatorService.prototype.compareFromStorage = function (srcEnv, destEnv, srcDbName, destDbName, ddlType, specificName) {
        return __awaiter(this, void 0, void 0, function () {
            var storageType, srcObjects, destObjects, srcMap, _i, srcObjects_1, obj, destMap, _a, destObjects_1, obj, srcNames, destNames, allNames, results, singularType, _b, allNames_2, name_3, srcDDL, destDDL, isOTE, status_1, alterStatements, diffSummary, hasChange, tableDiff, colCount, idxCount, objDiff, result, counts;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        storageType = ddlType.toUpperCase();
                        return [4 /*yield*/, this.storageService.getDDLObjects(srcEnv, srcDbName, storageType)];
                    case 1:
                        srcObjects = _c.sent();
                        return [4 /*yield*/, this.storageService.getDDLObjects(destEnv, destDbName, storageType)];
                    case 2:
                        destObjects = _c.sent();
                        if (srcObjects.length === 0 && destObjects.length === 0) {
                            this.logger.warn("[Compare] No exported DDLs for ".concat(storageType, ". Run export first."));
                            return [2 /*return*/, []];
                        }
                        srcMap = new Map();
                        for (_i = 0, srcObjects_1 = srcObjects; _i < srcObjects_1.length; _i++) {
                            obj = srcObjects_1[_i];
                            srcMap.set(obj.name, obj.content || '');
                        }
                        destMap = new Map();
                        for (_a = 0, destObjects_1 = destObjects; _a < destObjects_1.length; _a++) {
                            obj = destObjects_1[_a];
                            destMap.set(obj.name, obj.name === 'OTE_DATA' ? '' : obj.content || '');
                        } // Mock OTE handling
                        srcNames = specificName ? [specificName].filter(function (n) { return srcMap.has(n); }) : Array.from(srcMap.keys());
                        destNames = specificName ? [specificName].filter(function (n) { return destMap.has(n); }) : Array.from(destMap.keys());
                        allNames = new Set(__spreadArray(__spreadArray([], srcNames, true), destNames, true));
                        results = [];
                        singularType = storageType.replace(/S$/, '');
                        _b = 0, allNames_2 = allNames;
                        _c.label = 3;
                    case 3:
                        if (!(_b < allNames_2.length)) return [3 /*break*/, 6];
                        name_3 = allNames_2[_b];
                        if (this.isSkipObject(name_3))
                            return [3 /*break*/, 5];
                        srcDDL = srcMap.get(name_3) || '';
                        destDDL = destMap.get(name_3) || '';
                        isOTE = name_3.startsWith('OTE_') || srcDDL.includes('OTE_') || destDDL.includes('OTE_');
                        // Apply domain normalization (Rule #1 parity)
                        srcDDL = this._applyDomainNormalization(srcDDL, destEnv);
                        destDDL = this._applyDomainNormalization(destDDL, destEnv);
                        status_1 = void 0;
                        alterStatements = [];
                        diffSummary = null;
                        if (srcDDL && !destDDL) {
                            // NEW — exists in source, missing in target
                            status_1 = 'missing_in_target';
                            alterStatements = [srcDDL];
                            diffSummary = "[NEW] ".concat(singularType, " ").concat(name_3);
                        }
                        else if (!srcDDL && destDDL) {
                            // DEPRECATED — missing in source
                            status_1 = 'missing_in_source';
                            if (singularType !== 'TABLE') {
                                alterStatements = ["DROP ".concat(singularType, " IF EXISTS `").concat(name_3, "`;")];
                            }
                            diffSummary = "[DEPRECATED] ".concat(singularType, " ").concat(name_3);
                        }
                        else {
                            hasChange = this._hasRealChange(srcDDL, destDDL, storageType);
                            if (hasChange) {
                                status_1 = 'different';
                                if (storageType === 'TABLES') {
                                    tableDiff = this.compareTables(srcDDL, destDDL);
                                    alterStatements = this.migrator.generateTableAlterSQL(tableDiff);
                                    colCount = tableDiff.operations.filter(function (op) { return op.target === 'COLUMN'; }).length;
                                    idxCount = tableDiff.operations.filter(function (op) { return op.target === 'INDEX'; }).length;
                                    diffSummary = "[UPDATED] ".concat(name_3, ": col=").concat(colCount, ", idx=").concat(idxCount);
                                }
                                else {
                                    objDiff = (storageType === 'TRIGGERS')
                                        ? this.compareTriggers(name_3, srcDDL, destDDL)
                                        : this.compareGenericDDL(singularType, name_3, srcDDL, destDDL);
                                    if (objDiff) {
                                        alterStatements = this.migrator.generateObjectSQL(objDiff);
                                        diffSummary = "[UPDATED] ".concat(name_3);
                                    }
                                    else {
                                        status_1 = 'equal';
                                    }
                                }
                            }
                            else {
                                status_1 = 'equal';
                            }
                        }
                        if (isOTE && status_1 !== 'equal') {
                            diffSummary = "[OTE] ".concat(diffSummary || name_3);
                        }
                        if (!(status_1 !== 'skip')) return [3 /*break*/, 5];
                        result = {
                            name: name_3,
                            status: status_1,
                            type: storageType,
                            ddl: alterStatements,
                            alterStatements: alterStatements,
                            diffSummary: diffSummary,
                            diff: { source: srcDDL || null, target: destDDL || null },
                        };
                        results.push(result);
                        // Save comparison to storage (like legacy _saveComparison)
                        return [4 /*yield*/, this.storageService.saveComparison({
                                id: require('crypto').randomUUID(),
                                source_env: srcEnv,
                                target_env: destEnv,
                                database_name: srcDbName,
                                ddl_type: storageType,
                                ddl_name: name_3,
                                status: status_1,
                                alter_statements: alterStatements.length ? JSON.stringify(alterStatements) : '',
                            })];
                    case 4:
                        // Save comparison to storage (like legacy _saveComparison)
                        _c.sent();
                        _c.label = 5;
                    case 5:
                        _b++;
                        return [3 /*break*/, 3];
                    case 6:
                        counts = {
                            new: results.filter(function (r) { return r.status === 'missing_in_target'; }).length,
                            updated: results.filter(function (r) { return r.status === 'different'; }).length,
                            deprecated: results.filter(function (r) { return r.status === 'missing_in_source'; }).length,
                            equal: results.filter(function (r) { return r.status === 'equal'; }).length,
                        };
                        console.log("\n\uD83D\uDCCA [".concat(storageType, "] Comparison Summary (").concat(srcEnv, " -> ").concat(destEnv, ")"));
                        console.table([
                            { Status: 'NEW (Missing in Target)', Count: counts.new },
                            { Status: 'UPDATED (Different Content)', Count: counts.updated },
                            { Status: 'DEPRECATED (Missing in Source)', Count: counts.deprecated },
                            { Status: 'EQUAL (No Change)', Count: counts.equal },
                        ]);
                        return [2 /*return*/, results];
                }
            });
        });
    };
    /**
     * Apply domain normalization patterns to DDL content.
     * Legacy: _applyDomainNormalization
     */
    ComparatorService.prototype._applyDomainNormalization = function (content, env) {
        if (!content)
            return '';
        var norm = this.configService.getDomainNormalization(env);
        if (norm && norm.pattern && norm.pattern instanceof RegExp) {
            return content.replace(norm.pattern, norm.replacement || '');
        }
        return content;
    };
    ComparatorService.prototype._unescapeHtml = function (s) {
        if (!s)
            return '';
        return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    };
    /**
     * Literal Parity Methods for LEGACY_PARITY_MAP.md
     */
    ComparatorService.prototype.reportDLLChange = function (srcEnv, type, destEnv, specificName) {
        return __awaiter(this, void 0, void 0, function () {
            var srcConn, destConn;
            var _a, _b;
            return __generator(this, function (_c) {
                srcConn = this.configService.getConnection(srcEnv);
                destConn = this.configService.getConnection(destEnv);
                return [2 /*return*/, this.compareFromStorage(srcEnv, destEnv, ((_a = srcConn === null || srcConn === void 0 ? void 0 : srcConn.config) === null || _a === void 0 ? void 0 : _a.database) || 'default', ((_b = destConn === null || destConn === void 0 ? void 0 : destConn.config) === null || _b === void 0 ? void 0 : _b.database) || 'default', type, specificName)];
            });
        });
    };
    ComparatorService.prototype.reportTriggerChange = function (srcEnv, destEnv, specificName) {
        return __awaiter(this, void 0, void 0, function () {
            var srcConn, destConn;
            var _a, _b;
            return __generator(this, function (_c) {
                srcConn = this.configService.getConnection(srcEnv);
                destConn = this.configService.getConnection(destEnv);
                return [2 /*return*/, this.handleTriggerComparison(srcEnv, destEnv, ((_a = srcConn === null || srcConn === void 0 ? void 0 : srcConn.config) === null || _a === void 0 ? void 0 : _a.database) || 'default', ((_b = destConn === null || destConn === void 0 ? void 0 : destConn.config) === null || _b === void 0 ? void 0 : _b.database) || 'default', specificName)];
            });
        });
    };
    ComparatorService.prototype.loadDDLContent = function (srcEnv, destEnv, type, name) {
        return __awaiter(this, void 0, void 0, function () {
            var srcConn, destConn, srcLines, destLines;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        srcConn = this.configService.getConnection(srcEnv);
                        destConn = this.configService.getConnection(destEnv);
                        return [4 /*yield*/, this.storageService.getDDLObjects(srcEnv, ((_a = srcConn === null || srcConn === void 0 ? void 0 : srcConn.config) === null || _a === void 0 ? void 0 : _a.database) || 'default', type)];
                    case 1:
                        srcLines = _c.sent();
                        return [4 /*yield*/, this.storageService.getDDLObjects(destEnv, ((_b = destConn === null || destConn === void 0 ? void 0 : destConn.config) === null || _b === void 0 ? void 0 : _b.database) || 'default', type)];
                    case 2:
                        destLines = _c.sent();
                        return [2 /*return*/, {
                                srcLines: name ? srcLines.filter(function (l) { return l.name === name; }) : srcLines,
                                destLines: name ? destLines.filter(function (l) { return l.name === name; }) : destLines,
                            }];
                }
            });
        });
    };
    ComparatorService.prototype._getDDLContent = function (env, type, name) {
        return __awaiter(this, void 0, void 0, function () {
            var conn;
            var _a;
            return __generator(this, function (_b) {
                conn = this.configService.getConnection(env);
                return [2 /*return*/, this.storageService.getDDL(env, ((_a = conn === null || conn === void 0 ? void 0 : conn.config) === null || _a === void 0 ? void 0 : _a.database) || 'default', type, name)];
            });
        });
    };
    ComparatorService.prototype.checkDiffAndGenAlter = function (tableName, env) {
        return __awaiter(this, void 0, void 0, function () {
            var srcEnv, conn, db, results;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        srcEnv = this.configService.getSourceEnv() || 'local';
                        conn = this.configService.getConnection(env);
                        db = ((_a = conn === null || conn === void 0 ? void 0 : conn.config) === null || _a === void 0 ? void 0 : _a.database) || 'default';
                        return [4 /*yield*/, this.compareFromStorage(srcEnv, env, db, db, this.TABLES, tableName)];
                    case 1:
                        results = _c.sent();
                        return [2 /*return*/, ((_b = results[0]) === null || _b === void 0 ? void 0 : _b.ddl) || []];
                }
            });
        });
    };
    ComparatorService.prototype.findDDLChanged2Migrate = function (srcEnv, type, destEnv) {
        return __awaiter(this, void 0, void 0, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.reportDLLChange(srcEnv, type, destEnv)];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, results.filter(function (r) { return r.status === 'different' || r.status === 'missing_in_target'; })];
                }
            });
        });
    };
    ComparatorService.prototype._processUpdatedLines = function (results) {
        return results.filter(function (r) { return r.status === 'different'; });
    };
    ComparatorService.prototype._processEqualLines = function (results) {
        return results.filter(function (r) { return r.status === 'equal'; });
    };
    /**
     * Check if an object should be skipped (system tables, etc.)
     * Legacy: isNotMigrateCondition
     */
    /**
     * Specialized trigger comparison (Structural + content)
     * Legacy: handleTriggerComparison
     */
    ComparatorService.prototype.handleTriggerComparison = function (srcEnv, destEnv, srcDbName, destDbName, specificName) {
        return __awaiter(this, void 0, void 0, function () {
            var srcObjects, destObjects, srcTriggers, destTriggers, triggerChanges;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.storageService.getDDLObjects(srcEnv, srcDbName, this.TRIGGERS)];
                    case 1:
                        srcObjects = _a.sent();
                        return [4 /*yield*/, this.storageService.getDDLObjects(destEnv, destDbName, this.TRIGGERS)];
                    case 2:
                        destObjects = _a.sent();
                        return [4 /*yield*/, this.parseTriggerList(srcObjects)];
                    case 3:
                        srcTriggers = _a.sent();
                        return [4 /*yield*/, this.parseTriggerList(destObjects)];
                    case 4:
                        destTriggers = _a.sent();
                        triggerChanges = this.compareTriggerLists(srcTriggers, destTriggers);
                        if (triggerChanges.length > 0) {
                            this.logger.warn("[Compare] Found ".concat(triggerChanges.length, " trigger structural changes/duplicates"));
                        }
                        return [2 /*return*/, triggerChanges];
                }
            });
        });
    };
    ComparatorService.prototype.parseTriggerList = function (objects) {
        return __awaiter(this, void 0, void 0, function () {
            var list, _i, objects_1, obj, parsed;
            return __generator(this, function (_a) {
                list = [];
                for (_i = 0, objects_1 = objects; _i < objects_1.length; _i++) {
                    obj = objects_1[_i];
                    parsed = this.parser.parseTrigger(obj.content || '');
                    if (parsed)
                        list.push(parsed);
                }
                return [2 /*return*/, list];
            });
        });
    };
    ComparatorService.prototype.compareTriggerLists = function (srcTriggers, destTriggers) {
        var triggerChanges = [];
        var duplicateWarnings = [];
        var srcDuplicates = this.findDuplicateTriggers(srcTriggers);
        if (srcDuplicates.length > 0)
            duplicateWarnings.push({ type: 'SOURCE', duplicates: srcDuplicates });
        var destDuplicates = this.findDuplicateTriggers(destTriggers);
        if (destDuplicates.length > 0)
            duplicateWarnings.push({ type: 'DESTINATION', duplicates: destDuplicates });
        var _loop_1 = function (srcTrigger) {
            var destTrigger = destTriggers.find(function (t) { return t.triggerName === srcTrigger.triggerName; });
            if (destTrigger) {
                var diff = this_1.compareTriggers(srcTrigger.triggerName, srcTrigger.definition, destTrigger.definition);
                if (diff) {
                    triggerChanges.push({ triggerName: srcTrigger.triggerName, diff: diff });
                }
            }
        };
        var this_1 = this;
        for (var _i = 0, srcTriggers_1 = srcTriggers; _i < srcTriggers_1.length; _i++) {
            var srcTrigger = srcTriggers_1[_i];
            _loop_1(srcTrigger);
        }
        if (duplicateWarnings.length > 0) {
            this.logDuplicateTriggerWarnings(duplicateWarnings);
        }
        return triggerChanges;
    };
    ComparatorService.prototype.findDuplicateTriggers = function (triggers) {
        var duplicates = [];
        var groups = {};
        for (var _i = 0, triggers_1 = triggers; _i < triggers_1.length; _i++) {
            var trigger = triggers_1[_i];
            var key = "".concat(trigger.tableName, "_").concat(trigger.event, "_").concat(trigger.timing);
            if (!groups[key])
                groups[key] = [];
            groups[key].push(trigger);
        }
        for (var _a = 0, _b = Object.entries(groups); _a < _b.length; _a++) {
            var _c = _b[_a], key = _c[0], list = _c[1];
            if (list.length > 1) {
                var _d = key.split('_'), tableName = _d[0], event_1 = _d[1], timing = _d[2];
                duplicates.push({
                    tableName: tableName,
                    event: event_1,
                    timing: timing,
                    triggers: list.map(function (t) { return t.triggerName; }),
                    count: list.length,
                });
            }
        }
        return duplicates;
    };
    ComparatorService.prototype.logDuplicateTriggerWarnings = function (warnings) {
        for (var _i = 0, warnings_1 = warnings; _i < warnings_1.length; _i++) {
            var warning = warnings_1[_i];
            this.logger.warn("\u26A0\uFE0F DUPLICATE TRIGGERS in ".concat(warning.type, ":"));
            for (var _a = 0, _b = warning.duplicates; _a < _b.length; _a++) {
                var d = _b[_a];
                this.logger.warn("  Table: ".concat(d.tableName, ", Event: ").concat(d.timing, " ").concat(d.event, ", Found: ").concat(d.triggers.join(', ')));
            }
        }
    };
    /**
     * Log word-level diff (Parity with legacy logDiff)
     */
    ComparatorService.prototype.logDiff = function (src, dest) {
        this.logger.info('--- DIFF START ---');
        this.logger.info("Source: ".concat(src.substring(0, 100), "..."));
        this.logger.info("Target: ".concat(dest.substring(0, 100), "..."));
        // In a real terminal we'd use 'diff' or a library. For now, basic logging.
        this.logger.info('--- DIFF END ---');
    };
    ComparatorService.prototype._logDetailedDiff = function (srcEnv, destEnv, type, name, src, dest) {
        this.logger.info("Detailed Diff for ".concat(type, " \"").concat(name, "\" (").concat(srcEnv, " -> ").concat(destEnv, "):"));
        this.logDiff(src, dest);
    };
    /**
     * Filter false-positive changes (Legacy parity)
     */
    ComparatorService.prototype._hasRealChange = function (src, dest, type) {
        var normSrc = this.parser.normalize(this._unescapeHtml(src), { ignoreDefiner: true, ignoreWhitespace: true }).toLowerCase();
        var normDest = this.parser.normalize(this._unescapeHtml(dest), { ignoreDefiner: true, ignoreWhitespace: true }).toLowerCase();
        if (normSrc === normDest)
            return false;
        // For tables, we can do a deeper check via compareTables if needed
        if (type === 'TABLES' || type === 'TABLE') {
            var diff = this.compareTables(src, dest);
            return diff.hasChanges;
        }
        return true;
    };
    /**
     * Compare two arbitrary DDL strings
     */
    ComparatorService.prototype.compareArbitraryDDL = function (srcDDL, destDDL, type) {
        return __awaiter(this, void 0, void 0, function () {
            var detectedType, storageType, tableDiff, alterStatements, diff, isDifferent, result;
            return __generator(this, function (_a) {
                detectedType = type || this.parser.detectObjectType(srcDDL);
                storageType = (detectedType === 'TABLE' ? 'TABLES' :
                    (detectedType === 'UNKNOWN' ? 'SQL' : detectedType + 'S'));
                if (detectedType === 'TABLE') {
                    tableDiff = this.compareTables(srcDDL, destDDL);
                    alterStatements = tableDiff.hasChanges ? this.migrator.generateTableAlterSQL(tableDiff) : [];
                    if (!tableDiff.hasChanges && srcDDL.trim() !== destDDL.trim()) {
                        alterStatements.push(srcDDL);
                    }
                    else if (tableDiff.hasChanges && alterStatements.length === 0) {
                        alterStatements.push(srcDDL);
                    }
                    return [2 /*return*/, {
                            name: tableDiff.tableName || 'arbitrary',
                            status: tableDiff.hasChanges ? 'different' : (srcDDL.trim() !== destDDL.trim() ? 'different' : 'equal'),
                            type: 'TABLES',
                            alterStatements: alterStatements,
                            diff: { source: srcDDL, target: destDDL }
                        }];
                }
                diff = (detectedType === 'TRIGGER')
                    ? this.compareTriggers('arbitrary', srcDDL, destDDL)
                    : this.compareGenericDDL(detectedType, 'arbitrary', srcDDL, destDDL);
                isDifferent = diff !== null || (srcDDL.trim() !== destDDL.trim() && detectedType === 'UNKNOWN');
                result = {
                    name: diff ? diff.name : 'arbitrary',
                    status: isDifferent ? 'different' : (srcDDL && destDDL ? 'equal' : (!srcDDL && !destDDL ? 'missing' : (srcDDL ? 'missing_in_target' : 'missing_in_source'))),
                    type: storageType,
                    ddl: diff ? this.migrator.generateObjectSQL(diff) : (isDifferent ? [srcDDL] : []),
                    alterStatements: diff ? this.migrator.generateObjectSQL(diff) : (isDifferent ? [srcDDL] : []),
                    diff: { source: srcDDL || null, target: destDDL || null }
                };
                return [2 /*return*/, result];
            });
        });
    };
    /**
     * Compare two specific objects from storage, possibly with different names/envs
     */
    ComparatorService.prototype.compareCustomSelection = function (src, dest) {
        return __awaiter(this, void 0, void 0, function () {
            var srcDDL, destDDL, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.storageService.getDDL(src.env, src.db, src.type, src.name)];
                    case 1:
                        srcDDL = _a.sent();
                        return [4 /*yield*/, this.storageService.getDDL(dest.env, dest.db, dest.type, dest.name)];
                    case 2:
                        destDDL = _a.sent();
                        return [4 /*yield*/, this.compareArbitraryDDL(srcDDL, destDDL, src.type.replace(/S$/, ''))];
                    case 3:
                        result = _a.sent();
                        // Override name to be more descriptive for custom selection
                        result.name = "".concat(src.name, " vs ").concat(dest.name);
                        return [2 /*return*/, result];
                }
            });
        });
    };
    /**
     * Report table structure changes (Legacy parity)
     */
    ComparatorService.prototype.reportTableStructureChange = function (envName, tables, specificName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // This in legacy generates the alter-columns.list and alter-indexes.list
                // In Framework, we return this as part of the compare result.
                this.logger.info("Reporting structure changes for ".concat(envName, "..."));
                return [2 /*return*/];
            });
        });
    };
    /**
     * setupMigrationFolder (Legacy parity)
     */
    ComparatorService.prototype.setupMigrationFolder = function (srcEnv, destEnv, dbName) {
        var folder = "map-migrate/".concat(srcEnv, "-to-").concat(destEnv, "/").concat(dbName);
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }
        return folder;
    };
    ComparatorService.prototype.isSkipObject = function (name) {
        var skipList = ['information_schema', 'performance_schema', 'mysql', 'sys'];
        return skipList.includes(name.toLowerCase());
    };
    return ComparatorService;
}());
exports.ComparatorService = ComparatorService;
var fs = __importStar(require("fs"));
