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
var typeorm_1 = require("typeorm");
var fs = __importStar(require("fs"));
var path = __importStar(require("path"));
var os_1 = require("os");
// Require entities
var DdlExportEntity_1 = require("../src/modules/storage/entities/core/DdlExportEntity");
var DdlSnapshotEntity_1 = require("../src/modules/storage/entities/core/DdlSnapshotEntity");
var ComparisonEntity_1 = require("../src/modules/storage/entities/core/ComparisonEntity");
var MigrationHistoryEntity_1 = require("../src/modules/storage/entities/core/MigrationHistoryEntity");
function migrate() {
    return __awaiter(this, void 0, void 0, function () {
        var possibleFolders, appDataRoot, dbConfigPath, appDataPath, _i, possibleFolders_1, folder, testPath, dbPath, projectBaseDir, yaml, config, dataSource, writeSqlFile, exportRepo, exportsToMigrate, _a, exportsToMigrate_1, exp, extType, relPath, snapshotRepo, snapshotsToMigrate, _b, snapshotsToMigrate_1, snap, extType, timestampDate, dateFolder, relPath, compRepo, comparisonsToMigrate, _loop_1, _c, comparisonsToMigrate_1, comp;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    console.log('--- The-Andb FileSystem Migration Script ---');
                    possibleFolders = ['TheAndb_v3_dev', 'The Andb Dev_v3_dev', 'TheAndb', 'The Andb'];
                    appDataRoot = path.join((0, os_1.homedir)(), 'Library', 'Application Support');
                    dbConfigPath = '';
                    appDataPath = '';
                    for (_i = 0, possibleFolders_1 = possibleFolders; _i < possibleFolders_1.length; _i++) {
                        folder = possibleFolders_1[_i];
                        testPath = path.join(appDataRoot, folder, 'db-config.yaml');
                        if (fs.existsSync(testPath)) {
                            dbConfigPath = testPath;
                            appDataPath = path.join(appDataRoot, folder);
                            break;
                        }
                    }
                    if (!dbConfigPath && appDataPath === '') {
                        appDataPath = path.join(appDataRoot, 'TheAndb_v3_dev');
                        dbConfigPath = path.join(appDataPath, 'db-config.yaml');
                    }
                    dbPath = path.join(appDataPath, 'andb-storage.db');
                    projectBaseDir = process.cwd();
                    if (fs.existsSync(dbConfigPath)) {
                        yaml = require('js-yaml');
                        config = yaml.load(fs.readFileSync(dbConfigPath, 'utf8')) || {};
                        if (config.dbPath)
                            dbPath = config.dbPath;
                        if (config.projectBaseDir)
                            projectBaseDir = config.projectBaseDir;
                    }
                    console.log("Connecting to database at: ".concat(dbPath));
                    console.log("Using Project Base Dir: ".concat(projectBaseDir));
                    dataSource = new typeorm_1.DataSource({
                        type: 'better-sqlite3',
                        database: dbPath,
                        entities: [DdlExportEntity_1.DdlExportEntity, DdlSnapshotEntity_1.DdlSnapshotEntity, ComparisonEntity_1.ComparisonEntity, MigrationHistoryEntity_1.MigrationHistoryEntity],
                        synchronize: true,
                    });
                    return [4 /*yield*/, dataSource.initialize()];
                case 1:
                    _d.sent();
                    console.log('Database connected.');
                    writeSqlFile = function (relPath, content) {
                        if (!projectBaseDir)
                            return;
                        var fullPath = path.join(projectBaseDir, relPath);
                        var dir = path.dirname(fullPath);
                        if (!fs.existsSync(dir)) {
                            fs.mkdirSync(dir, { recursive: true });
                        }
                        var finalContent = Array.isArray(content) ? content.join('\n\n') : content;
                        fs.writeFileSync(fullPath, finalContent, 'utf8');
                    };
                    exportRepo = dataSource.getRepository(DdlExportEntity_1.DdlExportEntity);
                    return [4 /*yield*/, exportRepo.find({ where: { file_path: (0, typeorm_1.IsNull)() } })];
                case 2:
                    exportsToMigrate = _d.sent();
                    console.log("Found ".concat(exportsToMigrate.length, " DdlExports to migrate."));
                    _a = 0, exportsToMigrate_1 = exportsToMigrate;
                    _d.label = 3;
                case 3:
                    if (!(_a < exportsToMigrate_1.length)) return [3 /*break*/, 6];
                    exp = exportsToMigrate_1[_a];
                    if (!exp.ddl_content)
                        return [3 /*break*/, 5];
                    extType = (exp.export_type || 'unknown').toLowerCase();
                    relPath = "db/".concat(exp.environment, "/").concat(exp.database_name, "/").concat(extType, "/").concat(exp.export_name, ".sql");
                    writeSqlFile(relPath, exp.ddl_content);
                    exp.file_path = relPath;
                    exp.ddl_content = '';
                    return [4 /*yield*/, exportRepo.save(exp)];
                case 4:
                    _d.sent();
                    _d.label = 5;
                case 5:
                    _a++;
                    return [3 /*break*/, 3];
                case 6:
                    snapshotRepo = dataSource.getRepository(DdlSnapshotEntity_1.DdlSnapshotEntity);
                    return [4 /*yield*/, snapshotRepo.find({ where: { file_path: (0, typeorm_1.IsNull)() } })];
                case 7:
                    snapshotsToMigrate = _d.sent();
                    console.log("Found ".concat(snapshotsToMigrate.length, " DdlSnapshots to migrate."));
                    _b = 0, snapshotsToMigrate_1 = snapshotsToMigrate;
                    _d.label = 8;
                case 8:
                    if (!(_b < snapshotsToMigrate_1.length)) return [3 /*break*/, 11];
                    snap = snapshotsToMigrate_1[_b];
                    if (!snap.ddl_content)
                        return [3 /*break*/, 10];
                    extType = (snap.ddl_type || 'unknown').toLowerCase();
                    timestampDate = snap.created_at ? new Date(snap.created_at) : new Date();
                    dateFolder = timestampDate.toISOString().split('T')[0];
                    relPath = "db/".concat(snap.environment, "/").concat(snap.database_name, "/.snapshots/").concat(dateFolder, "/").concat(extType, "/").concat(snap.ddl_name, "_").concat(snap.hash.substring(0, 8), ".sql");
                    writeSqlFile(relPath, snap.ddl_content);
                    snap.file_path = relPath;
                    snap.ddl_content = '';
                    return [4 /*yield*/, snapshotRepo.save(snap)];
                case 9:
                    _d.sent();
                    _d.label = 10;
                case 10:
                    _b++;
                    return [3 /*break*/, 8];
                case 11:
                    compRepo = dataSource.getRepository(ComparisonEntity_1.ComparisonEntity);
                    return [4 /*yield*/, compRepo.find({ where: { file_path: (0, typeorm_1.IsNull)() } })];
                case 12:
                    comparisonsToMigrate = _d.sent();
                    console.log("Found ".concat(comparisonsToMigrate.length, " Comparisons to migrate."));
                    _loop_1 = function (comp) {
                        var extType, stmts, parsed, colAlters_1, idxAlters_1, rmvColAlters_1, basePath;
                        return __generator(this, function (_e) {
                            switch (_e.label) {
                                case 0:
                                    if (!comp.alter_statements)
                                        return [2 /*return*/, "continue"];
                                    extType = (comp.ddl_type || 'unknown').toLowerCase();
                                    stmts = [];
                                    try {
                                        parsed = JSON.parse(comp.alter_statements);
                                        if (Array.isArray(parsed))
                                            stmts = parsed;
                                        else
                                            stmts = [comp.alter_statements];
                                    }
                                    catch (_f) {
                                        stmts = comp.alter_statements.split(';').map(function (s) { return s.trim(); }).filter(function (s) { return !!s; }).map(function (s) { return s + ';'; });
                                    }
                                    if (!(stmts.length > 0)) return [3 /*break*/, 2];
                                    colAlters_1 = [];
                                    idxAlters_1 = [];
                                    rmvColAlters_1 = [];
                                    stmts.forEach(function (s) {
                                        var stmt = s.trim();
                                        if (!stmt)
                                            return;
                                        var normalizedStmt = stmt.endsWith(';') ? stmt : stmt + ';';
                                        var isDropCol = stmt.match(/ALTER TABLE\s+.*?DROP\s+(?:COLUMN\s+)?/i);
                                        var isAddIdx = stmt.match(/ALTER TABLE\s+.*?ADD\s+(?:CONSTRAINT\s+.*?|UNIQUE\s+|FULLTEXT\s+|SPATIAL\s+)?INDEX/i) || stmt.match(/CREATE\s+(?:UNIQUE\s+|FULLTEXT\s+|SPATIAL\s+)?INDEX/i) || stmt.match(/ALTER TABLE\s+.*?ADD\s+FOREIGN KEY/i) || stmt.match(/ALTER TABLE\s+.*?ADD\s+PRIMARY KEY/i);
                                        var isDropIdx = stmt.match(/ALTER TABLE\s+.*?DROP\s+INDEX/i) || stmt.match(/DROP\s+INDEX/i) || stmt.match(/ALTER TABLE\s+.*?DROP\s+FOREIGN KEY/i) || stmt.match(/ALTER TABLE\s+.*?DROP\s+PRIMARY KEY/i);
                                        if (isAddIdx || isDropIdx) {
                                            idxAlters_1.push(normalizedStmt);
                                        }
                                        else if (isDropCol) {
                                            rmvColAlters_1.push(normalizedStmt);
                                        }
                                        else {
                                            colAlters_1.push(normalizedStmt);
                                        }
                                    });
                                    basePath = "map-migrate/".concat(comp.source_env, "-to-").concat(comp.target_env, "/").concat(comp.database_name, "/").concat(extType, "/alters");
                                    if (colAlters_1.length > 0)
                                        writeSqlFile("".concat(basePath, "/columns/").concat(comp.ddl_name, ".sql"), colAlters_1.join('\n'));
                                    if (idxAlters_1.length > 0)
                                        writeSqlFile("".concat(basePath, "/indexes/").concat(comp.ddl_name, ".sql"), idxAlters_1.join('\n'));
                                    if (rmvColAlters_1.length > 0)
                                        writeSqlFile("".concat(basePath, "/rmv-columns/").concat(comp.ddl_name, ".sql"), rmvColAlters_1.join('\n'));
                                    comp.file_path = basePath;
                                    comp.alter_statements = '';
                                    return [4 /*yield*/, compRepo.save(comp)];
                                case 1:
                                    _e.sent();
                                    _e.label = 2;
                                case 2: return [2 /*return*/];
                            }
                        });
                    };
                    _c = 0, comparisonsToMigrate_1 = comparisonsToMigrate;
                    _d.label = 13;
                case 13:
                    if (!(_c < comparisonsToMigrate_1.length)) return [3 /*break*/, 16];
                    comp = comparisonsToMigrate_1[_c];
                    return [5 /*yield**/, _loop_1(comp)];
                case 14:
                    _d.sent();
                    _d.label = 15;
                case 15:
                    _c++;
                    return [3 /*break*/, 13];
                case 16:
                    console.log('Migration completed successfully.');
                    return [4 /*yield*/, dataSource.destroy()];
                case 17:
                    _d.sent();
                    return [2 /*return*/];
            }
        });
    });
}
migrate().catch(console.error);
