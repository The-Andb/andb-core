"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParserService = void 0;
var mysql_ast_parser_1 = require("./adapters/mysql-ast.parser");
var ParserService = /** @class */ (function () {
    function ParserService() {
        this.astParser = new mysql_ast_parser_1.MysqlAstParser();
    }
    /**
     * Remove DEFINER clause from DDL
     * Handles CREATE [DEFINER=...] PROCEDURE/FUNCTION/VIEW/TRIGGER/EVENT
     */
    ParserService.prototype.cleanDefiner = function (ddl) {
        if (!ddl)
            return '';
        // Regex components
        var userPart = "(?:'[^']+'|`[^`]+`|\"[^\"]+\"|[a-zA-Z0-9_]+)";
        var hostPart = "(?:@(?:'[^']+'|`[^`]+`|\"[^\"]+\"|[a-zA-Z0-9_\\.%]+))?";
        var definerPattern = "DEFINER\\s*=\\s*".concat(userPart).concat(hostPart);
        // Split routine to separate header and body
        var parts = this.splitRoutine(ddl);
        if (parts) {
            var header = parts.header;
            var body = parts.body;
            // Remove DEFINER from header
            var re = new RegExp(definerPattern, 'gi');
            header = header.replace(re, '');
            // Cleanup double spaces created by removal
            header = header.replace(/\s{2,}/g, ' ');
            return header + ' ' + body;
        }
        // Fallback: simple global replace if split failed
        var reFallback = new RegExp(definerPattern, 'gi');
        return ddl.replace(reFallback, '');
    };
    /**
     * Split Routine into Header and Body
     */
    ParserService.prototype.splitRoutine = function (ddl) {
        if (!ddl)
            return null;
        // Try to find the first "BEGIN" keyword
        var beginMatch = ddl.match(/(\s)BEGIN(\s|$)/i);
        if (beginMatch && beginMatch.index !== undefined) {
            return {
                header: ddl.substring(0, beginMatch.index).trim(),
                body: ddl.substring(beginMatch.index).trim(),
            };
        }
        return null;
    };
    /**
     * Normalize DDL for comparison
     */
    ParserService.prototype.normalize = function (ddl, options) {
        if (options === void 0) { options = {}; }
        if (!ddl)
            return '';
        var processed = ddl;
        if (options.ignoreDefiner) {
            processed = this.cleanDefiner(processed);
        }
        if (options.ignoreWhitespace) {
            // Collapse whitespace: tabs, newlines -> space
            processed = processed.replace(/\s+/g, ' ').trim();
        }
        return processed;
    };
    /**
     * Convert SQL keywords to uppercase
     */
    ParserService.prototype.uppercaseKeywords = function (query) {
        var keywords = new Set([
            'ACCESSIBLE',
            'ADD',
            'ALL',
            'ALTER',
            'ANALYZE',
            'AND',
            'AS',
            'ASC',
            'ASENSITIVE',
            'BEFORE',
            'BETWEEN',
            'BIGINT',
            'BINARY',
            'BLOB',
            'BOTH',
            'BY',
            'CALL',
            'CASCADE',
            'CASE',
            'CHANGE',
            'CHAR',
            'CHARACTER',
            'CHECK',
            'COLLATE',
            'COLUMN',
            'CONDITION',
            'CONSTRAINT',
            'CONTINUE',
            'CONVERT',
            'CREATE',
            'CROSS',
            'CURRENT_DATE',
            'CURRENT_TIME',
            'CURRENT_TIMESTAMP',
            'CURRENT_USER',
            'CURSOR',
            'DATABASE',
            'DATABASES',
            'DAY_HOUR',
            'DAY_MICROSECOND',
            'DAY_MINUTE',
            'DAY_SECOND',
            'DEC',
            'DECIMAL',
            'DECLARE',
            'DEFAULT',
            'DELAYED',
            'DELETE',
            'DESC',
            'DESCRIBE',
            'DETERMINISTIC',
            'DISTINCT',
            'DISTINCTROW',
            'DIV',
            'DOUBLE',
            'DROP',
            'DUAL',
            'EACH',
            'ELSE',
            'ELSEIF',
            'ENCLOSED',
            'ESCAPED',
            'EXISTS',
            'EXIT',
            'EXPLAIN',
            'FALSE',
            'FETCH',
            'FLOAT',
            'FLOAT4',
            'FLOAT8',
            'FORCE',
            'FOREIGN',
            'FROM',
            'FULLTEXT',
            'GENERATED',
            'GET',
            'GRANT',
            'GROUP',
            'HAVING',
            'HIGH_PRIORITY',
            'HOUR_MICROSECOND',
            'HOUR_MINUTE',
            'HOUR_SECOND',
            'IF',
            'IGNORE',
            'IGNORE_SERVER_IDS',
            'IN',
            'INDEX',
            'INFILE',
            'INNER',
            'INOUT',
            'INSENSITIVE',
            'INSERT',
            'INT',
            'INT1',
            'INT2',
            'INT3',
            'INT4',
            'INT8',
            'INTEGER',
            'INTERVAL',
            'INTO',
            'IO_AFTER_GTIDS',
            'IO_BEFORE_GTIDS',
            'IS',
            'ITERATE',
            'JOIN',
            'KEY',
            'KEYS',
            'KILL',
            'LEADING',
            'LEAVE',
            'LEFT',
            'LIKE',
            'LIMIT',
            'LINEAR',
            'LINES',
            'LOAD',
            'LOCALTIME',
            'LOCALTIMESTAMP',
            'LOCK',
            'LONG',
            'LONGBLOB',
            'LONGTEXT',
            'LOOP',
            'LOW_PRIORITY',
            'MASTER_BIND',
            'MASTER_SSL_VERIFY_SERVER_CERT',
            'MATCH',
            'MAXVALUE',
            'MEDIUMBLOB',
            'MEDIUMINT',
            'MEDIUMTEXT',
            'MIDDLEINT',
            'MINUTE_MICROSECOND',
            'MINUTE_SECOND',
            'MOD',
            'MODIFIES',
            'NATURAL',
            'NOT',
            'NO_WRITE_TO_BINLOG',
            'NULL',
            'NUMERIC',
            'ON',
            'OPTIMIZE',
            'OPTION',
            'OPTIONALLY',
            'OR',
            'ORDER',
            'OUT',
            'OUTER',
            'OUTFILE',
            'PARTITION',
            'PRECISION',
            'PRIMARY',
            'PROCEDURE',
            'PURGE',
            'RANGE',
            'READ',
            'READS',
            'READ_WRITE',
            'REAL',
            'REFERENCES',
            'REGEXP',
            'RELEASE',
            'RENAME',
            'REPEAT',
            'REPLACE',
            'REQUIRE',
            'RESIGNAL',
            'RESTRICT',
            'RETURN',
            'REVOKE',
            'RIGHT',
            'RLIKE',
            'SCHEMA',
            'SCHEMAS',
            'SECOND_MICROSECOND',
            'SELECT',
            'SENSITIVE',
            'SEPARATOR',
            'SET',
            'SHOW',
            'SIGNAL',
            'SMALLINT',
            'SPATIAL',
            'SPECIFIC',
            'SQL',
            'SQLEXCEPTION',
            'SQLSTATE',
            'SQLWARNING',
            'SQL_BIG_RESULT',
            'SQL_CALC_FOUND_ROWS',
            'SQL_SMALL_RESULT',
            'SSL',
            'STARTING',
            'STORED',
            'STRAIGHT_JOIN',
            'TABLE',
            'TERMINATED',
            'TEXT',
            'THEN',
            'TINYBLOB',
            'TINYINT',
            'TINYTEXT',
            'TO',
            'TRAILING',
            'TRIGGER',
            'TRUE',
            'UNDO',
            'UNION',
            'UNIQUE',
            'UNLOCK',
            'UNSIGNED',
            'UPDATE',
            'USAGE',
            'USE',
            'USING',
            'UTC_DATE',
            'UTC_TIME',
            'UTC_TIMESTAMP',
            'VALUES',
            'VARBINARY',
            'VARCHAR',
            'VARCHARACTER',
            'VARYING',
            'VIRTUAL',
            'WHEN',
            'WHERE',
            'WHILE',
            'WITH',
            'WRITE',
            'XOR',
            'YEAR_MONTH',
            'ZEROFILL',
            'END',
            'OPEN',
            'CLOSE',
            'DUPLICATE',
            'COALESCE',
        ]);
        // Use regex to match backticked identifiers, quotes, or regular words.
        // This prevents uppercasing keywords when they are used as column names (e.g., `end`) or inside string literals.
        return query
            .replace(/`[^`]*`|'[^']*'|"[^"]*"|\b[a-zA-Z_]+\b/g, function (match) {
            if (match.startsWith('`') || match.startsWith("'") || match.startsWith('"')) {
                return match; // Keep literals and identifiers untouched
            }
            return keywords.has(match.toUpperCase()) ? match.toUpperCase() : match;
        })
            .replace(/\`(GROUP|USER|GROUPS)\`/ig, function (match, p1) { return "`".concat(p1.toLowerCase(), "`"); })
            .replace(/\t/g, '  ');
    };
    /**
     * Parse CREATE TABLE statement into structured components
     */
    ParserService.prototype.parseTable = function (tableSQL) {
        try {
            var lines = tableSQL.split('\n');
            var tableNameLine = lines.find(function (line) { return line.includes('CREATE TABLE'); });
            if (!tableNameLine)
                return null;
            var tableNameMatch = tableNameLine.match(/`([^`]+)`/);
            if (!tableNameMatch || tableNameMatch.length < 2) {
                return null;
            }
            var tableName = tableNameMatch[1];
            var columnDefs = [];
            var primaryKey = [];
            var indexes = {};
            var foreignKeys = {};
            var insideColumnDefinitions = false;
            var insideIndexDefinitions = false;
            for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
                var line = lines_1[_i];
                if (line.includes('CREATE TABLE')) {
                    insideColumnDefinitions = true;
                    continue;
                }
                else if (insideColumnDefinitions &&
                    (line.trim().includes('ENGINE=') || line.trim().startsWith(')'))) {
                    // Reached the end of column definitions
                    insideColumnDefinitions = false;
                }
                else if (line.includes('PRIMARY KEY') ||
                    line.includes('UNIQUE KEY') ||
                    line.includes('FULLTEXT KEY') ||
                    line.includes('SPATIAL KEY') ||
                    line.includes('CONSTRAINT') ||
                    line.includes('INDEX') ||
                    (line.trim().startsWith('KEY') && line.includes('`'))) {
                    insideIndexDefinitions = true;
                    if (line.includes('CONSTRAINT')) {
                        var constraintNameMatch = line.match(/CONSTRAINT\s+`([^`]+)`/);
                        if (constraintNameMatch && constraintNameMatch.length >= 2) {
                            foreignKeys[constraintNameMatch[1]] = line.trim();
                        }
                    }
                    else {
                        var indexNameMatch = line.match(/`([^`]+)`/);
                        if (indexNameMatch && indexNameMatch.length >= 2) {
                            var indexName = indexNameMatch[1];
                            if (line.includes('PRIMARY KEY')) {
                                primaryKey.push(indexName);
                            }
                            else {
                                indexes[indexName] = line.trim();
                            }
                        }
                    }
                }
                else if (insideColumnDefinitions && line.trim() !== '') {
                    // Parse only non-empty lines inside column definitions
                    var columnNameMatch = line.match(/`([^`]+)`/);
                    if (!columnNameMatch || columnNameMatch.length < 2) {
                        continue;
                    }
                    var columnName = columnNameMatch[1];
                    columnDefs.push({
                        name: columnName,
                        definition: line.trim(),
                    });
                }
                else if (insideIndexDefinitions && line.trim() === ')') {
                    insideIndexDefinitions = false;
                }
            }
            var columns = {};
            for (var _a = 0, columnDefs_1 = columnDefs; _a < columnDefs_1.length; _a++) {
                var columnDef = columnDefs_1[_a];
                columns[columnDef.name] = columnDef.definition;
            }
            return {
                tableName: tableName,
                columns: columns,
                primaryKey: primaryKey,
                indexes: indexes,
                foreignKeys: foreignKeys,
            };
        }
        catch (error) {
            return null;
        }
    };
    /**
     * Parse CREATE TABLE statement into rich structured components for UI visualization
     */
    ParserService.prototype.parseTableDetailed = function (tableSQL) {
        try {
            // Attempt AST parsing first
            var ast = this.astParser.parseTableDetailed(tableSQL);
            if (ast) {
                var pkSet_1 = new Set(ast.indexes.filter(function (i) { return i.type === 'PRIMARY'; }).flatMap(function (i) { return i.columns; }));
                var uniqueSet_1 = new Set(ast.indexes.filter(function (i) { return i.type === 'UNIQUE'; }).flatMap(function (i) { return i.columns; }));
                var mappedColumns = ast.columns.map(function (c) { return ({
                    name: c.name,
                    type: c.dataType.toUpperCase(),
                    pk: pkSet_1.has(c.name),
                    notNull: !c.nullable,
                    unique: uniqueSet_1.has(c.name),
                    unsigned: !!c.unsigned,
                    autoIncrement: c.autoIncrement,
                    default: c.defaultValue,
                    comment: c.comment,
                    definition: c.rawDefinition
                }); });
                return {
                    tableName: ast.tableName,
                    columns: mappedColumns,
                    indexes: ast.indexes,
                    foreignKeys: ast.foreignKeys,
                    options: ast.options,
                    partitions: ast.partitions
                };
            }
        }
        catch (e) {
            console.warn('AST Parser failed, falling back to Regex. Error:', e.message);
        }
        // Fallback to legacy regex implementation
        return this.parseTableDetailedRegex(tableSQL);
    };
    /**
     * Legacy Regex-based Parser (Kept for testing & fallback)
     */
    ParserService.prototype.parseTableDetailedRegex = function (tableSQL) {
        try {
            if (!tableSQL || !tableSQL.toUpperCase().includes('CREATE TABLE'))
                return null;
            var tableNameMatch = tableSQL.match(/CREATE TABLE\s+`?([^`\s(]+)`?/i);
            if (!tableNameMatch)
                return null;
            var tableName = tableNameMatch[1];
            // Find the first '(' and the last ')' to extract the body
            var firstParen = tableSQL.indexOf('(');
            var lastParen = tableSQL.lastIndexOf(')');
            if (firstParen === -1 || lastParen === -1)
                return null;
            var body = tableSQL.substring(firstParen + 1, lastParen);
            var lines = [];
            var current = '';
            var parenLevel = 0;
            var inQuote = false;
            var quoteChar = '';
            for (var i = 0; i < body.length; i++) {
                var char = body[i];
                if (inQuote) {
                    current += char;
                    if (char === quoteChar && body[i - 1] !== '\\')
                        inQuote = false;
                }
                else {
                    if (char === "'" || char === '"' || char === '`') {
                        inQuote = true;
                        quoteChar = char;
                        current += char;
                    }
                    else if (char === '(') {
                        parenLevel++;
                        current += char;
                    }
                    else if (char === ')') {
                        parenLevel--;
                        current += char;
                    }
                    else if (char === ',' && parenLevel === 0) {
                        lines.push(current.trim());
                        current = '';
                    }
                    else {
                        current += char;
                    }
                }
            }
            if (current.trim())
                lines.push(current.trim());
            var columns = [];
            var indexes = [];
            var foreignKeys = [];
            var pkColumns_1 = new Set();
            for (var _i = 0, lines_2 = lines; _i < lines_2.length; _i++) {
                var line = lines_2[_i];
                if (!line)
                    continue;
                var up = line.toUpperCase();
                if (up.startsWith('PRIMARY KEY')) {
                    var match = line.match(/PRIMARY KEY\s*\((.*?)\)/i);
                    if (match) {
                        match[1].split(',').forEach(function (c) { return pkColumns_1.add(c.trim().replace(/[`"]/g, '')); });
                        indexes.push({
                            name: 'PRIMARY',
                            type: 'PRIMARY KEY',
                            columns: match[1].trim(),
                            definition: line,
                        });
                    }
                    continue;
                }
                if (up.startsWith('CONSTRAINT') && up.includes('FOREIGN KEY')) {
                    var nameMatch = line.match(/CONSTRAINT\s+`?([^`\s]+)`?/i);
                    var fkMatch = line.match(/FOREIGN KEY\s*\((.*?)\)\s+REFERENCES\s+`?([^`\s(]+)`?\s*\((.*?)\)/i);
                    if (fkMatch) {
                        foreignKeys.push({
                            name: nameMatch ? nameMatch[1] : 'FK_anonymous',
                            localColumns: fkMatch[1].trim(),
                            referencedTable: fkMatch[2].trim(),
                            referencedColumns: fkMatch[3].trim(),
                            definition: line,
                        });
                    }
                    continue;
                }
                if (up.startsWith('KEY') || up.startsWith('INDEX') || up.startsWith('UNIQUE KEY')) {
                    var type = up.startsWith('UNIQUE') ? 'UNIQUE' : 'INDEX';
                    var nameMatch = line.match(/(?:KEY|INDEX)\s+`?([^`\s(]+)`?/i);
                    var colMatch = line.match(/\((.*?)\)/);
                    indexes.push({
                        name: nameMatch ? nameMatch[1] : 'anonymous',
                        type: type,
                        columns: colMatch ? colMatch[1].trim() : '',
                        definition: line,
                    });
                    continue;
                }
                var colNameMatch = line.match(/^`?([^`\s]+)`?\s+([a-zA-Z0-9_().,'"\s]+)/i);
                if (colNameMatch) {
                    var name_1 = colNameMatch[1];
                    var fullType = colNameMatch[2].trim();
                    var isPk = pkColumns_1.has(name_1) || up.includes('PRIMARY KEY');
                    var isNotNull = up.includes('NOT NULL');
                    var isUnsigned = up.includes('UNSIGNED');
                    var isAutoInc = up.includes('AUTO_INCREMENT');
                    var isUnique = up.includes('UNIQUE');
                    var defVal = null;
                    var defMatch = line.match(/DEFAULT\s+('([^']*)'|([^,\s]+))/i);
                    if (defMatch)
                        defVal = defMatch[2] || defMatch[3];
                    var comment = '';
                    var commentMatch = line.match(/COMMENT\s+'([^']*)'/i);
                    if (commentMatch)
                        comment = commentMatch[1];
                    columns.push({
                        name: name_1,
                        type: fullType.split(' ')[0],
                        pk: isPk,
                        notNull: isNotNull,
                        unique: isUnique,
                        unsigned: isUnsigned,
                        autoIncrement: isAutoInc,
                        default: defVal,
                        comment: comment,
                        definition: line,
                    });
                }
            }
            var options = {};
            var engineMatch = tableSQL.match(/ENGINE=([^`\s;]+)/i);
            if (engineMatch)
                options.engine = engineMatch[1];
            var charsetMatch = tableSQL.match(/(?:DEFAULT\s+)?CHARSET=([^`\s;]+)/i) || tableSQL.match(/CHARACTER\s+SET\s+([^`\s;]+)/i);
            if (charsetMatch)
                options.charset = charsetMatch[1];
            var collationMatch = tableSQL.match(/COLLATE=([^`\s;]+)/i);
            if (collationMatch)
                options.collation = collationMatch[1];
            var tableCommentMatch = tableSQL.match(/COMMENT='([^']*)'/i);
            if (tableCommentMatch)
                options.comment = tableCommentMatch[1];
            var partitionsMatch = tableSQL.match(/PARTITION BY.*$/is);
            var partitions = partitionsMatch ? partitionsMatch[0].trim() : null;
            return {
                tableName: tableName,
                columns: columns,
                indexes: indexes,
                foreignKeys: foreignKeys,
                options: options,
                partitions: partitions,
            };
        }
        catch (e) {
            return null;
        }
    };
    /**
     * Parse CREATE TRIGGER statement
     */
    ParserService.prototype.parseTrigger = function (triggerSQL) {
        var _a, _b, _c;
        try {
            var lines = triggerSQL.split('\n');
            var triggerNameLine = lines.find(function (line) { return line.includes('TRIGGER') && line.includes('`'); });
            var triggerNameMatch = triggerNameLine === null || triggerNameLine === void 0 ? void 0 : triggerNameLine.match(/TRIGGER\s+`([^`]+)`/);
            if (!triggerNameMatch || triggerNameMatch.length < 2) {
                return null;
            }
            var triggerName = triggerNameMatch[1];
            var timing = (((_a = triggerNameLine === null || triggerNameLine === void 0 ? void 0 : triggerNameLine.match(/(BEFORE|AFTER)/i)) === null || _a === void 0 ? void 0 : _a[1]) || '').toUpperCase();
            var event_1 = (((_b = triggerNameLine === null || triggerNameLine === void 0 ? void 0 : triggerNameLine.match(/(INSERT|UPDATE|DELETE)/i)) === null || _b === void 0 ? void 0 : _b[1]) || '').toUpperCase();
            var tableName = ((_c = triggerNameLine === null || triggerNameLine === void 0 ? void 0 : triggerNameLine.match(/ON\s+`([^`]+)`/i)) === null || _c === void 0 ? void 0 : _c[1]) || '';
            return {
                triggerName: triggerName,
                timing: timing,
                event: event_1,
                tableName: tableName,
                definition: triggerSQL,
            };
        }
        catch (error) {
            return null;
        }
    };
    /**
     * Detect object type from DDL string
     */
    ParserService.prototype.detectObjectType = function (ddl) {
        if (!ddl)
            return 'UNKNOWN';
        var clean = ddl.replace(/\/\*.*?\*\//gs, '').trim(); // Remove comments
        var up = clean.toUpperCase();
        if (up.includes('CREATE TABLE'))
            return 'TABLE';
        if (up.includes('CREATE VIEW'))
            return 'VIEW';
        if (up.includes('CREATE PROCEDURE'))
            return 'PROCEDURE';
        if (up.includes('CREATE FUNCTION'))
            return 'FUNCTION';
        if (up.includes('CREATE TRIGGER'))
            return 'TRIGGER';
        if (up.includes('CREATE EVENT'))
            return 'EVENT';
        if (up.includes('CREATE INDEX') || up.includes('CREATE UNIQUE INDEX'))
            return 'INDEX';
        return 'UNKNOWN';
    };
    return ParserService;
}());
exports.ParserService = ParserService;
