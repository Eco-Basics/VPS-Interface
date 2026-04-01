import http from 'http';
import jwt from 'jsonwebtoken';
import { parse } from 'url';

/**
 * Attach WebSocket upgrade auth interceptor to the HTTP server.
 * Phase 1: Rejects unauthenticated upgrades with 401.
 *          Authenticated upgrades get 501 (bridge not yet implemented — Phase 2 swaps this).
 * JWT is read from ?token= query parameter (browser WebSocket API cannot set custom headers).
 */
export function attachWebSocketAuth(server: http.Server): void {
  server.on('upgrade', (req, socket) => {
    const { query } = parse(req.url ?? '', true);
    const token = query.token as string | undefined;

    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\nContent-Length: 0\r\n\r\n');
      socket.destroy();
      return;
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] });
      // Auth passed. Phase 2 will swap this 501 for wss.handleUpgrade(...)
      socket.write('HTTP/1.1 501 Not Implemented\r\nContent-Length: 0\r\n\r\n');
      socket.destroy();
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\nContent-Length: 0\r\n\r\n');
      socket.destroy();
    }
  });
}
