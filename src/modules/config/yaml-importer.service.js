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
exports.YamlImporterService = void 0;
var getLogger = require('andb-logger').getLogger;
var fs = __importStar(require("fs"));
var path = __importStar(require("path"));
var yaml = __importStar(require("js-yaml"));
var crypto = __importStar(require("crypto"));
var YamlImporterService = /** @class */ (function () {
    function YamlImporterService(storageService) {
        this.storageService = storageService;
        this.logger = getLogger({ logName: 'YamlImporterService' });
    }
    YamlImporterService.prototype.runImportIfNecessary = function () {
        return __awaiter(this, void 0, void 0, function () {
            var cwdConfigPath, legacyConfigPath, targetPath, rawFile, doc, existingProjects, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cwdConfigPath = path.join(process.cwd(), 'andb.yaml');
                        legacyConfigPath = path.join(process.cwd(), 'config', 'andb.yaml');
                        targetPath = '';
                        if (fs.existsSync(cwdConfigPath)) {
                            targetPath = cwdConfigPath;
                        }
                        else if (fs.existsSync(legacyConfigPath)) {
                            targetPath = legacyConfigPath;
                        }
                        if (!targetPath) {
                            return [2 /*return*/]; // No legacy config found to import
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        this.logger.info("Found legacy configuration at ".concat(targetPath, ". Starting YAML to SQLite dogfooding import..."));
                        rawFile = fs.readFileSync(targetPath, 'utf8');
                        doc = yaml.load(rawFile) || {};
                        return [4 /*yield*/, this.storageService.getProjects()];
                    case 2:
                        existingProjects = _a.sent();
                        if (existingProjects && existingProjects.length > 0) {
                            this.logger.info("Projects already exist in SQLite. Skipping YAML import to prevent overwriting.");
                            this._backupYamlFile(targetPath);
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this._importToSqlite(doc)];
                    case 3:
                        _a.sent();
                        this.logger.info("Successfully imported legacy YAML configuration into SQLite.");
                        this._backupYamlFile(targetPath);
                        return [3 /*break*/, 5];
                    case 4:
                        e_1 = _a.sent();
                        this.logger.error("YAML Import Failed: ".concat(e_1.message));
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    YamlImporterService.prototype._backupYamlFile = function (originalPath) {
        try {
            var backupPath = "".concat(originalPath, ".backup");
            fs.renameSync(originalPath, backupPath);
            this.logger.info("Renamed legacy andb.yaml to andb.yaml.backup");
        }
        catch (e) {
            this.logger.warn("Could not rename andb.yaml to backup: ".concat(e.message));
        }
    };
    YamlImporterService.prototype._importToSqlite = function (doc) {
        return __awaiter(this, void 0, void 0, function () {
            var projectId, projectName, envs, _i, _a, envKey, dbConfig, envId, sourceType;
            var _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        projectId = crypto.randomUUID();
                        projectName = doc.name || path.basename(process.cwd()) || 'Imported Legacy Project';
                        return [4 /*yield*/, this.storageService.saveProject({
                                id: projectId,
                                name: projectName,
                                description: 'Auto-imported from legacy andb.yaml',
                                is_favorite: 1,
                                order_index: 0
                            })];
                    case 1:
                        _f.sent();
                        envs = doc.getDBDestination || doc.environments || doc.ENVIRONMENTS || {};
                        _i = 0, _a = Object.keys(envs);
                        _f.label = 2;
                    case 2:
                        if (!(_i < _a.length)) return [3 /*break*/, 5];
                        envKey = _a[_i];
                        dbConfig = envs[envKey];
                        envId = crypto.randomUUID();
                        sourceType = 'mysql';
                        if (dbConfig.type) {
                            sourceType = dbConfig.type.toLowerCase();
                        }
                        else if (dbConfig.path || dbConfig.host === 'file') {
                            sourceType = 'dump';
                        }
                        return [4 /*yield*/, this.storageService.saveProjectEnvironment({
                                id: envId,
                                project_id: projectId,
                                env_name: envKey.toUpperCase(),
                                source_type: sourceType,
                                path: dbConfig.path || null,
                                host: dbConfig.host || null,
                                port: dbConfig.port || (sourceType === 'mysql' ? 3306 : null),
                                username: dbConfig.user || dbConfig.username || null,
                                database_name: dbConfig.database || dbConfig.database_name || null,
                                // TheAndb SQLite natively supports SSH tunnel configs, parse them if present
                                use_ssh_tunnel: dbConfig.ssh ? 1 : 0,
                                ssh_host: ((_b = dbConfig.ssh) === null || _b === void 0 ? void 0 : _b.host) || null,
                                ssh_port: ((_c = dbConfig.ssh) === null || _c === void 0 ? void 0 : _c.port) || 22,
                                ssh_username: ((_d = dbConfig.ssh) === null || _d === void 0 ? void 0 : _d.username) || null,
                                ssh_key_path: ((_e = dbConfig.ssh) === null || _e === void 0 ? void 0 : _e.privateKey) || null,
                                // Skip passwords
                                use_ssl: dbConfig.ssl ? 1 : 0,
                                is_read_only: dbConfig.readonly ? 1 : 0
                            })];
                    case 3:
                        _f.sent();
                        _f.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5:
                        if (!doc.domainNormalizationPattern) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.storageService.saveProjectSetting(projectId, 'domain_normalization_pattern', String(doc.domainNormalizationPattern))];
                    case 6:
                        _f.sent();
                        _f.label = 7;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    return YamlImporterService;
}());
exports.YamlImporterService = YamlImporterService;
