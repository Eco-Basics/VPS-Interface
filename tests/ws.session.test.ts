// Integration tests for the session WebSocket bridge (ws.session.ts)
// Covers: TERM-01, TERM-02, TERM-03, SESS-03, SESS-05
// Uses superwstest against a real http.Server + WebSocketServer in noServer mode.

import http from 'http';
import { WebSocketServer } from 'ws';
import request from 'superwstest';
import { attachSessionHandler } from '../src/ws/ws.session';
import {
  createSession,
  _clearRegistryForTests,
} from '../src/sessions/session.registry';
import { getMockPtyInstance, makeMockPty } from './__mocks__/node-pty';
import { spawn as mockSpawn } from './__mocks__/node-pty';

let server: http.Server;
let wss: WebSocketServer;

beforeAll(() => {
  wss = new WebSocketServer({ noServer: true });
  attachSessionHandler(wss);

  server = http.createServer();
  server.on('upgrade', (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });
});

afterAll((done) => {
  server.close(done);
});

beforeEach((done) => {
  _clearRegistryForTests();
  jest.clearAllMocks();
  // Reset spawn to return a fresh mock PTY each call
  (mockSpawn as jest.Mock).mockImplementation(() => makeMockPty());

  server.listen(0, '127.0.0.1', done);
});

afterEach((done) => {
  server.close(done);
});

describe('session WebSocket bridge', () => {
  test('TERM-01: forwards PTY data to the client as a raw string', async () => {
    const session = createSession('/home/user/project');
    const mockPty = getMockPtyInstance();

    // Pre-load buffer with some output so it gets replayed
    mockPty._emitData('hello from pty');

    await request(server)
      .ws(`/sessions/${session.id}/ws`)
      .expectText('hello from pty')
      .close()
      .expectClosed();
  });

  test('TERM-02: writes input messages to the PTY', async () => {
    const session = createSession('/home/user/project');
    const mockPty = getMockPtyInstance();

    await request(server)
      .ws(`/sessions/${session.id}/ws`)
      .sendJson({ type: 'input', data: 'ls\n' })
      .wait(50)
      .exec(() => {
        expect(mockPty.write).toHaveBeenCalledWith('ls\n');
      })
      .close()
      .expectClosed();
  });

  test('TERM-03: calls pty.resize on resize messages', async () => {
    const session = createSession('/home/user/project');
    const mockPty = getMockPtyInstance();

    await request(server)
      .ws(`/sessions/${session.id}/ws`)
      .sendJson({ type: 'resize', cols: 120, rows: 40 })
      .wait(50)
      .exec(() => {
        expect(mockPty.resize).toHaveBeenCalledWith(120, 40);
      })
      .close()
      .expectClosed();
  });

  test('SESS-03: reconnect replays buffered PTY output before live stream', async () => {
    const session = createSession('/home/user/project');
    const mockPty = getMockPtyInstance();

    // Emit several data chunks to fill the buffer
    mockPty._emitData('line-1\r\n');
    mockPty._emitData('line-2\r\n');
    mockPty._emitData('line-3\r\n');

    const expectedReplay = 'line-1\r\nline-2\r\nline-3\r\n';

    // First connection — receives replay of the entire buffer as a single string
    await request(server)
      .ws(`/sessions/${session.id}/ws`)
      .expectText(expectedReplay)
      .close()
      .expectClosed();

    // Second connection (reconnect) — also receives the same replay
    await request(server)
      .ws(`/sessions/${session.id}/ws`)
      .expectText(expectedReplay)
      .close()
      .expectClosed();
  });

  test('SESS-05: broadcasts exit notification and closes WebSocket clients', async () => {
    const session = createSession('/home/user/project');
    const mockPty = getMockPtyInstance();

    await request(server)
      .ws(`/sessions/${session.id}/ws`)
      .exec(() => {
        // Simulate PTY exit — registry handler sends exit JSON to all clients
        mockPty._emitExit(0);
      })
      .expectJson({ type: 'exit', exitCode: 0 })
      .expectClosed();
  });
});
