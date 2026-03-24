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
exports.SqliteIntrospectionService = void 0;
var crypto = __importStar(require("crypto"));
var SqliteIntrospectionService = /** @class */ (function () {
    function SqliteIntrospectionService(driver, parser) {
        this.driver = driver;
        this.parser = parser;
    }
    SqliteIntrospectionService.prototype.listTables = function (_dbName) {
        return __awaiter(this, void 0, void 0, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.driver.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, results.map(function (row) { return row.name; })];
                }
            });
        });
    };
    SqliteIntrospectionService.prototype.listViews = function (_dbName) {
        return __awaiter(this, void 0, void 0, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.driver.query("SELECT name FROM sqlite_master WHERE type='view'")];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, results.map(function (row) { return row.name; })];
                }
            });
        });
    };
    SqliteIntrospectionService.prototype.listProcedures = function (_dbName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, []];
            });
        });
    };
    SqliteIntrospectionService.prototype.listFunctions = function (_dbName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, []];
            });
        });
    };
    SqliteIntrospectionService.prototype.listTriggers = function (_dbName) {
        return __awaiter(this, void 0, void 0, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.driver.query("SELECT name FROM sqlite_master WHERE type='trigger'")];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, results.map(function (row) { return row.name; })];
                }
            });
        });
    };
    SqliteIntrospectionService.prototype.listEvents = function (_dbName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, []];
            });
        });
    };
    SqliteIntrospectionService.prototype._normalizeDDL = function (ddl) {
        return this.parser.cleanDefiner(ddl || '');
    };
    SqliteIntrospectionService.prototype.getTableDDL = function (_dbName, tableName) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.driver.query("SELECT sql FROM sqlite_master WHERE type='table' AND name = ?", [tableName])];
                    case 1:
                        result = _a.sent();
                        if (!result || result.length === 0)
                            return [2 /*return*/, ''];
                        return [2 /*return*/, this._normalizeDDL(result[0].sql)];
                }
            });
        });
    };
    SqliteIntrospectionService.prototype.getViewDDL = function (_dbName, viewName) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.driver.query("SELECT sql FROM sqlite_master WHERE type='view' AND name = ?", [viewName])];
                    case 1:
                        result = _a.sent();
                        if (!result || result.length === 0)
                            return [2 /*return*/, ''];
                        return [2 /*return*/, this._normalizeDDL(result[0].sql)];
                }
            });
        });
    };
    SqliteIntrospectionService.prototype.getProcedureDDL = function (_dbName, _procName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, ''];
            });
        });
    };
    SqliteIntrospectionService.prototype.getFunctionDDL = function (_dbName, _funcName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, ''];
            });
        });
    };
    SqliteIntrospectionService.prototype.getTriggerDDL = function (_dbName, triggerName) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.driver.query("SELECT sql FROM sqlite_master WHERE type='trigger' AND name = ?", [triggerName])];
                    case 1:
                        result = _a.sent();
                        if (!result || result.length === 0)
                            return [2 /*return*/, ''];
                        return [2 /*return*/, this._normalizeDDL(result[0].sql)];
                }
            });
        });
    };
    SqliteIntrospectionService.prototype.getEventDDL = function (_dbName, _eventName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, ''];
            });
        });
    };
    SqliteIntrospectionService.prototype.getChecksums = function (dbName) {
        return __awaiter(this, void 0, void 0, function () {
            var tables, map, _i, tables_1, name_1, ddl, hash;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.listTables(dbName)];
                    case 1:
                        tables = _a.sent();
                        map = {};
                        _i = 0, tables_1 = tables;
                        _a.label = 2;
                    case 2:
                        if (!(_i < tables_1.length)) return [3 /*break*/, 5];
                        name_1 = tables_1[_i];
                        return [4 /*yield*/, this.getTableDDL(dbName, name_1)];
                    case 3:
                        ddl = _a.sent();
                        hash = crypto.createHash('md5').update(ddl || '').digest('hex');
                        map[name_1] = "".concat(hash, "|");
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/, map];
                }
            });
        });
    };
    SqliteIntrospectionService.prototype.getObjectDDL = function (dbName, type, name) {
        return __awaiter(this, void 0, void 0, function () {
            var t;
            return __generator(this, function (_a) {
                t = type.toUpperCase().replace(/S$/, '');
                if (t === 'TABLE')
                    return [2 /*return*/, this.getTableDDL(dbName, name)];
                if (t === 'VIEW')
                    return [2 /*return*/, this.getViewDDL(dbName, name)];
                if (t === 'TRIGGER')
                    return [2 /*return*/, this.getTriggerDDL(dbName, name)];
                return [2 /*return*/, ''];
            });
        });
    };
    SqliteIntrospectionService.prototype.getTableColumns = function (_dbName, tableName) {
        return __awaiter(this, void 0, void 0, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.driver.query("PRAGMA table_info(\"".concat(tableName, "\")"))];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, results.map(function (row) { return ({
                                name: row.name,
                                type: row.type,
                                isNullable: row.notnull === 0,
                                defaultValue: row.dflt_value,
                                extra: row.pk ? 'PRIMARY KEY' : '',
                                comment: '',
                            }); })];
                }
            });
        });
    };
    return SqliteIntrospectionService;
}());
exports.SqliteIntrospectionService = SqliteIntrospectionService;
