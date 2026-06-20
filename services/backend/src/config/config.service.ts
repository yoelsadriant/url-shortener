import { Injectable } from '@nestjs/common';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { plainToInstance } from 'class-transformer';
import { EnvConfig } from './env.schema';

@Injectable()
export class ConfigService {
  private readonly env: EnvConfig;
  readonly ddb: DynamoDBDocumentClient;

  constructor() {
    this.env = plainToInstance(EnvConfig, process.env, {
      enableImplicitConversion: true,
    });
    const aws = {
      region: this.env.AWS_REGION,
      endpoint: this.env.AWS_ENDPOINT,
    };
    this.ddb = DynamoDBDocumentClient.from(new DynamoDBClient(aws));
  }

  get port(): number {
    return this.env.PORT;
  }

  get publicBaseUrl(): string {
    return this.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  }

  get frontendUrl(): string {
    return this.env.FRONTEND_URL.replace(/\/$/, '');
  }

  get urlTable(): string {
    return this.env.URL_TABLE;
  }

  get urlUserIndex(): string {
    return this.env.URL_USER_INDEX;
  }

  get userTable(): string {
    return this.env.USER_TABLE;
  }

  get userUsernameIndex(): string {
    return this.env.USER_USERNAME_INDEX;
  }

  get jwt(): { secret: string; expiresIn: string } {
    return {
      secret: this.env.JWT_SECRET,
      expiresIn: this.env.JWT_EXPIRES_IN,
    };
  }
}
