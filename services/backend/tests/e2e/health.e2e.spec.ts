import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './helpers/app.fixture';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app.close());

  it('GET /health returns 200 with the expected shape', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);

    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptimeSeconds).toBe('number');
    expect(res.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(typeof res.body.timestamp).toBe('string');
    expect(() => new Date(res.body.timestamp).toISOString()).not.toThrow();
  });

  it('GET /health does not require authentication', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => expect(res.body.status).toBe('ok'));
  });
});
