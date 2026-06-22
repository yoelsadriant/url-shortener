import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ConditionalCheckFailedException,
  TransactionCanceledException,
} from '@aws-sdk/client-dynamodb';
import type { App } from 'supertest/types';
import { AppModule } from '@/app.module';
import { ConfigService } from '@/config/config.service';

type Row = Record<string, unknown>;

function evaluateCondition(
  cond: string | undefined,
  existing: Row | undefined,
  exprVals: Record<string, unknown>,
): boolean {
  if (!cond) return true;
  const trimmed = cond.trim();
  if (trimmed.startsWith('attribute_not_exists')) return existing === undefined;
  if (trimmed.startsWith('attribute_exists')) return existing !== undefined;
  const [lhs, rhs] = trimmed.split('=').map((s) => s.trim());
  return existing !== undefined && existing[lhs] === exprVals[rhs];
}

export class InMemoryDdb {
  private tables: Record<string, Record<string, Row>> = {};

  reset() {
    this.tables = {};
  }

  private t(name: string) {
    return (this.tables[name] ??= {});
  }

  send(cmd: {
    constructor: { name: string };
    input: Record<string, unknown>;
  }): Promise<unknown> {
    const input = cmd.input as Record<string, unknown>;
    const tableName = input['TableName'] as string;
    const t = this.t(tableName);

    switch (cmd.constructor.name) {
      case 'GetCommand': {
        const keyVal = Object.values(input['Key'] as Record<string, string>)[0];
        return Promise.resolve({ Item: t[keyVal] ?? undefined });
      }
      case 'PutCommand': {
        const item = input['Item'] as Row;
        const pkVal = Object.values(item as Record<string, string>)[0];
        const cond = input['ConditionExpression'] as string | undefined;
        if (cond?.includes('attribute_not_exists') && t[pkVal] !== undefined) {
          return Promise.reject(
            new ConditionalCheckFailedException({
              message: 'exists',
              $metadata: {},
            }),
          );
        }
        t[pkVal] = item;
        return Promise.resolve({});
      }
      case 'QueryCommand': {
        const expr = input['KeyConditionExpression'] as string;
        const attrName = expr.split('=')[0].trim();
        const exprVals = input['ExpressionAttributeValues'] as Record<
          string,
          unknown
        >;
        const searchVal = Object.values(exprVals)[0];
        const items = Object.values(t).filter(
          (row) => row[attrName] === searchVal,
        );
        return Promise.resolve({ Items: items });
      }
      case 'DeleteCommand': {
        const keyVal = Object.values(input['Key'] as Record<string, string>)[0];
        const existing = t[keyVal];
        const cond = input['ConditionExpression'] as string | undefined;
        const exprVals = (input['ExpressionAttributeValues'] ?? {}) as Record<
          string,
          unknown
        >;
        if (!evaluateCondition(cond, existing, exprVals)) {
          return Promise.reject(
            new ConditionalCheckFailedException({
              message: 'condition not met',
              $metadata: {},
            }),
          );
        }
        delete t[keyVal];
        return Promise.resolve({});
      }
      case 'TransactWriteCommand': {
        const items = (input['TransactItems'] ?? []) as Array<
          Record<string, Record<string, unknown>>
        >;
        const planned: Array<() => void> = [];
        for (const op of items) {
          if (op.Put) {
            const table = this.t(op.Put['TableName'] as string);
            const item = op.Put['Item'] as Row;
            const pkVal = Object.values(item as Record<string, string>)[0];
            const cond = op.Put['ConditionExpression'] as string | undefined;
            const exprVals = (op.Put['ExpressionAttributeValues'] ??
              {}) as Record<string, unknown>;
            if (!evaluateCondition(cond, table[pkVal], exprVals)) {
              return Promise.reject(
                new TransactionCanceledException({
                  message: 'transaction canceled',
                  $metadata: {},
                  CancellationReasons: [{ Code: 'ConditionalCheckFailed' }],
                }),
              );
            }
            planned.push(() => {
              table[pkVal] = item;
            });
          } else if (op.Delete) {
            const table = this.t(op.Delete['TableName'] as string);
            const keyVal = Object.values(
              op.Delete['Key'] as Record<string, string>,
            )[0];
            const cond = op.Delete['ConditionExpression'] as string | undefined;
            const exprVals = (op.Delete['ExpressionAttributeValues'] ??
              {}) as Record<string, unknown>;
            if (!evaluateCondition(cond, table[keyVal], exprVals)) {
              return Promise.reject(
                new TransactionCanceledException({
                  message: 'transaction canceled',
                  $metadata: {},
                  CancellationReasons: [{ Code: 'ConditionalCheckFailed' }],
                }),
              );
            }
            planned.push(() => {
              delete table[keyVal];
            });
          }
        }
        for (const apply of planned) apply();
        return Promise.resolve({});
      }
      default:
        return Promise.resolve({});
    }
  }
}

export async function createTestApp(
  db: InMemoryDdb,
): Promise<INestApplication<App>> {
  const mockConfig = {
    ddb: db,
    port: 3000,
    publicBaseUrl: 'http://localhost:3000',
    frontendUrl: 'http://localhost:5173',
    urlTable: 'urls',
    urlUserIndex: 'user-index',
    userTable: 'users',
    userUsernameIndex: 'username-index',
    jwt: { secret: 'e2e-secret', expiresIn: '1h' },
  };

  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ConfigService)
    .useValue(mockConfig)
    .compile();

  const app = module.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  await app.init();
  return app;
}
