import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WordPressController } from './wordpress.controller';
import { WordPressWebhookController } from './wordpress-webhook.controller';
import { WordPressService } from './wordpress.service';
import { WordPressApiService } from './wordpress-api.service';
import { WordPressWebhookService } from './wordpress-webhook.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    PrismaModule,
    OrdersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [WordPressController, WordPressWebhookController],
  providers: [WordPressService, WordPressApiService, WordPressWebhookService],
  exports: [WordPressService],
})
export class WordPressModule {}
