"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Container = void 0;
var Database = __importStar(require("better-sqlite3"));
// SQLite Additions for Dogfooding
var sqlite_driver_1 = require("./modules/driver/sqlite/sqlite.driver");
// Services
var storage_service_1 = require("./modules/storage/storage.service");
var project_config_service_1 = require("./modules/config/project-config.service");
var yaml_importer_service_1 = require("./modules/config/yaml-importer.service");
var parser_service_1 = require("./modules/parser/parser.service");
var schema_template_1 = require("./modules/storage/schema_template");
var driver_factory_service_1 = require("./modules/driver/driver-factory.service");
var comparator_service_1 = require("./modules/comparator/comparator.service");
var semantic_diff_service_1 = require("./modules/comparator/semantic-diff.service");
var migrator_service_1 = require("./modules/migrator/migrator.service");
var exporter_service_1 = require("./modules/exporter/exporter.service");
var schema_mirror_service_1 = require("./modules/exporter/schema-mirror.service");
var reporter_service_1 = require("./modules/reporter/reporter.service");
var git_orchestrator_service_1 = require("./modules/orchestration/git-orchestrator.service");
var impact_analysis_service_1 = require("./modules/safety/impact-analysis.service");
var security_orchestrator_service_1 = require("./modules/orchestration/security-orchestrator.service");
var schema_orchestrator_service_1 = require("./modules/orchestration/schema-orchestrator.service");
var orchestration_service_1 = require("./modules/orchestration/orchestration.service");
var feature_config_1 = require("./modules/config/feature.config");
var dependency_search_service_1 = require("./modules/search/dependency-search.service");
/**
 * Lightweight DI Container — replaces Framework AppModule + NestFactory.
 * All wiring is explicit. No decorators, no reflection, no magic.
 */
var Container = /** @class */ (function () {
    function Container() {
        // Migration report from last boot (null = no changes)
        this.lastMigrationReport = null;
        this.storage = new storage_service_1.StorageService();
        this.config = new project_config_service_1.ProjectConfigService();
        this.parser = new parser_service_1.ParserService();
        this.impactAnalysis = new impact_analysis_service_1.ImpactAnalysisService();
        this.migrator = new migrator_service_1.MigratorService(this.impactAnalysis);
        this.reporter = new reporter_service_1.ReporterService();
        // 2. Services with deps
        this.driverFactory = new driver_factory_service_1.DriverFactoryService(this.parser);
        this.comparator = new comparator_service_1.ComparatorService(this.parser, this.storage, this.config);
        this.semanticDiff = new semantic_diff_service_1.SemanticDiffService();
        this.exporter = new exporter_service_1.ExporterService(this.driverFactory, this.config, this.parser, this.storage);
        this.mirror = new schema_mirror_service_1.SchemaMirrorService(this.storage);
        this.dependencySearch = new dependency_search_service_1.DependencySearchService();
        // 3. Orchestrators
        this.gitOrchestrator = new git_orchestrator_service_1.GitOrchestrator(this.mirror);
        this.securityOrchestrator = new security_orchestrator_service_1.SecurityOrchestrator(this.config, this.driverFactory);
        this.schemaOrchestrator = new schema_orchestrator_service_1.SchemaOrchestrator(this.config, this.storage, this.driverFactory, this.comparator, this.exporter, this.migrator, this.semanticDiff, this.gitOrchestrator, this.dependencySearch, this.parser);
        // 4. Root orchestrator
        this.orchestrator = new orchestration_service_1.OrchestrationService(this.config, feature_config_1.featureConfig, this.securityOrchestrator, this.gitOrchestrator, this.schemaOrchestrator, this.parser);
    }
    /**
     * Async initialization of services (like storage)
     */
    Container.prototype.init = function (strategy, dbPath, projectBaseDir) {
        return __awaiter(this, void 0, void 0, function () {
            var finalDbPath, _a, e_1, importer;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!strategy) {
                            throw new Error('Container.init(): ICoreStorageStrategy is required.');
                        }
                        finalDbPath = dbPath;
                        return [4 /*yield*/, this.storage.initialize(strategy, finalDbPath, projectBaseDir)];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        _a = this;
                        return [4 /*yield*/, this.runDogfoodMigration(finalDbPath)];
                    case 3:
                        _a.lastMigrationReport = _b.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_1 = _b.sent();
                        console.error("[Dogfooding] Internal Migration Failed: ".concat(e_1.message));
                        return [3 /*break*/, 5];
                    case 5:
                        importer = new yaml_importer_service_1.YamlImporterService(this.storage);
                        return [4 /*yield*/, importer.runImportIfNecessary()];
                    case 6:
                        _b.sent();
                        // Rehydrate synchronous accessors for CLI configurations
                        return [4 /*yield*/, this.config.init(this.storage)];
                    case 7:
                        // Rehydrate synchronous accessors for CLI configurations
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Container.prototype.runDogfoodMigration = function (targetDbPath) {
        return __awaiter(this, void 0, void 0, function () {
            var memDb, srcDriver, destDriver, srcIntro, destIntro, migrator, expectedTables, actualTables, changes, _i, expectedTables_1, table, srcDdl, colNames, destDdl, diff, stmts, details, _a, stmts_1, sql;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        memDb = new Database(':memory:');
                        memDb.exec(schema_template_1.schemaTemplateSql);
                        srcDriver = new sqlite_driver_1.SqliteDbDriver({ host: ':memory:' });
                        // Hack: manually set db connection for the memory db so it doesn't try to open disk file again
                        srcDriver.db = memDb;
                        destDriver = new sqlite_driver_1.SqliteDbDriver({ host: targetDbPath });
                        return [4 /*yield*/, destDriver.connect()];
                    case 1:
                        _b.sent();
                        srcIntro = srcDriver.getIntrospectionService();
                        destIntro = destDriver.getIntrospectionService();
                        migrator = destDriver.getMigrator();
                        return [4 /*yield*/, srcIntro.listTables('default')];
                    case 2:
                        expectedTables = _b.sent();
                        return [4 /*yield*/, destIntro.listTables('default')];
                    case 3:
                        actualTables = _b.sent();
                        changes = [];
                        _i = 0, expectedTables_1 = expectedTables;
                        _b.label = 4;
                    case 4:
                        if (!(_i < expectedTables_1.length)) return [3 /*break*/, 15];
                        table = expectedTables_1[_i];
                        return [4 /*yield*/, srcIntro.getTableDDL('default', table)];
                    case 5:
                        srcDdl = _b.sent();
                        if (!!actualTables.includes(table)) return [3 /*break*/, 7];
                        // Missing entirely -> Execute CREATE statement verbatim
                        console.log("[Dogfooding] Creating missing table: ".concat(table));
                        return [4 /*yield*/, destDriver.query(srcDdl)];
                    case 6:
                        _b.sent();
                        colNames = this.extractColumnNames(srcDdl);
                        changes.push({
                            action: 'CREATED',
                            table: table,
                            details: colNames.length > 0
                                ? ["New table with ".concat(colNames.length, " columns: ").concat(colNames.join(', '))]
                                : ['New table created']
                        });
                        return [3 /*break*/, 14];
                    case 7: return [4 /*yield*/, destIntro.getTableDDL('default', table)];
                    case 8:
                        destDdl = _b.sent();
                        diff = this.comparator.compareTables(srcDdl, destDdl);
                        if (!diff.hasChanges) return [3 /*break*/, 14];
                        console.log("[Dogfooding] Migrating table: ".concat(table));
                        stmts = migrator.generateTableAlterSQL(diff);
                        details = [];
                        _a = 0, stmts_1 = stmts;
                        _b.label = 9;
                    case 9:
                        if (!(_a < stmts_1.length)) return [3 /*break*/, 13];
                        sql = stmts_1[_a];
                        if (!sql.startsWith('-- WARNING')) return [3 /*break*/, 10];
                        console.warn("[Dogfooding] ".concat(sql));
                        details.push(sql.replace('-- WARNING: ', '⚠️ '));
                        return [3 /*break*/, 12];
                    case 10: return [4 /*yield*/, destDriver.query(sql)];
                    case 11:
                        _b.sent();
                        details.push(this.humanizeAlterSQL(sql));
                        _b.label = 12;
                    case 12:
                        _a++;
                        return [3 /*break*/, 9];
                    case 13:
                        changes.push({ action: 'MODIFIED', table: table, details: details });
                        _b.label = 14;
                    case 14:
                        _i++;
                        return [3 /*break*/, 4];
                    case 15:
                        if (changes.length > 0) {
                            console.log("[Dogfooding] Core database migrated: ".concat(changes.length, " table(s) affected."));
                        }
                        return [4 /*yield*/, destDriver.disconnect()];
                    case 16:
                        _b.sent();
                        if (changes.length === 0)
                            return [2 /*return*/, null];
                        return [2 /*return*/, {
                                toVersion: 'latest',
                                changes: changes,
                                timestamp: new Date().toISOString()
                            }];
                }
            });
        });
    };
    /**
     * Extract column names from a CREATE TABLE DDL for reporting.
     */
    Container.prototype.extractColumnNames = function (ddl) {
        var match = ddl.match(/\(([\s\S]+)\)/);
        if (!match)
            return [];
        var body = match[1];
        var columns = [];
        for (var _i = 0, _a = body.split(','); _i < _a.length; _i++) {
            var line = _a[_i];
            var trimmed = line.trim();
            // Skip constraints (PRIMARY KEY, UNIQUE, FOREIGN KEY, CHECK)
            if (/^(PRIMARY|UNIQUE|FOREIGN|CHECK|CONSTRAINT)/i.test(trimmed))
                continue;
            var colMatch = trimmed.match(/^[`"']?(\w+)[`"']?/);
            if (colMatch)
                columns.push(colMatch[1]);
        }
        return columns;
    };
    /**
     * Convert ALTER TABLE SQL to a human-readable string for the changelog.
     */
    Container.prototype.humanizeAlterSQL = function (sql) {
        var addCol = sql.match(/ALTER TABLE\s+[`"']?(\w+)[`"']?\s+ADD\s+(?:COLUMN\s+)?[`"']?(\w+)[`"']?/i);
        if (addCol)
            return "Added column `".concat(addCol[2], "`");
        var dropCol = sql.match(/ALTER TABLE\s+[`"']?(\w+)[`"']?\s+DROP\s+(?:COLUMN\s+)?[`"']?(\w+)[`"']?/i);
        if (dropCol)
            return "Removed column `".concat(dropCol[2], "`");
        var modCol = sql.match(/ALTER TABLE\s+[`"']?(\w+)[`"']?\s+(?:MODIFY|ALTER)\s+(?:COLUMN\s+)?[`"']?(\w+)[`"']?/i);
        if (modCol)
            return "Modified column `".concat(modCol[2], "`");
        var rename = sql.match(/ALTER TABLE\s+[`"']?(\w+)[`"']?\s+RENAME/i);
        if (rename)
            return "Renamed table structure";
        // Fallback: show truncated SQL
        return sql.length > 80 ? sql.substring(0, 77) + '...' : sql;
    };
    /**
     * Create or retrieve singleton container
     */
    Container.create = function (strategy, dbPath, projectBaseDir) {
        return __awaiter(this, void 0, void 0, function () {
            var container;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.instance)
                            return [2 /*return*/, this.instance];
                        container = new Container();
                        return [4 /*yield*/, container.init(strategy, dbPath, projectBaseDir)];
                    case 1:
                        _a.sent();
                        this.instance = container;
                        return [2 /*return*/, this.instance];
                }
            });
        });
    };
    /**
     * Reset container (for testing)
     */
    Container.reset = function () {
        if (this.instance) {
            this.instance.storage.close();
            this.instance = null;
        }
    };
    /**
     * Destroy and cleanup
     */
    Container.prototype.destroy = function () {
        this.storage.close();
        Container.instance = null;
    };
    Container.instance = null;
    return Container;
}());
exports.Container = Container;
