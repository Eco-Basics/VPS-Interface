import request from 'supertest';
import jwt from 'jsonwebtoken';
import type { Application } from 'express';

// Must set env vars BEFORE importing app (app reads them at module load)
const TEST_PASSWORD = 'test-password-123';
const TEST_JWT_SECRET = 'test-secret-at-least-32-chars-long-abcdef';

beforeAll(() => {
  process.env.PASSWORD = TEST_PASSWORD;
  process.env.JWT_SECRET = TEST_JWT_SECRET;
});

// Lazy import to ensure env vars are set first
let app: Application;
beforeAll(async () => {
  const mod = await import('../src/app');
  app = await mod.createApp();
});

describe('POST /auth/login', () => {
  test('AUTH-01: correct password returns 200 with token in body', async () => {
    const res = await request(app).post('/auth/login').send({ password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.length).toBeGreaterThan(0);
  });

  test('AUTH-01: wrong password returns 401 with error message', async () => {
    const res = await request(app).post('/auth/login').send({ password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('AUTH-02: token has 7-day expiry (exp - iat === 604800)', async () => {
    const res = await request(app).post('/auth/login').send({ password: TEST_PASSWORD });
    const decoded = jwt.decode(res.body.token) as { iat: number; exp: number };
    expect(decoded.exp - decoded.iat).toBe(7 * 24 * 60 * 60); // 604800 seconds
  });
});

describe('AUTH-03: JWT middleware on protected routes', () => {
  let validToken: string;

  beforeAll(async () => {
    const res = await request(app).post('/auth/login').send({ password: TEST_PASSWORD });
    validToken = res.body.token;
  });

  test('AUTH-03: GET /sessions without Authorization header returns 401', async () => {
    const res = await request(app).get('/sessions');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('AUTH-03: GET /sessions with malformed token returns 401', async () => {
    const res = await request(app).get('/sessions').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  test('AUTH-03: GET /sessions with valid Bearer token returns 200', async () => {
    const res = await request(app).get('/sessions').set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
  });
});
