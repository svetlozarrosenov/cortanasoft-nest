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
exports.CreateCrmCompanyDto = exports.Industry = exports.CompanySize = exports.CrmCompanyType = void 0;
const class_validator_1 = require("class-validator");
var CrmCompanyType;
(function (CrmCompanyType) {
    CrmCompanyType["PROSPECT"] = "PROSPECT";
    CrmCompanyType["CUSTOMER"] = "CUSTOMER";
    CrmCompanyType["PARTNER"] = "PARTNER";
    CrmCompanyType["VENDOR"] = "VENDOR";
    CrmCompanyType["COMPETITOR"] = "COMPETITOR";
    CrmCompanyType["OTHER"] = "OTHER";
})(CrmCompanyType || (exports.CrmCompanyType = CrmCompanyType = {}));
var CompanySize;
(function (CompanySize) {
    CompanySize["MICRO"] = "MICRO";
    CompanySize["SMALL"] = "SMALL";
    CompanySize["MEDIUM"] = "MEDIUM";
    CompanySize["LARGE"] = "LARGE";
})(CompanySize || (exports.CompanySize = CompanySize = {}));
var Industry;
(function (Industry) {
    Industry["TECHNOLOGY"] = "TECHNOLOGY";
    Industry["FINANCE"] = "FINANCE";
    Industry["HEALTHCARE"] = "HEALTHCARE";
    Industry["MANUFACTURING"] = "MANUFACTURING";
    Industry["RETAIL"] = "RETAIL";
    Industry["REAL_ESTATE"] = "REAL_ESTATE";
    Industry["EDUCATION"] = "EDUCATION";
    Industry["CONSULTING"] = "CONSULTING";
    Industry["LOGISTICS"] = "LOGISTICS";
    Industry["HOSPITALITY"] = "HOSPITALITY";
    Industry["CONSTRUCTION"] = "CONSTRUCTION";
    Industry["AGRICULTURE"] = "AGRICULTURE";
    Industry["ENERGY"] = "ENERGY";
    Industry["MEDIA"] = "MEDIA";
    Industry["OTHER"] = "OTHER";
})(Industry || (exports.Industry = Industry = {}));
class CreateCrmCompanyDto {
    name;
    type;
    industry;
    size;
    eik;
    vatNumber;
    email;
    phone;
    website;
    address;
    city;
    postalCode;
    countryId;
    annualRevenue;
    employeeCount;
    foundedYear;
    linkedIn;
    facebook;
    twitter;
    description;
    notes;
    tags;
    isActive;
}
exports.CreateCrmCompanyDto = CreateCrmCompanyDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CreateCrmCompanyDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(CrmCompanyType),
    __metadata("design:type", String)
], CreateCrmCompanyDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(Industry),
    __metadata("design:type", String)
], CreateCrmCompanyDto.prototype, "industry", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(CompanySize),
    __metadata("design:type", String)
], CreateCrmCompanyDto.prototype, "size", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], CreateCrmCompanyDto.prototype, "eik", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], CreateCrmCompanyDto.prototype, "vatNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateCrmCompanyDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], CreateCrmCompanyDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], CreateCrmCompanyDto.prototype, "website", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateCrmCompanyDto.prototype, "address", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateCrmCompanyDto.prototype, "city", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], CreateCrmCompanyDto.prototype, "postalCode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCrmCompanyDto.prototype, "countryId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateCrmCompanyDto.prototype, "annualRevenue", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateCrmCompanyDto.prototype, "employeeCount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1800),
    (0, class_validator_1.Max)(2100),
    __metadata("design:type", Number)
], CreateCrmCompanyDto.prototype, "foundedYear", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], CreateCrmCompanyDto.prototype, "linkedIn", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], CreateCrmCompanyDto.prototype, "facebook", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateCrmCompanyDto.prototype, "twitter", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCrmCompanyDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCrmCompanyDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateCrmCompanyDto.prototype, "tags", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateCrmCompanyDto.prototype, "isActive", void 0);
//# sourceMappingURL=create-crm-company.dto.js.map