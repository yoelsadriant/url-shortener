#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { App } from 'aws-cdk-lib';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { DataStack } from '../lib/data-stack';
import { BackendStack } from '../lib/backend-stack';
import { FrontendStack } from '../lib/frontend-stack';

const app = new App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? 'ap-southeast-1',
};

const data = new DataStack(app, 'UrlShortenerData', { env });

const backend = new BackendStack(app, 'UrlShortenerBackend', {
  env,
  urlsTable: data.urlsTable,
  usersTable: data.usersTable,
});
backend.addDependency(data);

const frontend = new FrontendStack(app, 'UrlShortenerFrontend', { env });

// Upload the built React bundle to the frontend bucket. Kept here (not in the
// stack) so the stack stays a pure infrastructure definition — tests can synth
// it without an artifact on disk.
const distPath = path.join(
  __dirname,
  '..',
  '..',
  'services',
  'frontend',
  'dist',
);
if (!fs.existsSync(distPath)) {
  throw new Error(
    `${distPath} not found. Run \`npm --prefix services/frontend run build\` ` +
      `with VITE_API_URL set to the backend URL before deploying UrlShortenerFrontend.`,
  );
}
new BucketDeployment(frontend, 'Deploy', {
  sources: [Source.asset(distPath)],
  destinationBucket: frontend.bucket,
  distribution: frontend.distribution,
  distributionPaths: ['/*'],
});
