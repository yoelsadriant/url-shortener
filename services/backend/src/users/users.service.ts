import { randomUUID } from 'node:crypto';
import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@/config/config.service';
import { User } from './entity/user';

@Injectable()
export class UsersService {
  constructor(private readonly config: ConfigService) {}

  async getById(userId: string): Promise<User> {
    const { Item } = await this.config.ddb.send(
      new GetCommand({
        TableName: this.config.env.USER_TABLE,
        Key: { userId },
      }),
    );
    if (!Item) throw new NotFoundException(`User "${userId}" not found`);
    return Item as User;
  }

  async findByUsername(username: string): Promise<User | null> {
    const { Items } = await this.config.ddb.send(
      new QueryCommand({
        TableName: this.config.env.USER_TABLE,
        IndexName: this.config.env.USER_USERNAME_INDEX,
        KeyConditionExpression: 'username = :username',
        ExpressionAttributeValues: { ':username': username },
        Limit: 1,
      }),
    );
    return (Items?.[0] as User) ?? null;
  }

  async create(username: string, password: string): Promise<User> {
    const user: User = {
      userId: randomUUID(),
      username,
      password,
      createdAt: new Date().toISOString(),
    };
    await this.config.ddb.send(
      new PutCommand({
        TableName: this.config.env.USER_TABLE,
        Item: user,
      }),
    );
    return user;
  }
}
