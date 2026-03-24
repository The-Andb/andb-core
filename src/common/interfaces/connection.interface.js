"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionType = void 0;
var ConnectionType;
(function (ConnectionType) {
    ConnectionType["MYSQL"] = "mysql";
    ConnectionType["MARIADB"] = "mariadb";
    ConnectionType["POSTGRES"] = "postgres";
    ConnectionType["SQLITE"] = "sqlite";
    ConnectionType["DUMP"] = "dump";
    ConnectionType["FILE"] = "file";
})(ConnectionType || (exports.ConnectionType = ConnectionType = {}));
