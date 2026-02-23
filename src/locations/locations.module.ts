import { Module } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { LocationsController } from './locations.controller';
import { CompanyLocationsController } from './company-locations.controller';

@Module({
  controllers: [LocationsController, CompanyLocationsController],
  providers: [LocationsService],
  exports: [LocationsService],
})
export class LocationsModule {}
