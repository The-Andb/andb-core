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
exports.GitService = void 0;
var getLogger = require('andb-logger').getLogger;
var simple_git_1 = require("simple-git");
var fs = __importStar(require("fs"));
var GitService = /** @class */ (function () {
    function GitService() {
        this.logger = getLogger({ logName: 'GitService' });
        this.git = null;
        this.currentConfig = null;
    }
    GitService.prototype.initialize = function (config) {
        return __awaiter(this, void 0, void 0, function () {
            var baseDir, options, isRepo;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.currentConfig = config;
                        baseDir = config.storagePath || require('path').join(require('os').homedir(), '.andb', 'git-storage');
                        if (!fs.existsSync(baseDir)) {
                            fs.mkdirSync(baseDir, { recursive: true });
                        }
                        options = {
                            baseDir: baseDir,
                            binary: 'git',
                            maxConcurrentProcesses: 6,
                            trimmed: false,
                        };
                        this.git = (0, simple_git_1.simpleGit)(options);
                        return [4 /*yield*/, this.git.checkIsRepo()];
                    case 1:
                        isRepo = _a.sent();
                        if (!!isRepo) return [3 /*break*/, 6];
                        this.logger.info("Initializing new Git repository at ".concat(baseDir));
                        return [4 /*yield*/, this.git.init()];
                    case 2:
                        _a.sent();
                        // Force LF normalization (Phase 2)
                        return [4 /*yield*/, this.git.addConfig('core.autocrlf', 'false')];
                    case 3:
                        // Force LF normalization (Phase 2)
                        _a.sent();
                        return [4 /*yield*/, this.git.addConfig('core.safecrlf', 'false')];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, this.git.addConfig('core.eol', 'lf')];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6:
                        if (!config.remoteUrl) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.setupRemote(config.remoteUrl)];
                    case 7:
                        _a.sent();
                        _a.label = 8;
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    GitService.prototype.setupRemote = function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var remotes, origin;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.git)
                            return [2 /*return*/];
                        return [4 /*yield*/, this.git.getRemotes(true)];
                    case 1:
                        remotes = _a.sent();
                        origin = remotes.find(function (r) { return r.name === 'origin'; });
                        if (!!origin) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.git.addRemote('origin', url)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 3:
                        if (!(origin.refs.push !== url)) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.git.remote(['set-url', 'origin', url])];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    GitService.prototype.getStatus = function () {
        return __awaiter(this, void 0, void 0, function () {
            var status, branch;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.git)
                            throw new Error('GitService not initialized');
                        return [4 /*yield*/, this.git.status()];
                    case 1:
                        status = _b.sent();
                        return [4 /*yield*/, this.git.branch()];
                    case 2:
                        branch = _b.sent();
                        return [2 /*return*/, {
                                isRepo: true,
                                modifiedFiles: status.modified,
                                stagedFiles: status.staged,
                                untrackedFiles: status.not_added,
                                ahead: status.ahead,
                                behind: status.behind,
                                currentBranch: branch.current,
                                remote: (_a = this.currentConfig) === null || _a === void 0 ? void 0 : _a.remoteUrl
                            }];
                }
            });
        });
    };
    GitService.prototype.fetch = function () {
        return __awaiter(this, void 0, void 0, function () {
            var err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.git)
                            throw new Error('GitService not initialized');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.git.fetch()];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _a.sent();
                        this.logger.warn("Git fetch failed: ".concat(err_1.message));
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    GitService.prototype.checkDrift = function () {
        return __awaiter(this, arguments, void 0, function (branch) {
            var _a, baseBranch, workBranch, targetBase, currentWork, status_1, behindRes, aheadRes, err_2;
            if (branch === void 0) { branch = 'main'; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.git)
                            throw new Error('GitService not initialized');
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 6, , 7]);
                        _a = this.currentConfig || {}, baseBranch = _a.baseBranch, workBranch = _a.workBranch;
                        targetBase = baseBranch || branch;
                        currentWork = workBranch || 'main';
                        return [4 /*yield*/, this.git.status()];
                    case 2:
                        status_1 = _b.sent();
                        if (!(targetBase && targetBase !== currentWork)) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.git.raw(['rev-list', '--count', "HEAD..origin/".concat(targetBase)])];
                    case 3:
                        behindRes = _b.sent();
                        return [4 /*yield*/, this.git.raw(['rev-list', '--count', "origin/".concat(targetBase, "..HEAD")])];
                    case 4:
                        aheadRes = _b.sent();
                        return [2 /*return*/, {
                                ahead: parseInt(aheadRes.trim(), 10) || 0,
                                behind: parseInt(behindRes.trim(), 10) || 0
                            }];
                    case 5: return [2 /*return*/, {
                            ahead: status_1.ahead,
                            behind: status_1.behind
                        }];
                    case 6:
                        err_2 = _b.sent();
                        this.logger.error("Failed to check drift: ".concat(err_2.message));
                        return [2 /*return*/, { ahead: 0, behind: 0 }];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    GitService.prototype.commit = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var commitOptions;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.git)
                            throw new Error('GitService not initialized');
                        return [4 /*yield*/, this.git.add('.')];
                    case 1:
                        _a.sent();
                        commitOptions = {};
                        if (options.author) {
                            commitOptions['--author'] = "\"".concat(options.author.name, " <").concat(options.author.email, ">\"");
                        }
                        return [4 /*yield*/, this.git.commit(options.message, undefined, commitOptions)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    GitService.prototype.push = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, username, token, remoteUrl, branch, workBranch, targetBranch, url;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.git || !this.currentConfig)
                            throw new Error('GitService not initialized');
                        _a = this.currentConfig, username = _a.username, token = _a.token, remoteUrl = _a.remoteUrl, branch = _a.branch, workBranch = _a.workBranch;
                        targetBranch = workBranch || branch || 'main';
                        if (!(username && token && remoteUrl)) return [3 /*break*/, 2];
                        url = new URL(remoteUrl);
                        url.username = username;
                        url.password = token;
                        return [4 /*yield*/, this.git.push(url.toString(), targetBranch)];
                    case 1:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, this.git.push('origin', targetBranch)];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    GitService.prototype.pull = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, branch, workBranch, baseBranch, currentWorkBranch;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.git || !this.currentConfig)
                            throw new Error('GitService not initialized');
                        _a = this.currentConfig, branch = _a.branch, workBranch = _a.workBranch, baseBranch = _a.baseBranch;
                        currentWorkBranch = workBranch || branch || 'main';
                        if (!(baseBranch && baseBranch !== currentWorkBranch)) return [3 /*break*/, 2];
                        // Team flow: Pull from base (main) into work branch with rebase
                        this.logger.info("Rebasing ".concat(currentWorkBranch, " from origin/").concat(baseBranch));
                        return [4 /*yield*/, this.git.pull('origin', baseBranch, { '--rebase': 'true' })];
                    case 1:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 2: 
                    // Standard flow: Pull current branch
                    return [4 /*yield*/, this.git.pull('origin', currentWorkBranch)];
                    case 3:
                        // Standard flow: Pull current branch
                        _b.sent();
                        _b.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return GitService;
}());
exports.GitService = GitService;
