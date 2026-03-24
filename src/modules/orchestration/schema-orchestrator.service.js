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
exports.SchemaOrchestrator = void 0;
var getLogger = require('andb-logger').getLogger;
var connection_util_1 = require("../../common/utils/connection.util");
var SchemaOrchestrator = /** @class */ (function () {
    function SchemaOrchestrator(configService, storageService, driverFactory, comparator, exporter, migrator, semanticDiff, gitOrchestrator, dependencySearch, // Using any for now to avoid complex type imports if not readily available
    parser) {
        this.configService = configService;
        this.storageService = storageService;
        this.driverFactory = driverFactory;
        this.comparator = comparator;
        this.exporter = exporter;
        this.migrator = migrator;
        this.semanticDiff = semanticDiff;
        this.gitOrchestrator = gitOrchestrator;
        this.dependencySearch = dependencySearch;
        this.parser = parser;
        this.logger = getLogger({ logName: 'SchemaOrchestrator' });
    }
    SchemaOrchestrator.prototype.exportSchema = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var env, db, _a, name, _b, type, onProgress, gitConfig, result;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        env = payload.env, db = payload.db, _a = payload.name, name = _a === void 0 ? null : _a, _b = payload.type, type = _b === void 0 ? null : _b, onProgress = payload.onProgress, gitConfig = payload.gitConfig;
                        return [4 /*yield*/, this.exporter.exportSchema(env, name, type, onProgress)];
                    case 1:
                        result = _c.sent();
                        if (!(gitConfig === null || gitConfig === void 0 ? void 0 : gitConfig.autoCommit)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.gitOrchestrator.gitSync({
                                config: gitConfig,
                                env: env,
                                db: db || 'default',
                                message: null
                            })];
                    case 2:
                        _c.sent();
                        _c.label = 3;
                    case 3: return [2 /*return*/, result];
                }
            });
        });
    };
    SchemaOrchestrator.prototype.getSchemaObjects = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var connection, type, driver, intro, dbName, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        connection = payload.connection, type = payload.type;
                        return [4 /*yield*/, this.getDriverFromConnection(connection)];
                    case 1:
                        driver = _b.sent();
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, , 16, 18]);
                        return [4 /*yield*/, driver.connect()];
                    case 3:
                        _b.sent();
                        intro = driver.getIntrospectionService();
                        dbName = connection.database || connection.name || 'default';
                        _a = type.toLowerCase();
                        switch (_a) {
                            case 'tables': return [3 /*break*/, 4];
                            case 'views': return [3 /*break*/, 6];
                            case 'procedures': return [3 /*break*/, 8];
                            case 'functions': return [3 /*break*/, 10];
                            case 'triggers': return [3 /*break*/, 12];
                        }
                        return [3 /*break*/, 14];
                    case 4: return [4 /*yield*/, intro.listTables(dbName)];
                    case 5: return [2 /*return*/, _b.sent()];
                    case 6: return [4 /*yield*/, intro.listViews(dbName)];
                    case 7: return [2 /*return*/, _b.sent()];
                    case 8: return [4 /*yield*/, intro.listProcedures(dbName)];
                    case 9: return [2 /*return*/, _b.sent()];
                    case 10: return [4 /*yield*/, intro.listFunctions(dbName)];
                    case 11: return [2 /*return*/, _b.sent()];
                    case 12: return [4 /*yield*/, intro.listTriggers(dbName)];
                    case 13: return [2 /*return*/, _b.sent()];
                    case 14: return [2 /*return*/, []];
                    case 15: return [3 /*break*/, 18];
                    case 16: return [4 /*yield*/, driver.disconnect()];
                    case 17:
                        _b.sent();
                        return [7 /*endfinally*/];
                    case 18: return [2 /*return*/];
                }
            });
        });
    };
    SchemaOrchestrator.prototype.compareSchema = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var srcEnv, destEnv, _a, type, specificName, srcConn, destConn, srcDbName, destDbName, diff, srcDriver, destDriver, srcIntro, destIntro, _b, _c, _d, _i, tableName, tableDiff, srcDDL, destDDL, semantic, err_1;
            var _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        srcEnv = payload.srcEnv, destEnv = payload.destEnv, _a = payload.type, type = _a === void 0 ? 'tables' : _a, specificName = payload.name;
                        srcConn = this.configService.getConnection(srcEnv);
                        destConn = this.configService.getConnection(destEnv);
                        srcDbName = ((_e = srcConn === null || srcConn === void 0 ? void 0 : srcConn.config) === null || _e === void 0 ? void 0 : _e.database) || 'default';
                        destDbName = ((_f = destConn === null || destConn === void 0 ? void 0 : destConn.config) === null || _f === void 0 ? void 0 : _f.database) || 'default';
                        return [4 /*yield*/, this.comparator.compareFromStorage(srcEnv, destEnv, srcDbName, destDbName, type, specificName)];
                    case 1:
                        diff = _g.sent();
                        if (!(type.toUpperCase() === 'TABLES' && diff.tables)) return [3 /*break*/, 17];
                        if (!srcConn || !destConn) {
                            this.logger.warn("Skipping semantic enrichment: Environment config not found for ".concat(!srcConn ? srcEnv : destEnv));
                            return [2 /*return*/, diff];
                        }
                        return [4 /*yield*/, this.driverFactory.create(srcConn.type, srcConn.config)];
                    case 2:
                        srcDriver = _g.sent();
                        return [4 /*yield*/, this.driverFactory.create(destConn.type, destConn.config)];
                    case 3:
                        destDriver = _g.sent();
                        _g.label = 4;
                    case 4:
                        _g.trys.push([4, 13, 14, 17]);
                        return [4 /*yield*/, srcDriver.connect()];
                    case 5:
                        _g.sent();
                        return [4 /*yield*/, destDriver.connect()];
                    case 6:
                        _g.sent();
                        srcIntro = srcDriver.getIntrospectionService();
                        destIntro = destDriver.getIntrospectionService();
                        _b = diff.tables;
                        _c = [];
                        for (_d in _b)
                            _c.push(_d);
                        _i = 0;
                        _g.label = 7;
                    case 7:
                        if (!(_i < _c.length)) return [3 /*break*/, 12];
                        _d = _c[_i];
                        if (!(_d in _b)) return [3 /*break*/, 11];
                        tableName = _d;
                        tableDiff = diff.tables[tableName];
                        if (!tableDiff.hasChanges) return [3 /*break*/, 11];
                        return [4 /*yield*/, srcIntro.getTableDDL(srcDbName, tableName)];
                    case 8:
                        srcDDL = _g.sent();
                        return [4 /*yield*/, destIntro.getTableDDL(destDbName, tableName)];
                    case 9:
                        destDDL = _g.sent();
                        if (!(srcDDL && destDDL)) return [3 /*break*/, 11];
                        return [4 /*yield*/, this.semanticDiff.compare(srcDDL, destDDL)];
                    case 10:
                        semantic = _g.sent();
                        tableDiff.semantic = semantic;
                        _g.label = 11;
                    case 11:
                        _i++;
                        return [3 /*break*/, 7];
                    case 12: return [3 /*break*/, 17];
                    case 13:
                        err_1 = _g.sent();
                        this.logger.warn("Failed to enrich semantic diff: ".concat(err_1.message));
                        return [3 /*break*/, 17];
                    case 14: return [4 /*yield*/, srcDriver.disconnect()];
                    case 15:
                        _g.sent();
                        return [4 /*yield*/, destDriver.disconnect()];
                    case 16:
                        _g.sent();
                        return [7 /*endfinally*/];
                    case 17: return [2 /*return*/, diff];
                }
            });
        });
    };
    SchemaOrchestrator.prototype.semanticCompare = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var srcEnv, destEnv, _a, type, name, srcConn, destConn, srcDriver, destDriver, srcIntro, destIntro, srcDDL, destDDL;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        srcEnv = payload.srcEnv, destEnv = payload.destEnv, _a = payload.type, type = _a === void 0 ? 'TABLE' : _a, name = payload.name;
                        srcConn = this.configService.getConnection(srcEnv);
                        destConn = this.configService.getConnection(destEnv);
                        if (!srcConn || !destConn) {
                            throw new Error("Environment config not found: ".concat(!srcConn ? srcEnv : destEnv));
                        }
                        return [4 /*yield*/, this.driverFactory.create(srcConn.type, srcConn.config)];
                    case 1:
                        srcDriver = _b.sent();
                        return [4 /*yield*/, this.driverFactory.create(destConn.type, destConn.config)];
                    case 2:
                        destDriver = _b.sent();
                        _b.label = 3;
                    case 3:
                        _b.trys.push([3, , 9, 12]);
                        return [4 /*yield*/, srcDriver.connect()];
                    case 4:
                        _b.sent();
                        return [4 /*yield*/, destDriver.connect()];
                    case 5:
                        _b.sent();
                        srcIntro = srcDriver.getIntrospectionService();
                        destIntro = destDriver.getIntrospectionService();
                        return [4 /*yield*/, srcIntro.getObjectDDL(srcConn.config.database || 'default', type, name)];
                    case 6:
                        srcDDL = _b.sent();
                        return [4 /*yield*/, destIntro.getObjectDDL(destConn.config.database || 'default', type, name)];
                    case 7:
                        destDDL = _b.sent();
                        if (!srcDDL || !destDDL) {
                            throw new Error("DDL not found for ".concat(type, " ").concat(name));
                        }
                        return [4 /*yield*/, this.semanticDiff.compare(srcDDL, destDDL)];
                    case 8: return [2 /*return*/, _b.sent()];
                    case 9: return [4 /*yield*/, srcDriver.disconnect()];
                    case 10:
                        _b.sent();
                        return [4 /*yield*/, destDriver.disconnect()];
                    case 11:
                        _b.sent();
                        return [7 /*endfinally*/];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    SchemaOrchestrator.prototype.compareArbitraryDDL = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var srcDDL, destDDL, type;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        srcDDL = payload.srcDDL, destDDL = payload.destDDL, type = payload.type;
                        return [4 /*yield*/, this.comparator.compareArbitraryDDL(srcDDL, destDDL, type)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    SchemaOrchestrator.prototype.compareCustomSelection = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var src, dest;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        src = payload.src, dest = payload.dest;
                        return [4 /*yield*/, this.comparator.compareCustomSelection(src, dest)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    SchemaOrchestrator.prototype.generate = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var srcEnv, destEnv, type, name, srcConn, destConn, srcDbName, destDbName, diffResults, ddlList, itemDiff;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        srcEnv = payload.srcEnv, destEnv = payload.destEnv, type = payload.type, name = payload.name;
                        srcConn = this.configService.getConnection(srcEnv);
                        destConn = this.configService.getConnection(destEnv);
                        if (!destConn)
                            throw new Error("Destination connection ".concat(destEnv, " not found"));
                        srcDbName = ((_a = srcConn === null || srcConn === void 0 ? void 0 : srcConn.config) === null || _a === void 0 ? void 0 : _a.database) || 'default';
                        destDbName = ((_b = destConn.config) === null || _b === void 0 ? void 0 : _b.database) || 'default';
                        return [4 /*yield*/, this.comparator.compareFromStorage(srcEnv, destEnv, srcDbName, destDbName, type, name)];
                    case 1:
                        diffResults = _c.sent();
                        ddlList = [];
                        itemDiff = diffResults.find(function (r) { return r.name === name; });
                        if (itemDiff && itemDiff.alterStatements && itemDiff.alterStatements.length > 0) {
                            return [2 /*return*/, { success: true, data: { sql: itemDiff.alterStatements.join('\n') } }];
                        }
                        return [2 /*return*/, { success: true, data: { sql: '-- No changes detected' } }];
                }
            });
        });
    };
    SchemaOrchestrator.prototype.migrateSchema = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var srcEnv, destEnv, objects, gitConfig, _a, dryRun, destConn, itemsToProcess, safeObjects, srcConn, srcDbName, destDbName, dDestDriver, migratorDriver, _loop_1, this_1, _i, safeObjects_1, obj, allStatements, safetyReport;
            var _this = this;
            var _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        srcEnv = payload.srcEnv, destEnv = payload.destEnv, objects = payload.objects, gitConfig = payload.gitConfig, _a = payload.dryRun, dryRun = _a === void 0 ? false : _a;
                        destConn = this.configService.getConnection(destEnv);
                        if (!destConn) {
                            throw new Error("Connection not found for environment: ".concat(destEnv));
                        }
                        if (destEnv.toLowerCase().endsWith('.sql')) {
                            throw new Error("Migration safety: Cannot execute migration into a static SQL file \"".concat(destEnv, "\"."));
                        }
                        itemsToProcess = objects;
                        // Support single item direct mode from options
                        if (!Array.isArray(itemsToProcess) || itemsToProcess.length === 0) {
                            if (payload.type && payload.name && payload.name !== 'batch') {
                                itemsToProcess = [{ type: payload.type, name: payload.name, status: 'UPDATED' }];
                            }
                            else {
                                this.logger.info('No objects to migrate.');
                                return [2 /*return*/, { success: true, successful: [], failed: [], dryRun: dryRun, safetyLevel: 'safe', totalStatements: 0 }];
                            }
                        }
                        safeObjects = itemsToProcess.filter(function (obj) {
                            return obj.status !== 'DEPRECATED' && obj.status !== 'deprecated' && obj.status !== 'missing_in_source';
                        });
                        if (safeObjects.length === 0) {
                            this.logger.info('All selected objects are DEPRECATED (DROP). Migration skipped by safety rule.');
                            return [2 /*return*/, { success: true, successful: [], failed: [], dryRun: dryRun, safetyLevel: 'safe', totalStatements: 0, skippedDrops: objects.length }];
                        }
                        srcConn = this.configService.getConnection(srcEnv);
                        srcDbName = ((_b = srcConn === null || srcConn === void 0 ? void 0 : srcConn.config) === null || _b === void 0 ? void 0 : _b.database) || 'default';
                        destDbName = ((_c = destConn === null || destConn === void 0 ? void 0 : destConn.config) === null || _c === void 0 ? void 0 : _c.database) || 'default';
                        return [4 /*yield*/, this.driverFactory.create(destConn.type, destConn.config)];
                    case 1:
                        dDestDriver = _d.sent();
                        migratorDriver = dDestDriver.getMigrator();
                        _loop_1 = function (obj) {
                            var diffResults, itemDiff;
                            return __generator(this, function (_e) {
                                switch (_e.label) {
                                    case 0:
                                        if (!!obj.ddl) return [3 /*break*/, 2];
                                        return [4 /*yield*/, this_1.comparator.compareFromStorage(srcEnv, destEnv, srcDbName, destDbName, obj.type, obj.name)];
                                    case 1:
                                        diffResults = _e.sent();
                                        itemDiff = diffResults.find(function (r) { return r.name === obj.name; });
                                        if (itemDiff && itemDiff.alterStatements && itemDiff.alterStatements.length > 0) {
                                            obj.ddl = itemDiff.alterStatements;
                                        }
                                        _e.label = 2;
                                    case 2: return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _i = 0, safeObjects_1 = safeObjects;
                        _d.label = 2;
                    case 2:
                        if (!(_i < safeObjects_1.length)) return [3 /*break*/, 5];
                        obj = safeObjects_1[_i];
                        return [5 /*yield**/, _loop_1(obj)];
                    case 3:
                        _d.sent();
                        _d.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5:
                        allStatements = safeObjects.flatMap(function (obj) {
                            return Array.isArray(obj.ddl) ? obj.ddl : (obj.ddl ? [obj.ddl] : []);
                        });
                        return [4 /*yield*/, this.migrator.getSafetyReport(allStatements)];
                    case 6:
                        safetyReport = _d.sent();
                        // 2. Dry Run Handler
                        if (dryRun) {
                            this.logger.info("\uD83D\uDD0D DRY RUN: Simulating migration for ".concat(safeObjects.length, " objects. Level: ").concat(safetyReport.level));
                            return [2 /*return*/, {
                                    success: true,
                                    dryRun: true,
                                    safetyReport: safetyReport,
                                    totalStatements: allStatements.length,
                                    objects: safeObjects.map(function (obj) { return ({
                                        name: obj.name,
                                        type: obj.type,
                                        status: obj.status,
                                        safetyLevel: _this.migrator.getSafetyLevel(Array.isArray(obj.ddl) ? obj.ddl[0] : obj.ddl)
                                    }); })
                                }];
                        }
                        return [4 /*yield*/, this.performLiveMigration(destEnv, destConn, safeObjects, safetyReport, payload)];
                    case 7: 
                    // 3. Live Migration
                    return [2 /*return*/, _d.sent()];
                }
            });
        });
    };
    SchemaOrchestrator.prototype.performLiveMigration = function (destEnv, destConn, objects, safetyReport, payload) {
        return __awaiter(this, void 0, void 0, function () {
            var impactSummary, gitConfig, _a, force, successful, failed, autoBackup, dbName, destDriver, destIntro, _i, objects_1, obj, statements, _b, statements_1, statement, storageType, isDrop, newDdl, syncErr_1, err_2;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        impactSummary = safetyReport.summary;
                        gitConfig = payload.gitConfig, _a = payload.force, force = _a === void 0 ? false : _a;
                        successful = [];
                        failed = [];
                        autoBackup = this.configService.getAutoBackup();
                        dbName = destConn.config.database || 'default';
                        return [4 /*yield*/, this.driverFactory.create(destConn.type, destConn.config)];
                    case 1:
                        destDriver = _c.sent();
                        _c.label = 2;
                    case 2:
                        _c.trys.push([2, , 27, 29]);
                        return [4 /*yield*/, destDriver.connect()];
                    case 3:
                        _c.sent();
                        destIntro = destDriver.getIntrospectionService();
                        // Final pre-flight validation
                        this.migrator.validateMigration(destEnv, safetyReport, { force: force });
                        return [4 /*yield*/, destDriver.query(this.migrator.disableForeignKeyChecks())];
                    case 4:
                        _c.sent();
                        _i = 0, objects_1 = objects;
                        _c.label = 5;
                    case 5:
                        if (!(_i < objects_1.length)) return [3 /*break*/, 23];
                        obj = objects_1[_i];
                        if (this.migrator.isNotMigrateCondition(obj.name)) {
                            this.logger.info("Skipping restricted object: ".concat(obj.name));
                            return [3 /*break*/, 22];
                        }
                        statements = Array.isArray(obj.ddl) ? obj.ddl : [obj.ddl];
                        // Individual safety check per object if needed, though global validation already ran
                        this.migrator.checkSafety(statements, force);
                        if (!(autoBackup && this.requiresBackup(obj.status))) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.handleObjectBackup(destEnv, dbName, obj, destIntro)];
                    case 6:
                        _c.sent();
                        _c.label = 7;
                    case 7:
                        _c.trys.push([7, 21, , 22]);
                        _b = 0, statements_1 = statements;
                        _c.label = 8;
                    case 8:
                        if (!(_b < statements_1.length)) return [3 /*break*/, 11];
                        statement = statements_1[_b];
                        if (!statement) return [3 /*break*/, 10];
                        return [4 /*yield*/, destDriver.query(statement)];
                    case 9:
                        _c.sent();
                        _c.label = 10;
                    case 10:
                        _b++;
                        return [3 /*break*/, 8];
                    case 11:
                        successful.push(obj);
                        _c.label = 12;
                    case 12:
                        _c.trys.push([12, 19, , 20]);
                        storageType = obj.type.toUpperCase();
                        isDrop = obj.status === 'DEPRECATED' || obj.status === 'deprecated' || obj.status === 'missing_in_source';
                        if (!isDrop) return [3 /*break*/, 14];
                        // Remove from storage to reflect drop
                        return [4 /*yield*/, this.storageService.deleteDDL(destEnv, dbName, storageType, obj.name)];
                    case 13:
                        // Remove from storage to reflect drop
                        _c.sent();
                        this.logger.info("Auto-synced (DELETE) storage for ".concat(storageType, " ").concat(obj.name));
                        return [3 /*break*/, 18];
                    case 14: return [4 /*yield*/, destIntro.getObjectDDL(dbName, obj.type, obj.name)];
                    case 15:
                        newDdl = _c.sent();
                        if (!newDdl) return [3 /*break*/, 17];
                        // Normalize: Uppercase keywords so it matches what ExporterService does natively before saving
                        newDdl = this.parser.uppercaseKeywords(newDdl);
                        return [4 /*yield*/, this.storageService.saveDDL(destEnv, dbName, storageType, obj.name, newDdl)];
                    case 16:
                        _c.sent();
                        this.logger.info("Auto-synced (UPSERT) storage for ".concat(storageType, " ").concat(obj.name));
                        return [3 /*break*/, 18];
                    case 17:
                        this.logger.warn("Could not fetch new DDL for ".concat(obj.name, " after migration to update storage."));
                        _c.label = 18;
                    case 18: return [3 /*break*/, 20];
                    case 19:
                        syncErr_1 = _c.sent();
                        this.logger.warn("Failed to auto-sync DDL to storage post-migration for ".concat(obj.name, ": ").concat(syncErr_1.message));
                        return [3 /*break*/, 20];
                    case 20: return [3 /*break*/, 22];
                    case 21:
                        err_2 = _c.sent();
                        failed.push(__assign(__assign({}, obj), { error: err_2.message }));
                        this.logger.error("Migration failed for ".concat(obj.name, ": ").concat(err_2.message));
                        return [3 /*break*/, 22];
                    case 22:
                        _i++;
                        return [3 /*break*/, 5];
                    case 23: return [4 /*yield*/, destDriver.query(this.migrator.enableForeignKeyChecks())];
                    case 24:
                        _c.sent();
                        if (!(gitConfig === null || gitConfig === void 0 ? void 0 : gitConfig.autoCommit)) return [3 /*break*/, 26];
                        return [4 /*yield*/, this.handleGitSync(destEnv, dbName, successful, failed, gitConfig)];
                    case 25:
                        _c.sent();
                        _c.label = 26;
                    case 26: return [2 /*return*/, {
                            success: true,
                            successful: successful,
                            failed: failed,
                            dryRun: false,
                            safetyLevel: safetyReport.level,
                            impact: impactSummary
                        }];
                    case 27: return [4 /*yield*/, destDriver.disconnect()];
                    case 28:
                        _c.sent();
                        return [7 /*endfinally*/];
                    case 29: return [2 /*return*/];
                }
            });
        });
    };
    SchemaOrchestrator.prototype.requiresBackup = function (status) {
        var statuses = ['UPDATED', 'DEPRECATED', 'different', 'modified', 'missing_in_source'];
        return statuses.includes(status);
    };
    SchemaOrchestrator.prototype.handleObjectBackup = function (env, db, obj, intro) {
        return __awaiter(this, void 0, void 0, function () {
            var currentDdl, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, intro.getObjectDDL(db, obj.type, obj.name)];
                    case 1:
                        currentDdl = _a.sent();
                        if (!currentDdl) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.storageService.saveSnapshot(env, db, obj.type, obj.name, currentDdl, 'PRE_MIGRATE')];
                    case 2:
                        _a.sent();
                        this.logger.info("Auto-backup created for ".concat(obj.type, " ").concat(obj.name));
                        _a.label = 3;
                    case 3: return [3 /*break*/, 5];
                    case 4:
                        e_1 = _a.sent();
                        this.logger.warn("Failed to create auto-backup for ".concat(obj.name, ": ").concat(e_1.message));
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    SchemaOrchestrator.prototype.handleGitSync = function (env, db, successful, failed, config) {
        return __awaiter(this, void 0, void 0, function () {
            var status, failSummary, message, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        status = failed.length > 0 ? 'ALERT' : 'SUCCESS';
                        failSummary = failed.length > 0 ? " [FAILED: ".concat(failed.length, " objects]") : '';
                        message = "".concat(status.toLowerCase(), "(migrate): applied ").concat(successful.length, " objects to ").concat(env).concat(failSummary);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.gitOrchestrator.gitSync({
                                config: config,
                                env: env,
                                db: db,
                                message: message
                            })];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_2 = _a.sent();
                        this.logger.error("Git sync failed: ".concat(e_2.message));
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    SchemaOrchestrator.prototype.isTableExists = function (env, tableName) {
        return __awaiter(this, void 0, void 0, function () {
            var conn, driver, intro, tables;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        conn = this.configService.getConnection(env);
                        if (!conn) {
                            throw new Error("Connection not found for environment: ".concat(env));
                        }
                        return [4 /*yield*/, this.driverFactory.create(conn.type, conn.config)];
                    case 1:
                        driver = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, , 5, 7]);
                        return [4 /*yield*/, driver.connect()];
                    case 3:
                        _a.sent();
                        intro = driver.getIntrospectionService();
                        return [4 /*yield*/, intro.listTables(conn.config.database || 'default')];
                    case 4:
                        tables = _a.sent();
                        return [2 /*return*/, tables.includes(tableName)];
                    case 5: return [4 /*yield*/, driver.disconnect()];
                    case 6:
                        _a.sent();
                        return [7 /*endfinally*/];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    SchemaOrchestrator.prototype.getDriverFromConnection = function (connection) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, type, config;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = connection_util_1.ConnectionUtil.resolve(connection), type = _a.type, config = _a.config;
                        return [4 /*yield*/, this.driverFactory.create(type, config)];
                    case 1: return [2 /*return*/, _b.sent()];
                }
            });
        });
    };
    SchemaOrchestrator.prototype.getSchemaNormalized = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var env, _a, db, conn, driver, intro, tables, result, _i, tables_1, table, ddl;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        env = payload.env, _a = payload.db, db = _a === void 0 ? 'default' : _a;
                        conn = this.configService.getConnection(env);
                        if (!conn)
                            throw new Error("Connection not found: ".concat(env));
                        return [4 /*yield*/, this.driverFactory.create(conn.type, conn.config)];
                    case 1:
                        driver = _b.sent();
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, , 9, 11]);
                        return [4 /*yield*/, driver.connect()];
                    case 3:
                        _b.sent();
                        intro = driver.getIntrospectionService();
                        return [4 /*yield*/, intro.listTables(db)];
                    case 4:
                        tables = _b.sent();
                        result = { tables: {} };
                        _i = 0, tables_1 = tables;
                        _b.label = 5;
                    case 5:
                        if (!(_i < tables_1.length)) return [3 /*break*/, 8];
                        table = tables_1[_i];
                        return [4 /*yield*/, intro.getTableDDL(db, table)];
                    case 6:
                        ddl = _b.sent();
                        if (ddl) {
                            result.tables[table] = {
                                name: table,
                                ddl: ddl.trim(),
                            };
                        }
                        _b.label = 7;
                    case 7:
                        _i++;
                        return [3 /*break*/, 5];
                    case 8: return [2 /*return*/, result];
                    case 9: return [4 /*yield*/, driver.disconnect()];
                    case 10:
                        _b.sent();
                        return [7 /*endfinally*/];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    SchemaOrchestrator.prototype.searchDependencies = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var connection, query, flags, dbName;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        connection = payload.connection, query = payload.query, flags = payload.flags;
                        dbName = connection.database || connection.name || 'default';
                        return [4 /*yield*/, this.dependencySearch.searchLocal(this.storageService, connection.environment, dbName, query, flags)];
                    case 1: 
                    // We search locally in SQLite as per user's request
                    return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    SchemaOrchestrator.prototype.createSnapshot = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var env, db, type, name, conn, driver, intro, dbName, ddl;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        env = payload.env, db = payload.db, type = payload.type, name = payload.name;
                        conn = this.configService.getConnection(env || ((_a = payload.sourceConfig) === null || _a === void 0 ? void 0 : _a.env));
                        if (!conn)
                            throw new Error('Source connection required for snapshot');
                        return [4 /*yield*/, this.driverFactory.create(conn.type, conn.config)];
                    case 1:
                        driver = _d.sent();
                        _d.label = 2;
                    case 2:
                        _d.trys.push([2, , 7, 9]);
                        return [4 /*yield*/, driver.connect()];
                    case 3:
                        _d.sent();
                        intro = driver.getIntrospectionService();
                        dbName = db || ((_b = conn.config) === null || _b === void 0 ? void 0 : _b.database);
                        return [4 /*yield*/, intro.getObjectDDL(dbName, type, name)];
                    case 4:
                        ddl = _d.sent();
                        if (!ddl) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.storageService.saveSnapshot(env || ((_c = payload.sourceConfig) === null || _c === void 0 ? void 0 : _c.env), dbName, type.toLowerCase(), name, ddl, 'MANUAL_SNAPSHOT')];
                    case 5:
                        _d.sent();
                        return [2 /*return*/, { success: true, message: "Snapshot created for ".concat(type, " ").concat(name) }];
                    case 6: throw new Error("Could not generate DDL for ".concat(type, " ").concat(name));
                    case 7: return [4 /*yield*/, driver.disconnect()];
                    case 8:
                        _d.sent();
                        return [7 /*endfinally*/];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    return SchemaOrchestrator;
}());
exports.SchemaOrchestrator = SchemaOrchestrator;
