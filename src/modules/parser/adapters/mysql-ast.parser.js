"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MysqlAstParser = void 0;
var node_sql_parser_1 = require("node-sql-parser");
var MysqlAstParser = /** @class */ (function () {
    function MysqlAstParser() {
        this.parser = new node_sql_parser_1.Parser();
    }
    MysqlAstParser.prototype.extractDefaultValue = function (defVal) {
        var _a, _b, _c;
        if (!defVal || !defVal.value)
            return null;
        var inner = defVal.value;
        if (typeof inner === 'string' || typeof inner === 'number' || typeof inner === 'boolean') {
            return String(inner);
        }
        if (inner && inner.type) {
            if (inner.type === 'single_quote_string' || inner.type === 'double_quote_string' || inner.type === 'string') {
                return inner.value;
            }
            if (inner.type === 'function') {
                var funcName = ((_c = (_b = (_a = inner.name) === null || _a === void 0 ? void 0 : _a.name) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.value) || 'FUNC';
                return "(".concat(funcName, "())"); // Simplified AST to string representation
            }
            if (inner.type === 'expr_list' || inner.type === 'origin') {
                return inner.value;
            }
        }
        // Fallback: JSON stringify if complex
        return typeof inner === 'object' ? JSON.stringify(inner) : String(inner);
    };
    MysqlAstParser.prototype.parseTableDetailed = function (ddl) {
        var _a;
        try {
            if (!ddl || !ddl.toUpperCase().includes('CREATE TABLE'))
                return null;
            var ast = this.parser.astify(ddl, { database: 'MySQL' });
            var createTableAst = Array.isArray(ast) ? ast[0] : ast;
            if (createTableAst.type !== 'create' || createTableAst.keyword !== 'table') {
                return null;
            }
            var tableName = createTableAst.table[0].table;
            var columns = [];
            var indexes = [];
            var foreignKeys = [];
            var _loop_1 = function (def) {
                if (def.resource === 'column') {
                    columns.push({
                        name: def.column.column,
                        dataType: def.definition.dataType,
                        length: def.definition.length,
                        nullable: def.nullable ? def.nullable.value !== 'not null' : true,
                        defaultValue: this_1.extractDefaultValue(def.default_val),
                        comment: def.comment ? def.comment.value : undefined,
                        autoIncrement: !!def.auto_increment,
                        rawDefinition: '' // Omitted because AST abstracts it
                    });
                }
                else if (def.resource === 'constraint') {
                    if (def.constraint_type === 'FOREIGN KEY') {
                        var onDelete_1, onUpdate_1;
                        if (def.reference_definition.on_action) {
                            def.reference_definition.on_action.forEach(function (action) {
                                var _a, _b;
                                if (action.type === 'on delete')
                                    onDelete_1 = (_a = action.value) === null || _a === void 0 ? void 0 : _a.value;
                                if (action.type === 'on update')
                                    onUpdate_1 = (_b = action.value) === null || _b === void 0 ? void 0 : _b.value;
                            });
                        }
                        foreignKeys.push({
                            name: def.constraint,
                            columns: def.definition.map(function (c) { return c.column; }),
                            refTable: def.reference_definition.table[0].table,
                            refColumns: def.reference_definition.definition.map(function (c) { return c.column; }),
                            onDelete: onDelete_1,
                            onUpdate: onUpdate_1
                        });
                    }
                    else {
                        indexes.push({
                            name: def.index || def.constraint || 'PRIMARY',
                            type: def.constraint_type === 'primary key' ? 'PRIMARY' : (def.constraint_type === 'unique key' ? 'UNIQUE' : 'INDEX'),
                            columns: def.definition.map(function (c) { return c.column; })
                        });
                    }
                }
            };
            var this_1 = this;
            for (var _i = 0, _b = createTableAst.create_definitions; _i < _b.length; _i++) {
                var def = _b[_i];
                _loop_1(def);
            }
            var options = {};
            if (createTableAst.table_options) {
                for (var _c = 0, _d = createTableAst.table_options; _c < _d.length; _c++) {
                    var opt = _d[_c];
                    options[opt.keyword.toLowerCase()] = ((_a = opt.value) === null || _a === void 0 ? void 0 : _a.value) || opt.value;
                }
            }
            return {
                tableName: tableName,
                columns: columns,
                indexes: indexes,
                foreignKeys: foreignKeys,
                options: options,
                partitions: null,
                rawSql: ddl
            };
        }
        catch (err) {
            // Return null or gracefully fallback if astify fails
            console.warn('AST parser failed for table, falling back. Error:', err.message);
            return null;
        }
    };
    MysqlAstParser.prototype.cleanDefiner = function (ddl) {
        if (!ddl)
            return '';
        var userPart = "(?:'[^']+'|`[^`]+`|\"[^\"]+\"|[a-zA-Z0-9_]+)";
        var hostPart = "(?:@(?:'[^']+'|`[^`]+`|\"[^\"]+\"|[a-zA-Z0-9_\\.%]+))?";
        var definerPattern = "DEFINER\\s*=\\s*".concat(userPart).concat(hostPart);
        var beginMatch = ddl.match(/(\s)BEGIN(\s|$)/i);
        if (beginMatch && beginMatch.index !== undefined) {
            var header = ddl.substring(0, beginMatch.index).trim();
            var body = ddl.substring(beginMatch.index).trim();
            var re = new RegExp(definerPattern, 'gi');
            header = header.replace(re, '').replace(/\s{2,}/g, ' ');
            return header + ' ' + body;
        }
        var reFallback = new RegExp(definerPattern, 'gi');
        return ddl.replace(reFallback, '');
    };
    return MysqlAstParser;
}());
exports.MysqlAstParser = MysqlAstParser;
