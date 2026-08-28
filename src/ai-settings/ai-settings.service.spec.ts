import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AiSettingsService } from './ai-settings.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  encryptSecret,
  isEncryptedSecret,
} from '../common/utils/secret-crypto.util';

const mockPrisma = {
  aiSettings: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
};

describe('AiSettingsService', () => {
  let service: AiSettingsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-secret';
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiSettingsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<AiSettingsService>(AiSettingsService);
  });

  describe('updateSettings', () => {
    it('should encrypt the key before storing and never echo it back', async () => {
      mockPrisma.aiSettings.upsert.mockImplementation(({ create }: any) =>
        Promise.resolve({
          isActive: true,
          apiKey: create.apiKey,
          updatedAt: new Date(),
        }),
      );

      const result = await service.updateSettings('c1', {
        apiKey: 'sk-ant-api03-secret-1234',
      });

      const stored = mockPrisma.aiSettings.upsert.mock.calls[0][0].create.apiKey;
      // В базата отива само шифрован вариант...
      expect(isEncryptedSecret(stored)).toBe(true);
      expect(stored).not.toContain('secret');
      // ...а навън — само маскиран hint с последните 4 знака
      expect(result).not.toHaveProperty('apiKey');
      expect(result.hasKey).toBe(true);
      expect(result.keyHint).toBe('••••1234');
    });

    it('should clear the key when an empty string is sent', async () => {
      mockPrisma.aiSettings.upsert.mockResolvedValue({
        isActive: true,
        apiKey: null,
        updatedAt: new Date(),
      });

      const result = await service.updateSettings('c1', { apiKey: '' });

      expect(mockPrisma.aiSettings.upsert.mock.calls[0][0].create.apiKey).toBeNull();
      expect(result.hasKey).toBe(false);
      expect(result.keyHint).toBeNull();
    });
  });

  describe('getSettings', () => {
    it('should report unset state for companies without settings', async () => {
      mockPrisma.aiSettings.findUnique.mockResolvedValue(null);
      const result = await service.getSettings('c1');
      expect(result).toEqual({
        isActive: false,
        hasKey: false,
        keyHint: null,
        updatedAt: null,
      });
    });
  });

  describe('getApiKeyForCompany', () => {
    it('should decrypt the stored key for internal use', async () => {
      mockPrisma.aiSettings.findUnique.mockResolvedValue({
        apiKey: encryptSecret('sk-ant-real-key'),
        isActive: true,
      });
      await expect(service.getApiKeyForCompany('c1')).resolves.toBe('sk-ant-real-key');
    });

    it('should return null when AI is switched off, even with a key', async () => {
      mockPrisma.aiSettings.findUnique.mockResolvedValue({
        apiKey: encryptSecret('sk-ant-real-key'),
        isActive: false,
      });
      await expect(service.getApiKeyForCompany('c1')).resolves.toBeNull();
    });

    it('should return null when no key is stored', async () => {
      mockPrisma.aiSettings.findUnique.mockResolvedValue(null);
      await expect(service.getApiKeyForCompany('c1')).resolves.toBeNull();
    });
  });

  describe('testConnection', () => {
    it('should refuse when no key is configured', async () => {
      mockPrisma.aiSettings.findUnique.mockResolvedValue(null);
      await expect(service.testConnection('c1')).rejects.toThrow(BadRequestException);
    });
  });
});
