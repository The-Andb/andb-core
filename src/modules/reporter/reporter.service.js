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
exports.ReporterService = void 0;
var getLogger = require('andb-logger').getLogger;
var fs = __importStar(require("fs"));
var path = __importStar(require("path"));
var ReporterService = /** @class */ (function () {
    function ReporterService() {
        this.logger = getLogger({ logName: 'ReporterService' });
    }
    ReporterService.prototype.generateHtmlReport = function (env, dbName, diff, outputPath) {
        return __awaiter(this, void 0, void 0, function () {
            var templatePath, resolvedTemplatePath, template, categories, newData, updatedData, deprecatedData, tableName, replacements, reportHTML, _i, _a, _b, key, value;
            var _this = this;
            return __generator(this, function (_c) {
                templatePath = path.join(__dirname, 'templates', 'template.html');
                resolvedTemplatePath = templatePath;
                if (!fs.existsSync(resolvedTemplatePath)) {
                    resolvedTemplatePath = path.join(process.cwd(), 'src', 'modules', 'reporter', 'templates', 'template.html');
                }
                if (!fs.existsSync(resolvedTemplatePath)) {
                    throw new Error("Report template not found: ".concat(resolvedTemplatePath));
                }
                template = fs.readFileSync(resolvedTemplatePath, 'utf8');
                categories = ['Tables', 'Views', 'Procedures', 'Functions', 'Triggers', 'Events'];
                newData = [0, 0, 0, 0, 0, 0];
                updatedData = [0, 0, 0, 0, 0, 0];
                deprecatedData = [diff.droppedTables.length, 0, 0, 0, 0, 0];
                // Count changes
                for (tableName in diff.tables) {
                    if (diff.tables[tableName].operations.length > 0) {
                        updatedData[0]++;
                    }
                }
                diff.objects.forEach(function (obj) {
                    var idx = _this._getCategoryIndex(obj.type);
                    if (obj.operation === 'CREATE')
                        newData[idx]++;
                    else if (obj.operation === 'REPLACE')
                        updatedData[idx]++;
                    else if (obj.operation === 'DROP')
                        deprecatedData[idx]++;
                });
                replacements = {
                    '{{ENV}}': env,
                    '{{CHART_CATEGORIES}}': JSON.stringify(categories),
                    '{{TOTAL_DDL}}': JSON.stringify([0, 0, 0, 0, 0, 0]), // TODO: Need real totals
                    '{{NEW_DDL}}': JSON.stringify(newData),
                    '{{UPDATED_DDL}}': JSON.stringify(updatedData),
                    '{{DEPRECATED_DDL}}': JSON.stringify(deprecatedData),
                    '{{MISSING_COLUMNS}}': '{}',
                    '{{STYLE4MISSING}}': 'display:none',
                };
                // Replace DDL lists
                this._addListReplacements(replacements, diff);
                reportHTML = template;
                for (_i = 0, _a = Object.entries(replacements); _i < _a.length; _i++) {
                    _b = _a[_i], key = _b[0], value = _b[1];
                    reportHTML = reportHTML.split(key).join(value);
                }
                fs.mkdirSync(path.dirname(outputPath), { recursive: true });
                fs.writeFileSync(outputPath, reportHTML);
                this.logger.info("Generated HTML report: ".concat(outputPath));
                return [2 /*return*/, outputPath];
            });
        });
    };
    ReporterService.prototype._getCategoryIndex = function (type) {
        switch (type) {
            case 'VIEW':
                return 1;
            case 'PROCEDURE':
                return 2;
            case 'FUNCTION':
                return 3;
            case 'TRIGGER':
                return 4;
            case 'EVENT':
                return 5;
            default:
                return 0;
        }
    };
    ReporterService.prototype._addListReplacements = function (replacements, diff) {
        var types = ['TABLE', 'VIEW', 'PROCEDURE', 'FUNCTION', 'TRIGGER', 'EVENT'];
        types.forEach(function (type) {
            var newHtml = '';
            var updatedHtml = '';
            var droppedHtml = '';
            if (type === 'TABLE') {
                for (var tableName in diff.tables) {
                    if (diff.tables[tableName].operations.length > 0) {
                        updatedHtml += "<li>".concat(tableName, "</li>");
                    }
                }
                diff.droppedTables.forEach(function (t) {
                    droppedHtml += "<li>".concat(t, "</li>");
                });
            }
            else {
                diff.objects
                    .filter(function (o) { return o.type === type; })
                    .forEach(function (obj) {
                    if (obj.operation === 'CREATE')
                        newHtml += "<li>".concat(obj.name, "</li>");
                    else if (obj.operation === 'REPLACE')
                        updatedHtml += "<li>".concat(obj.name, "</li>");
                    else if (obj.operation === 'DROP')
                        droppedHtml += "<li>".concat(obj.name, "</li>");
                });
            }
            replacements["{{".concat(type, "_NEW}}")] = newHtml || '<li class="empty-state">No changes</li>';
            replacements["{{".concat(type, "_UPDATE}}")] = updatedHtml || '<li class="empty-state">No changes</li>';
            replacements["{{".concat(type, "_DEPRECATED}}")] =
                droppedHtml || '<li class="empty-state">No changes</li>';
        });
    };
    return ReporterService;
}());
exports.ReporterService = ReporterService;
