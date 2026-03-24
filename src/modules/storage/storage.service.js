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
exports.StorageService = void 0;
var path = __importStar(require("path"));
var os = __importStar(require("os"));
var fs = __importStar(require("fs"));
var getLogger = require('andb-logger').getLogger;
var StorageService = /** @class */ (function () {
    function StorageService() {
        this.logger = getLogger({ logName: 'StorageService' });
        this.strategy = null;
        this.dbPath = '';
        this.projectBaseDir = process.cwd();
    }
    StorageService.prototype.initialize = function (strategy, dbPath, projectBaseDir) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.strategy && this.dbPath === dbPath)
                            return [2 /*return*/];
                        if (!this.strategy) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.close()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        this.strategy = strategy;
                        this.dbPath = dbPath;
                        if (projectBaseDir)
                            this.projectBaseDir = projectBaseDir;
                        if (!process.env.ANDB_QUIET) {
                            this.logger.info("Initializing storage at: ".concat(dbPath, " using ").concat(strategy.constructor.name));
                        }
                        return [4 /*yield*/, this.strategy.initialize(dbPath, [], projectBaseDir)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    StorageService.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.strategy) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.strategy.close()];
                    case 1:
                        _a.sent();
                        this.strategy = null;
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    StorageService.prototype.getDbPath = function () {
        return this.dbPath;
    };
    StorageService.prototype.getProjectBaseDir = function () {
        return this.projectBaseDir;
    };
    StorageService.prototype.ensureStrategy = function () {
        if (!this.strategy) {
            throw new Error('StorageService cannot be used before it is initialized with a strategy.');
        }
        return this.strategy;
    };
    // --- Statistics ---
    StorageService.prototype.getStats = function () {
        return __awaiter(this, void 0, void 0, function () {
            var strategy, projects, snapshots, _a, ddlCount, exports_1, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        strategy = this.ensureStrategy();
                        return [4 /*yield*/, strategy.getProjects()];
                    case 1:
                        projects = _c.sent();
                        return [4 /*yield*/, strategy.getAllSnapshots];
                    case 2:
                        if (!(_c.sent())) return [3 /*break*/, 4];
                        return [4 /*yield*/, strategy.getAllSnapshots()];
                    case 3:
                        _a = _c.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        _a = [];
                        _c.label = 5;
                    case 5:
                        snapshots = _a;
                        ddlCount = 0;
                        _c.label = 6;
                    case 6:
                        _c.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, strategy.queryRaw("SELECT COUNT(*) as c FROM ddl_exports")];
                    case 7:
                        exports_1 = _c.sent();
                        ddlCount = exports_1[0].c;
                        return [3 /*break*/, 9];
                    case 8:
                        _b = _c.sent();
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/, {
                            projects: projects.length,
                            snapshots: snapshots.length,
                            exports: ddlCount
                        }];
                }
            });
        });
    };
    // --- Core Lifecycle/Execution for Schema Builder ---
    StorageService.prototype.queryAll = function (sql_1) {
        return __awaiter(this, arguments, void 0, function (sql, params) {
            if (params === void 0) { params = []; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.ensureStrategy().queryRaw(sql, params)];
            });
        });
    };
    StorageService.prototype.execute = function (sql_1) {
        return __awaiter(this, arguments, void 0, function (sql, params) {
            if (params === void 0) { params = []; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.ensureStrategy().executeRaw(sql, params)];
            });
        });
    };
    // --- DDL Exports ---
    StorageService.prototype.saveDdlExport = function (environment, databaseName, exportType, exportName, ddlContent) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.ensureStrategy().saveDdlExport({
                        id: "".concat(environment, "_").concat(databaseName, "_").concat(exportType, "_").concat(exportName).replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase(),
                        environment: environment,
                        database_name: databaseName,
                        export_type: exportType,
                        export_name: exportName,
                        ddl_content: ddlContent
                    })];
            });
        });
    };
    // Alias for backward compatibility with ExporterService
    StorageService.prototype.saveDDL = function (environment, databaseName, exportType, exportName, ddlContent) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.saveDdlExport(environment, databaseName, exportType, exportName, ddlContent)];
            });
        });
    };
    StorageService.prototype.deleteDDL = function (environment, databaseName, exportType, exportName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.ensureStrategy().deleteDdlExport(environment, databaseName, exportType, exportName)];
            });
        });
    };
    StorageService.prototype.getDDL = function (environment, database, type, name) {
        return __awaiter(this, void 0, void 0, function () {
            var rows, row;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureStrategy().getDdlExports(environment, database, type, 1)];
                    case 1:
                        rows = _a.sent();
                        row = rows.find(function (r) { return r.export_name === name; });
                        return [2 /*return*/, row ? row.ddl_content : null];
                }
            });
        });
    };
    StorageService.prototype.getDDLObjects = function (environment, database, type) {
        return __awaiter(this, void 0, void 0, function () {
            var rows;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureStrategy().getDdlExports(environment, database, type)];
                    case 1:
                        rows = _a.sent();
                        return [2 /*return*/, rows.map(function (r) { return ({
                                name: r.export_name,
                                content: r.ddl_content,
                                updated_at: r.exported_at
                            }); })];
                }
            });
        });
    };
    StorageService.prototype.searchDDL = function (environment, database, query, flags) {
        return __awaiter(this, void 0, void 0, function () {
            var sql, likeQuery, rows;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sql = "\n      SELECT export_type as type, export_name as name, ddl_content as content, exported_at as updated_at\n      FROM ddl_exports\n      WHERE environment = ? AND database_name = ?\n      AND (export_name LIKE ? OR ddl_content LIKE ?)\n    ";
                        likeQuery = "%".concat(query, "%");
                        return [4 /*yield*/, this.ensureStrategy().queryRaw(sql, [environment, database, likeQuery, likeQuery])];
                    case 1:
                        rows = _a.sent();
                        // Simplistic return, omitting RegExp filter for brevity.
                        return [2 /*return*/, rows];
                }
            });
        });
    };
    StorageService.prototype.getEnvironments = function () {
        return __awaiter(this, void 0, void 0, function () {
            var rows;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureStrategy().queryRaw('SELECT DISTINCT environment FROM ddl_exports ORDER BY environment ASC')];
                    case 1:
                        rows = _a.sent();
                        return [2 /*return*/, rows.map(function (r) { return r.environment; })];
                }
            });
        });
    };
    StorageService.prototype.getDatabases = function (environment) {
        return __awaiter(this, void 0, void 0, function () {
            var rows;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureStrategy().queryRaw('SELECT DISTINCT database_name as name FROM ddl_exports WHERE environment = ? ORDER BY database_name ASC', [environment])];
                    case 1:
                        rows = _a.sent();
                        return [2 /*return*/, rows.map(function (r) { return r.name; })];
                }
            });
        });
    };
    // --- Snapshots ---
    StorageService.prototype.saveSnapshot = function (environment, databaseName, ddlType, ddlName, ddlContent, hash) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.ensureStrategy().saveSnapshot({
                        id: "".concat(environment, "_").concat(databaseName, "_").concat(ddlType, "_").concat(ddlName, "_").concat(hash).replace(/[^a-zA-Z0-9_]/g, ''),
                        environment: environment,
                        database_name: databaseName,
                        ddl_type: ddlType,
                        ddl_name: ddlName,
                        ddl_content: ddlContent,
                        hash: hash
                    })];
            });
        });
    };
    StorageService.prototype.getSnapshots = function (environment, databaseName, type, name) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // We wrapped getSnapshot, but the original returned a list of history.
                // Assuming strategy provides `queryRaw` for backwards compatibility.
                return [2 /*return*/, this.ensureStrategy().queryRaw('SELECT hash, created_at, ddl_content FROM ddl_snapshots WHERE environment = ? AND database_name = ? AND ddl_type = ? AND ddl_name = ? ORDER BY created_at DESC', [environment, databaseName, type, name])];
            });
        });
    };
    StorageService.prototype.getAllSnapshots = function () {
        return __awaiter(this, arguments, void 0, function (limit) {
            if (limit === void 0) { limit = 200; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.ensureStrategy().getAllSnapshots(limit)];
            });
        });
    };
    // --- Comparisons ---
    StorageService.prototype.saveComparison = function (sourceEnv, targetEnv, databaseName, ddlType, ddlName, status, alterStatements) {
        return __awaiter(this, void 0, void 0, function () {
            var src, dest, db, type, name, stat, alters, payload, processedAlters;
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
            return __generator(this, function (_u) {
                if (typeof sourceEnv === 'object' && sourceEnv !== null) {
                    payload = sourceEnv;
                    src = (_c = (_b = (_a = payload.srcEnv) !== null && _a !== void 0 ? _a : payload.sourceEnv) !== null && _b !== void 0 ? _b : payload.source_env) !== null && _c !== void 0 ? _c : '';
                    dest = (_f = (_e = (_d = payload.destEnv) !== null && _d !== void 0 ? _d : payload.targetEnv) !== null && _e !== void 0 ? _e : payload.target_env) !== null && _f !== void 0 ? _f : '';
                    db = (_j = (_h = (_g = payload.database) !== null && _g !== void 0 ? _g : payload.database_name) !== null && _h !== void 0 ? _h : payload.databaseName) !== null && _j !== void 0 ? _j : '';
                    type = (_m = (_l = (_k = payload.type) !== null && _k !== void 0 ? _k : payload.ddlType) !== null && _l !== void 0 ? _l : payload.ddl_type) !== null && _m !== void 0 ? _m : '';
                    name = (_q = (_p = (_o = payload.name) !== null && _o !== void 0 ? _o : payload.ddlName) !== null && _p !== void 0 ? _p : payload.ddl_name) !== null && _q !== void 0 ? _q : '';
                    stat = (_r = payload.status) !== null && _r !== void 0 ? _r : '';
                    alters = (_t = (_s = payload.alterStatements) !== null && _s !== void 0 ? _s : payload.alter_statements) !== null && _t !== void 0 ? _t : '';
                }
                else {
                    src = sourceEnv !== null && sourceEnv !== void 0 ? sourceEnv : '';
                    dest = targetEnv !== null && targetEnv !== void 0 ? targetEnv : '';
                    db = databaseName !== null && databaseName !== void 0 ? databaseName : '';
                    type = ddlType !== null && ddlType !== void 0 ? ddlType : '';
                    name = ddlName !== null && ddlName !== void 0 ? ddlName : '';
                    stat = status !== null && status !== void 0 ? status : '';
                    alters = alterStatements !== null && alterStatements !== void 0 ? alterStatements : '';
                }
                processedAlters = Array.isArray(alters) ? JSON.stringify(alters) : alters;
                return [2 /*return*/, this.ensureStrategy().saveComparison({
                        id: "".concat(src, "_").concat(dest, "_").concat(db, "_").concat(type, "_").concat(name).replace(/[^a-zA-Z0-9_]/g, ''),
                        source_env: src,
                        target_env: dest,
                        database_name: db,
                        ddl_type: type,
                        ddl_name: name,
                        status: stat,
                        alter_statements: processedAlters
                    })];
            });
        });
    };
    StorageService.prototype.getComparisons = function (srcEnv, destEnv, database, type) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.ensureStrategy().getComparisons(srcEnv, destEnv, database, type)];
            });
        });
    };
    StorageService.prototype.getLatestComparisons = function () {
        return __awaiter(this, arguments, void 0, function (limit) {
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.ensureStrategy().getLatestComparisons(limit)];
            });
        });
    };
    // --- Migration History ---
    StorageService.prototype.addMigrationHistory = function (environment, databaseName, type, targetObjects) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.ensureStrategy().saveMigrationHistory({
                        environment: environment,
                        database_name: databaseName,
                        migration_type: type,
                        target_objects: JSON.stringify(targetObjects),
                        status: 'PENDING'
                    })];
            });
        });
    };
    StorageService.prototype.updateMigrationStatus = function (id, status, error) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.ensureStrategy().updateMigrationStatus(id, status, error)];
            });
        });
    };
    StorageService.prototype.getMigrationHistory = function () {
        return __awaiter(this, arguments, void 0, function (limit) {
            if (limit === void 0) { limit = 100; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.ensureStrategy().getMigrationHistory(limit)];
            });
        });
    };
    // --- Project Operations ---
    StorageService.prototype.saveProject = function (project) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureStrategy().saveProject(project)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this._backupProjectsToJson()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    StorageService.prototype.getProjects = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.ensureStrategy().getProjects()];
            });
        });
    };
    StorageService.prototype.deleteProject = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureStrategy().deleteProject(id)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this._backupProjectsToJson()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    StorageService.prototype.saveProjectEnvironment = function (env) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureStrategy().saveProjectEnvironment(env)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this._backupProjectsToJson()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    StorageService.prototype.getProjectEnvironments = function (projectId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.ensureStrategy().getProjectEnvironments(projectId)];
            });
        });
    };
    StorageService.prototype.deleteProjectEnvironment = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureStrategy().deleteProjectEnvironment(id)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this._backupProjectsToJson()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // --- Settings ---
    StorageService.prototype.saveProjectSetting = function (projectId, key, value) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureStrategy().saveProjectSetting(projectId, key, value)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this._backupProjectsToJson()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    StorageService.prototype.getProjectSettings = function (projectId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.ensureStrategy().getProjectSettings(projectId)];
            });
        });
    };
    StorageService.prototype.saveUserSetting = function (key, value) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.ensureStrategy().saveUserSetting(key, value)];
            });
        });
    };
    StorageService.prototype.getUserSettings = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.ensureStrategy().getUserSettings()];
            });
        });
    };
    StorageService.prototype.saveMetadata = function (key, value) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.ensureStrategy().setMetadata(key, value)];
            });
        });
    };
    StorageService.prototype.getMetadata = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.ensureStrategy().getMetadata(key)];
            });
        });
    };
    // --- Resilience Backup ---
    StorageService.prototype._backupProjectsToJson = function () {
        return __awaiter(this, void 0, void 0, function () {
            var projects, _i, _a, p, _b, _c, backupDir, backupPath, e_1;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 7, , 8]);
                        return [4 /*yield*/, this.getProjects()];
                    case 1:
                        projects = _d.sent();
                        _i = 0, _a = projects;
                        _d.label = 2;
                    case 2:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        p = _a[_i];
                        _b = p;
                        return [4 /*yield*/, this.getProjectEnvironments(p.id)];
                    case 3:
                        _b.environments = _d.sent();
                        _c = p;
                        return [4 /*yield*/, this.getProjectSettings(p.id)];
                    case 4:
                        _c.settings = _d.sent();
                        _d.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 2];
                    case 6:
                        backupDir = path.join(os.homedir(), '.andb', 'backups');
                        if (!fs.existsSync(backupDir)) {
                            fs.mkdirSync(backupDir, { recursive: true });
                        }
                        backupPath = path.join(backupDir, 'projects_backup.json');
                        fs.writeFileSync(backupPath, JSON.stringify(projects, null, 2), 'utf-8');
                        return [3 /*break*/, 8];
                    case 7:
                        e_1 = _d.sent();
                        this.logger.error("Failed to backup projects: ".concat(e_1.message));
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    // Cleanup ops if necessary
    StorageService.prototype.clearConnectionData = function (env, database) {
        return __awaiter(this, void 0, void 0, function () {
            var e_2;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, ((_a = this.strategy) === null || _a === void 0 ? void 0 : _a.executeRaw('DELETE FROM ddl_exports WHERE environment = ? AND database_name = ?', [env, database]))];
                    case 1:
                        _d.sent();
                        return [4 /*yield*/, ((_b = this.strategy) === null || _b === void 0 ? void 0 : _b.executeRaw('DELETE FROM ddl_snapshots WHERE environment = ? AND database_name = ?', [env, database]))];
                    case 2:
                        _d.sent();
                        return [4 /*yield*/, ((_c = this.strategy) === null || _c === void 0 ? void 0 : _c.executeRaw('DELETE FROM comparisons WHERE database_name = ? AND (source_env = ? OR target_env = ?)', [database, env, env]))];
                    case 3:
                        _d.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_2 = _d.sent();
                        this.logger.error("clearConnectionData failed: ".concat(e_2));
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    return StorageService;
}());
exports.StorageService = StorageService;
