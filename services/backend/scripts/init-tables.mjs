// Node version of init-tables.sh — used in environments without the aws CLI
// (Render container, etc.). Reads env vars, creates tables if missing.
// Idempotent: safe to run on every startup.

import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';

const required = [
  'AWS_REGION',
  'URL_TABLE',
  'URL_USER_INDEX',
  'USER_TABLE',
  'USER_USERNAME_INDEX',
];
for (const k of required) {
  if (!process.env[k]) {
    console.error(`init-tables: missing required env var ${k}`);
    process.exit(1);
  }
}

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT,
});

const tables = [
  {
    name: process.env.URL_TABLE,
    pk: 'code',
    index: { name: process.env.URL_USER_INDEX, key: 'userId' },
  },
  {
    name: process.env.USER_TABLE,
    pk: 'userId',
    index: { name: process.env.USER_USERNAME_INDEX, key: 'username' },
  },
];

async function waitForDdb(attempts = 30) {
  for (let i = 0; i < attempts; i++) {
    try {
      await client.send(new DescribeTableCommand({ TableName: '__probe__' }));
      return;
    } catch (e) {
      if (e instanceof ResourceNotFoundException) return; // server up, table absent
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error(`DynamoDB at ${process.env.AWS_ENDPOINT ?? 'aws'} unreachable`);
}

async function ensure({ name, pk, index }) {
  try {
    await client.send(new DescribeTableCommand({ TableName: name }));
    console.log(`  table "${name}" already exists`);
    return;
  } catch (e) {
    if (!(e instanceof ResourceNotFoundException)) throw e;
  }
  await client.send(
    new CreateTableCommand({
      TableName: name,
      AttributeDefinitions: [
        { AttributeName: pk, AttributeType: 'S' },
        { AttributeName: index.key, AttributeType: 'S' },
      ],
      KeySchema: [{ AttributeName: pk, KeyType: 'HASH' }],
      GlobalSecondaryIndexes: [
        {
          IndexName: index.name,
          KeySchema: [{ AttributeName: index.key, KeyType: 'HASH' }],
          Projection: { ProjectionType: 'ALL' },
        },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    }),
  );
  console.log(`  created table "${name}" with index "${index.name}"`);
}

await waitForDdb();
for (const t of tables) await ensure(t);
