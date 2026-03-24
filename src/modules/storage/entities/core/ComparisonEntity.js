"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComparisonEntity = void 0;
var typeorm_1 = require("typeorm");
var ComparisonEntity = /** @class */ (function () {
    function ComparisonEntity() {
    }
    __decorate([
        (0, typeorm_1.PrimaryColumn)('text')
    ], ComparisonEntity.prototype, "id", void 0);
    __decorate([
        (0, typeorm_1.Column)('text', { default: '' })
    ], ComparisonEntity.prototype, "source_env", void 0);
    __decorate([
        (0, typeorm_1.Column)('text', { default: '' })
    ], ComparisonEntity.prototype, "target_env", void 0);
    __decorate([
        (0, typeorm_1.Column)('text')
    ], ComparisonEntity.prototype, "database_name", void 0);
    __decorate([
        (0, typeorm_1.Column)('text')
    ], ComparisonEntity.prototype, "ddl_type", void 0);
    __decorate([
        (0, typeorm_1.Column)('text')
    ], ComparisonEntity.prototype, "ddl_name", void 0);
    __decorate([
        (0, typeorm_1.Column)('text')
    ], ComparisonEntity.prototype, "status", void 0);
    __decorate([
        (0, typeorm_1.Column)('text', { nullable: true })
    ], ComparisonEntity.prototype, "file_path", void 0);
    __decorate([
        (0, typeorm_1.Column)('text', { nullable: true })
    ], ComparisonEntity.prototype, "alter_statements", void 0);
    __decorate([
        (0, typeorm_1.CreateDateColumn)({ type: 'datetime' })
    ], ComparisonEntity.prototype, "compared_at", void 0);
    ComparisonEntity = __decorate([
        (0, typeorm_1.Entity)('comparisons')
    ], ComparisonEntity);
    return ComparisonEntity;
}());
exports.ComparisonEntity = ComparisonEntity;
