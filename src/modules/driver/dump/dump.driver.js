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
exports.DumpDriver = void 0;
var getLogger = require('andb-logger').getLogger;
var fs = __importStar(require("fs"));
var path = __importStar(require("path"));
var dump_introspection_1 = require("./dump.introspection");
var mysql_migrator_1 = require("../../migrator/mysql/mysql.migrator");
var DumpDriver = /** @class */ (function () {
    function DumpDriver(config, parserService) {
        this.config = config;
        this.parserService = parserService;
        this.logger = getLogger({ logName: 'DumpDriver' });
        // Store DDLs by type
        this.data = {
            TABLES: new Map(),
            VIEWS: new Map(),
            PROCEDURES: new Map(),
            FUNCTIONS: new Map(),
            TRIGGERS: new Map(),
            EVENTS: new Map(),
        };
    }
    DumpDriver.prototype.connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var dumpPath, resolvedPath, content, count;
            return __generator(this, function (_a) {
                dumpPath = this.config.path || this.config.host || this.config.database;
                if (!dumpPath) {
                    throw new Error('Dump file path is required (in host field)');
                }
                resolvedPath = dumpPath;
                if (dumpPath.startsWith('./') || dumpPath.startsWith('../')) {
                    resolvedPath = path.resolve(process.cwd(), dumpPath);
                }
                if (!fs.existsSync(resolvedPath)) {
                    throw new Error("Dump file not found: ".concat(resolvedPath));
                }
                this.logger.info("Parsing dump file: ".concat(resolvedPath));
                content = fs.readFileSync(resolvedPath, 'utf8');
                this._parseDump(content);
                count = this.data.TABLES.size;
                this.logger.info("Parsed ".concat(count, " tables from dump."));
                return [2 /*return*/];
            });
        });
    };
    /**
     * Load DDLs from storage data (SQLite) instead of reading from filesystem.
     * Used by offline compare flow (Rule #1: Compare = OFFLINE).
     * @param ddlObjects Array of { name, content } for a specific DDL type
     * @param ddlType Uppercase plural type: 'TABLES', 'PROCEDURES', etc.
     */
    DumpDriver.prototype.loadFromStorage = function (ddlObjects, ddlType) {
        var type = ddlType.toUpperCase();
        if (!this.data[type]) {
            this.data[type] = new Map();
        }
        for (var _i = 0, ddlObjects_1 = ddlObjects; _i < ddlObjects_1.length; _i++) {
            var obj = ddlObjects_1[_i];
            if (obj.name && obj.content) {
                this.data[type].set(obj.name, obj.content);
            }
        }
    };
    DumpDriver.prototype.disconnect = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/];
            });
        });
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DumpDriver.prototype.query = function (sql) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.logger.warn("Query on DumpDriver is not supported: ".concat(sql));
                return [2 /*return*/, []];
            });
        });
    };
    DumpDriver.prototype.getIntrospectionService = function () {
        if (!this.introspectionService) {
            this.introspectionService = new dump_introspection_1.DumpIntrospectionService(this);
        }
        return this.introspectionService;
    };
    DumpDriver.prototype.getMigrator = function () {
        if (!this.migrator) {
            this.migrator = new mysql_migrator_1.MysqlMigrator(); // Offline dumps generate MySQL syntax currently
        }
        return this.migrator;
    };
    DumpDriver.prototype.getMonitoringService = function () {
        var _this = this;
        // Stub
        return {
            getProcessList: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, []];
            }); }); },
            getStatus: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, ({})];
            }); }); },
            getVariables: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, ({})];
            }); }); },
            getVersion: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, 'Dump-1.0'];
            }); }); },
            getConnections: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, []];
            }); }); },
            getTransactions: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, []];
            }); }); },
        };
    };
    DumpDriver.prototype.getSessionContext = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, {}];
            });
        });
    };
    DumpDriver.prototype.setForeignKeyChecks = function (_enabled) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/];
            });
        });
    };
    DumpDriver.prototype.generateUserSetupScript = function (_params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new Error('User setup script generation is not supported for offline dump connections.');
            });
        });
    };
    /**
     * Stateful dump parser (Ported from Legacy DumpDriver.js)
     */
    DumpDriver.prototype._parseDump = function (content) {
        if (!content)
            return;
        // 1. Remove comments but keep pragmas
        var cleaned = content.replace(/(\/\*([\s\S]*?)\*\/)|(--.*)|(#.*)/g, function (match) {
            if (match.startsWith('/*!')) {
                // Executable comment: /*!50003 CREATE ... */ -> CREATE ...
                return match.replace(/^\/\*!\d*\s*/, '').replace(/\s*\*\/$/, ' ');
            }
            return '';
        });
        var lines = cleaned.split('\n');
        var buffer = [];
        var inBeginEndBlock = 0;
        var currentDelimiter = ';';
        for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
            var line = lines_1[_i];
            var trimmed = line.trim();
            if (!trimmed)
                continue;
            // DELIMITER logic
            if (trimmed.toUpperCase().startsWith('DELIMITER')) {
                var parts = trimmed.split(/\s+/);
                if (parts.length > 1) {
                    currentDelimiter = parts[1];
                }
                continue;
            }
            // BEGIN...END tracking (naive regex)
            var upper = trimmed.toUpperCase();
            if (/\bBEGIN\b/.test(upper))
                inBeginEndBlock++;
            if (/\bEND\b/.test(upper))
                inBeginEndBlock--;
            buffer.push(line);
            // Check statement complete
            var isActuallyDelimited = trimmed.endsWith(currentDelimiter) && (currentDelimiter !== ';' || inBeginEndBlock <= 0);
            if (isActuallyDelimited) {
                var stmt = buffer.join('\n').trim();
                if (stmt.endsWith(currentDelimiter)) {
                    stmt = stmt.substring(0, stmt.length - currentDelimiter.length).trim();
                }
                if (stmt) {
                    this._processStatement(stmt);
                }
                buffer = [];
                inBeginEndBlock = 0;
            }
        }
    };
    DumpDriver.prototype._processStatement = function (stmt) {
        var normalized = stmt.replace(/\s+/g, ' ');
        // Detect CREATE statement
        var createMatch = normalized.match(/CREATE\s+(?:OR\s+REPLACE\s+)?(?:(?:DEFINER\s*=\s*(?:'[^']+'|`[^`]+`|\S+)|ALGORITHM\s*=\s*\S+|SQL\s+SECURITY\s+\S+)\s+)*(TABLE|VIEW|PROCEDURE|FUNCTION|TRIGGER|EVENT)\s+(?:IF\s+NOT\s+EXISTS\s+)?((?:`[^`]+`)|(?:[^\s\(\)]+))/i);
        if (!createMatch)
            return;
        var typeKey = createMatch[1].toUpperCase() + 'S'; // TABLE -> TABLES
        var rawName = createMatch[2];
        var name = this._extractName(rawName);
        if (name && this.data[typeKey]) {
            this.data[typeKey].set(name, stmt + ';');
        }
    };
    DumpDriver.prototype._extractName = function (rawName) {
        if (!rawName)
            return null;
        var name = rawName.replace(/[`"']/g, '');
        if (name.includes('.')) {
            name = name.split('.').pop() || name;
        }
        return name;
    };
    return DumpDriver;
}());
exports.DumpDriver = DumpDriver;
