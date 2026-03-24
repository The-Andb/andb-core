"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DdlSnapshotEntity = void 0;
var typeorm_1 = require("typeorm");
var DdlSnapshotEntity = /** @class */ (function () {
    function DdlSnapshotEntity() {
    }
    __decorate([
        (0, typeorm_1.PrimaryColumn)('text')
    ], DdlSnapshotEntity.prototype, "id", void 0);
    __decorate([
        (0, typeorm_1.Column)('text')
    ], DdlSnapshotEntity.prototype, "environment", void 0);
    __decorate([
        (0, typeorm_1.Column)('text')
    ], DdlSnapshotEntity.prototype, "database_name", void 0);
    __decorate([
        (0, typeorm_1.Column)('text')
    ], DdlSnapshotEntity.prototype, "ddl_type", void 0);
    __decorate([
        (0, typeorm_1.Column)('text')
    ], DdlSnapshotEntity.prototype, "ddl_name", void 0);
    __decorate([
        (0, typeorm_1.Column)('text', { nullable: true })
    ], DdlSnapshotEntity.prototype, "file_path", void 0);
    __decorate([
        (0, typeorm_1.Column)('text', { nullable: true })
    ], DdlSnapshotEntity.prototype, "ddl_content", void 0);
    __decorate([
        (0, typeorm_1.Column)('text')
    ], DdlSnapshotEntity.prototype, "hash", void 0);
    __decorate([
        (0, typeorm_1.CreateDateColumn)({ type: 'datetime' })
    ], DdlSnapshotEntity.prototype, "created_at", void 0);
    DdlSnapshotEntity = __decorate([
        (0, typeorm_1.Entity)('ddl_snapshots')
    ], DdlSnapshotEntity);
    return DdlSnapshotEntity;
}());
exports.DdlSnapshotEntity = DdlSnapshotEntity;
