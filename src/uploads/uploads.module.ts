import { Module } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { PublicFilesController } from './public-files.controller';

@Module({
  controllers: [UploadsController, PublicFilesController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
