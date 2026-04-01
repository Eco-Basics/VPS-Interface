// WebSocket upgrade auth tests
// Covers: AUTH-03 (unauthenticated WS upgrade rejected with 401)
// Implementation plan: 01-04-PLAN.md (server wiring)

import http from 'http';
import net from 'net';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app';
import { attachWebSocketAuth } from '../src/ws/ws.upgrade';

const TEST_JWT_SECRET = 'test-ws-secret-at-least-32-chars-long-abcdef';
const TEST_PASSWORD = 'test-ws-password';

let server: http.Server;
let port: number;

beforeAll(async () => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.PASSWORD = TEST_PASSWORD;

  const app = await createApp();
  server = http.createServer(app);
  attachWebSocketAuth(server);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      port = (server.address() as net.AddressInfo).port;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

function sendUpgradeRequest(token: string | null): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(port, '127.0.0.1', () => {
      const tokenParam = token !== null ? `?token=${encodeURIComponent(token)}` : '';
      socket.write(
        `GET /ws${tokenParam} HTTP/1.1\r\n` +
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

describe('WebSocket upgrade auth (AUTH-03)', () => {
  test('WS upgrade without token query param: response contains HTTP/1.1 401', async () => {
    const response = await sendUpgradeRequest(null);
    expect(response).toContain('HTTP/1.1 401');
  });

  test('WS upgrade with invalid token: response contains HTTP/1.1 401', async () => {
    const response = await sendUpgradeRequest('this-is-not-a-valid-jwt');
    expect(response).toContain('HTTP/1.1 401');
  });

  test('WS upgrade with valid token: response contains HTTP/1.1 501 (auth passed, bridge pending)', async () => {
    const validToken = jwt.sign({}, TEST_JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d' });
    const response = await sendUpgradeRequest(validToken);
    expect(response).toContain('HTTP/1.1 501');
  });
});
