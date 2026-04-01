// Session router integration tests
// Covers: SESS-01 (spawn), SESS-04 (multiple concurrent), AUTH-03 (session endpoint protection)
// node-pty is mocked via jest.config.ts moduleNameMapper — no real processes spawned
// Implementation plan: 01-03-PLAN.md

import request from 'supertest';
// import app from '../src/app';

describe('POST /sessions', () => {
  test.todo('SESS-01: valid cwd returns 201 with id (UUID) and pid (number)');
  test.todo('SESS-01: missing cwd field returns 400 with error message');
  test.todo('SESS-01: invalid cwd (non-existent path) returns 400');
  test.todo('SESS-04: two POST /sessions calls return two distinct UUIDs, both status=running');
});

describe('GET /sessions', () => {
  test.todo('AUTH-03: GET /sessions without token returns 401');
  test.todo('returns array of sessions with id, pid, cwd, createdAt, status fields');
});

describe('DELETE /sessions/:id', () => {
  test.todo('existing session id returns 200');
  test.todo('unknown session id returns 404');
});
