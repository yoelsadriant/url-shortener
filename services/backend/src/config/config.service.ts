import { Global, Injectable, Module } from '@nestjs/common';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { EnvConfig, validateEnv } from './env.schema';

@Injectable()
export class ConfigService {
  readonly env: EnvConfig;
  readonly ddb: DynamoDBDocumentClient;

  constructor() {
    this.env = validateEnv(process.env);
    this.ddb = DynamoDBDocumentClient.from(
      new DynamoDBClient({
        region: this.env.AWS_REGION,
        endpoint: this.env.AWS_ENDPOINT,
      }),
    );
  }

  get publicBaseUrl(): string {
    return this.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  }

  get jwt() {
    return { secret: this.env.JWT_SECRET, expiresIn: this.env.JWT_EXPIRES_IN };
  }
}

@Global()
@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
