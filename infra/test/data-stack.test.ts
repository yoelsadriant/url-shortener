import { App } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { DataStack } from '../lib/data-stack';

describe('DataStack', () => {
  const stack = new DataStack(new App(), 'TestData');
  const template = Template.fromStack(stack);

  it('creates urls and users tables with PAY_PER_REQUEST + PITR + RETAIN', () => {
    template.resourceCountIs('AWS::DynamoDB::Table', 2);
    template.allResourcesProperties('AWS::DynamoDB::Table', {
      BillingMode: 'PAY_PER_REQUEST',
      PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true },
    });
    template.allResources('AWS::DynamoDB::Table', {
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
    });
  });

  it('urls table is keyed by code with a user-index GSI', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'urls',
      KeySchema: [{ AttributeName: 'code', KeyType: 'HASH' }],
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({
          IndexName: 'user-index',
          KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
          Projection: { ProjectionType: 'ALL' },
        }),
      ]),
    });
  });

  it('users table is keyed by userId with a username-index GSI', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'users',
      KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({
          IndexName: 'username-index',
          KeySchema: [{ AttributeName: 'username', KeyType: 'HASH' }],
          Projection: { ProjectionType: 'ALL' },
        }),
      ]),
    });
  });

  it('exposes table names as outputs', () => {
    template.hasOutput('UrlsTableName', {});
    template.hasOutput('UsersTableName', {});
  });
});
