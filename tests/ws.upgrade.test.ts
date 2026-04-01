// WebSocket upgrade auth tests
// Covers: AUTH-03 (unauthenticated WS upgrade rejected with 401)
// Implementation plan: 01-04-PLAN.md (server wiring)

import http from 'http';
// import app from '../src/app';
// import { attachWebSocketAuth } from '../src/ws/ws.upgrade';

describe('WebSocket upgrade auth (AUTH-03)', () => {
  test.todo('WS upgrade without token query param: socket closed with HTTP/1.1 401 response');
  test.todo('WS upgrade with invalid token: socket closed with HTTP/1.1 401 response');
  test.todo('WS upgrade with valid token: socket closed with HTTP/1.1 501 (not 401) — auth passed, bridge not yet implemented');
});
