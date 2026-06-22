import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { BackendStack } from '../lib/backend-stack';
import { DataStack } from '../lib/data-stack';

function build() {
  const app = new App();
  const data = new DataStack(app, 'TestData');
  // Stand-up a real VPC in a sibling stack so BackendStack can use it without
  // calling Vpc.fromLookup (which would hit AWS).
  const networkStack = new Stack(app, 'TestNetwork');
  const vpc = new Vpc(networkStack, 'TestVpc', { maxAzs: 2 });
  const backend = new BackendStack(app, 'TestBackend', {
    urlsTable: data.urlsTable,
    usersTable: data.usersTable,
    vpc,
  });
  return Template.fromStack(backend);
}

describe('BackendStack', () => {
  const template = build();

  it('creates a single Fargate service behind an ALB', () => {
    template.resourceCountIs('AWS::ECS::Service', 1);
    template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
    template.hasResourceProperties('AWS::ECS::Service', {
      LaunchType: 'FARGATE',
      DesiredCount: 1,
    });
  });

  it('runs at 0.25 vCPU / 0.5 GB with the prod container on port 3000', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      Cpu: '256',
      Memory: '512',
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          PortMappings: [Match.objectLike({ ContainerPort: 3000 })],
        }),
      ]),
    });
  });

  it('health check hits /health and requires 200', () => {
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
      HealthCheckPath: '/health',
      Matcher: { HttpCode: '200' },
    });
  });

  it('task role gets only Get/Put/Delete/Query on the project tables', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'BackendDynamoAccess',
            Effect: 'Allow',
            Action: [
              'dynamodb:GetItem',
              'dynamodb:PutItem',
              'dynamodb:DeleteItem',
              'dynamodb:Query',
            ],
          }),
        ]),
      },
    });
  });

  it('creates a Secrets Manager JWT secret and injects it into the container', () => {
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: 'url-shortener/jwt-secret',
    });
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          Secrets: Match.arrayWith([
            Match.objectLike({ Name: 'JWT_SECRET' }),
          ]),
        }),
      ]),
    });
  });

  it('exposes BackendUrl + JwtSecretArn as outputs', () => {
    template.hasOutput('BackendUrl', {});
    template.hasOutput('JwtSecretArn', {});
  });
});
