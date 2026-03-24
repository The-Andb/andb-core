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
exports.ExporterService = void 0;
var getLogger = require('andb-logger').getLogger;
var fs = __importStar(require("fs"));
var path = __importStar(require("path"));
var ExporterService = /** @class */ (function () {
    function ExporterService(driverFactory, configService, parser, storageService) {
        this.driverFactory = driverFactory;
        this.configService = configService;
        this.parser = parser;
        this.storageService = storageService;
        this.logger = getLogger({ logName: 'ExporterService' });
    }
    ExporterService.prototype.exportSchema = function (envName, specificName, typeFilter, onProgress) {
        return __awaiter(this, void 0, void 0, function () {
            var connection, driver, introspection, dbName, projectBaseDir, baseDir, allTypes, normalizedFilter_1, types, summary, _i, types_1, type, pluralType, dir, list, exportedNames, savedCount, emptyDDLCount, errorCount, _a, list_1, name_1, ddl, err_1;
            var _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        console.log("\uD83D\uDCE6 [Exporter] exportSchema called: env=".concat(envName, ", name=").concat(specificName || 'ALL', ", typeFilter=").concat(typeFilter || 'ALL'));
                        connection = this.configService.getConnection(envName);
                        if (!connection) {
                            console.log("\u274C [Exporter] Connection NOT found for env: ".concat(envName));
                            throw new Error("Connection not found for env: ".concat(envName));
                        }
                        console.log("\u2705 [Exporter] Connection found: type=".concat(connection.type, ", host=").concat((_b = connection.config) === null || _b === void 0 ? void 0 : _b.host, ", db=").concat((_c = connection.config) === null || _c === void 0 ? void 0 : _c.database));
                        console.log("[Exporter] Full connection config: ".concat(JSON.stringify(connection.config)));
                        return [4 /*yield*/, this.driverFactory.create(connection.type, connection.config)];
                    case 1:
                        driver = _d.sent();
                        _d.label = 2;
                    case 2:
                        _d.trys.push([2, , 15, 17]);
                        console.log("\uD83D\uDD0C [Exporter] Connecting to ".concat(connection.type, "..."));
                        return [4 /*yield*/, driver.connect()];
                    case 3:
                        _d.sent();
                        console.log("\u2705 [Exporter] Connected successfully");
                        introspection = driver.getIntrospectionService();
                        dbName = connection.config.database || 'default';
                        projectBaseDir = this.storageService.getProjectBaseDir ? this.storageService.getProjectBaseDir() : process.cwd();
                        baseDir = path.join(projectBaseDir, 'db', envName, dbName);
                        this._ensureDir(baseDir);
                        this._ensureDir(path.join(baseDir, 'current-ddl'));
                        allTypes = ['TABLE', 'VIEW', 'PROCEDURE', 'FUNCTION', 'TRIGGER', 'EVENT'];
                        normalizedFilter_1 = (typeFilter && typeFilter.toLowerCase() !== 'all')
                            ? typeFilter.toUpperCase().replace(/S$/, '') // 'procedures' -> 'PROCEDURE'
                            : undefined;
                        types = normalizedFilter_1
                            ? allTypes.filter(function (t) { return t === normalizedFilter_1; })
                            : allTypes;
                        console.log("\uD83D\uDCCB [Exporter] Filter: \"".concat(typeFilter, "\" \u2192 normalized: \"").concat(normalizedFilter_1 || 'ALL', "\" \u2192 types: [").concat(types.join(', '), "]"));
                        summary = {};
                        _i = 0, types_1 = types;
                        _d.label = 4;
                    case 4:
                        if (!(_i < types_1.length)) return [3 /*break*/, 14];
                        type = types_1[_i];
                        pluralType = "".concat(type, "S");
                        dir = path.join(baseDir, pluralType.toLowerCase());
                        this._ensureDir(dir);
                        return [4 /*yield*/, this._listObjects(introspection, dbName, type, specificName)];
                    case 5:
                        list = _d.sent();
                        console.log("\uD83D\uDCCA [Exporter] ".concat(pluralType, ": found ").concat(list.length, " objects"));
                        summary[pluralType] = list.length;
                        if (list.length > 0 && onProgress) {
                            onProgress({ type: pluralType, current: 0, total: list.length, objectName: '', state: 'starting_type' });
                        }
                        exportedNames = [];
                        savedCount = 0;
                        emptyDDLCount = 0;
                        errorCount = 0;
                        _a = 0, list_1 = list;
                        _d.label = 6;
                    case 6:
                        if (!(_a < list_1.length)) return [3 /*break*/, 12];
                        name_1 = list_1[_a];
                        if (this.isSkipObject(name_1))
                            return [3 /*break*/, 11];
                        _d.label = 7;
                    case 7:
                        _d.trys.push([7, 10, , 11]);
                        return [4 /*yield*/, this._getDDL(introspection, dbName, type, name_1)];
                    case 8:
                        ddl = _d.sent();
                        if (!ddl) {
                            emptyDDLCount++;
                        }
                        // Legacy parity: Normalize SQL keywords to UPPERCASE before saving
                        // This prevents false-positive diffs from keyword casing differences
                        // e.g., 'where' vs 'WHERE', 'end if' vs 'END IF'
                        if (ddl) {
                            ddl = this.parser.uppercaseKeywords(ddl);
                        }
                        // Save to file — always write, even if DDL is empty
                        fs.writeFileSync(path.join(dir, "".concat(name_1, ".sql")), ddl || '');
                        exportedNames.push(name_1);
                        // Save to storage — always save so it appears in sidebar list
                        return [4 /*yield*/, this.storageService.saveDDL(envName, dbName, pluralType, name_1, ddl || '')];
                    case 9:
                        // Save to storage — always save so it appears in sidebar list
                        _d.sent();
                        savedCount++;
                        if (onProgress) {
                            onProgress({
                                type: pluralType,
                                current: savedCount,
                                total: list.length,
                                objectName: name_1
                            });
                        }
                        return [3 /*break*/, 11];
                    case 10:
                        err_1 = _d.sent();
                        errorCount++;
                        this.logger.error("[Export] Failed to export ".concat(type, " \"").concat(name_1, "\": ").concat(err_1.message));
                        return [3 /*break*/, 11];
                    case 11:
                        _a++;
                        return [3 /*break*/, 6];
                    case 12:
                        // Diagnostic summary per type
                        if (list.length > 0) {
                            this.logger.info("[Export] ".concat(pluralType, ": listed=").concat(list.length, ", saved=").concat(savedCount, ", emptyDDL=").concat(emptyDDLCount, ", errors=").concat(errorCount));
                        }
                        // Save list file for parity with legacy
                        if (!specificName) {
                            fs.writeFileSync(path.join(baseDir, 'current-ddl', "".concat(pluralType.toLowerCase(), ".list")), exportedNames.join('\n'));
                        }
                        _d.label = 13;
                    case 13:
                        _i++;
                        return [3 /*break*/, 4];
                    case 14:
                        this.logger.info("Exported schema for ".concat(envName, ": ").concat(JSON.stringify(summary)));
                        return [2 /*return*/, summary];
                    case 15: return [4 /*yield*/, driver.disconnect()];
                    case 16:
                        _d.sent();
                        return [7 /*endfinally*/];
                    case 17: return [2 /*return*/];
                }
            });
        });
    };
    ExporterService.prototype.isSkipObject = function (name) {
        var skipList = ['information_schema', 'performance_schema', 'mysql', 'sys'];
        return skipList.includes(name.toLowerCase());
    };
    ExporterService.prototype._ensureDir = function (p) {
        if (!fs.existsSync(p)) {
            fs.mkdirSync(p, { recursive: true });
        }
    };
    ExporterService.prototype._listObjects = function (introspection, dbName, type, specificName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (specificName)
                    return [2 /*return*/, [specificName]];
                switch (type) {
                    case 'TABLE':
                        return [2 /*return*/, introspection.listTables(dbName)];
                    case 'VIEW':
                        return [2 /*return*/, introspection.listViews(dbName)];
                    case 'PROCEDURE':
                        return [2 /*return*/, introspection.listProcedures(dbName)];
                    case 'FUNCTION':
                        return [2 /*return*/, introspection.listFunctions(dbName)];
                    case 'TRIGGER':
                        return [2 /*return*/, introspection.listTriggers(dbName)];
                    case 'EVENT':
                        return [2 /*return*/, introspection.listEvents(dbName)];
                    default:
                        return [2 /*return*/, []];
                }
                return [2 /*return*/];
            });
        });
    };
    ExporterService.prototype._getDDL = function (introspection, dbName, type, name) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (type) {
                    case 'TABLE':
                        return [2 /*return*/, introspection.getTableDDL(dbName, name)];
                    case 'VIEW':
                        return [2 /*return*/, introspection.getViewDDL(dbName, name)];
                    case 'PROCEDURE':
                        return [2 /*return*/, introspection.getProcedureDDL(dbName, name)];
                    case 'FUNCTION':
                        return [2 /*return*/, introspection.getFunctionDDL(dbName, name)];
                    case 'TRIGGER':
                        return [2 /*return*/, introspection.getTriggerDDL(dbName, name)];
                    case 'EVENT':
                        return [2 /*return*/, introspection.getEventDDL(dbName, name)];
                    default:
                        return [2 /*return*/, ''];
                }
                return [2 /*return*/];
            });
        });
    };
    ExporterService.prototype.exportTableData = function (envName, tableName, format, outputPath) {
        return __awaiter(this, void 0, void 0, function () {
            var connection, driver, data, content, projectBaseDir, finalPath;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.logger.info("\uD83D\uDCCA [Exporter] exportTableData: table=".concat(tableName, ", format=").concat(format, ", env=").concat(envName));
                        connection = this.configService.getConnection(envName);
                        if (!connection)
                            throw new Error("Connection not found for env: ".concat(envName));
                        return [4 /*yield*/, this.driverFactory.create(connection.type, connection.config)];
                    case 1:
                        driver = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, , 5, 7]);
                        return [4 /*yield*/, driver.connect()];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, driver.query("SELECT * FROM ".concat(tableName, " LIMIT 10000"))];
                    case 4:
                        data = _a.sent();
                        content = '';
                        if (format === 'json') {
                            content = JSON.stringify(data, null, 2);
                        }
                        else {
                            content = this._convertToCSV(data);
                        }
                        projectBaseDir = this.storageService.getProjectBaseDir ? this.storageService.getProjectBaseDir() : process.cwd();
                        finalPath = outputPath || path.join(projectBaseDir, 'exports', "".concat(tableName, ".").concat(format));
                        this._ensureDir(path.dirname(finalPath));
                        fs.writeFileSync(finalPath, content);
                        this.logger.info("\u2705 [Exporter] Exported ".concat(data.length, " rows to ").concat(finalPath));
                        return [2 /*return*/, { path: finalPath, count: data.length }];
                    case 5: return [4 /*yield*/, driver.disconnect()];
                    case 6:
                        _a.sent();
                        return [7 /*endfinally*/];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    ExporterService.prototype._convertToCSV = function (data) {
        if (!data || data.length === 0)
            return '';
        var headers = Object.keys(data[0]);
        var rows = data.map(function (row) {
            return headers.map(function (header) {
                var val = row[header];
                if (val === null || val === undefined)
                    return '';
                if (typeof val === 'string') {
                    // Escape quotes and wrap in quotes
                    return "\"".concat(val.replace(/"/g, '""'), "\"");
                }
                if (val instanceof Date) {
                    return val.toISOString();
                }
                return val;
            }).join(',');
        });
        return __spreadArray([headers.join(',')], rows, true).join('\n');
    };
    return ExporterService;
}());
exports.ExporterService = ExporterService;
