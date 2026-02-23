"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RejectLeaveDto = exports.ApproveLeaveDto = exports.UpdateLeaveDto = void 0;
const class_validator_1 = require("class-validator");
const create_leave_dto_1 = require("./create-leave.dto");
class UpdateLeaveDto {
    type;
    startDate;
    endDate;
    days;
    reason;
}
exports.UpdateLeaveDto = UpdateLeaveDto;
__decorate([
    (0, class_validator_1.IsEnum)(create_leave_dto_1.LeaveType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateLeaveDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateLeaveDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateLeaveDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateLeaveDto.prototype, "days", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateLeaveDto.prototype, "reason", void 0);
class ApproveLeaveDto {
    note;
}
exports.ApproveLeaveDto = ApproveLeaveDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ApproveLeaveDto.prototype, "note", void 0);
class RejectLeaveDto {
    rejectionNote;
}
exports.RejectLeaveDto = RejectLeaveDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RejectLeaveDto.prototype, "rejectionNote", void 0);
//# sourceMappingURL=update-leave.dto.js.map