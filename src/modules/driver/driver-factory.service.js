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
exports.DriverFactoryService = void 0;
var connection_interface_1 = require("../../common/interfaces/connection.interface");
var mysql_driver_1 = require("./mysql/mysql.driver");
var dump_driver_1 = require("./dump/dump.driver");
var file_driver_1 = require("./file/file.driver");
var postgres_driver_1 = require("./postgres/postgres.driver");
var sqlite_driver_1 = require("./sqlite/sqlite.driver");
var DriverFactoryService = /** @class */ (function () {
    function DriverFactoryService(parser) {
        this.parser = parser;
    }
    DriverFactoryService.prototype.create = function (type, config) {
        return __awaiter(this, void 0, void 0, function () {
            var t;
            return __generator(this, function (_a) {
                t = type;
                if (t === 'mysql' || t === 'mariadb') {
                    return [2 /*return*/, new mysql_driver_1.MysqlDriver(config)];
                }
                if (t === connection_interface_1.ConnectionType.POSTGRES) {
                    return [2 /*return*/, new postgres_driver_1.PostgresDriver(config)];
                }
                if (t === connection_interface_1.ConnectionType.DUMP) {
                    return [2 /*return*/, new dump_driver_1.DumpDriver(config, this.parser)];
                }
                if (t === connection_interface_1.ConnectionType.FILE) {
                    return [2 /*return*/, new file_driver_1.FileDriver(config)];
                }
                if (t === connection_interface_1.ConnectionType.SQLITE || t === 'sqlite3') {
                    return [2 /*return*/, new sqlite_driver_1.SqliteDbDriver(config)];
                }
                throw new Error("Unsupported connection type: ".concat(type));
            });
        });
    };
    return DriverFactoryService;
}());
exports.DriverFactoryService = DriverFactoryService;
