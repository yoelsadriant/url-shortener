import {
  ConditionalCheckFailedException,
  TransactionCanceledException,
} from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { ConfigService } from '../config/config.service';
import { CreateShortUrlDto } from './dto/create-short-url.dto';
import { Url } from './entity/url';

const generateCode = () => randomBytes(6).toString('base64url').slice(0, 8);

@Injectable()
export class UrlsService {
  constructor(private readonly config: ConfigService) {}

  async create(input: CreateShortUrlDto) {
    const { url, userId, customUrl } = input;
    const code = customUrl ?? generateCode();

    try {
      await this.config.ddb.send(
        new PutCommand({
          TableName: this.config.env.URL_TABLE,
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
        TableName: this.config.env.URL_TABLE,
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
        TableName: this.config.env.URL_TABLE,
        IndexName: this.config.env.URL_USER_INDEX,
        KeyConditionExpression: 'userId = :id',
        ExpressionAttributeValues: { ':id': userId },
      }),
    );

    return (Items ?? []) as Url[];
  }

  async renameCode(code: string, newCode: string, userId: string) {
    const item = await this.getByCode(code);
    if (item.userId !== userId) {
      throw new NotFoundException(`Code "${code}" not found`);
    }
    if (newCode === code) {
      return { shortUrl: `${this.config.publicBaseUrl}/${code}` };
    }
    try {
      await this.config.ddb.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: this.config.env.URL_TABLE,
                Item: {
                  ...item,
                  code: newCode,
                },
                ConditionExpression: 'attribute_not_exists(code)',
              },
            },
            {
              Delete: {
                TableName: this.config.env.URL_TABLE,
                Key: { code },
                ConditionExpression: 'userId = :id',
                ExpressionAttributeValues: { ':id': userId },
              },
            },
          ],
        }),
      );

      return {
        shortUrl: `${this.config.publicBaseUrl}/${newCode}`,
      };
    } catch (e) {
      if (e instanceof TransactionCanceledException) {
        throw new ConflictException(`Code "${newCode}" is already taken`);
      }
      throw e;
    }
  }

  async delete(code: string, userId: string): Promise<void> {
    try {
      await this.config.ddb.send(
        new DeleteCommand({
          TableName: this.config.env.URL_TABLE,
          Key: { code },
          ConditionExpression: 'userId = :id',
          ExpressionAttributeValues: { ':id': userId },
        }),
      );
    } catch (e) {
      if (e instanceof ConditionalCheckFailedException) {
        throw new NotFoundException(`Code "${code}" not found`);
      }
      throw e;
    }
  }
}
