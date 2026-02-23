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
exports.CreatePerformanceReviewDto = exports.CreatePerformanceReviewItemDto = exports.PerformanceItemType = exports.PerformanceRating = exports.PerformanceReviewType = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var PerformanceReviewType;
(function (PerformanceReviewType) {
    PerformanceReviewType["PROBATION"] = "PROBATION";
    PerformanceReviewType["QUARTERLY"] = "QUARTERLY";
    PerformanceReviewType["SEMI_ANNUAL"] = "SEMI_ANNUAL";
    PerformanceReviewType["ANNUAL"] = "ANNUAL";
    PerformanceReviewType["PROJECT"] = "PROJECT";
    PerformanceReviewType["SELF_ASSESSMENT"] = "SELF_ASSESSMENT";
})(PerformanceReviewType || (exports.PerformanceReviewType = PerformanceReviewType = {}));
var PerformanceRating;
(function (PerformanceRating) {
    PerformanceRating["EXCEPTIONAL"] = "EXCEPTIONAL";
    PerformanceRating["EXCEEDS"] = "EXCEEDS";
    PerformanceRating["MEETS"] = "MEETS";
    PerformanceRating["NEEDS_IMPROVEMENT"] = "NEEDS_IMPROVEMENT";
    PerformanceRating["UNSATISFACTORY"] = "UNSATISFACTORY";
})(PerformanceRating || (exports.PerformanceRating = PerformanceRating = {}));
var PerformanceItemType;
(function (PerformanceItemType) {
    PerformanceItemType["KPI"] = "KPI";
    PerformanceItemType["COMPETENCY"] = "COMPETENCY";
    PerformanceItemType["GOAL"] = "GOAL";
    PerformanceItemType["BEHAVIOR"] = "BEHAVIOR";
})(PerformanceItemType || (exports.PerformanceItemType = PerformanceItemType = {}));
class CreatePerformanceReviewItemDto {
    type;
    name;
    description;
    weight;
    targetValue;
    actualValue;
    rating;
    score;
    comments;
    selfRating;
    selfScore;
    selfComments;
}
exports.CreatePerformanceReviewItemDto = CreatePerformanceReviewItemDto;
__decorate([
    (0, class_validator_1.IsEnum)(PerformanceItemType),
    __metadata("design:type", String)
], CreatePerformanceReviewItemDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePerformanceReviewItemDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePerformanceReviewItemDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreatePerformanceReviewItemDto.prototype, "weight", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePerformanceReviewItemDto.prototype, "targetValue", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePerformanceReviewItemDto.prototype, "actualValue", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(PerformanceRating),
    __metadata("design:type", String)
], CreatePerformanceReviewItemDto.prototype, "rating", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    __metadata("design:type", Number)
], CreatePerformanceReviewItemDto.prototype, "score", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePerformanceReviewItemDto.prototype, "comments", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(PerformanceRating),
    __metadata("design:type", String)
], CreatePerformanceReviewItemDto.prototype, "selfRating", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    __metadata("design:type", Number)
], CreatePerformanceReviewItemDto.prototype, "selfScore", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePerformanceReviewItemDto.prototype, "selfComments", void 0);
class CreatePerformanceReviewDto {
    title;
    type;
    periodStart;
    periodEnd;
    reviewDate;
    userId;
    reviewerId;
    overallRating;
    overallScore;
    achievements;
    areasToImprove;
    managerComments;
    employeeComments;
    developmentPlan;
    nextPeriodGoals;
    items;
}
exports.CreatePerformanceReviewDto = CreatePerformanceReviewDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePerformanceReviewDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(PerformanceReviewType),
    __metadata("design:type", String)
], CreatePerformanceReviewDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreatePerformanceReviewDto.prototype, "periodStart", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreatePerformanceReviewDto.prototype, "periodEnd", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreatePerformanceReviewDto.prototype, "reviewDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePerformanceReviewDto.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePerformanceReviewDto.prototype, "reviewerId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(PerformanceRating),
    __metadata("design:type", String)
], CreatePerformanceReviewDto.prototype, "overallRating", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    __metadata("design:type", Number)
], CreatePerformanceReviewDto.prototype, "overallScore", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePerformanceReviewDto.prototype, "achievements", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePerformanceReviewDto.prototype, "areasToImprove", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePerformanceReviewDto.prototype, "managerComments", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePerformanceReviewDto.prototype, "employeeComments", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePerformanceReviewDto.prototype, "developmentPlan", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePerformanceReviewDto.prototype, "nextPeriodGoals", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreatePerformanceReviewItemDto),
    __metadata("design:type", Array)
], CreatePerformanceReviewDto.prototype, "items", void 0);
//# sourceMappingURL=create-performance-review.dto.js.map