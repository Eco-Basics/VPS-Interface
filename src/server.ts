import 'dotenv/config';

import http from 'http';
import { WebSocketServer } from 'ws';
import { createApp } from './app';
import { attachWebSocketAuth } from './ws/ws.upgrade';
import { attachSessionHandler } from './ws/ws.session';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function main() {
  const app = await createApp();
  const server = http.createServer(app);

  const wss = new WebSocketServer({ noServer: true });

  attachWebSocketAuth(server, wss);
  attachSessionHandler(wss);

  server.listen(PORT, () => {
    console.log(`[server] Listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('[server] Fatal startup error:', err);
  process.exit(1);
});
