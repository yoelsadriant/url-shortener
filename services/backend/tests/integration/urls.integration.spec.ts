import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@/config/config.service';
import { UrlsModule } from '@/urls/urls.module';
import { UrlsService } from '@/urls/urls.service';

describe('Urls (integration)', () => {
  let urlsService: UrlsService;
  const ddbSend = jest.fn();

  const mockConfig = {
    ddb: { send: ddbSend },
    env: { URL_TABLE: 'urls', URL_USER_INDEX: 'user-index' },
    publicBaseUrl: 'http://localhost:3000',
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule, UrlsModule],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfig)
      .compile();

    urlsService = module.get(UrlsService);
  });

  beforeEach(() => jest.clearAllMocks());

  it('module compiles and resolves all providers', () => {
    expect(urlsService).toBeDefined();
  });

  describe('create → getByCode round-trip', () => {
    it('stores and retrieves a short URL', async () => {
      let storedCode = '';
      ddbSend.mockImplementationOnce(
        (cmd: {
          input: { Item: { code: string; originUrl: string; userId: string } };
        }) => {
          storedCode = cmd.input.Item.code;
          return Promise.resolve({});
        },
      );

      const { shortUrl } = await urlsService.create({
        url: 'https://example.com',
        userId: 'uuid-1',
      });
      expect(shortUrl).toContain(storedCode);

      ddbSend.mockResolvedValueOnce({
        Item: {
          code: storedCode,
          originUrl: 'https://example.com',
          userId: 'uuid-1',
        },
      });
      const found = await urlsService.getByCode(storedCode);
      expect(found.originUrl).toBe('https://example.com');
    });

    it('throws ConflictException for a duplicate custom URL', async () => {
      ddbSend.mockRejectedValueOnce(
        new ConditionalCheckFailedException({
          message: 'exists',
          $metadata: {},
        }),
      );
      await expect(
        urlsService.create({
          url: 'https://example.com',
          userId: 'uuid-1',
          customUrl: 'taken',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException for an unknown code', async () => {
      ddbSend.mockResolvedValueOnce({ Item: undefined });
      await expect(urlsService.getByCode('notfound')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getByUser', () => {
    it('returns all URLs for a user', async () => {
      const items = [
        { code: 'Abcd1234', originUrl: 'https://a.com', userId: 'uuid-1' },
        { code: 'Efgh5678', originUrl: 'https://b.com', userId: 'uuid-1' },
      ];
      ddbSend.mockResolvedValueOnce({ Items: items });

      const result = await urlsService.getByUser('uuid-1');
      expect(result).toHaveLength(2);
      expect(result[0].originUrl).toBe('https://a.com');
    });
  });
});
