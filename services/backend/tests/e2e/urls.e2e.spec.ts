import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { InMemoryDdb, createTestApp } from './helpers/app.fixture';

describe('URLs (e2e)', () => {
  let app: INestApplication<App>;
  const db = new InMemoryDdb();

  beforeAll(async () => {
    app = await createTestApp(db);
  });

  afterAll(() => app.close());

  beforeEach(() => db.reset());

  describe('POST /url', () => {
    it('201 returns a short URL', async () => {
      const res = await request(app.getHttpServer())
        .post('/url')
        .send({
          url: 'https://example.com',
          userId: 'a1b2c3d4-e5f6-4a7b-8c9d-000000000001',
        })
        .expect(201);

      expect(res.body.shortUrl).toMatch(
        /^http:\/\/localhost:3000\/[A-Za-z0-9]{8}$/,
      );
    });

    it('201 uses the provided customUrl', async () => {
      const res = await request(app.getHttpServer())
        .post('/url')
        .send({
          url: 'https://example.com',
          userId: 'a1b2c3d4-e5f6-4a7b-8c9d-000000000001',
          customUrl: 'my-link',
        })
        .expect(201);

      expect(res.body.shortUrl).toBe('http://localhost:3000/my-link');
    });

    it('409 when custom URL is already taken', async () => {
      const body = {
        url: 'https://example.com',
        userId: 'a1b2c3d4-e5f6-4a7b-8c9d-000000000001',
        customUrl: 'taken',
      };
      await request(app.getHttpServer()).post('/url').send(body);
      await request(app.getHttpServer()).post('/url').send(body).expect(409);
    });

    it('400 when url is not a valid URL', () => {
      return request(app.getHttpServer())
        .post('/url')
        .send({
          url: 'not-a-url',
          userId: 'a1b2c3d4-e5f6-4a7b-8c9d-000000000001',
        })
        .expect(400);
    });
  });

  describe('GET /url/:code', () => {
    it('302 redirects to the original URL', async () => {
      await request(app.getHttpServer()).post('/url').send({
        url: 'https://example.com',
        userId: 'a1b2c3d4-e5f6-4a7b-8c9d-000000000001',
        customUrl: 'Abcd1234',
      });

      await request(app.getHttpServer())
        .get('/url/Abcd1234')
        .expect(302)
        .expect('Location', 'https://example.com');
    });

    it('404 for an unknown code', () => {
      return request(app.getHttpServer()).get('/url/Unknown1').expect(404);
    });
  });

  describe('GET /url?user=...', () => {
    it('200 returns the list of URLs for a user', async () => {
      const userId = 'a1b2c3d4-e5f6-4a7b-8c9d-000000000001';
      await request(app.getHttpServer())
        .post('/url')
        .send({ url: 'https://a.com', userId, customUrl: 'Aaaaaaaa' });
      await request(app.getHttpServer())
        .post('/url')
        .send({ url: 'https://b.com', userId, customUrl: 'Bbbbbbbb' });

      const res = await request(app.getHttpServer())
        .get(`/url?user=${userId}`)
        .expect(200);

      expect(res.body).toHaveLength(2);
    });

    it('400 when user is not a valid UUID', () => {
      return request(app.getHttpServer())
        .get('/url?user=not-a-uuid')
        .expect(400);
    });
  });
});
