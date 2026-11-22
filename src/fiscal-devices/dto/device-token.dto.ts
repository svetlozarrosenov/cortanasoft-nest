import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeviceChallengeDto {
  @IsString()
  @MaxLength(64)
  deviceId: string;
}

export class DeviceTokenDto {
  @IsString()
  @MaxLength(64)
  deviceId: string;

  // The challenge exactly as issued, and its signature with the device key
  @IsString()
  @MaxLength(1024)
  challenge: string;

  @IsString()
  @MaxLength(512)
  signature: string;

  @IsString()
  @MaxLength(32)
  serialNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  appVersion?: string;
}
