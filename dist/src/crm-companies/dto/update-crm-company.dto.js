"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCrmCompanyDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_crm_company_dto_1 = require("./create-crm-company.dto");
class UpdateCrmCompanyDto extends (0, mapped_types_1.PartialType)(create_crm_company_dto_1.CreateCrmCompanyDto) {
}
exports.UpdateCrmCompanyDto = UpdateCrmCompanyDto;
//# sourceMappingURL=update-crm-company.dto.js.map