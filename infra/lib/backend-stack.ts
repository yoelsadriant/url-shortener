import * as path from 'path';
import { CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { IVpc, Vpc } from 'aws-cdk-lib/aws-ec2';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import {
  Cluster,
  ContainerImage,
  LogDrivers,
  Secret as EcsSecret,
} from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

interface BackendStackProps extends StackProps {
  urlsTable: Table;
  usersTable: Table;
  // Optional — injected by tests to skip the AWS lookup. Defaults to the account's default VPC.
  vpc?: IVpc;
}

export class BackendStack extends Stack {
  readonly serviceUrl: string;

  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    const vpc = props.vpc ?? Vpc.fromLookup(this, 'Vpc', { isDefault: true });

    const cluster = new Cluster(this, 'Cluster', { vpc });

    const jwtSecret = new Secret(this, 'JwtSecret', {
      secretName: 'url-shortener/jwt-secret',
      description: 'JWT signing key for url-shortener backend',
      generateSecretString: {
        passwordLength: 48,
        excludePunctuation: true,
        includeSpace: false,
      },
    });

    const image = new DockerImageAsset(this, 'BackendImage', {
      directory: path.join(__dirname, '..', '..', 'services', 'backend'),
      target: 'prod',
    });

    const service = new ApplicationLoadBalancedFargateService(this, 'Service', {
      cluster,
      cpu: 256,
      memoryLimitMiB: 512,
      desiredCount: 1,
      assignPublicIp: true,
      publicLoadBalancer: true,
      minHealthyPercent: 100,
      circuitBreaker: { rollback: true },
      taskImageOptions: {
        image: ContainerImage.fromDockerImageAsset(image),
        containerPort: 3000,
        environment: {
          PORT: '3000',
          AWS_REGION: this.region,
          URL_TABLE: props.urlsTable.tableName,
          URL_USER_INDEX: 'user-index',
          USER_TABLE: props.usersTable.tableName,
          USER_USERNAME_INDEX: 'username-index',
          JWT_EXPIRES_IN: '7d',
          PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL ?? '',
        },
        secrets: {
          JWT_SECRET: EcsSecret.fromSecretsManager(jwtSecret),
        },
        logDriver: LogDrivers.awsLogs({ streamPrefix: 'backend' }),
      },
    });

    service.targetGroup.configureHealthCheck({
      path: '/health',
      healthyHttpCodes: '200',
      interval: Duration.seconds(30),
      timeout: Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
    });

    service.taskDefinition.taskRole.addToPrincipalPolicy(
      new PolicyStatement({
        sid: 'BackendDynamoAccess',
        effect: Effect.ALLOW,
        actions: [
          'dynamodb:GetItem',
          'dynamodb:PutItem',
          'dynamodb:DeleteItem',
          'dynamodb:Query',
        ],
        resources: [
          props.urlsTable.tableArn,
          `${props.urlsTable.tableArn}/index/*`,
          props.usersTable.tableArn,
          `${props.usersTable.tableArn}/index/*`,
        ],
      }),
    );

    // EcsSecret.fromSecretsManager already grants secretsmanager:GetSecretValue
    // to the task execution role — don't duplicate it on the task role.

    this.serviceUrl = `http://${service.loadBalancer.loadBalancerDnsName}`;
    new CfnOutput(this, 'BackendUrl', { value: this.serviceUrl });
    new CfnOutput(this, 'JwtSecretArn', { value: jwtSecret.secretArn });
  }
}
