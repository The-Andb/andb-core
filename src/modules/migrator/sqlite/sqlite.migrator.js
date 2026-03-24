"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteMigrator = void 0;
var SqliteMigrator = /** @class */ (function () {
    function SqliteMigrator() {
    }
    SqliteMigrator.prototype.generateObjectSQL = function (diff) {
        var type = diff.type, name = diff.name, operation = diff.operation, definition = diff.definition;
        var statements = [];
        if (operation === 'DROP' || operation === 'REPLACE') {
            statements.push("DROP ".concat(type, " IF EXISTS \"").concat(name, "\";"));
        }
        if ((operation === 'CREATE' || operation === 'REPLACE') && definition) {
            statements.push(definition.endsWith(';') ? definition : definition + ';');
        }
        return statements;
    };
    SqliteMigrator.prototype.generateTableAlterSQL = function (diff) {
        if (!diff.hasChanges || diff.operations.length === 0) {
            return [];
        }
        var tableName = diff.tableName, operations = diff.operations;
        var statements = [];
        var addColumns = operations.filter(function (op) { return op.type === 'ADD' && op.target === 'COLUMN'; });
        var dropColumns = operations.filter(function (op) { return op.type === 'DROP' && op.target === 'COLUMN'; });
        var modifyColumns = operations.filter(function (op) { return op.type === 'MODIFY' && op.target === 'COLUMN'; });
        var addIndexes = operations.filter(function (op) { return op.type === 'ADD' && op.target === 'INDEX'; });
        var dropIndexes = operations.filter(function (op) { return op.type === 'DROP' && op.target === 'INDEX'; });
        // SQLite typically requires separate ALTER TABLE statements for each operation.
        // ADD COLUMN
        addColumns.forEach(function (op) {
            statements.push("ALTER TABLE \"".concat(tableName, "\" ADD COLUMN ").concat(op.definition, ";"));
        });
        // DROP COLUMN (Supported in SQLite 3.35.0+)
        dropColumns.forEach(function (op) {
            statements.push("ALTER TABLE \"".concat(tableName, "\" DROP COLUMN \"").concat(op.name, "\";"));
        });
        // MODIFY COLUMN is not directly supported by SQLite ALTER TABLE.
        modifyColumns.forEach(function (op) {
            statements.push("-- WARNING: SQLite does not support MODIFY COLUMN natively. Table recreation is required to modify column \"".concat(op.name, "\"."));
        });
        // DROP INDEX
        dropIndexes.forEach(function (op) {
            statements.push("DROP INDEX IF EXISTS \"".concat(op.name, "\";"));
        });
        // ADD INDEX
        addIndexes.forEach(function (op) {
            statements.push(op.definition.endsWith(';') ? op.definition : op.definition + ';');
        });
        return statements;
    };
    SqliteMigrator.prototype.isNotMigrateCondition = function (name) {
        var n = name.toLowerCase();
        if (n.includes('test'))
            return true;
        if (n.startsWith('sqlite_'))
            return true;
        return false;
    };
    SqliteMigrator.prototype.disableForeignKeyChecks = function () {
        return 'PRAGMA foreign_keys = OFF;';
    };
    SqliteMigrator.prototype.enableForeignKeyChecks = function () {
        return 'PRAGMA foreign_keys = ON;';
    };
    return SqliteMigrator;
}());
exports.SqliteMigrator = SqliteMigrator;
