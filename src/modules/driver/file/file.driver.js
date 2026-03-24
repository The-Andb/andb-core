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
exports.FileDriver = void 0;
var getLogger = require('andb-logger').getLogger;
var fs = __importStar(require("fs"));
var path = __importStar(require("path"));
var file_introspection_1 = require("./file.introspection");
var mysql_migrator_1 = require("../../migrator/mysql/mysql.migrator");
var FileDriver = /** @class */ (function () {
    function FileDriver(config) {
        this.config = config;
        this.logger = getLogger({ logName: 'FileDriver' });
        this.basePath = '';
    }
    FileDriver.prototype.connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var configPath;
            return __generator(this, function (_a) {
                configPath = this.config.path;
                if (!configPath) {
                    throw new Error('File path is required in configuration (field "path")');
                }
                this.basePath = path.isAbsolute(configPath)
                    ? configPath
                    : path.resolve(process.cwd(), configPath);
                if (!fs.existsSync(this.basePath)) {
                    throw new Error("Base path for files not found: ".concat(this.basePath));
                }
                this.logger.info("Connected to File Storage at: ".concat(this.basePath));
                return [2 /*return*/];
            });
        });
    };
    FileDriver.prototype.disconnect = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/];
            });
        });
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    FileDriver.prototype.query = function (sql) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.logger.warn("Query on FileDriver is not supported: ".concat(sql));
                return [2 /*return*/, []];
            });
        });
    };
    FileDriver.prototype.getIntrospectionService = function () {
        if (!this.introspectionService) {
            this.introspectionService = new file_introspection_1.FileIntrospectionService(this);
        }
        return this.introspectionService;
    };
    FileDriver.prototype.getMigrator = function () {
        if (!this.migrator) {
            this.migrator = new mysql_migrator_1.MysqlMigrator(); // Defaults to MySQL syntax
        }
        return this.migrator;
    };
    FileDriver.prototype.getMonitoringService = function () {
        var _this = this;
        return {
            getProcessList: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, []];
            }); }); },
            getStatus: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, ({ basePath: this.basePath })];
            }); }); },
            getVariables: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, ({})];
            }); }); },
            getVersion: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, 'FileDriver-4.0'];
            }); }); },
            getConnections: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, []];
            }); }); },
            getTransactions: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, []];
            }); }); },
        };
    };
    FileDriver.prototype.getSessionContext = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, {}];
            });
        });
    };
    FileDriver.prototype.setForeignKeyChecks = function (_enabled) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/];
            });
        });
    };
    FileDriver.prototype.generateUserSetupScript = function (_params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new Error('User setup script generation not supported for FileDriver.');
            });
        });
    };
    /**
     * Internal helper to list names of objects in a subdirectory
     */
    FileDriver.prototype.listObjects = function (folder) {
        return __awaiter(this, void 0, void 0, function () {
            var dir, files;
            return __generator(this, function (_a) {
                dir = path.join(this.basePath, folder.toLowerCase());
                if (!fs.existsSync(dir))
                    return [2 /*return*/, []];
                try {
                    files = fs.readdirSync(dir);
                    return [2 /*return*/, files
                            .filter(function (f) { return f.endsWith('.sql'); })
                            .map(function (f) { return f.replace(/\.sql$/, ''); })];
                }
                catch (err) {
                    this.logger.error("Failed to list objects in ".concat(dir, ": ").concat(err instanceof Error ? err.message : err));
                    return [2 /*return*/, []];
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Internal helper to read a DDL file
     */
    FileDriver.prototype.readObject = function (folder, name) {
        return __awaiter(this, void 0, void 0, function () {
            var filePath;
            return __generator(this, function (_a) {
                filePath = path.join(this.basePath, folder.toLowerCase(), "".concat(name, ".sql"));
                if (!fs.existsSync(filePath))
                    return [2 /*return*/, ''];
                try {
                    return [2 /*return*/, fs.readFileSync(filePath, 'utf8')];
                }
                catch (err) {
                    this.logger.error("Failed to read object from ".concat(filePath, ": ").concat(err instanceof Error ? err.message : err));
                    return [2 /*return*/, ''];
                }
                return [2 /*return*/];
            });
        });
    };
    return FileDriver;
}());
exports.FileDriver = FileDriver;
