"use strict";
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
exports.MysqlIntrospectionService = void 0;
var MysqlIntrospectionService = /** @class */ (function () {
    function MysqlIntrospectionService(driver, parser) {
        this.driver = driver;
        this.parser = parser;
    }
    MysqlIntrospectionService.prototype.listTables = function (dbName) {
        return __awaiter(this, void 0, void 0, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.driver.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME", [dbName])];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, results.map(function (row) { return row.TABLE_NAME; })];
                }
            });
        });
    };
    MysqlIntrospectionService.prototype.listViews = function (dbName) {
        return __awaiter(this, void 0, void 0, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.driver.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'VIEW' ORDER BY TABLE_NAME", [dbName])];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, results.map(function (row) { return row.TABLE_NAME; })];
                }
            });
        });
    };
    MysqlIntrospectionService.prototype.listProcedures = function (dbName) {
        return __awaiter(this, void 0, void 0, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.driver.query("SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE' ORDER BY ROUTINE_NAME", [dbName])];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, results.map(function (row) { return row.ROUTINE_NAME; })];
                }
            });
        });
    };
    MysqlIntrospectionService.prototype.listFunctions = function (dbName) {
        return __awaiter(this, void 0, void 0, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.driver.query("SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'FUNCTION' ORDER BY ROUTINE_NAME", [dbName])];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, results.map(function (row) { return row.ROUTINE_NAME; })];
                }
            });
        });
    };
    MysqlIntrospectionService.prototype.listTriggers = function (dbName) {
        return __awaiter(this, void 0, void 0, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.driver.query('SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = ? ORDER BY TRIGGER_NAME', [dbName])];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, results.map(function (row) { return row.TRIGGER_NAME; })];
                }
            });
        });
    };
    MysqlIntrospectionService.prototype.listEvents = function (dbName) {
        return __awaiter(this, void 0, void 0, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.driver.query('SELECT EVENT_NAME FROM information_schema.EVENTS WHERE EVENT_SCHEMA = ? ORDER BY EVENT_NAME', [dbName])];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, results.map(function (row) { return row.EVENT_NAME; })];
                }
            });
        });
    };
    // --- DDL Retrieval ---
    MysqlIntrospectionService.prototype._normalizeDDL = function (ddl) {
        return this.parser.cleanDefiner(ddl); // Basic cleaning for now, extend if needed
    };
    /**
     * Safely extract DDL content from a SHOW CREATE result row.
     * MySQL returns columns like 'Create Table', 'Create Procedure', etc.
     * The casing can vary by MySQL version/driver config, so we do case-insensitive lookup.
     * If the DDL column value is NULL (e.g., insufficient privileges), returns empty string.
     */
    MysqlIntrospectionService.prototype._extractDDLFromRow = function (row, expectedKey, objectType, objectName) {
        if (!row)
            return '';
        var keys = Object.keys(row);
        var key = keys.find(function (k) { return k.toLowerCase() === expectedKey.toLowerCase(); });
        if (!key) {
            console.warn("[Introspection] ".concat(objectType, " \"").concat(objectName, "\": expected column \"").concat(expectedKey, "\" not found. Available keys: [").concat(keys.join(', '), "]"));
            return '';
        }
        var value = row[key];
        if (value === null || value === undefined) {
            console.warn("[Introspection] ".concat(objectType, " \"").concat(objectName, "\": column \"").concat(key, "\" is NULL (likely insufficient privileges)"));
            return '';
        }
        return String(value);
    };
    MysqlIntrospectionService.prototype.getTableDDL = function (dbName, tableName) {
        return __awaiter(this, void 0, void 0, function () {
            var result, row, ddl, normalizedDdl, lines, standardLines, indexLines, i, _line, insertAt, i, insideParen, i, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.driver.query("SHOW CREATE TABLE `".concat(tableName, "`"))];
                    case 1:
                        result = _a.sent();
                        row = result[0];
                        if (!row)
                            return [2 /*return*/, ''];
                        ddl = this._extractDDLFromRow(row, 'Create Table', 'TABLE', tableName);
                        if (ddl) {
                            ddl = ddl.replace(/AUTO_INCREMENT=\d+\s/, '');
                        }
                        normalizedDdl = this._normalizeDDL(ddl);
                        lines = normalizedDdl.split('\n');
                        standardLines = [];
                        indexLines = [];
                        for (i = 0; i < lines.length; i++) {
                            _line = lines[i];
                            if (_line.trim().startsWith('KEY `') ||
                                _line.trim().startsWith('UNIQUE KEY `') ||
                                _line.trim().startsWith('FULLTEXT KEY `') ||
                                _line.trim().startsWith('SPATIAL KEY `') ||
                                _line.trim().startsWith('INDEX `')) {
                                // If the previous line ended with a comma, we might need to be careful, but MySQL SHOW CREATE TABLE 
                                // usually formats one constraint per line ending with comma except the last.
                                // To sort safely, we strip trailing comma, sort, and add them back.
                                indexLines.push(_line);
                            }
                            else {
                                standardLines.push(_line);
                            }
                        }
                        if (indexLines.length > 0) {
                            // Find where index lines were (usually before CONSTRAINT or `) ENGINE=`)
                            // To be safe, we collect all index lines, and replace the block where the first index started.
                            // Identify the exact insertion point (right after the last column or primary key before the first index line was found).
                            // Since we extracted them, `standardLines` has the table without those specific indexes.
                            // Strip trailing commas from all index lines, sort them.
                            indexLines.sort(function (a, b) {
                                var _a, _b;
                                var aName = ((_a = a.trim().match(/KEY\s+`([^`]+)`/)) === null || _a === void 0 ? void 0 : _a[1]) || a;
                                var bName = ((_b = b.trim().match(/KEY\s+`([^`]+)`/)) === null || _b === void 0 ? void 0 : _b[1]) || b;
                                return aName.localeCompare(bName);
                            });
                            insertAt = standardLines.length - 1;
                            for (i = standardLines.length - 1; i >= 0; i--) {
                                if (standardLines[i].trim().startsWith(')')) {
                                    insertAt = i;
                                }
                                else if (standardLines[i].trim().startsWith('CONSTRAINT')) {
                                    insertAt = i;
                                }
                                else if (standardLines[i].trim().startsWith('PRIMARY KEY')) {
                                    // Usually PK is before other keys, so we insert after
                                    insertAt = i + 1;
                                    break;
                                }
                                else if (standardLines[i].trim() !== ')' && !standardLines[i].trim().startsWith('CONSTRAINT')) {
                                    // Found a column definition, break
                                    insertAt = i + 1;
                                    break;
                                }
                            }
                            // Ensure trailing comma logic is sound. We will apply commas to all lines before the last line inside the definition.
                            standardLines.splice.apply(standardLines, __spreadArray([insertAt, 0], indexLines, false));
                            insideParen = false;
                            for (i = 0; i < standardLines.length; i++) {
                                if (standardLines[i].includes('CREATE TABLE')) {
                                    insideParen = true;
                                }
                                else if (insideParen && standardLines[i].trim().startsWith(')')) {
                                    insideParen = false;
                                    // Remove comma from the line right before the closing paren if it exists
                                    if (i > 0 && standardLines[i - 1].trim().endsWith(',')) {
                                        standardLines[i - 1] = standardLines[i - 1].replace(/,$/, '');
                                    }
                                }
                                else if (insideParen && standardLines[i].trim().length > 0 && standardLines[i + 1] && !standardLines[i + 1].trim().startsWith(')')) {
                                    // ensure it has a comma if it's not the last item
                                    if (!standardLines[i].trim().endsWith(',')) {
                                        standardLines[i] = standardLines[i] + ',';
                                    }
                                }
                            }
                        }
                        return [2 /*return*/, standardLines.join('\n')];
                    case 2:
                        err_1 = _a.sent();
                        console.error("[Introspection] Failed to get TABLE DDL for \"".concat(tableName, "\": ").concat(err_1.message));
                        return [2 /*return*/, ''];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    MysqlIntrospectionService.prototype.getViewDDL = function (dbName, viewName) {
        return __awaiter(this, void 0, void 0, function () {
            var result, row, ddl, err_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.driver.query("SHOW CREATE VIEW `".concat(viewName, "`"))];
                    case 1:
                        result = _a.sent();
                        row = result[0];
                        ddl = this._extractDDLFromRow(row, 'Create View', 'VIEW', viewName);
                        return [2 /*return*/, this._normalizeDDL(ddl)];
                    case 2:
                        err_2 = _a.sent();
                        console.error("[Introspection] Failed to get VIEW DDL for \"".concat(viewName, "\": ").concat(err_2.message));
                        return [2 /*return*/, ''];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    MysqlIntrospectionService.prototype.getProcedureDDL = function (dbName, procName) {
        return __awaiter(this, void 0, void 0, function () {
            var result, row, ddl, err_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.driver.query("SHOW CREATE PROCEDURE `".concat(procName, "`"))];
                    case 1:
                        result = _a.sent();
                        row = result[0];
                        ddl = this._extractDDLFromRow(row, 'Create Procedure', 'PROCEDURE', procName);
                        return [2 /*return*/, this._normalizeDDL(ddl)];
                    case 2:
                        err_3 = _a.sent();
                        console.error("[Introspection] Failed to get PROCEDURE DDL for \"".concat(procName, "\": ").concat(err_3.message));
                        return [2 /*return*/, ''];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    MysqlIntrospectionService.prototype.getFunctionDDL = function (dbName, funcName) {
        return __awaiter(this, void 0, void 0, function () {
            var result, row, ddl, err_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.driver.query("SHOW CREATE FUNCTION `".concat(funcName, "`"))];
                    case 1:
                        result = _a.sent();
                        row = result[0];
                        ddl = this._extractDDLFromRow(row, 'Create Function', 'FUNCTION', funcName);
                        return [2 /*return*/, this._normalizeDDL(ddl)];
                    case 2:
                        err_4 = _a.sent();
                        console.error("[Introspection] Failed to get FUNCTION DDL for \"".concat(funcName, "\": ").concat(err_4.message));
                        return [2 /*return*/, ''];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    MysqlIntrospectionService.prototype.getTriggerDDL = function (dbName, triggerName) {
        return __awaiter(this, void 0, void 0, function () {
            var result, row, rawDDL, ddl, err_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.driver.query("SHOW CREATE TRIGGER `".concat(triggerName, "`"))];
                    case 1:
                        result = _a.sent();
                        row = result[0];
                        if (!row)
                            return [2 /*return*/, ''];
                        rawDDL = this._extractDDLFromRow(row, 'SQL Original Statement', 'TRIGGER', triggerName);
                        if (!rawDDL)
                            return [2 /*return*/, ''];
                        ddl = rawDDL
                            .replace(/\sDEFINER=`[^`]+`@`[^`]+`\s/g, ' ')
                            .replace(/\sCOLLATE\s+\w+\s/, ' ')
                            .replace(/\sCHARSET\s+\w+\s/, ' ');
                        return [2 /*return*/, this._normalizeDDL(ddl)];
                    case 2:
                        err_5 = _a.sent();
                        console.error("[Introspection] Failed to get TRIGGER DDL for \"".concat(triggerName, "\": ").concat(err_5.message));
                        return [2 /*return*/, ''];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    MysqlIntrospectionService.prototype.getEventDDL = function (dbName, eventName) {
        return __awaiter(this, void 0, void 0, function () {
            var result, row, ddl, err_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.driver.query("SHOW CREATE EVENT `".concat(eventName, "`"))];
                    case 1:
                        result = _a.sent();
                        row = result[0];
                        ddl = this._extractDDLFromRow(row, 'Create Event', 'EVENT', eventName);
                        return [2 /*return*/, this._normalizeDDL(ddl)];
                    case 2:
                        err_6 = _a.sent();
                        console.error("[Introspection] Failed to get EVENT DDL for \"".concat(eventName, "\": ").concat(err_6.message));
                        return [2 /*return*/, ''];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    MysqlIntrospectionService.prototype.getChecksums = function (dbName) {
        return __awaiter(this, void 0, void 0, function () {
            var results, map, _i, results_1, row, r;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.driver.query("\n      SELECT TABLE_NAME, CHECKSUM, UPDATE_TIME \n      FROM information_schema.TABLES \n      WHERE TABLE_SCHEMA = ?\n    ", [dbName])];
                    case 1:
                        results = _a.sent();
                        map = {};
                        for (_i = 0, results_1 = results; _i < results_1.length; _i++) {
                            row = results_1[_i];
                            r = row;
                            map[r.TABLE_NAME] = "".concat(r.CHECKSUM || '', "|").concat(r.UPDATE_TIME || '');
                        }
                        return [2 /*return*/, map];
                }
            });
        });
    };
    MysqlIntrospectionService.prototype.getObjectDDL = function (dbName, type, name) {
        return __awaiter(this, void 0, void 0, function () {
            var t;
            return __generator(this, function (_a) {
                t = type.toUpperCase().replace(/S$/, '');
                if (t === 'TABLE')
                    return [2 /*return*/, this.getTableDDL(dbName, name)];
                if (t === 'VIEW')
                    return [2 /*return*/, this.getViewDDL(dbName, name)];
                if (t === 'PROCEDURE')
                    return [2 /*return*/, this.getProcedureDDL(dbName, name)];
                if (t === 'FUNCTION')
                    return [2 /*return*/, this.getFunctionDDL(dbName, name)];
                if (t === 'TRIGGER')
                    return [2 /*return*/, this.getTriggerDDL(dbName, name)];
                if (t === 'EVENT')
                    return [2 /*return*/, this.getEventDDL(dbName, name)];
                return [2 /*return*/, ''];
            });
        });
    };
    MysqlIntrospectionService.prototype.getTableColumns = function (dbName, tableName) {
        return __awaiter(this, void 0, void 0, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.driver.query("SELECT \n        COLUMN_NAME as name, \n        DATA_TYPE as type, \n        IS_NULLABLE as isNullable, \n        COLUMN_DEFAULT as defaultValue, \n        EXTRA as extra, \n        COLUMN_COMMENT as comment\n      FROM information_schema.COLUMNS \n      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?\n      ORDER BY ORDINAL_POSITION", [dbName, tableName])];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, results.map(function (row) { return ({
                                name: row.name,
                                type: row.type,
                                isNullable: row.isNullable === 'YES',
                                defaultValue: row.defaultValue,
                                extra: row.extra,
                                comment: row.comment,
                            }); })];
                }
            });
        });
    };
    return MysqlIntrospectionService;
}());
exports.MysqlIntrospectionService = MysqlIntrospectionService;
