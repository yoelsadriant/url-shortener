#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
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

new FrontendStack(app, 'UrlShortenerFrontend', { env });
