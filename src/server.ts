import 'dotenv/config';

import http from 'http';
import { createApp } from './app';
import { attachWebSocketAuth } from './ws/ws.upgrade';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function main() {
  const app = await createApp();
  const server = http.createServer(app);

  attachWebSocketAuth(server);

  server.listen(PORT, () => {
    console.log(`[server] Listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('[server] Fatal startup error:', err);
  process.exit(1);
});
