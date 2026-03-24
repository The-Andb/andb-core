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
exports.SecurityOrchestrator = void 0;
var getLogger = require('andb-logger').getLogger;
var connection_util_1 = require("../../common/utils/connection.util");
var SecurityOrchestrator = /** @class */ (function () {
    function SecurityOrchestrator(configService, driverFactory) {
        this.configService = configService;
        this.driverFactory = driverFactory;
        this.logger = getLogger({ logName: 'SecurityOrchestrator' });
    }
    SecurityOrchestrator.prototype.probeRestrictedUser = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var connection, permissions, driver, results, introspection, dbName, procs, ddl, e_1, probeTable, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        connection = payload.connection, permissions = payload.permissions;
                        return [4 /*yield*/, this.getDriverFromConnection(connection)];
                    case 1:
                        driver = _a.sent();
                        results = {
                            baseConn: 'fail',
                            schemaRead: 'fail',
                            sandboxTest: 'fail',
                        };
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, , 16, 18]);
                        return [4 /*yield*/, driver.connect()];
                    case 3:
                        _a.sent();
                        results.baseConn = 'pass';
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 9, , 10]);
                        introspection = driver.getIntrospectionService();
                        dbName = connection.database || connection.name || 'default';
                        return [4 /*yield*/, introspection.listTables(dbName)];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, introspection.listProcedures(dbName)];
                    case 6:
                        procs = _a.sent();
                        if (!(procs.length > 0)) return [3 /*break*/, 8];
                        return [4 /*yield*/, introspection.getProcedureDDL(dbName, procs[0])];
                    case 7:
                        ddl = _a.sent();
                        if (ddl === null || ddl === undefined) {
                            this.logger.warn("Probe: procedure \"".concat(procs[0], "\" listed but DDL is NULL \u2014 SHOW_ROUTINE privilege may be missing"));
                        }
                        _a.label = 8;
                    case 8:
                        results.schemaRead = 'pass';
                        return [3 /*break*/, 10];
                    case 9:
                        e_1 = _a.sent();
                        results.schemaRead = 'fail';
                        return [3 /*break*/, 10];
                    case 10:
                        probeTable = "_andb_probe_".concat(Date.now());
                        _a.label = 11;
                    case 11:
                        _a.trys.push([11, 14, , 15]);
                        return [4 /*yield*/, driver.query("CREATE TABLE `".concat(probeTable, "` (id INT)"))];
                    case 12:
                        _a.sent();
                        return [4 /*yield*/, driver.query("DROP TABLE `".concat(probeTable, "`"))];
                    case 13:
                        _a.sent();
                        results.sandboxTest = permissions.writeAlter ? 'pass' : 'fail';
                        return [3 /*break*/, 15];
                    case 14:
                        e_2 = _a.sent();
                        results.sandboxTest = !permissions.writeAlter ? 'pass' : 'fail';
                        return [3 /*break*/, 15];
                    case 15: return [2 /*return*/, results];
                    case 16: return [4 /*yield*/, driver.disconnect()];
                    case 17:
                        _a.sent();
                        return [7 /*endfinally*/];
                    case 18: return [2 /*return*/];
                }
            });
        });
    };
    SecurityOrchestrator.prototype.setupRestrictedUser = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var adminConnection, script, driver, statements, _i, statements_1, stmt, err_1, cleanStmt, isRevoke, isShowRoutine, isNoSuchGrant, isIllegalLevel;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        adminConnection = payload.adminConnection, script = payload.script;
                        return [4 /*yield*/, this.getDriverFromConnection(adminConnection)];
                    case 1:
                        driver = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, , 10, 12]);
                        return [4 /*yield*/, driver.connect()];
                    case 3:
                        _a.sent();
                        statements = Array.isArray(script)
                            ? script
                            : script
                                .split(';')
                                .map(function (s) { return s.trim(); })
                                .filter(function (s) { return s.length > 0; });
                        _i = 0, statements_1 = statements;
                        _a.label = 4;
                    case 4:
                        if (!(_i < statements_1.length)) return [3 /*break*/, 9];
                        stmt = statements_1[_i];
                        if (!stmt)
                            return [3 /*break*/, 8];
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, driver.query(stmt)];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        err_1 = _a.sent();
                        cleanStmt = stmt.replace(/--.*$/gm, '').trim().toUpperCase();
                        isRevoke = cleanStmt.startsWith('REVOKE');
                        isShowRoutine = cleanStmt.includes('SHOW_ROUTINE');
                        isNoSuchGrant = err_1.message.toLowerCase().includes('no such grant') ||
                            err_1.code === 'ER_NONEXISTING_GRANT';
                        isIllegalLevel = err_1.message.toLowerCase().includes('illegal privilege level') ||
                            err_1.code === 'ER_ILLEGAL_PRIVILEGE_LEVEL' ||
                            err_1.message.includes('3619');
                        if (isRevoke && isNoSuchGrant) {
                            this.logger.warn("Ignored \"no such grant\" error for statement: ".concat(stmt));
                            return [3 /*break*/, 8];
                        }
                        if (isShowRoutine && isIllegalLevel) {
                            this.logger.warn("Ignored \"illegal privilege level\" error for SHOW_ROUTINE statement: ".concat(stmt));
                            return [3 /*break*/, 8];
                        }
                        throw new Error("Failed to execute statement: ".concat(stmt, ". Error: ").concat(err_1.message));
                    case 8:
                        _i++;
                        return [3 /*break*/, 4];
                    case 9: return [2 /*return*/, { success: true }];
                    case 10: return [4 /*yield*/, driver.disconnect()];
                    case 11:
                        _a.sent();
                        return [7 /*endfinally*/];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    SecurityOrchestrator.prototype.generateUserSetupScript = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var adminConnection, restrictedUser, permissions, driver, err_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        adminConnection = payload.adminConnection, restrictedUser = payload.restrictedUser, permissions = payload.permissions;
                        if (!adminConnection)
                            throw new Error('Admin connection details are missing from payload');
                        if (!restrictedUser)
                            throw new Error('Restricted user details are missing from payload');
                        if (!permissions)
                            throw new Error('Permissions details are missing from payload');
                        return [4 /*yield*/, this.getDriverFromConnection(adminConnection)];
                    case 1:
                        driver = _a.sent();
                        if (typeof driver.generateUserSetupScript !== 'function') {
                            throw new Error("Driver for ".concat(adminConnection.type || 'unknown', " does not support user setup generation."));
                        }
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, driver.generateUserSetupScript({
                                username: restrictedUser.username || 'the_andb',
                                password: restrictedUser.password || '',
                                database: adminConnection.database || adminConnection.name || 'default',
                                host: '%',
                                permissions: permissions,
                            })];
                    case 3: return [2 /*return*/, _a.sent()];
                    case 4:
                        err_2 = _a.sent();
                        throw new Error("Driver failed to generate script: ".concat(err_2.message));
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    SecurityOrchestrator.prototype.testConnection = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var connection, driver, connType, e_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        connection = payload.connection || payload;
                        return [4 /*yield*/, this.getDriverFromConnection(connection)];
                    case 1:
                        driver = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 6, 7, 9]);
                        return [4 /*yield*/, driver.connect()];
                    case 3:
                        _a.sent();
                        connType = connection_util_1.ConnectionUtil.resolve(connection).type;
                        if (!(connType !== 'dump')) return [3 /*break*/, 5];
                        return [4 /*yield*/, driver.query('SELECT 1')];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [2 /*return*/, { success: true, message: 'Connection successful' }];
                    case 6:
                        e_3 = _a.sent();
                        return [2 /*return*/, { success: false, message: e_3.message }];
                    case 7: return [4 /*yield*/, driver.disconnect()];
                    case 8:
                        _a.sent();
                        return [7 /*endfinally*/];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    SecurityOrchestrator.prototype.getDriverFromConnection = function (connection) {
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
    return SecurityOrchestrator;
}());
exports.SecurityOrchestrator = SecurityOrchestrator;
