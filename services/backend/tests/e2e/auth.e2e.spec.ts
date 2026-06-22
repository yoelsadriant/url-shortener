import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp, resetTables } from './helpers/app.fixture';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app.close());

  beforeEach(() => resetTables(app));

  describe('POST /auth/register', () => {
    it('201 returns a JWT token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'alice', password: 'Password1' })
        .expect(201);

      expect(res.body.token).toBeTruthy();
    });

    it('409 when username is already taken', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'alice', password: 'Password1' });

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'alice', password: 'Password1' })
        .expect(409);
    });

    it('400 when username is too short', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'ab', password: 'Password1' })
        .expect(400);
    });

    it('400 when password is too short', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'alice', password: 'short' })
        .expect(400);
    });

    it('400 when username contains invalid characters', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'alice!', password: 'Password1' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'alice', password: 'Password1' });
    });

    it('200 returns a JWT token on valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'alice', password: 'Password1' })
        .expect(201);

      expect(res.body.token).toBeTruthy();
    });

    it('401 on wrong password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'alice', password: 'WrongPassword' })
        .expect(401);
    });

    it('401 on unknown username', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'nobody', password: 'Password1' })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    let token: string;

    beforeEach(async () => {
      const reg = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'alice', password: 'Password1' });
      token = reg.body.token as string;
    });

    it('200 returns the current user without leaking the password hash', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.username).toBe('alice');
      expect(res.body).not.toHaveProperty('password');
      expect(Object.keys(res.body).sort()).toEqual(
        ['createdAt', 'userId', 'username'].sort(),
      );
    });

    it('401 without a token', () => {
      return request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('401 with an invalid token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer bad.token.here')
        .expect(401);
    });
  });
});
