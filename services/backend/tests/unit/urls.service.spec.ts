import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@/config/config.service';
import { UrlsService } from '@/urls/urls.service';

const urlItem = {
  code: 'Abcd1234',
  originUrl: 'https://example.com',
  userId: 'uuid-1',
};

describe('UrlsService', () => {
  let service: UrlsService;
  const ddbSend = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        UrlsService,
        {
          provide: ConfigService,
          useValue: {
            ddb: { send: ddbSend },
            env: { URL_TABLE: 'urls', URL_USER_INDEX: 'user-index' },
            publicBaseUrl: 'http://localhost:3000',
          },
        },
      ],
    }).compile();

    service = module.get(UrlsService);
  });

  describe('create', () => {
    it('returns a short URL with a generated 8-char code', async () => {
      ddbSend.mockResolvedValue({});
      const result = await service.create({
        url: 'https://example.com',
        userId: 'uuid-1',
      });
      expect(result.shortUrl).toMatch(
        /^http:\/\/localhost:3000\/[A-Za-z0-9_-]{8}$/,
      );
    });

    it('uses the provided customUrl as the code', async () => {
      ddbSend.mockResolvedValue({});
      const result = await service.create({
        url: 'https://example.com',
        userId: 'uuid-1',
        customUrl: 'my-slug',
      });
      expect(result.shortUrl).toBe('http://localhost:3000/my-slug');
    });

    it('throws ConflictException when code is already taken', async () => {
      ddbSend.mockRejectedValue(
        new ConditionalCheckFailedException({
          message: 'exists',
          $metadata: {},
        }),
      );
      await expect(
        service.create({
          url: 'https://example.com',
          userId: 'uuid-1',
          customUrl: 'taken',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('re-throws unexpected DynamoDB errors', async () => {
      ddbSend.mockRejectedValue(new Error('network error'));
      await expect(
        service.create({ url: 'https://example.com', userId: 'uuid-1' }),
      ).rejects.toThrow('network error');
    });
  });

  describe('getByCode', () => {
    it('returns the URL item', async () => {
      ddbSend.mockResolvedValue({ Item: urlItem });
      expect(await service.getByCode('Abcd1234')).toEqual(urlItem);
    });

    it('throws NotFoundException when code does not exist', async () => {
      ddbSend.mockResolvedValue({ Item: undefined });
      await expect(service.getByCode('Abcd1234')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getByUser', () => {
    it('returns all URLs for the user', async () => {
      ddbSend.mockResolvedValue({ Items: [urlItem] });
      expect(await service.getByUser('uuid-1')).toEqual([urlItem]);
    });

    it('returns empty array when user has no URLs', async () => {
      ddbSend.mockResolvedValue({ Items: undefined });
      expect(await service.getByUser('uuid-1')).toEqual([]);
    });
  });
});
