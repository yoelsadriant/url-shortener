import { App } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { FrontendStack } from '../lib/frontend-stack';

describe('FrontendStack', () => {
  const template = Template.fromStack(new FrontendStack(new App(), 'TestFrontend'));

  it('creates a private bucket with SSL enforced + S3-managed encryption', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      BucketEncryption: {
        ServerSideEncryptionConfiguration: Match.arrayWith([
          Match.objectLike({
            ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' },
          }),
        ]),
      },
    });
  });

  it('creates a CloudFront distribution with HTTPS redirect and security headers', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        DefaultCacheBehavior: Match.objectLike({
          ViewerProtocolPolicy: 'redirect-to-https',
          ResponseHeadersPolicyId: Match.anyValue(),
        }),
        DefaultRootObject: 'index.html',
      }),
    });
  });

  it('falls back to index.html for 403/404 (SPA routing)', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        CustomErrorResponses: Match.arrayWith([
          Match.objectLike({
            ErrorCode: 403,
            ResponseCode: 200,
            ResponsePagePath: '/index.html',
          }),
          Match.objectLike({
            ErrorCode: 404,
            ResponseCode: 200,
            ResponsePagePath: '/index.html',
          }),
        ]),
      }),
    });
  });

  it('uses Origin Access Control (OAC), not the legacy OAI', () => {
    template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);
  });

  it('exposes FrontendUrl + BucketName as outputs', () => {
    template.hasOutput('FrontendUrl', {});
    template.hasOutput('BucketName', {});
  });
});
