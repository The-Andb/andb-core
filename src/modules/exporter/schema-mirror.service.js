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
exports.SchemaMirrorService = void 0;
var getLogger = require('andb-logger').getLogger;
var fs = __importStar(require("fs"));
var path = __importStar(require("path"));
var SchemaMirrorService = /** @class */ (function () {
    function SchemaMirrorService(storageService) {
        this.storageService = storageService;
        this.logger = getLogger({ logName: 'SchemaMirrorService' });
    }
    /**
     * Mirrors the SQLite state to the filesystem in the specified base directory.
     */
    SchemaMirrorService.prototype.mirrorToFilesystem = function (envName, dbName, baseDir) {
        return __awaiter(this, void 0, void 0, function () {
            var types, _i, types_1, type, objects, targetDir, existingFiles, _a, objects_1, obj, fileName, filePath, _b, existingFiles_1, deletedFile;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        this.logger.info("mirroring ".concat(envName, "/").concat(dbName, " to ").concat(baseDir));
                        types = ['TABLES', 'VIEWS', 'PROCEDURES', 'FUNCTIONS', 'TRIGGERS', 'EVENTS'];
                        _i = 0, types_1 = types;
                        _c.label = 1;
                    case 1:
                        if (!(_i < types_1.length)) return [3 /*break*/, 4];
                        type = types_1[_i];
                        return [4 /*yield*/, this.storageService.getDDLObjects(envName, dbName, type)];
                    case 2:
                        objects = _c.sent();
                        targetDir = path.join(baseDir, envName, dbName, type.toLowerCase());
                        this._ensureDir(targetDir);
                        existingFiles = new Set(fs.existsSync(targetDir) ? fs.readdirSync(targetDir).filter(function (f) { return f.endsWith('.sql'); }) : []);
                        for (_a = 0, objects_1 = objects; _a < objects_1.length; _a++) {
                            obj = objects_1[_a];
                            fileName = "".concat(obj.name, ".sql");
                            filePath = path.join(targetDir, fileName);
                            fs.writeFileSync(filePath, obj.content || '');
                            existingFiles.delete(fileName);
                        }
                        // Cleanup deleted objects
                        for (_b = 0, existingFiles_1 = existingFiles; _b < existingFiles_1.length; _b++) {
                            deletedFile = existingFiles_1[_b];
                            fs.unlinkSync(path.join(targetDir, deletedFile));
                            this.logger.info("\uD83D\uDDD1\uFE0F Deleted ".concat(deletedFile, " as it no longer exists in SQLite"));
                        }
                        _c.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    SchemaMirrorService.prototype._ensureDir = function (p) {
        if (!fs.existsSync(p)) {
            fs.mkdirSync(p, { recursive: true });
        }
    };
    return SchemaMirrorService;
}());
exports.SchemaMirrorService = SchemaMirrorService;
