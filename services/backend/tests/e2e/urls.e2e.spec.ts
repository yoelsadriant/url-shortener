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

  describe('GET /:code', () => {
    it('302 redirects to the original URL', async () => {
      await request(app.getHttpServer()).post('/url').send({
        url: 'https://example.com',
        userId: 'a1b2c3d4-e5f6-4a7b-8c9d-000000000001',
        customUrl: 'Abcd1234',
      });

      await request(app.getHttpServer())
        .get('/Abcd1234')
        .expect(302)
        .expect('Location', 'https://example.com');
    });

    it('404 for an unknown code', () => {
      return request(app.getHttpServer()).get('/Unknown1').expect(404);
    });

    it('404 (not 400) for any reasonable unknown code shape', async () => {
      await request(app.getHttpServer()).get('/nonexistent').expect(404);
      await request(app.getHttpServer()).get('/abc').expect(404);
    });

    it('302 redirects for a custom code with dashes/underscores', async () => {
      await request(app.getHttpServer()).post('/url').send({
        url: 'https://custom.example',
        userId: 'a1b2c3d4-e5f6-4a7b-8c9d-000000000099',
        customUrl: 'my-custom_link',
      });
      await request(app.getHttpServer())
        .get('/my-custom_link')
        .expect(302)
        .expect('Location', 'https://custom.example');
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

  describe('DELETE /url/:code', () => {
    const owner = 'a1b2c3d4-e5f6-4a7b-8c9d-0000000000aa';
    const other = 'a1b2c3d4-e5f6-4a7b-8c9d-0000000000bb';

    beforeEach(async () => {
      await request(app.getHttpServer()).post('/url').send({
        url: 'https://example.com',
        userId: owner,
        customUrl: 'DelMe123',
      });
    });

    it('204 when the owner deletes their own URL', async () => {
      await request(app.getHttpServer())
        .delete(`/url/DelMe123?user=${owner}`)
        .expect(204);
      await request(app.getHttpServer()).get('/DelMe123').expect(404);
    });

    it('404 when another user tries to delete it', async () => {
      await request(app.getHttpServer())
        .delete(`/url/DelMe123?user=${other}`)
        .expect(404);
      await request(app.getHttpServer()).get('/DelMe123').expect(302);
    });

    it('404 for a non-existent code', () => {
      return request(app.getHttpServer())
        .delete(`/url/Unknown1?user=${owner}`)
        .expect(404);
    });

    it('400 when the user query is not a valid UUID', () => {
      return request(app.getHttpServer())
        .delete('/url/DelMe123?user=not-a-uuid')
        .expect(400);
    });
  });

  describe('PUT /url/:code/rename', () => {
    const owner = 'a1b2c3d4-e5f6-4a7b-8c9d-0000000000aa';
    const other = 'a1b2c3d4-e5f6-4a7b-8c9d-0000000000bb';
    const newCode = 'newUpdatedCode';

    beforeEach(async () => {
      await request(app.getHttpServer()).post('/url').send({
        url: 'https://example.com',
        userId: owner,
        customUrl: 'updateMe123',
      });
    });

    it('200 when the owner renames their own code', async () => {
      const res = await request(app.getHttpServer())
        .put(`/url/updateMe123/rename?user=${owner}`)
        .send({ newCode })
        .expect(200);
      expect(res.body.shortUrl).toBe(`http://localhost:3000/${newCode}`);

      await request(app.getHttpServer()).get('/updateMe123').expect(404);
      await request(app.getHttpServer())
        .get(`/${newCode}`)
        .expect(302)
        .expect('Location', 'https://example.com');
    });

    it('404 when another user tries to rename', async () => {
      await request(app.getHttpServer())
        .put(`/url/updateMe123/rename?user=${other}`)
        .send({ newCode })
        .expect(404);
    });

    it('404 for a non-existent code', () => {
      return request(app.getHttpServer())
        .put(`/url/Unknown1/rename?user=${owner}`)
        .send({ newCode })
        .expect(404);
    });

    it('409 when the new code is already taken', async () => {
      await request(app.getHttpServer()).post('/url').send({
        url: 'https://other.example',
        userId: owner,
        customUrl: 'takenCode',
      });

      await request(app.getHttpServer())
        .put(`/url/updateMe123/rename?user=${owner}`)
        .send({ newCode: 'takenCode' })
        .expect(409);
    });

    it('400 when the new code has invalid characters', () => {
      return request(app.getHttpServer())
        .put(`/url/updateMe123/rename?user=${owner}`)
        .send({ newCode: 'has spaces!' })
        .expect(400);
    });

    it('400 when the user query is not a valid UUID', () => {
      return request(app.getHttpServer())
        .put('/url/updateMe123/rename?user=not-a-uuid')
        .send({ newCode })
        .expect(400);
    });
  });
});
