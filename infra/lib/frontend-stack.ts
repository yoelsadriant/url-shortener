import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import {
  Distribution,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

// Stack owns the infrastructure shape (bucket + CloudFront + IAM).
// The `BucketDeployment` that uploads the built frontend lives in bin/app.ts —
// it's a deploy-time concern, not part of what the stack tests verify.
export class FrontendStack extends Stack {
  readonly bucket: Bucket;
  readonly distribution: Distribution;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.bucket = new Bucket(this, 'Bucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    this.distribution = new Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: ResponseHeadersPolicy.SECURITY_HEADERS,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.minutes(5),
        },
      ],
    });

    new CfnOutput(this, 'FrontendUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
    });
    new CfnOutput(this, 'BucketName', { value: this.bucket.bucketName });
  }
}
