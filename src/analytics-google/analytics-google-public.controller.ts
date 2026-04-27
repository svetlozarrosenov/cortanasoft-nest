import { Controller, Get } from '@nestjs/common';
import { AnalyticsGoogleService } from './analytics-google.service';

/**
 * Public controller for Google Analytics — exposes only the Measurement ID
 * for the public site to inject gtag.js. No authentication required.
 */
@Controller('public/google-analytics')
export class AnalyticsGooglePublicController {
  constructor(private service: AnalyticsGoogleService) {}

  @Get('measurement-id')
  async getMeasurementId() {
    const measurementId = await this.service.getPublicMeasurementId();
    return { success: true, measurementId };
  }
}
