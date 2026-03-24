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
exports.MigratorService = void 0;
var schema_interface_1 = require("../../common/interfaces/schema.interface");
var impact_analysis_service_1 = require("../safety/impact-analysis.service");
var MigratorService = /** @class */ (function () {
    function MigratorService(impactAnalysis) {
        if (impactAnalysis === void 0) { impactAnalysis = new impact_analysis_service_1.ImpactAnalysisService(); }
        this.impactAnalysis = impactAnalysis;
    }
    MigratorService.prototype.generateAlterSQL = function (diff, migrator) {
        return migrator.generateTableAlterSQL(diff);
    };
    MigratorService.prototype.generateObjectSQL = function (obj, migrator) {
        return migrator.generateObjectSQL(obj);
    };
    MigratorService.prototype.generateSchemaSQL = function (schemaDiff, migrator) {
        var allStatements = [];
        // 1. Drop Objects (Views, Procedures, etc.) - To avoid dependency issues if replaced
        // and Tables (Dropped)
        for (var _i = 0, _a = schemaDiff.droppedTables; _i < _a.length; _i++) {
            var tableName = _a[_i];
            // TODO: Dialect quoting should be handled by the Migrator as well eventually
            allStatements.push("DROP TABLE IF EXISTS `".concat(tableName, "`;"));
        }
        var dropOperations = schemaDiff.objects.filter(function (obj) { return obj.operation === 'DROP'; });
        for (var _b = 0, dropOperations_1 = dropOperations; _b < dropOperations_1.length; _b++) {
            var obj = dropOperations_1[_b];
            allStatements.push.apply(allStatements, migrator.generateObjectSQL(obj));
        }
        // 2. Table Alters
        for (var tableName in schemaDiff.tables) {
            var tableDiff = schemaDiff.tables[tableName];
            allStatements.push.apply(allStatements, migrator.generateTableAlterSQL(tableDiff));
        }
        // 3. Create/Replace Objects
        var createReplaceOperations = schemaDiff.objects.filter(function (obj) { return obj.operation !== 'DROP'; });
        for (var _c = 0, createReplaceOperations_1 = createReplaceOperations; _c < createReplaceOperations_1.length; _c++) {
            var obj = createReplaceOperations_1[_c];
            allStatements.push.apply(allStatements, migrator.generateObjectSQL(obj));
        }
        return allStatements;
    };
    /**
     * Determine the safety level of a statement using AST analysis
     */
    MigratorService.prototype.getSafetyLevel = function (sql) {
        // Note: This is now a synchronous-looking wrapper for backward compatibility
        // In a real high-performance app, we should use the async 'analyze' method
        // For now, we'll implement a simplified logic or use the service's fallback if needed
        // But ideally, the caller should use getSafetyReport(statements) which is more accurate.
        var upper = sql.trim().toUpperCase();
        if (upper.startsWith('DROP TABLE') || upper.startsWith('TRUNCATE') || upper.includes('DROP COLUMN')) {
            return schema_interface_1.SafetyLevel.CRITICAL;
        }
        if (upper.includes('MODIFY') || upper.includes('CHANGE')) {
            return schema_interface_1.SafetyLevel.WARNING;
        }
        return schema_interface_1.SafetyLevel.SAFE;
    };
    /**
     * Check if a statement is potentially destructive
     */
    MigratorService.prototype.isDestructive = function (sql) {
        return this.getSafetyLevel(sql) !== schema_interface_1.SafetyLevel.SAFE;
    };
    /**
     * Enforce safety guards
     */
    MigratorService.prototype.checkSafety = function (statements, force) {
        if (force === void 0) { force = false; }
        if (force)
            return;
        for (var _i = 0, statements_1 = statements; _i < statements_1.length; _i++) {
            var sql = statements_1[_i];
            if (this.isDestructive(sql)) {
                throw new Error("Safety Guard: Destructive operation detected: \"".concat(sql.substring(0, 50), "...\". ") +
                    "Use \"force: true\" to bypass this protection.");
            }
        }
    };
    MigratorService.prototype.disableForeignKeyChecks = function () {
        return 'SET FOREIGN_KEY_CHECKS = 0;';
    };
    MigratorService.prototype.enableForeignKeyChecks = function () {
        return 'SET FOREIGN_KEY_CHECKS = 1;';
    };
    MigratorService.prototype.isNotMigrateCondition = function (name) {
        var n = name.toLowerCase();
        if (n.includes('ote_') || n.startsWith('pt_') || n.includes('test'))
            return true;
        return false;
    };
    /**
     * Summarize migration statements for safety reporting
     */
    MigratorService.prototype.summarizeMigration = function (statements) {
        var summary = { safe: [], destructive: [] };
        for (var _i = 0, statements_2 = statements; _i < statements_2.length; _i++) {
            var sql = statements_2[_i];
            if (this.isDestructive(sql)) {
                summary.destructive.push(sql);
            }
            else {
                summary.safe.push(sql);
            }
        }
        return summary;
    };
    /**
     * Get a structured safety report for the UI using the deep AST analysis service
     */
    MigratorService.prototype.getSafetyReport = function (statements_3) {
        return __awaiter(this, arguments, void 0, function (statements, dialect) {
            if (dialect === void 0) { dialect = 'mysql'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.impactAnalysis.analyze(statements, dialect)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Validate if the migration can proceed based on environment and safety rules
     */
    MigratorService.prototype.validateMigration = function (destEnv, safetyReport, options) {
        if (options === void 0) { options = {}; }
        var isProd = this.isProduction(destEnv);
        if (isProd && safetyReport.level === schema_interface_1.SafetyLevel.CRITICAL && !options.force) {
            throw new Error("CRITICAL SAFETY: You are attempting to run CRITICAL operations on PRODUCTION (".concat(destEnv, "). ") +
                "This requires \"force: true\" or disabling Safe Mode. Statements: ".concat(safetyReport.summary.critical.length));
        }
        if (isProd && safetyReport.level === schema_interface_1.SafetyLevel.WARNING && !options.force) {
            // In prod, we could also warn about warnings, but for now we block CRITICAL strictly.
            // Maybe we just log it.
        }
    };
    /**
     * Heuristic to determine if an environment is production
     */
    MigratorService.prototype.isProduction = function (env) {
        var e = env.toLowerCase();
        return e.includes('prod') || e.includes('production') || e.includes('live') || e.includes('main');
    };
    return MigratorService;
}());
exports.MigratorService = MigratorService;
