"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionUtil = void 0;
var connection_interface_1 = require("../interfaces/connection.interface");
var ConnectionUtil = /** @class */ (function () {
    function ConnectionUtil() {
    }
    /**
     * Resolves a raw connection object (from IPC or Config) into a standard Type + Config pair.
     * Handles flat objects (DatabaseConnection) and structured ones (IConnection).
     */
    ConnectionUtil.resolve = function (connection) {
        if (!connection) {
            throw new Error('Connection object is required');
        }
        // 1. Determine Type
        var type = connection.type;
        // Auto-detect SQLite if path or host='file' is used
        if (!type) {
            if (connection.path || connection.host === 'file') {
                type = connection_interface_1.ConnectionType.SQLITE;
            }
            else {
                type = connection_interface_1.ConnectionType.MYSQL; // Default fallback
            }
        }
        // 2. Extract Config
        // If it's the structured IConnection from core, config is already there
        var config = connection.config;
        if (!config) {
            // It's a flat DatabaseConnection object from andb-desktop
            config = {
                host: connection.host,
                port: connection.port,
                user: connection.user || connection.username,
                password: connection.password || '',
                database: connection.database || connection.database_name || connection.name,
                path: connection.path || (type === connection_interface_1.ConnectionType.SQLITE ? connection.host : undefined),
                sshConfig: connection.sshConfig || connection.ssh,
            };
        }
        return { type: type, config: config };
    };
    return ConnectionUtil;
}());
exports.ConnectionUtil = ConnectionUtil;
