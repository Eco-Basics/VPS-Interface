import { WebSocket, WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import { getSession } from '../sessions/session.registry';

const PING_INTERVAL_MS = 30_000;

function getSessionId(request: IncomingMessage): string | null {
  const url = new URL(request.url ?? '', 'http://localhost');
  const match = url.pathname.match(/^\/sessions\/([^/]+)\/ws$/);
  return match ? match[1] : null;
}

export function attachSessionHandler(wss: WebSocketServer): void {
  wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
    const sessionId = getSessionId(request);
    const session = sessionId ? getSession(sessionId) : undefined;

    if (!session) {
      ws.close(1008, 'Session not found');
      return;
    }

    const replay = session.buffer.join('');
    if (replay) {
      ws.send(replay);
    }

    if (session.status === 'exited') {
      ws.send(JSON.stringify({ type: 'exit', exitCode: 0 }));
      ws.close();
      return;
    }

    session.clients.add(ws);

    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
        return;
      }

      clearInterval(interval);
      session.clients.delete(ws);
    }, PING_INTERVAL_MS);

    const cleanup = () => {
      clearInterval(interval);
      session.clients.delete(ws);
    };

    ws.on('message', (raw) => {
      let message: unknown;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
        return;
      }

      if (!message || typeof message !== 'object' || !('type' in message)) {
        ws.send(JSON.stringify({ type: 'error', message: 'Missing type field' }));
        return;
      }

      const payload = message as { type: string; data?: string; cols?: number; rows?: number };

      switch (payload.type) {
        case 'input':
          if (typeof payload.data === 'string' && session.status === 'running') {
            session.pty.write(payload.data);
          }
          break;
        case 'resize':
          if (
            typeof payload.cols === 'number' &&
            typeof payload.rows === 'number' &&
            session.status === 'running'
          ) {
            session.pty.resize(payload.cols, payload.rows);
          }
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        default:
          ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${payload.type}` }));
      }
    });

    ws.on('close', cleanup);
    ws.on('error', cleanup);
  });
}
