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
exports.SqliteDbDriver = void 0;
var sqlite_introspection_1 = require("./sqlite.introspection");
var sqlite_monitoring_1 = require("./sqlite.monitoring");
var sqlite_migrator_1 = require("../../migrator/sqlite/sqlite.migrator");
var Database = __importStar(require("better-sqlite3"));
var getLogger = require('andb-logger').getLogger;
var parser_service_1 = require("../../parser/parser.service");
var SqliteDbDriver = /** @class */ (function () {
    function SqliteDbDriver(config) {
        this.config = config;
        this.db = null;
        this.logger = getLogger({ logName: 'SqliteDbDriver' });
        this.parserService = new parser_service_1.ParserService();
    }
    SqliteDbDriver.prototype.connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var dbPath, error;
            return __generator(this, function (_a) {
                try {
                    if (!this.config.host && !this.config.database && !this.config.path) {
                        throw new Error('SQLite config requires "database", "host", or "path" specifying the file location.');
                    }
                    dbPath = this.config.path || this.config.database || this.config.host;
                    this.logger.info("Connecting to SQLite DB at ".concat(dbPath));
                    this.db = new Database(dbPath, {
                        fileMustExist: false // Create if doesn't exist, mimicking standard SQLite behavior
                    });
                    // Ensure foreign keys are enforced by default
                    this.db.pragma('foreign_keys = ON');
                }
                catch (err) {
                    error = err;
                    this.logger.error("SQLite Connection Failed: ".concat(error.message));
                    throw error;
                }
                return [2 /*return*/];
            });
        });
    };
    SqliteDbDriver.prototype.disconnect = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.db) {
                    this.db.close();
                    this.db = null;
                }
                return [2 /*return*/];
            });
        });
    };
    SqliteDbDriver.prototype.query = function (sql_1) {
        return __awaiter(this, arguments, void 0, function (sql, params) {
            var stmt, result;
            if (params === void 0) { params = []; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.db) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.connect()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        try {
                            stmt = this.db.prepare(sql);
                            if (stmt.reader) {
                                if (params && params.length > 0) {
                                    return [2 /*return*/, stmt.all.apply(stmt, params)];
                                }
                                return [2 /*return*/, stmt.all()];
                            }
                            else {
                                result = params && params.length > 0 ? stmt.run.apply(stmt, params) : stmt.run();
                                return [2 /*return*/, [{ insertId: result.lastInsertRowid, changes: result.changes }]];
                            }
                        }
                        catch (e) {
                            this.logger.error("SQLite query error: ".concat(e.message), { sql: sql });
                            throw e;
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    SqliteDbDriver.prototype.getIntrospectionService = function () {
        if (!this.introspectionService) {
            this.introspectionService = new sqlite_introspection_1.SqliteIntrospectionService(this, this.parserService);
        }
        return this.introspectionService;
    };
    SqliteDbDriver.prototype.getMonitoringService = function () {
        if (!this.monitoringService) {
            this.monitoringService = new sqlite_monitoring_1.SqliteMonitoringService(this);
        }
        return this.monitoringService;
    };
    SqliteDbDriver.prototype.getMigrator = function () {
        if (!this.migrator) {
            this.migrator = new sqlite_migrator_1.SqliteMigrator();
        }
        return this.migrator;
    };
    SqliteDbDriver.prototype.getSessionContext = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, {
                        sql_mode: 'STRICT',
                        time_zone: 'UTC',
                        charset: 'utf8'
                    }];
            });
        });
    };
    SqliteDbDriver.prototype.setForeignKeyChecks = function (enabled) {
        return __awaiter(this, void 0, void 0, function () {
            var value;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        value = enabled ? 'ON' : 'OFF';
                        return [4 /*yield*/, this.query("PRAGMA foreign_keys = ".concat(value, ";"))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    SqliteDbDriver.prototype.generateUserSetupScript = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, "-- SQLite does not support user grants natively.\n-- Skipped user setup script for ".concat(params.username, ".")];
            });
        });
    };
    return SqliteDbDriver;
}());
exports.SqliteDbDriver = SqliteDbDriver;
