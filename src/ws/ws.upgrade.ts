import type http from 'http';
import jwt from 'jsonwebtoken';
import { parse } from 'url';
import type { WebSocketServer } from 'ws';
import { getSession } from '../sessions/session.registry';

/**
 * Attach WebSocket upgrade auth interceptor to the HTTP server.
 * Phase 2: Real authenticated handleUpgrade flow.
 * - missing or invalid token -> 401
 * - valid token but unknown sessionId -> 404
 * - valid token and known sessionId -> wss.handleUpgrade into shared server
 *
 * JWT is read from ?token= query parameter (browser WebSocket API cannot set custom headers).
 */
export function attachWebSocketAuth(server: http.Server, wss: WebSocketServer): void {
  server.on('upgrade', (req, socket, head) => {
    const { pathname, query } = parse(req.url ?? '', true);
    const token = query.token as string | undefined;

    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\nContent-Length: 0\r\n\r\n');
      socket.destroy();
      return;
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] });
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\nContent-Length: 0\r\n\r\n');
      socket.destroy();
      return;
    }

    const match = pathname?.match(/^\/sessions\/([^/]+)\/ws$/);
    const sessionId = match?.[1];

    if (!sessionId || !getSession(sessionId)) {
      socket.write('HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });
}
