"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MysqlMigrator = void 0;
var MysqlMigrator = /** @class */ (function () {
    function MysqlMigrator() {
    }
    MysqlMigrator.prototype.generateObjectSQL = function (diff) {
        var type = diff.type, name = diff.name, operation = diff.operation, definition = diff.definition;
        var statements = [];
        if (operation === 'DROP' || operation === 'REPLACE') {
            statements.push("DROP ".concat(type, " IF EXISTS `").concat(name, "`;"));
        }
        if ((operation === 'CREATE' || operation === 'REPLACE') && definition) {
            statements.push(definition.endsWith(';') ? definition : definition + ';');
        }
        return statements;
    };
    MysqlMigrator.prototype.generateTableAlterSQL = function (diff) {
        if (!diff.hasChanges || diff.operations.length === 0) {
            return [];
        }
        var tableName = diff.tableName, operations = diff.operations;
        var statements = [];
        // Group columns by add, modify, drop to generate efficient SQL
        var addColumns = operations.filter(function (op) { return op.type === 'ADD' && op.target === 'COLUMN'; });
        var modifyColumns = operations.filter(function (op) { return op.type === 'MODIFY' && op.target === 'COLUMN'; });
        var dropColumns = operations.filter(function (op) { return op.type === 'DROP' && op.target === 'COLUMN'; });
        var addIndexes = operations.filter(function (op) { return op.type === 'ADD' && op.target === 'INDEX'; });
        var dropIndexes = operations.filter(function (op) { return op.type === 'DROP' && op.target === 'INDEX'; });
        var addForeignKeys = operations.filter(function (op) { return op.type === 'ADD' && op.target === 'FOREIGN_KEY'; });
        var dropForeignKeys = operations.filter(function (op) { return op.type === 'DROP' && op.target === 'FOREIGN_KEY'; });
        // MySQL quirk: Cannot DROP and ADD a FK with the same name in a single ALTER TABLE.
        // MySQL validates constraint names before processing drops within the same statement.
        // Solution: If any FK name appears in both DROP and ADD, split into two ALTER statements.
        var dropFkNames = new Set(dropForeignKeys.map(function (op) { return op.name; }));
        var hasFkModification = addForeignKeys.some(function (op) { return dropFkNames.has(op.name); });
        var clauses = [];
        var addFkClauses = [];
        // Drops
        dropForeignKeys.forEach(function (op) {
            return clauses.push("DROP FOREIGN KEY `".concat(op.name, "`"));
        });
        dropIndexes.forEach(function (op) {
            if (op.name === 'PRIMARY') {
                clauses.push('DROP PRIMARY KEY');
            }
            else {
                clauses.push("DROP INDEX `".concat(op.name, "`"));
            }
        });
        dropColumns.forEach(function (op) { return clauses.push("DROP COLUMN `".concat(op.name, "`")); });
        // Modifies
        modifyColumns.forEach(function (op) {
            // Legacy logic cleanup: remove DEFAULT NULL, trailing comma
            var def = op.definition.replace(/ DEFAULT NULL/gi, '').replace(/,$/, '');
            if (!def.startsWith('\`')) {
                def = '\`' + op.name + '\` ' + def;
            }
            clauses.push("MODIFY COLUMN ".concat(def));
        });
        addColumns.forEach(function (op) {
            var def = op.definition;
            if (!def.startsWith('\`')) {
                def = '\`' + op.name + '\` ' + def;
            }
            clauses.push("ADD COLUMN ".concat(def));
        });
        addIndexes.forEach(function (op) {
            // Safety: strip any position clause (AFTER `col` or FIRST) that may have
            // leaked from column operations into index definitions
            var cleanDef = (op.definition || '').replace(/\s+(AFTER\s+`[^`]+`|FIRST)\s*$/i, '');
            clauses.push("ADD ".concat(cleanDef));
        });
        // FK Adds: put in separate statement if modification detected
        if (hasFkModification) {
            addForeignKeys.forEach(function (op) {
                addFkClauses.push("ADD ".concat(op.definition));
            });
        }
        else {
            addForeignKeys.forEach(function (op) {
                clauses.push("ADD ".concat(op.definition));
            });
        }
        var formatAlterTable = function (alterClauses) {
            if (alterClauses.length === 1) {
                return "ALTER TABLE `".concat(tableName, "`\n  ").concat(alterClauses[0], ";");
            }
            return "ALTER TABLE `".concat(tableName, "`\n  ").concat(alterClauses[0], "\n  , ").concat(alterClauses.slice(1).join('\n  , '), ";");
        };
        if (clauses.length > 0) {
            statements.push(formatAlterTable(clauses));
        }
        // Second ALTER for FK adds (only when modifying FKs)
        if (addFkClauses.length > 0) {
            statements.push(formatAlterTable(addFkClauses));
        }
        return statements;
    };
    /**
     * Skip rules for migration (Rule #1 parity)
     * Legacy: isNotMigrateCondition
     */
    MysqlMigrator.prototype.isNotMigrateCondition = function (name) {
        var n = name.toLowerCase();
        if (n.includes('ote_'))
            return true; // Online Transaction Engine (Skip)
        if (n.startsWith('pt_'))
            return true; // Percona Toolkit shadow tables
        if (n.includes('test'))
            return true; // Test objects
        return false;
    };
    MysqlMigrator.prototype.disableForeignKeyChecks = function () {
        return 'SET FOREIGN_KEY_CHECKS = 0;';
    };
    MysqlMigrator.prototype.enableForeignKeyChecks = function () {
        return 'SET FOREIGN_KEY_CHECKS = 1;';
    };
    return MysqlMigrator;
}());
exports.MysqlMigrator = MysqlMigrator;
