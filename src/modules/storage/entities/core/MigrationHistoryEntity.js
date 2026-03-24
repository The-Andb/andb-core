"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationHistoryEntity = void 0;
var typeorm_1 = require("typeorm");
var MigrationHistoryEntity = /** @class */ (function () {
    function MigrationHistoryEntity() {
    }
    __decorate([
        (0, typeorm_1.PrimaryGeneratedColumn)()
    ], MigrationHistoryEntity.prototype, "id", void 0);
    __decorate([
        (0, typeorm_1.Column)('text')
    ], MigrationHistoryEntity.prototype, "environment", void 0);
    __decorate([
        (0, typeorm_1.Column)('text')
    ], MigrationHistoryEntity.prototype, "database_name", void 0);
    __decorate([
        (0, typeorm_1.Column)('text')
    ], MigrationHistoryEntity.prototype, "migration_type", void 0);
    __decorate([
        (0, typeorm_1.Column)('text')
    ], MigrationHistoryEntity.prototype, "target_objects", void 0);
    __decorate([
        (0, typeorm_1.Column)('text')
    ], MigrationHistoryEntity.prototype, "status", void 0);
    __decorate([
        (0, typeorm_1.Column)('text', { nullable: true })
    ], MigrationHistoryEntity.prototype, "error_message", void 0);
    __decorate([
        (0, typeorm_1.CreateDateColumn)({ type: 'datetime' })
    ], MigrationHistoryEntity.prototype, "executed_at", void 0);
    __decorate([
        (0, typeorm_1.Column)('text', { nullable: true })
    ], MigrationHistoryEntity.prototype, "executed_by", void 0);
    MigrationHistoryEntity = __decorate([
        (0, typeorm_1.Entity)('migration_history')
    ], MigrationHistoryEntity);
    return MigrationHistoryEntity;
}());
exports.MigrationHistoryEntity = MigrationHistoryEntity;
