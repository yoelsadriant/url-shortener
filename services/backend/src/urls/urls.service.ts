import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import { ConfigService } from '../config/config.service';
import { CreateShortUrlDto } from './dto/create-short-url.dto';
import { Url } from './entity/url';

const generateCode = customAlphabet(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  8,
);

@Injectable()
export class UrlsService {
  constructor(private readonly config: ConfigService) {}

  async create(args: CreateShortUrlDto) {
    const { url, userId, customUrl } = args;
    const code = customUrl ?? generateCode();

    try {
      await this.config.ddb.send(
        new PutCommand({
          TableName: this.config.urlTable,
          Item: {
            code,
            userId,
            originUrl: url,
            createdAt: new Date().toISOString(),
          },
          ConditionExpression: 'attribute_not_exists(code)',
        }),
      );

      return {
        shortUrl: `${this.config.publicBaseUrl}/${code}`,
      };
    } catch (e) {
      if (e instanceof ConditionalCheckFailedException) {
        throw new ConflictException(`Code "${code}" is already taken`);
      }
      throw e;
    }
  }

  async getByCode(code: string): Promise<Url> {
    const { Item } = await this.config.ddb.send(
      new GetCommand({
        TableName: this.config.urlTable,
        Key: { code },
      }),
    );

    if (!Item) {
      throw new NotFoundException(`Code "${code}" not found`);
    }

    return Item as Url;
  }

  async getByUser(userId: string): Promise<Url[]> {
    const { Items } = await this.config.ddb.send(
      new QueryCommand({
        TableName: this.config.urlTable,
        IndexName: this.config.urlUserIndex,
        KeyConditionExpression: 'userId = :id',
        ExpressionAttributeValues: { ':id': userId },
      }),
    );

    return (Items ?? []) as Url[];
  }
}
