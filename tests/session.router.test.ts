// Session router integration tests
// Covers: SESS-01 (spawn), SESS-04 (multiple concurrent), AUTH-03 (session endpoint protection)
// node-pty is mocked via jest.config.ts moduleNameMapper — no real processes spawned
// Implementation plan: 01-04-PLAN.md

import request from 'supertest';
import { Application } from 'express';
import { _clearRegistryForTests } from '../src/sessions/session.registry';
import { spawn as mockSpawn, makeMockPty } from './__mocks__/node-pty';

// node-pty is mocked via jest.config.ts moduleNameMapper

const TEST_PASSWORD = 'test-password-session';
const TEST_JWT_SECRET = 'test-session-secret-at-least-32-chars-long-abcdef';

let app: Application;
let validToken: string;

beforeAll(async () => {
  process.env.PASSWORD = TEST_PASSWORD;
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  const { createApp } = await import('../src/app');
  app = await createApp();
});

beforeEach(async () => {
  _clearRegistryForTests();
  jest.clearAllMocks();
  (mockSpawn as jest.Mock).mockImplementation(() => makeMockPty());

  // Get a fresh token
  const loginRes = await request(app).post('/auth/login').send({ password: TEST_PASSWORD });
  validToken = loginRes.body.token;
});

describe('POST /sessions', () => {
  test('SESS-01: valid cwd returns 201 with id (UUID) and pid (number)', async () => {
    const res = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ cwd: '/home/user/project' });
    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(typeof res.body.pid).toBe('number');
    expect(res.body.status).toBe('running');
  });

  test('SESS-01: missing cwd field returns 400', async () => {
    const res = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('AUTH-03: POST /sessions without token returns 401', async () => {
    const res = await request(app).post('/sessions').send({ cwd: '/home/user/project' });
    expect(res.status).toBe(401);
  });

  test('SESS-04: two POST /sessions return distinct UUIDs, both status=running', async () => {
    const r1 = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ cwd: '/home/user/p1' });
    const r2 = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ cwd: '/home/user/p2' });
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    expect(r1.body.id).not.toBe(r2.body.id);
    expect(r1.body.status).toBe('running');
    expect(r2.body.status).toBe('running');
  });
});

describe('GET /sessions', () => {
  test('AUTH-03: GET /sessions without token returns 401', async () => {
    const res = await request(app).get('/sessions');
    expect(res.status).toBe(401);
  });

  test('returns array of sessions with required fields', async () => {
    // Create a session first
    await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ cwd: '/home/user/project' });

    const res = await request(app)
      .get('/sessions')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0]).toHaveProperty('pid');
    expect(res.body[0]).toHaveProperty('cwd');
    expect(res.body[0]).toHaveProperty('createdAt');
    expect(res.body[0]).toHaveProperty('status');
    expect(res.body[0]).not.toHaveProperty('pty'); // internal field must not leak
  });
});

describe('DELETE /sessions/:id', () => {
  test('existing session id returns 200', async () => {
    const createRes = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ cwd: '/home/user/project' });
    const { id } = createRes.body;

    const deleteRes = await request(app)
      .delete(`/sessions/${id}`)
      .set('Authorization', `Bearer ${validToken}`);
    expect(deleteRes.status).toBe(200);
  });

  test('unknown session id returns 404', async () => {
    const res = await request(app)
      .delete('/sessions/00000000-0000-4000-8000-000000000000')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(404);
  });
});
