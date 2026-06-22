import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import type { App } from 'supertest/types';
import { AppModule } from '@/app.module';
import { ConfigService } from '@/config/config.service';

export async function createTestApp(): Promise<INestApplication<App>> {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = module.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  await app.init();
  return app;
}

export async function resetTables(app: INestApplication<App>): Promise<void> {
  const config = app.get(ConfigService);
  await Promise.all([
    truncate(config, config.env.URL_TABLE, 'code'),
    truncate(config, config.env.USER_TABLE, 'userId'),
  ]);
}

async function truncate(config: ConfigService, table: string, pk: string) {
  const { Items = [] } = await config.ddb.send(
    new ScanCommand({ TableName: table, ProjectionExpression: pk }),
  );
  if (Items.length === 0) return;
  await config.ddb.send(
    new BatchWriteCommand({
      RequestItems: {
        [table]: Items.map((item) => ({
          DeleteRequest: { Key: { [pk]: item[pk] as string } },
        })),
      },
    }),
  );
}
