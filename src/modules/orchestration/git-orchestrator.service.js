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
exports.GitOrchestrator = void 0;
var getLogger = require('andb-logger').getLogger;
var path = __importStar(require("path"));
var GitOrchestrator = /** @class */ (function () {
    function GitOrchestrator(mirrorService) {
        this.mirrorService = mirrorService;
        this.logger = getLogger({ logName: 'GitOrchestrator' });
        this.gitService = null;
    }
    GitOrchestrator.prototype.getGitService = function () {
        return __awaiter(this, void 0, void 0, function () {
            var GitService;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.gitService)
                            return [2 /*return*/, this.gitService];
                        this.logger.info('🚀 Lazy loading GitService...');
                        return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../git/git.service')); })];
                    case 1:
                        GitService = (_a.sent()).GitService;
                        this.gitService = new GitService();
                        return [2 /*return*/, this.gitService];
                }
            });
        });
    };
    GitOrchestrator.prototype.gitInit = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var config, gitService;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = payload.config;
                        return [4 /*yield*/, this.getGitService()];
                    case 1:
                        gitService = _a.sent();
                        return [4 /*yield*/, gitService.initialize(config)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, { success: true }];
                }
            });
        });
    };
    GitOrchestrator.prototype.gitStatus = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var config, env, db, gitService, status, drift, suggestedMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = payload.config, env = payload.env, db = payload.db;
                        return [4 /*yield*/, this.getGitService()];
                    case 1:
                        gitService = _a.sent();
                        return [4 /*yield*/, gitService.initialize(config)];
                    case 2:
                        _a.sent();
                        if (!config.remoteUrl) return [3 /*break*/, 4];
                        return [4 /*yield*/, gitService.fetch()];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [4 /*yield*/, gitService.getStatus()];
                    case 5:
                        status = _a.sent();
                        return [4 /*yield*/, gitService.checkDrift(config.branch || 'main')];
                    case 6:
                        drift = _a.sent();
                        suggestedMessage = '';
                        if (status.modifiedFiles.length > 0 || status.untrackedFiles.length > 0) {
                            suggestedMessage = this.generateSemanticMessage(status, env || 'DEV', db || 'default');
                        }
                        return [2 /*return*/, __assign(__assign({ success: true }, status), { behind: drift.behind, ahead: drift.ahead, suggestedMessage: suggestedMessage })];
                }
            });
        });
    };
    GitOrchestrator.prototype.gitSync = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var config, env, db, message, author, gitService, storagePath, status, hasChanges, finalMessage, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = payload.config, env = payload.env, db = payload.db, message = payload.message, author = payload.author;
                        return [4 /*yield*/, this.getGitService()];
                    case 1:
                        gitService = _a.sent();
                        return [4 /*yield*/, gitService.initialize(config)];
                    case 2:
                        _a.sent();
                        storagePath = config.storagePath || path.join(process.cwd(), 'db');
                        return [4 /*yield*/, this.mirrorService.mirrorToFilesystem(env, db, storagePath)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, gitService.getStatus()];
                    case 4:
                        status = _a.sent();
                        hasChanges = status.modifiedFiles.length > 0 || status.untrackedFiles.length > 0;
                        if (!hasChanges) {
                            return [2 /*return*/, { success: true, message: 'No changes to sync' }];
                        }
                        finalMessage = message;
                        if (!finalMessage) {
                            finalMessage = this.generateSemanticMessage(status, env, db);
                        }
                        return [4 /*yield*/, gitService.commit({
                                message: finalMessage,
                                author: author,
                            })];
                    case 5:
                        _a.sent();
                        if (!config.remoteUrl) return [3 /*break*/, 9];
                        _a.label = 6;
                    case 6:
                        _a.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, gitService.push()];
                    case 7:
                        _a.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        err_1 = _a.sent();
                        this.logger.error("Git push failed: ".concat(err_1.message));
                        return [2 /*return*/, {
                                success: true,
                                message: "Committed locally but push failed: ".concat(err_1.message),
                                commitMessage: finalMessage
                            }];
                    case 9: return [2 /*return*/, { success: true, commitMessage: finalMessage }];
                }
            });
        });
    };
    GitOrchestrator.prototype.gitPull = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var config, gitService;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = payload.config;
                        return [4 /*yield*/, this.getGitService()];
                    case 1:
                        gitService = _a.sent();
                        return [4 /*yield*/, gitService.initialize(config)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, gitService.pull()];
                    case 3:
                        _a.sent();
                        return [2 /*return*/, { success: true, message: 'Pull and rebase successful' }];
                }
            });
        });
    };
    GitOrchestrator.prototype.generateSemanticMessage = function (status, env, db) {
        var allChanges = __spreadArray(__spreadArray([], status.modifiedFiles, true), status.untrackedFiles, true);
        var groups = {};
        for (var _i = 0, allChanges_1 = allChanges; _i < allChanges_1.length; _i++) {
            var file = allChanges_1[_i];
            var parts = file.split(/[/\\]/);
            if (parts.length >= 2) {
                var type = parts[parts.length - 2];
                var name_1 = parts[parts.length - 1].replace('.sql', '');
                if (!groups[type])
                    groups[type] = [];
                groups[type].push(name_1);
            }
        }
        var typeSummaries = Object.entries(groups)
            .map(function (_a) {
            var type = _a[0], names = _a[1];
            var uniqueNames = Array.from(new Set(names));
            if (uniqueNames.length > 3) {
                return "".concat(type, "(").concat(uniqueNames.length, " objects)");
            }
            return "".concat(type, "(").concat(uniqueNames.join(', '), ")");
        })
            .join(', ');
        var prefix = status.untrackedFiles.length > 0 ? 'feat' : 'refactor';
        return "".concat(prefix, "(schema): ").concat(typeSummaries || 'sync', " [").concat(env, "/").concat(db, "]");
    };
    return GitOrchestrator;
}());
exports.GitOrchestrator = GitOrchestrator;
