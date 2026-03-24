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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DumpIntrospectionService = void 0;
var DumpIntrospectionService = /** @class */ (function () {
    function DumpIntrospectionService(driver) {
        this.driver = driver;
    }
    DumpIntrospectionService.prototype._list = function (type) {
        var map = this.driver.data[type];
        if (!map)
            return [];
        return Array.from(map.keys());
    };
    DumpIntrospectionService.prototype._get = function (type, name) {
        var _a;
        return ((_a = this.driver.data[type]) === null || _a === void 0 ? void 0 : _a.get(name)) || '';
    };
    DumpIntrospectionService.prototype.listTables = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this._list('TABLES')];
            });
        });
    };
    DumpIntrospectionService.prototype.listViews = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this._list('VIEWS')];
            });
        });
    };
    DumpIntrospectionService.prototype.listProcedures = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this._list('PROCEDURES')];
            });
        });
    };
    DumpIntrospectionService.prototype.listFunctions = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this._list('FUNCTIONS')];
            });
        });
    };
    DumpIntrospectionService.prototype.listTriggers = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this._list('TRIGGERS')];
            });
        });
    };
    DumpIntrospectionService.prototype.listEvents = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this._list('EVENTS')];
            });
        });
    };
    DumpIntrospectionService.prototype.getTableDDL = function (db, name) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this._get('TABLES', name)];
            });
        });
    };
    DumpIntrospectionService.prototype.getViewDDL = function (db, name) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this._get('VIEWS', name)];
            });
        });
    };
    DumpIntrospectionService.prototype.getProcedureDDL = function (db, name) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this._get('PROCEDURES', name)];
            });
        });
    };
    DumpIntrospectionService.prototype.getFunctionDDL = function (db, name) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this._get('FUNCTIONS', name)];
            });
        });
    };
    DumpIntrospectionService.prototype.getTriggerDDL = function (db, name) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this._get('TRIGGERS', name)];
            });
        });
    };
    DumpIntrospectionService.prototype.getEventDDL = function (db, name) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this._get('EVENTS', name)];
            });
        });
    };
    DumpIntrospectionService.prototype.getChecksums = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, {}];
            });
        });
    };
    DumpIntrospectionService.prototype.getObjectDDL = function (db, type, name) {
        return __awaiter(this, void 0, void 0, function () {
            var t;
            return __generator(this, function (_a) {
                t = type.toUpperCase();
                if (t === 'TABLE')
                    return [2 /*return*/, this.getTableDDL(db, name)];
                if (t === 'VIEW')
                    return [2 /*return*/, this.getViewDDL(db, name)];
                if (t === 'PROCEDURE')
                    return [2 /*return*/, this.getProcedureDDL(db, name)];
                if (t === 'FUNCTION')
                    return [2 /*return*/, this.getFunctionDDL(db, name)];
                if (t === 'TRIGGER')
                    return [2 /*return*/, this.getTriggerDDL(db, name)];
                if (t === 'EVENT')
                    return [2 /*return*/, this.getEventDDL(db, name)];
                return [2 /*return*/, ''];
            });
        });
    };
    DumpIntrospectionService.prototype.getTableColumns = function (db, tableName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, []];
            });
        });
    };
    return DumpIntrospectionService;
}());
exports.DumpIntrospectionService = DumpIntrospectionService;
