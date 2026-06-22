import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import {
  AttributeType,
  BillingMode,
  ProjectionType,
  Table,
} from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class DataStack extends Stack {
  readonly urlsTable: Table;
  readonly usersTable: Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.urlsTable = new Table(this, 'Urls', {
      tableName: 'urls',
      partitionKey: { name: 'code', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: RemovalPolicy.RETAIN,
    });
    this.urlsTable.addGlobalSecondaryIndex({
      indexName: 'user-index',
      partitionKey: { name: 'userId', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    this.usersTable = new Table(this, 'Users', {
      tableName: 'users',
      partitionKey: { name: 'userId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: RemovalPolicy.RETAIN,
    });
    this.usersTable.addGlobalSecondaryIndex({
      indexName: 'username-index',
      partitionKey: { name: 'username', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    new CfnOutput(this, 'UrlsTableName', { value: this.urlsTable.tableName });
    new CfnOutput(this, 'UsersTableName', { value: this.usersTable.tableName });
  }
}
