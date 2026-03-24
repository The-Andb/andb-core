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
exports.MysqlDriver = void 0;
var mysql_introspection_1 = require("./mysql.introspection");
var mysql_monitoring_1 = require("./mysql.monitoring");
var mysql_migrator_1 = require("../../migrator/mysql/mysql.migrator");
var ssh_tunnel_1 = require("../ssh-tunnel");
var mysql = __importStar(require("mysql2/promise")); // Use promise wrapper natively
var getLogger = require('andb-logger').getLogger;
var parser_service_1 = require("../../parser/parser.service"); // We need this for Introspection
var MysqlDriver = /** @class */ (function () {
    function MysqlDriver(config) {
        this.config = config;
        this.connection = null;
        this.sshTunnel = null;
        this.logger = getLogger({ logName: 'MysqlDriver' });
        this.parserService = new parser_service_1.ParserService(); // Instantiate directly or inject if we refactor Driver to be Injectable
    }
    MysqlDriver.prototype.connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var stream, _a, err_1, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 6, , 7]);
                        stream = void 0;
                        if (!(this.config.sshConfig && this.config.sshConfig.host)) return [3 /*break*/, 2];
                        this.logger.info("Initializing SSH Tunnel to ".concat(this.config.sshConfig.host, "..."));
                        this.sshTunnel = new ssh_tunnel_1.SshTunnel(this.config.sshConfig);
                        return [4 /*yield*/, this.sshTunnel.forward(this.config.host || 'localhost', this.config.port || 3306)];
                    case 1:
                        // Connect SSH and forward to DB host/port
                        // Note: this.config.host is the DB host relative to the SSH server
                        stream = _b.sent();
                        _b.label = 2;
                    case 2:
                        _a = this;
                        return [4 /*yield*/, mysql.createConnection({
                                host: this.config.host === 'localhost' ? '127.0.0.1' : this.config.host,
                                port: this.config.port || 3306,
                                user: this.config.user,
                                password: this.config.password,
                                database: this.config.database,
                                multipleStatements: true,
                                stream: stream, // Inject the SSH stream if available
                            })];
                    case 3:
                        _a.connection = _b.sent();
                        // Session hygiene
                        return [4 /*yield*/, this.connection.query("SET SESSION sql_mode = 'NO_AUTO_VALUE_ON_ZERO,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'")];
                    case 4:
                        // Session hygiene
                        _b.sent();
                        return [4 /*yield*/, this.connection.query("SET NAMES 'utf8mb4'")];
                    case 5:
                        _b.sent();
                        this.logger.info("Connected to MySQL at ".concat(this.config.host, " ").concat(this.sshTunnel ? '(via SSH)' : ''));
                        return [3 /*break*/, 7];
                    case 6:
                        err_1 = _b.sent();
                        error = err_1;
                        this.logger.error("MySQL Connection Failed: ".concat(error.message));
                        // Cleanup SSH if DB connection failed
                        if (this.sshTunnel) {
                            this.sshTunnel.close();
                            this.sshTunnel = null;
                        }
                        throw error;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    MysqlDriver.prototype.disconnect = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.connection) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.connection.end()];
                    case 1:
                        _a.sent();
                        this.connection = null;
                        _a.label = 2;
                    case 2:
                        if (this.sshTunnel) {
                            this.sshTunnel.close();
                            this.sshTunnel = null;
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MysqlDriver.prototype.query = function (sql_1) {
        return __awaiter(this, arguments, void 0, function (sql, params) {
            var rows;
            if (params === void 0) { params = []; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.connection) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.connect()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [4 /*yield*/, this.connection.query(sql, params)];
                    case 3:
                        rows = (_a.sent())[0];
                        return [2 /*return*/, rows];
                }
            });
        });
    };
    MysqlDriver.prototype.getIntrospectionService = function () {
        if (!this.introspectionService) {
            this.introspectionService = new mysql_introspection_1.MysqlIntrospectionService(this, this.parserService);
        }
        return this.introspectionService;
    };
    MysqlDriver.prototype.getMonitoringService = function () {
        if (!this.monitoringService) {
            this.monitoringService = new mysql_monitoring_1.MysqlMonitoringService(this);
        }
        return this.monitoringService;
    };
    MysqlDriver.prototype.getMigrator = function () {
        if (!this.migrator) {
            this.migrator = new mysql_migrator_1.MysqlMigrator();
        }
        return this.migrator;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MysqlDriver.prototype.getSessionContext = function () {
        return __awaiter(this, void 0, void 0, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.query("\n      SELECT \n        @@session.sql_mode as sql_mode,\n        @@session.time_zone as time_zone,\n        @@session.wait_timeout as lock_wait_timeout,\n        @@session.character_set_results as charset\n    ")];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, Array.isArray(results) ? results[0] : results];
                }
            });
        });
    };
    MysqlDriver.prototype.setForeignKeyChecks = function (enabled) {
        return __awaiter(this, void 0, void 0, function () {
            var value;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        value = enabled ? 1 : 0;
                        return [4 /*yield*/, this.query("SET FOREIGN_KEY_CHECKS = ".concat(value, ";"))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    MysqlDriver.prototype.generateUserSetupScript = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var username, password, database, _a, host, permissions, _b, isReconfigure, db, safeUser, safePass, safeHost, safeDb, sql;
            return __generator(this, function (_c) {
                username = params.username, password = params.password, database = params.database, _a = params.host, host = _a === void 0 ? '%' : _a, permissions = params.permissions, _b = params.isReconfigure, isReconfigure = _b === void 0 ? false : _b;
                db = database || 'default';
                safeUser = (username || '').replace(/'/g, '');
                safePass = (password || '').replace(/'/g, '');
                safeHost = (host || '%').replace(/'/g, '');
                safeDb = (db || 'default').replace(/`/g, '');
                sql = '';
                if (!isReconfigure) {
                    sql += "-- Base: Create user and basic metadata access\n";
                    sql += "CREATE USER IF NOT EXISTS '".concat(safeUser, "'@'").concat(safeHost, "' IDENTIFIED BY '").concat(safePass, "';\n");
                    sql += "ALTER USER '".concat(safeUser, "'@'").concat(safeHost, "' IDENTIFIED BY '").concat(safePass, "';\n\n");
                }
                else {
                    sql += "-- Reconfigure privileges for existing user '".concat(safeUser, "'@'").concat(safeHost, "'\n");
                }
                sql += "-- Reset: Remove all existing privileges (supports re-configuration & downgrade)\n";
                sql += "REVOKE ALL PRIVILEGES ON `".concat(safeDb, "`.* FROM '").concat(safeUser, "'@'").concat(safeHost, "';\n\n");
                sql += "-- SELECT, SHOW VIEW, TRIGGER, EVENT: READ permissions\n";
                sql += "GRANT SELECT ON `".concat(safeDb, "`.* TO '").concat(safeUser, "'@'").concat(safeHost, "';\n");
                sql += "GRANT SHOW VIEW ON `".concat(safeDb, "`.* TO '").concat(safeUser, "'@'").concat(safeHost, "';\n");
                sql += "GRANT TRIGGER ON `".concat(safeDb, "`.* TO '").concat(safeUser, "'@'").concat(safeHost, "';\n");
                sql += "GRANT EVENT ON `".concat(safeDb, "`.* TO '").concat(safeUser, "'@'").concat(safeHost, "';\n\n");
                sql += "-- Global READ Permissions (Required for metadata access)\n";
                sql += "-- GRANT SELECT ON mysql.proc: read procedure/function bodies (Legacy/Compatibility)\n";
                sql += "GRANT SELECT ON mysql.proc TO '".concat(safeUser, "'@'").concat(safeHost, "';\n\n");
                if (permissions.writeAlter) {
                    sql += "-- Group: WRITE - DDL Operations\n";
                    sql += "GRANT ALTER, CREATE, DROP, INDEX, REFERENCES ON `".concat(safeDb, "`.* TO '").concat(safeUser, "'@'").concat(safeHost, "';\n\n");
                }
                if (permissions.writeView) {
                    sql += "-- Group: WRITE - View Operations\n";
                    sql += "GRANT CREATE VIEW ON `".concat(safeDb, "`.* TO '").concat(safeUser, "'@'").concat(safeHost, "';\n\n");
                }
                if (permissions.writeRoutine) {
                    sql += "-- Group: WRITE - Routine Operations\n";
                    sql += "GRANT ALTER ROUTINE, CREATE ROUTINE, EXECUTE ON `".concat(safeDb, "`.* TO '").concat(safeUser, "'@'").concat(safeHost, "';\n\n");
                }
                sql += "FLUSH PRIVILEGES;";
                console.log('[MysqlDriver] Generated Script:\n', sql);
                return [2 /*return*/, sql];
            });
        });
    };
    return MysqlDriver;
}());
exports.MysqlDriver = MysqlDriver;
