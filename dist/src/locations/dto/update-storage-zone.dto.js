"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateStorageZoneDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_storage_zone_dto_1 = require("./create-storage-zone.dto");
class UpdateStorageZoneDto extends (0, mapped_types_1.PartialType)(create_storage_zone_dto_1.CreateStorageZoneDto) {
}
exports.UpdateStorageZoneDto = UpdateStorageZoneDto;
//# sourceMappingURL=update-storage-zone.dto.js.map