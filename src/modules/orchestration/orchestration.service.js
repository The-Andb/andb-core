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
exports.OrchestrationService = void 0;
var getLogger = require('andb-logger').getLogger;
var OrchestrationService = /** @class */ (function () {
    function OrchestrationService(configService, features, securityOrchestrator, gitOrchestrator, schemaOrchestrator, parser) {
        this.configService = configService;
        this.features = features;
        this.securityOrchestrator = securityOrchestrator;
        this.gitOrchestrator = gitOrchestrator;
        this.schemaOrchestrator = schemaOrchestrator;
        this.parser = parser;
        this.logger = getLogger({ logName: 'OrchestrationService' });
    }
    OrchestrationService.prototype.execute = function (operation, payload) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.logger.info("Executing operation: ".concat(operation));
                        // Ensure config is synced before dispatching
                        this.syncConfigWithPayload(payload);
                        _a = operation;
                        switch (_a) {
                            case 'parseTable': return [3 /*break*/, 1];
                            case 'getSchemaObjects': return [3 /*break*/, 2];
                            case 'export': return [3 /*break*/, 4];
                            case 'mcp-server-start': return [3 /*break*/, 6];
                            case 'compare': return [3 /*break*/, 7];
                            case 'semanticCompare': return [3 /*break*/, 9];
                            case 'getSchemaNormalized': return [3 /*break*/, 11];
                            case 'migrate': return [3 /*break*/, 13];
                            case 'create-snapshot': return [3 /*break*/, 15];
                            case 'search': return [3 /*break*/, 17];
                            case 'compare-arbitrary': return [3 /*break*/, 19];
                            case 'compare-custom': return [3 /*break*/, 21];
                            case 'generate': return [3 /*break*/, 23];
                            case 'setup-restricted-user': return [3 /*break*/, 25];
                            case 'generate-user-setup-script': return [3 /*break*/, 27];
                            case 'probe-restricted-user': return [3 /*break*/, 29];
                            case 'test-connection': return [3 /*break*/, 31];
                            case 'git-status': return [3 /*break*/, 33];
                            case 'git-init': return [3 /*break*/, 35];
                            case 'git-sync': return [3 /*break*/, 37];
                            case 'git-pull': return [3 /*break*/, 39];
                            case 'updateFeatureFlag': return [3 /*break*/, 41];
                            case 'getFeaturesStatus': return [3 /*break*/, 43];
                        }
                        return [3 /*break*/, 45];
                    case 1: return [2 /*return*/, this.parser.parseTableDetailed(payload.ddl)];
                    case 2: return [4 /*yield*/, this.schemaOrchestrator.getSchemaObjects(payload)];
                    case 3: return [2 /*return*/, _b.sent()];
                    case 4: return [4 /*yield*/, this.schemaOrchestrator.exportSchema(payload)];
                    case 5: return [2 /*return*/, _b.sent()];
                    case 6:
                        if (!this.features.mcpServer) {
                            throw new Error('Feature MCP_SERVER is disabled in configuration.');
                        }
                        return [2 /*return*/, { success: true }];
                    case 7: return [4 /*yield*/, this.schemaOrchestrator.compareSchema(payload)];
                    case 8: return [2 /*return*/, _b.sent()];
                    case 9: return [4 /*yield*/, this.schemaOrchestrator.semanticCompare(payload)];
                    case 10: return [2 /*return*/, _b.sent()];
                    case 11: return [4 /*yield*/, this.schemaOrchestrator.getSchemaNormalized(payload)];
                    case 12: return [2 /*return*/, _b.sent()];
                    case 13: return [4 /*yield*/, this.schemaOrchestrator.migrateSchema(payload)];
                    case 14: return [2 /*return*/, _b.sent()];
                    case 15: return [4 /*yield*/, this.schemaOrchestrator.createSnapshot(payload)];
                    case 16: return [2 /*return*/, _b.sent()];
                    case 17: return [4 /*yield*/, this.schemaOrchestrator.searchDependencies(payload)];
                    case 18: return [2 /*return*/, _b.sent()];
                    case 19: return [4 /*yield*/, this.schemaOrchestrator.compareArbitraryDDL(payload)];
                    case 20: return [2 /*return*/, _b.sent()];
                    case 21: return [4 /*yield*/, this.schemaOrchestrator.compareCustomSelection(payload)];
                    case 22: return [2 /*return*/, _b.sent()];
                    case 23: return [4 /*yield*/, this.schemaOrchestrator.generate(payload)];
                    case 24: return [2 /*return*/, _b.sent()];
                    case 25: return [4 /*yield*/, this.securityOrchestrator.setupRestrictedUser(payload)];
                    case 26: return [2 /*return*/, _b.sent()];
                    case 27: return [4 /*yield*/, this.securityOrchestrator.generateUserSetupScript(payload)];
                    case 28: return [2 /*return*/, _b.sent()];
                    case 29: return [4 /*yield*/, this.securityOrchestrator.probeRestrictedUser(payload)];
                    case 30: return [2 /*return*/, _b.sent()];
                    case 31: return [4 /*yield*/, this.securityOrchestrator.testConnection(payload)];
                    case 32: return [2 /*return*/, _b.sent()];
                    case 33: return [4 /*yield*/, this.gitOrchestrator.gitStatus(payload)];
                    case 34: return [2 /*return*/, _b.sent()];
                    case 35: return [4 /*yield*/, this.gitOrchestrator.gitInit(payload)];
                    case 36: return [2 /*return*/, _b.sent()];
                    case 37: return [4 /*yield*/, this.gitOrchestrator.gitSync(payload)];
                    case 38: return [2 /*return*/, _b.sent()];
                    case 39: return [4 /*yield*/, this.gitOrchestrator.gitPull(payload)];
                    case 40: return [2 /*return*/, _b.sent()];
                    case 41: return [4 /*yield*/, this.updateFeatureFlag(payload)];
                    case 42: return [2 /*return*/, _b.sent()];
                    case 43: return [4 /*yield*/, this.getFeaturesStatus()];
                    case 44: return [2 /*return*/, _b.sent()];
                    case 45: throw new Error("Unknown operation: ".concat(operation));
                }
            });
        });
    };
    OrchestrationService.prototype.syncConfigWithPayload = function (payload) {
        if (payload.sourceConfig && payload.srcEnv) {
            this.configService.setConnection(payload.srcEnv, payload.sourceConfig, payload.sourceConfig.type);
        }
        if (payload.targetConfig && payload.destEnv) {
            this.configService.setConnection(payload.destEnv, payload.targetConfig, payload.targetConfig.type);
        }
        if (payload.domainNormalization) {
            this.configService.setDomainNormalization(new RegExp(payload.domainNormalization.pattern), payload.domainNormalization.replacement);
        }
    };
    OrchestrationService.prototype.getFeaturesStatus = function () {
        return __awaiter(this, void 0, void 0, function () {
            var allFlags, yamlFlags;
            return __generator(this, function (_a) {
                allFlags = __assign({}, this.features);
                yamlFlags = this.configService.getFeatureFlags();
                return [2 /*return*/, __assign(__assign({}, allFlags), yamlFlags)];
            });
        });
    };
    OrchestrationService.prototype.updateFeatureFlag = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var key, enabled;
            return __generator(this, function (_a) {
                key = payload.key, enabled = payload.enabled;
                this.configService.setFeatureFlag(key, enabled);
                this.configService.saveConfig();
                return [2 /*return*/, { success: true, key: key, enabled: enabled }];
            });
        });
    };
    return OrchestrationService;
}());
exports.OrchestrationService = OrchestrationService;
