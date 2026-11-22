import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class PairDeviceDto {
  @IsString()
  @MinLength(6)
  @MaxLength(16)
  code: string;

  // EC P-256 public key, base64 of the DER SubjectPublicKeyInfo
  @IsString()
  @MaxLength(512)
  publicKey: string;

  // Signature of the code with the new key: proves the device holds it
  @IsString()
  @MaxLength(512)
  signature: string;

  @IsString()
  @MinLength(1)
  @MaxLength(32)
  serialNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  fiscalMemoryNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  appVersion?: string;
}
