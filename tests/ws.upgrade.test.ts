// WebSocket upgrade auth tests
// Covers: AUTH-03 (unauthenticated WS upgrade rejected with 401)
//         SESS-03 (valid token unknown session returns 404)
//         SESS-05 (valid token known session completes upgrade)
// Implementation plan: 02-04-PLAN.md

import http from 'http';
import net from 'net';
import jwt from 'jsonwebtoken';
import { WebSocketServer } from 'ws';
import { createApp } from '../src/app';
import { attachWebSocketAuth } from '../src/ws/ws.upgrade';
import { createSession, _clearRegistryForTests } from '../src/sessions/session.registry';
import { attachSessionHandler } from '../src/ws/ws.session';

const TEST_JWT_SECRET = 'test-ws-secret-at-least-32-chars-long-abcdef';
const TEST_PASSWORD = 'test-ws-password';

let server: http.Server;
let wss: WebSocketServer;
let port: number;

beforeAll(async () => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.PASSWORD = TEST_PASSWORD;

  const app = await createApp();
  server = http.createServer(app);
  wss = new WebSocketServer({ noServer: true });
  attachWebSocketAuth(server, wss);
  attachSessionHandler(wss);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      port = (server.address() as net.AddressInfo).port;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  wss.close();
  _clearRegistryForTests();
});

function sendUpgradeRequest(path: string, token: string | null): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(port, '127.0.0.1', () => {
      const tokenParam = token !== null ? `?token=${encodeURIComponent(token)}` : '';
      socket.write(
        `GET ${path}${tokenParam} HTTP/1.1\r\n` +
        `Host: localhost\r\n` +
        `Upgrade: websocket\r\n` +
        `Connection: Upgrade\r\n` +
        `Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n` +
        `Sec-WebSocket-Version: 13\r\n\r\n`
      );
    });
    let response = '';
    socket.on('data', (chunk) => {
      response += chunk.toString();
      socket.destroy();
    });
    socket.on('close', () => resolve(response));
    socket.on('error', reject);
    setTimeout(() => { socket.destroy(); resolve(response); }, 1000);
  });
}

describe('WebSocket upgrade auth (AUTH-03, SESS-03, SESS-05)', () => {
  test('WS upgrade without token query param: response contains HTTP/1.1 401', async () => {
    const response = await sendUpgradeRequest('/sessions/any-id/ws', null);
    expect(response).toContain('HTTP/1.1 401');
  });

  test('WS upgrade with invalid token: response contains HTTP/1.1 401', async () => {
    const response = await sendUpgradeRequest('/sessions/any-id/ws', 'this-is-not-a-valid-jwt');
    expect(response).toContain('HTTP/1.1 401');
  });

  test('WS upgrade with valid token but unknown session id: response contains HTTP/1.1 404', async () => {
    const validToken = jwt.sign({}, TEST_JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d' });
    const response = await sendUpgradeRequest('/sessions/unknown-session-id/ws', validToken);
    expect(response).toContain('HTTP/1.1 404');
  });

  test('WS upgrade with valid token and known session: completes upgrade (101), not 501', async () => {
    const session = createSession('/tmp');
    const validToken = jwt.sign({}, TEST_JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d' });
    const response = await sendUpgradeRequest(`/sessions/${session.id}/ws`, validToken);
    expect(response).toContain('HTTP/1.1 101');
    expect(response).not.toContain('HTTP/1.1 501');
  });
});
