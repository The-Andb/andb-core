"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticDiffService = void 0;
var node_sql_parser_1 = require("node-sql-parser");
var SemanticDiffService = /** @class */ (function () {
    function SemanticDiffService() {
        this.parser = new node_sql_parser_1.Parser();
    }
    /**
     * Compare two DDL strings (Source vs Target) and return a semantic report
     */
    SemanticDiffService.prototype.compare = function (sourceDDL_1, targetDDL_1) {
        return __awaiter(this, arguments, void 0, function (sourceDDL, targetDDL, dialect) {
            var report, sourceAst, targetAst, sourceTable, targetTable, tableName_1, diff;
            var _a;
            if (dialect === void 0) { dialect = 'mysql'; }
            return __generator(this, function (_b) {
                report = {
                    tables: {},
                    summary: [],
                };
                try {
                    sourceAst = this.parser.astify(sourceDDL, { database: dialect });
                    targetAst = this.parser.astify(targetDDL, { database: dialect });
                    sourceTable = Array.isArray(sourceAst) ? sourceAst[0] : sourceAst;
                    targetTable = Array.isArray(targetAst) ? targetAst[0] : targetAst;
                    if (sourceTable && targetTable && sourceTable.type === 'create' && targetTable.type === 'create') {
                        tableName_1 = this.getTableName(sourceTable);
                        diff = this.compareTableAst(sourceTable, targetTable);
                        if (diff.changes.length > 0) {
                            report.tables[tableName_1] = diff;
                            (_a = report.summary).push.apply(_a, diff.changes.map(function (c) { return "Table '".concat(tableName_1, "': ").concat(c.description); }));
                        }
                    }
                }
                catch (err) {
                    report.summary.push("Semantic analysis failed: ".concat(err.message));
                }
                return [2 /*return*/, report];
            });
        });
    };
    SemanticDiffService.prototype.compareTableAst = function (source, target) {
        var tableName = this.getTableName(source);
        var diff = {
            name: tableName,
            type: 'TABLE',
            changes: [],
        };
        var sourceCols = this.extractColumns(source);
        var targetCols = this.extractColumns(target);
        // 1. Column Diffs
        for (var _i = 0, _a = Object.entries(sourceCols); _i < _a.length; _i++) {
            var _b = _a[_i], colName = _b[0], sourceCol = _b[1];
            var targetCol = targetCols[colName];
            if (targetCol) {
                this.diffColumns(sourceCol, targetCol, diff.changes);
            }
        }
        return diff;
    };
    SemanticDiffService.prototype.extractColumns = function (ast) {
        var cols = {};
        if (!ast.create_definitions)
            return cols;
        for (var _i = 0, _a = ast.create_definitions; _i < _a.length; _i++) {
            var def = _a[_i];
            if (def.resource === 'column') {
                cols[def.column.column] = def;
            }
        }
        return cols;
    };
    SemanticDiffService.prototype.diffColumns = function (source, target, changes) {
        var _a, _b, _c, _d, _e, _f;
        var colName = source.column.column;
        // Type Change
        var sourceType = this.formatType(source.definition);
        var targetType = this.formatType(target.definition);
        if (sourceType !== targetType) {
            changes.push({
                type: 'DATATYPE_CHANGE',
                property: 'type',
                oldValue: sourceType,
                newValue: targetType,
                description: "Column '".concat(colName, "' type changed: ").concat(sourceType, " -> ").concat(targetType),
            });
        }
        // Nullability
        var sourceNull = ((_a = source.nullable) === null || _a === void 0 ? void 0 : _a.value) !== 'not null';
        var targetNull = ((_b = target.nullable) === null || _b === void 0 ? void 0 : _b.value) !== 'not null';
        if (sourceNull !== targetNull) {
            changes.push({
                type: 'NULLABILITY_CHANGE',
                property: 'isNullable',
                oldValue: sourceNull,
                newValue: targetNull,
                description: "Column '".concat(colName, "' nullability changed: ").concat(sourceNull ? 'NULL' : 'NOT NULL', " -> ").concat(targetNull ? 'NULL' : 'NOT NULL'),
            });
        }
        // Default Value
        var sourceDefault = (_d = (_c = source.default_val) === null || _c === void 0 ? void 0 : _c.value) === null || _d === void 0 ? void 0 : _d.value;
        var targetDefault = (_f = (_e = target.default_val) === null || _e === void 0 ? void 0 : _e.value) === null || _f === void 0 ? void 0 : _f.value;
        if (sourceDefault !== targetDefault) {
            changes.push({
                type: 'DEFAULT_VALUE_CHANGE',
                property: 'defaultValue',
                oldValue: sourceDefault,
                newValue: targetDefault,
                description: "Column '".concat(colName, "' default changed: ").concat(sourceDefault !== null && sourceDefault !== void 0 ? sourceDefault : 'NONE', " -> ").concat(targetDefault !== null && targetDefault !== void 0 ? targetDefault : 'NONE'),
            });
        }
    };
    SemanticDiffService.prototype.formatType = function (def) {
        if (!def)
            return 'unknown';
        var type = def.dataType;
        if (def.length)
            type += "(".concat(def.length, ")");
        return type.toUpperCase();
    };
    SemanticDiffService.prototype.getTableName = function (ast) {
        if (!ast.table)
            return 'unknown';
        if (Array.isArray(ast.table)) {
            return ast.table[0].table || 'unknown';
        }
        return ast.table.table || ast.table || 'unknown';
    };
    return SemanticDiffService;
}());
exports.SemanticDiffService = SemanticDiffService;
