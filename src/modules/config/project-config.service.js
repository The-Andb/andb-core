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
exports.ProjectConfigService = void 0;
var getLogger = require('andb-logger').getLogger;
var connection_interface_1 = require("../../common/interfaces/connection.interface");
var ProjectConfigService = /** @class */ (function () {
    function ProjectConfigService() {
        this.logger = getLogger({ logName: 'ProjectConfigService' });
        this.config = {};
        this.activeProjectId = null;
        // Configs are now late-loaded by init()
    }
    /**
     * Called exactly once during Container boot lifecycle.
     */
    ProjectConfigService.prototype.init = function (storageService) {
        return __awaiter(this, void 0, void 0, function () {
            var projects, userSettings_1, defaultProject, found, envs, settings, _i, envs_1, env, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.storageService = storageService;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 6, , 7]);
                        return [4 /*yield*/, this.storageService.getProjects()];
                    case 2:
                        projects = _a.sent();
                        if (!projects || projects.length === 0) {
                            this.logger.warn("ProjectConfigService.init(): No projects found in SQLite DB.");
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.storageService.getUserSettings()];
                    case 3:
                        userSettings_1 = _a.sent();
                        defaultProject = projects[0];
                        if (userSettings_1 && userSettings_1.default_cli_project_id) {
                            found = projects.find(function (p) { return p.id === userSettings_1.default_cli_project_id; });
                            if (found) {
                                defaultProject = found;
                            }
                        }
                        this.activeProjectId = defaultProject.id;
                        return [4 /*yield*/, this.storageService.getProjectEnvironments(defaultProject.id)];
                    case 4:
                        envs = _a.sent();
                        return [4 /*yield*/, this.storageService.getProjectSettings(defaultProject.id)];
                    case 5:
                        settings = _a.sent();
                        // Reconstruct the legacy config structure so existing getters do not break
                        this.config = {
                            projects: projects,
                            environments: {}, // mapped below
                            domainNormalization: {},
                            FEATURE_FLAGS: {} // Fallback generic
                        };
                        for (_i = 0, envs_1 = envs; _i < envs_1.length; _i++) {
                            env = envs_1[_i];
                            this.config.environments[env.env_name] = {
                                id: env.id,
                                type: env.source_type,
                                path: env.path,
                                host: env.host,
                                port: env.port,
                                user: env.username,
                                password: '', // We don't save passwords in Config anymore by design
                                database: env.database_name,
                                ssh: env.use_ssh_tunnel ? {
                                    host: env.ssh_host,
                                    port: env.ssh_port,
                                    username: env.ssh_username,
                                    privateKey: env.ssh_key_path
                                } : undefined,
                                ssl: env.use_ssl === 1,
                                readonly: env.is_read_only === 1
                            };
                        }
                        if (settings['domain_normalization_pattern']) {
                            this.config.domainNormalization = {
                                pattern: settings['domain_normalization_pattern'],
                                replacement: settings['domain_normalization_replacement'] || ''
                            };
                        }
                        return [3 /*break*/, 7];
                    case 6:
                        e_1 = _a.sent();
                        this.logger.error("Error loading configuration from SQLite: ".concat(e_1.message));
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    ProjectConfigService.prototype.getEnvironments = function () {
        var envMap = this.config.environments;
        if (envMap && typeof envMap === 'object') {
            return Object.keys(envMap);
        }
        return [];
    };
    ProjectConfigService.prototype.getDBDestination = function (env) {
        var destinations = this.config.environments;
        if (!destinations) {
            this.logger.warn("getDBDestination: No destinations found in config.");
            return null;
        }
        var config = destinations[env] || null;
        return config;
    };
    ProjectConfigService.prototype.getDBName = function (env) {
        var config = this.getDBDestination(env);
        return (config === null || config === void 0 ? void 0 : config.database) || 'unknown';
    };
    ProjectConfigService.prototype.getConnection = function (env) {
        var dbConfig = this.getDBDestination(env);
        if (!dbConfig)
            return null;
        return {
            type: dbConfig.type || connection_interface_1.ConnectionType.MYSQL,
            config: dbConfig,
        };
    };
    ProjectConfigService.prototype.getDomainNormalization = function (env) {
        var normConfig = this.config.domainNormalization;
        if (!normConfig)
            return { pattern: /(?!)/, replacement: '' };
        // If environment specific config exists, use it
        var norm = (env && normConfig[env]) ? normConfig[env] : normConfig;
        if (norm && norm.pattern) {
            try {
                var pattern = typeof norm.pattern === 'string'
                    ? new RegExp(norm.pattern, 'g')
                    : norm.pattern;
                return { pattern: pattern, replacement: norm.replacement || '' };
            }
            catch (e) {
                this.logger.error("Invalid domain normalization pattern: ".concat(norm.pattern));
            }
        }
        return { pattern: /(?!)/, replacement: '' };
    };
    ProjectConfigService.prototype.getAutoBackup = function () {
        // Default to false if not specified (safer for CLI/tests)
        if (this.config.autoBackup === undefined)
            return false;
        return !!this.config.autoBackup;
    };
    ProjectConfigService.prototype.setConnection = function (env, config, type) {
        if (type === void 0) { type = connection_interface_1.ConnectionType.MYSQL; }
        if (!this.config.environments) {
            this.config.environments = {};
        }
        this.config.environments[env] = __assign(__assign({}, config), { type: type });
        // We do NOT physically save here because the desktop UI directly calls StorageService now.
        // This is just a memory fallback if CLI manipulates something live.
    };
    ProjectConfigService.prototype.setDomainNormalization = function (pattern, replacement) {
        this.config.domainNormalization = { pattern: pattern, replacement: replacement };
    };
    ProjectConfigService.prototype.setAutoBackup = function (enabled) {
        this.config.autoBackup = enabled;
    };
    ProjectConfigService.prototype.getFeatureFlags = function () {
        return this.config.FEATURE_FLAGS || {};
    };
    ProjectConfigService.prototype.isFeatureEnabled = function (key) {
        var flags = this.getFeatureFlags();
        if (flags[key] !== undefined)
            return !!flags[key];
        // Fallback to process.env if not in YAML
        var envKey = "FEATURE_".concat(key.toUpperCase().replace(/\./g, '_'));
        return process.env[envKey] === 'true';
    };
    ProjectConfigService.prototype.setFeatureFlag = function (key, enabled) {
        if (!this.config.FEATURE_FLAGS) {
            this.config.FEATURE_FLAGS = {};
        }
        this.config.FEATURE_FLAGS[key] = enabled;
    };
    ProjectConfigService.prototype.saveConfig = function () {
        this.logger.warn('saveConfig() called dynamically. andb.yaml is no longer supported directly.');
    };
    return ProjectConfigService;
}());
exports.ProjectConfigService = ProjectConfigService;
