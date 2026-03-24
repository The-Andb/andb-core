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
exports.ImpactAnalysisService = void 0;
var getLogger = require('andb-logger').getLogger;
var node_sql_parser_1 = require("node-sql-parser");
var schema_interface_1 = require("../../common/interfaces/schema.interface");
var ImpactAnalysisService = /** @class */ (function () {
    function ImpactAnalysisService() {
        this.logger = getLogger({ logName: 'ImpactAnalysisService' });
        this.parser = new node_sql_parser_1.Parser();
    }
    /**
     * Deeply analyze a list of SQL statements to determine safety and impact summary
     */
    ImpactAnalysisService.prototype.analyze = function (statements_1) {
        return __awaiter(this, arguments, void 0, function (statements, dialect, context) {
            var report, impact, tablesSet, _i, statements_2, sql, ast, asts, _a, asts_1, singleAst, risk, fallbackRisk;
            if (dialect === void 0) { dialect = 'mysql'; }
            if (context === void 0) { context = {}; }
            return __generator(this, function (_b) {
                report = {
                    level: schema_interface_1.SafetyLevel.SAFE,
                    summary: {
                        safe: [],
                        warning: [],
                        critical: [],
                    },
                    hasDestructive: false,
                };
                impact = {
                    tablesAffected: [],
                    columnsAdded: 0,
                    columnsDropped: 0,
                    indexesCreated: 0,
                    indexesDropped: 0,
                    destructiveOps: 0,
                    rebuildRisk: false,
                };
                tablesSet = new Set();
                for (_i = 0, statements_2 = statements; _i < statements_2.length; _i++) {
                    sql = statements_2[_i];
                    if (!sql || sql.trim() === '')
                        continue;
                    try {
                        ast = this.parser.astify(sql, { database: dialect === 'postgres' ? 'Postgresql' : 'MySQL' });
                        asts = Array.isArray(ast) ? ast : [ast];
                        for (_a = 0, asts_1 = asts; _a < asts_1.length; _a++) {
                            singleAst = asts_1[_a];
                            risk = this.detectRisk(singleAst);
                            this.updateReport(report, risk, sql);
                            this.updateImpact(impact, singleAst, tablesSet);
                        }
                    }
                    catch (err) {
                        this.logger.warn("Failed to parse SQL for impact analysis: ".concat(err.message, ". SQL snippet: ").concat(sql.substring(0, 50), "..."));
                        fallbackRisk = this.fallbackRiskCheck(sql);
                        this.updateReport(report, fallbackRisk, sql);
                    }
                }
                impact.tablesAffected = Array.from(tablesSet);
                report.hasDestructive = report.level === schema_interface_1.SafetyLevel.CRITICAL;
                return [2 /*return*/, __assign(__assign({}, report), { impact: impact })];
            });
        });
    };
    ImpactAnalysisService.prototype.detectRisk = function (ast) {
        var _a, _b;
        var type = (_a = ast.type) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        // 1. Destructive Operations (CRITICAL)
        if (type === 'drop' || type === 'truncate') {
            return schema_interface_1.SafetyLevel.CRITICAL;
        }
        if (type === 'delete' && !ast.where) {
            return schema_interface_1.SafetyLevel.CRITICAL; // DELETE without WHERE is deadly
        }
        if (type === 'alter') {
            var actions = Array.isArray(ast.expr) ? ast.expr : [ast.expr];
            for (var _i = 0, actions_1 = actions; _i < actions_1.length; _i++) {
                var action = actions_1[_i];
                // DROP column/index
                if (action.action === 'drop') {
                    return schema_interface_1.SafetyLevel.CRITICAL;
                }
                // MODIFY/CHANGE column - DBA Knowledge Layer
                if (action.action === 'modify' || action.action === 'change') {
                    // Rule: Narrowing Varchar is destructive (can truncate data)
                    // Rule: Changing data types is high risk (rebuild + lock)
                    return schema_interface_1.SafetyLevel.WARNING;
                }
                // ADD PRIMARY KEY or CONSTRAINT - Very high risk on large tables
                if (action.action === 'add' && (action.resource === 'primary key' || (action.resource === 'constraint' && ((_b = action.create_definitions) === null || _b === void 0 ? void 0 : _b.constraint_type) === 'primary key'))) {
                    return schema_interface_1.SafetyLevel.CRITICAL;
                }
                // DROP PRIMARY KEY
                if (action.action === 'drop' && (action.resource === 'primary key' || action.resource === 'constraint')) {
                    return schema_interface_1.SafetyLevel.CRITICAL;
                }
            }
        }
        // 2. High Impact / Structural Changes (WARNING)
        if (type === 'create' && ast.keyword === 'index') {
            return schema_interface_1.SafetyLevel.WARNING; // Index creation on large tables can be risky
        }
        if (type === 'create' && ast.keyword === 'table') {
            return schema_interface_1.SafetyLevel.SAFE;
        }
        // 3. Defaults to SAFE
        return schema_interface_1.SafetyLevel.SAFE;
    };
    ImpactAnalysisService.prototype.updateReport = function (report, risk, sql) {
        if (risk === schema_interface_1.SafetyLevel.CRITICAL) {
            report.summary.critical.push(sql);
            report.level = schema_interface_1.SafetyLevel.CRITICAL;
        }
        else if (risk === schema_interface_1.SafetyLevel.WARNING) {
            report.summary.warning.push(sql);
            if (report.level !== schema_interface_1.SafetyLevel.CRITICAL) {
                report.level = schema_interface_1.SafetyLevel.WARNING;
            }
        }
        else {
            report.summary.safe.push(sql);
        }
    };
    ImpactAnalysisService.prototype.updateImpact = function (impact, ast, tablesSet) {
        var _a;
        var type = (_a = ast.type) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        // Table Tracking
        if (ast.table && Array.isArray(ast.table)) {
            ast.table.forEach(function (t) {
                if (typeof t === 'string')
                    tablesSet.add(t);
                else if (t.table)
                    tablesSet.add(t.table);
            });
        }
        else if (ast.table) {
            if (typeof ast.table === 'string')
                tablesSet.add(ast.table);
            else if (ast.table.table)
                tablesSet.add(ast.table.table);
        }
        // Operation Summarization
        if (type === 'alter') {
            var actions = Array.isArray(ast.expr) ? ast.expr : [ast.expr];
            for (var _i = 0, actions_2 = actions; _i < actions_2.length; _i++) {
                var action = actions_2[_i];
                if (action.action === 'add') {
                    if (action.resource === 'column')
                        impact.columnsAdded++;
                    if (action.resource === 'index')
                        impact.indexesCreated++;
                }
                else if (action.action === 'change' || action.action === 'modify') {
                    impact.rebuildRisk = true;
                }
                else if (action.action === 'drop') {
                    if (action.resource === 'column') {
                        impact.columnsDropped++;
                        impact.destructiveOps++;
                    }
                    if (action.resource === 'index')
                        impact.indexesDropped++;
                }
            }
        }
        if (type === 'create' && ast.keyword === 'index') {
            impact.indexesCreated++;
        }
        if (type === 'drop') {
            impact.destructiveOps++;
        }
    };
    ImpactAnalysisService.prototype.fallbackRiskCheck = function (sql) {
        var upper = sql.toUpperCase();
        if (upper.includes('DROP ') || upper.includes('TRUNCATE '))
            return schema_interface_1.SafetyLevel.CRITICAL;
        if (upper.includes('DELETE ') && !upper.includes('WHERE'))
            return schema_interface_1.SafetyLevel.CRITICAL;
        if (upper.includes('ALTER ') && (upper.includes(' DROP ') || upper.includes(' MODIFY ') || upper.includes(' CHANGE ')))
            return schema_interface_1.SafetyLevel.WARNING;
        return schema_interface_1.SafetyLevel.SAFE;
    };
    return ImpactAnalysisService;
}());
exports.ImpactAnalysisService = ImpactAnalysisService;
