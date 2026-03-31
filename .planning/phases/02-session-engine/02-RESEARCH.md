# Phase 2: Session Engine - Research

**Researched:** 2026-04-01
**Domain:** WebSocket bridge (ws library), ring buffer, PTY data piping, session management
**Confidence:** HIGH (all core libraries verified against npm registry and official docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Ring buffer: in-memory circular buffer per session, capped at 1000 lines; no disk persistence; buffer is part of SessionRecord (Phase 1 registry owns it, Phase 2 populates it); cleared on DELETE /sessions/:id
- WebSocket protocol:
  - Server → client: raw UTF-8 string for PTY output data (passed directly to xterm.js `Terminal.write()`)
  - Client → server: JSON envelope for all messages — `{"type":"input","data":"..."}`, `{"type":"resize","cols":N,"rows":M}`, `{"type":"ping"}`
  - Server responds to ping with `{"type":"pong"}`
- Reconnect: on connect to existing session, server immediately sends full ring buffer contents as a single string chunk, then live streams; no special framing — xterm.js treats replay identically to live data
- Multiple simultaneous WS connections to same session are allowed — all receive same live output (broadcast)
- WS URL: `ws://host/sessions/:id/ws?token=<jwt>`
- Session kill notification: connected WS clients receive `{"type":"exit","exitCode":N}` then server closes the WebSocket
- Phase 1 already rejects unauthenticated WS upgrades with 401; Phase 2 replaces 501 stub with `wss.handleUpgrade()` for authenticated connections
- Terminal resize: client sends `{"type":"resize","cols":N,"rows":M}`; server calls `pty.resize(cols, rows)`; no server-side debounce required

### Claude's Discretion
- WebSocket ping/pong interval timing (suggest 30s)
- Exact ring buffer data structure (circular array vs. simple push/shift)
- Error response format for WS protocol violations (malformed JSON, unknown message type)
- Whether to log PTY output for debugging (suggest off by default, env var to enable)

### Deferred Ideas (OUT OF SCOPE)
- Ring buffer persistence across server restarts — v2 RESIL-01
- Session recording/playback — v2 UI-02
- Binary framing for PTY data (performance optimization for large output) — not needed for v1
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SESS-03 | User can reconnect to a running session and see recent output (scrollback replay via ring buffer) | Ring buffer populated on PTY onData; full buffer sent as single string chunk on new WS connect before live stream |
| SESS-05 | User can kill/close a session with graceful shutdown (SIGTERM before SIGKILL) | Phase 1 killSession() already handles SIGTERM+SIGKILL; Phase 2 adds WS notification: `{"type":"exit","exitCode":N}` broadcast + ws.close() |
| TERM-01 | Terminal renders full ANSI color and formatting via xterm.js | PTY spawned with `TERM=xterm-256color`, `COLORTERM=truecolor`; raw UTF-8 string forwarded without transformation preserves escape sequences |
| TERM-02 | All Claude interactive prompts work correctly (approve/deny, diffs, menus, slash commands) | Real PTY (node-pty) required — already established in Phase 1; WS bridge must forward input via `pty.write(data)` |
| TERM-03 | Terminal resizes correctly when browser window or viewport changes (SIGWINCH propagated) | `pty.resize(cols, rows)` called on resize message; node-pty handles SIGWINCH propagation internally |
</phase_requirements>

---

## Summary

Phase 2 builds the WebSocket bridge that connects a browser terminal (xterm.js) to the running PTY processes created in Phase 1. Three technical problems must be solved: (1) routing WebSocket upgrades to per-session handlers using the `ws` library's `noServer` + `handleUpgrade` pattern, (2) piping PTY output through an in-memory ring buffer while broadcasting to multiple concurrent clients, and (3) wiring the session lifecycle (reconnect replay, resize, exit notification) over the WebSocket protocol.

The `ws` library's `noServer` mode is the correct attachment mechanism — it hands full upgrade control back to the application, enabling per-session routing and auth validation before any WebSocket handshake completes. The ring buffer is simple to hand-roll as a capped array (push + conditional shift); external ring buffer libraries add zero value for this use case and are explicitly not needed.

The most significant pitfall is listener accumulation: every WebSocket connection registers a callback on the PTY's `onData` event. The `onData` API returns an `IDisposable` that must be called when the WebSocket closes. Failure to dispose creates a permanent closure reference to the (possibly closed) `ws` socket — a classic leak that grows linearly with reconnection count.

**Primary recommendation:** `ws` 8.x with `noServer: true`, hand-rolled ring buffer as a `string[]` with capped push, PTY `onData` subscriptions cleaned up via `IDisposable.dispose()` on WebSocket close, and `superwstest` for integration-level WebSocket tests.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ws | 8.20.0 | WebSocket server | PROJECT.md requirement; not socket.io; already in use from Phase 1 |
| node-pty | 1.1.0 | PTY process I/O source | Already in use from Phase 1; `onData`, `resize`, `onExit` are the Phase 2 API surface |

### Supporting (test only)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| superwstest | 2.1.1 | WebSocket integration testing | Extends supertest with WS connection helpers; avoids raw net.Socket test boilerplate |

### No New Production Dependencies
Phase 2 requires no new production `npm install` beyond what Phase 1 already installed (`ws` was installed in Phase 1 for the upgrade auth stub). The ring buffer is a plain `string[]` — no library needed.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled ring buffer | `ring-buffer-ts` (npm) | External dependency adds zero value; the problem is `string[].push` + conditional `string[].shift` — 4 lines of code |
| superwstest | Raw `net.Socket` in tests | Phase 1 used raw `net.Socket` for upgrade tests; superwstest is cleaner for full message-level WS tests |
| superwstest | `ws` client in tests | `ws` client works but superwstest provides a fluent assertion API matching supertest style |

**Version verification (confirmed 2026-04-01):**
- ws: 8.20.0 (published 2026-03-21)
- node-pty: 1.1.0 (published 2026-03-12)
- superwstest: 2.1.1

**Installation (dev only — production libs already installed):**
```bash
npm install --save-dev superwstest
```

---

## Architecture Patterns

### Recommended Project Structure Extension
```
src/
├── app.ts                          # unchanged — createApp() factory
├── server.ts                       # updated — attach ws bridge after http.createServer
├── sessions/
│   ├── session.types.ts            # updated — add buffer: string[] to SessionRecord
│   ├── session.registry.ts         # unchanged — Phase 2 reads from it only
│   └── session.router.ts           # unchanged — DELETE /sessions/:id already wired
└── ws/
    ├── ws.upgrade.ts               # updated — replace 501 stub with wss.handleUpgrade()
    └── session.ws.handler.ts       # NEW — per-connection handler logic
```

### Pattern 1: WebSocketServer with noServer Mode — Attaching to http.Server

**What:** Create a `WebSocketServer` without binding its own port. The HTTP server's `upgrade` event fires first; the handler validates auth + session existence, then calls `wss.handleUpgrade()` to complete the WebSocket handshake.

**When to use:** Whenever a WebSocket server must share an existing `http.Server` (i.e., same port as Express). The `noServer` mode gives full routing control before the upgrade completes.

```typescript
// Source: ws 8.x official README — "Multiple servers sharing a single HTTP/S server"
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { parse } from 'url';
import jwt from 'jsonwebtoken';
import { getSession } from '../sessions/session.registry';

const wss = new WebSocketServer({ noServer: true });

export function attachWebSocketBridge(server: http.Server): void {
  server.on('upgrade', (req, socket, head) => {
    const { pathname, query } = parse(req.url ?? '', true);
    const token = query.token as string | undefined;

    // 1. Auth check
    try {
      jwt.verify(token ?? '', process.env.JWT_SECRET!, { algorithms: ['HS256'] });
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\nContent-Length: 0\r\n\r\n');
      socket.destroy();
      return;
    }

    // 2. Route: only /sessions/:id/ws paths are handled
    const match = pathname?.match(/^\/sessions\/([^/]+)\/ws$/);
    if (!match) {
      socket.write('HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n');
      socket.destroy();
      return;
    }

    const sessionId = match[1];
    const session = getSession(sessionId);
    if (!session) {
      socket.write('HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n');
      socket.destroy();
      return;
    }

    // 3. Complete upgrade — callback receives the live WebSocket
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req, session);
    });
  });

  wss.on('connection', (ws: WebSocket, req: http.IncomingMessage, session) => {
    handleSessionConnection(ws, session);
  });
}
```

**Key constraint:** The `wss.emit('connection', ws, req, session)` call in the callback is the idiomatic way to pass the resolved session object into the `connection` event handler — the third positional argument becomes the third parameter of `wss.on('connection', ...)`.

### Pattern 2: Ring Buffer — Capped String Array

**What:** A plain `string[]` field on `SessionRecord`. PTY output lines are appended; once the array reaches 1000 entries, the oldest entry is discarded via `shift()`.

**When to use:** Always. Do not use an external ring buffer library for this use case.

**Implementation — in `session.types.ts`:**
```typescript
// Updated SessionRecord — add buffer field
export interface SessionRecord {
  id: string;
  pid: number;
  pty: pty.IPty;
  cwd: string;
  createdAt: Date;
  status: 'running' | 'exited';
  buffer: string[];   // ring buffer — max 1000 entries; populated by Phase 2
}
```

**Ring buffer push (called in PTY onData handler):**
```typescript
const BUFFER_LIMIT = 1000;

function appendToBuffer(record: SessionRecord, chunk: string): void {
  record.buffer.push(chunk);
  if (record.buffer.length > BUFFER_LIMIT) {
    record.buffer.shift();
  }
}
```

**Note on "lines" vs "chunks":** PTY `onData` fires with arbitrary byte chunks, not necessarily one line at a time. The CONTEXT.md decision says "1000 lines" as a sizing intent, but the implementation stores raw PTY chunks (not newline-split lines). Storing raw chunks is correct: splitting by `\n` would break multi-line ANSI escape sequences. At typical terminal widths, 1000 chunks approximates several screens of scrollback.

### Pattern 3: PTY Data Piping — onData to Ring Buffer and Broadcast

**What:** Subscribe to `pty.onData` at session creation time (in ws handler setup). Each chunk is appended to the ring buffer AND sent to all open WebSocket clients for that session.

**When to use:** Immediately when the first WebSocket connects to a session (or at session creation if pre-buffering is desired). The key constraint is that `onData` must be registered only ONCE per session, not once per WebSocket connection. Broadcasting to multiple clients happens in the callback.

```typescript
// Source: node-pty 1.1.0 typings — onData returns IDisposable
// This handler is registered ONCE per session when the ws bridge initialises.
// It runs for the session's entire lifetime — not per-connection.

const clients = new Set<WebSocket>();   // per-session client tracking

const dataDisposable = session.pty.onData((chunk: string) => {
  // 1. Append to ring buffer
  appendToBuffer(session, chunk);

  // 2. Broadcast to all open clients
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(chunk);   // raw UTF-8 string — xterm.js Terminal.write() compatible
    }
  }
});
// dataDisposable.dispose() called when session exits or server shuts down
```

**Why register once, not per-connection:** If `onData` is registered inside the `connection` callback, each new client connection adds another listener. With N reconnections, the PTY fires N identical handlers per data chunk, sending duplicate output to still-open clients and leaking memory for closed-client closures. Register once, maintain a `Set<WebSocket>` of clients, and add/remove from the Set on connect/close.

### Pattern 4: Reconnect Replay

**What:** When a new WebSocket connects to a session that already has buffer contents, send the entire buffer as a single concatenated string before switching to live streaming.

```typescript
// Source: CONTEXT.md locked decision — "single string chunk, no special framing"
function replayBuffer(ws: WebSocket, session: SessionRecord): void {
  if (session.buffer.length > 0 && ws.readyState === WebSocket.OPEN) {
    ws.send(session.buffer.join(''));
  }
}
```

Called immediately after the client is added to the Set, before live data starts arriving. Because `onData` fires asynchronously (event loop turn), there is no race condition: the replay send completes synchronously before any new `onData` fires.

### Pattern 5: Client Message Handling — Input, Resize, Ping

**What:** All client → server messages arrive as JSON strings. Parse, validate type field, dispatch.

```typescript
ws.on('message', (raw: Buffer | string) => {
  let msg: unknown;
  try {
    msg = JSON.parse(raw.toString());
  } catch {
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
    return;
  }

  if (typeof msg !== 'object' || msg === null || !('type' in msg)) {
    ws.send(JSON.stringify({ type: 'error', message: 'Missing type field' }));
    return;
  }

  const { type } = msg as { type: string };

  switch (type) {
    case 'input': {
      const { data } = msg as { data?: string };
      if (typeof data === 'string' && session.status === 'running') {
        session.pty.write(data);
      }
      break;
    }
    case 'resize': {
      const { cols, rows } = msg as { cols?: number; rows?: number };
      if (typeof cols === 'number' && typeof rows === 'number' && session.status === 'running') {
        session.pty.resize(cols, rows);
      }
      break;
    }
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
    default:
      ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${type}` }));
  }
});
```

### Pattern 6: Session Exit Notification and WS Cleanup

**What:** When the PTY process exits, broadcast `{"type":"exit","exitCode":N}` to all connected clients and close their WebSocket connections. Clean up the `onData` disposable.

```typescript
// Source: node-pty 1.1.0 typings — onExit fires with { exitCode: number, signal?: number }
// Note: Phase 1 registry already registers an onExit to set record.status = 'exited'.
// Phase 2 registers a SECOND onExit for WS notification.
// node-pty IEvent supports multiple listeners (each call to onExit() adds a new listener).

const exitDisposable = session.pty.onExit(({ exitCode }) => {
  const msg = JSON.stringify({ type: 'exit', exitCode });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
      client.close(1000, 'Session exited');
    }
  }
  clients.clear();
  dataDisposable.dispose();   // stop onData firing after process exits
  exitDisposable.dispose();
});
```

### Pattern 7: Per-Connection Cleanup on WS Close

**What:** Remove client from broadcast Set and dispose of any per-connection resources on `close` and `error` events.

```typescript
// Source: oneuptime.com/blog/post/2026-01-24-websocket-memory-leak-issues/view
// Named handler prevents adding anonymous functions that can't be removed.
const onClose = () => {
  clients.delete(ws);
};
ws.on('close', onClose);
ws.on('error', onClose);
```

### Pattern 8: Ping/Pong Keepalive (Discretion: 30s)

**What:** Server-side heartbeat using ws library native ping/pong to detect dead connections.

```typescript
// Source: ws 8.x README — ping/pong heartbeat example
const PING_INTERVAL_MS = 30_000;

const pingInterval = setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.ping();
  } else {
    clearInterval(pingInterval);
    clients.delete(ws);
  }
}, PING_INTERVAL_MS);

ws.on('close', () => {
  clearInterval(pingInterval);
  clients.delete(ws);
});
```

**Note:** The built-in ws `ping()` / `pong` event is distinct from the application-level `{"type":"ping"}` message. Both should be implemented: the built-in one detects silent TCP disconnects; the app-level one lets the browser JavaScript detect connection health.

### Anti-Patterns to Avoid

- **Registering `onData` inside the WS `connection` callback:** Creates N duplicate listeners after N reconnections. Register once per session; use a Set for clients.
- **Not disposing `onData` after session exits:** The PTY object and all client closures are retained by the GC even after the process is gone. Call `dataDisposable.dispose()` in the `onExit` handler.
- **Splitting PTY chunks by newline before buffering:** Breaks multi-line ANSI escape sequences. Buffer raw chunks.
- **Sending PTY data as JSON-wrapped string (e.g., `{"type":"data","payload":"..."}`):** CONTEXT.md decision is raw UTF-8 string server→client. Wrapping adds encoding overhead and requires unwrapping in xterm.js. Contradicts the locked decision.
- **Using `wss.clients` Set for per-session broadcast:** `wss.clients` contains ALL connections across all sessions. Use a per-session `Set<WebSocket>` instead.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Ring buffer (1000-entry cap) | External library | `string[]` with push/shift | 4 lines of code; no dependency justified |
| WebSocket keepalive detection | Manual TCP probing | `ws.ping()` + `pong` event | ws handles WebSocket ping frame at protocol level |
| PTY output fan-out | Custom EventEmitter | `Set<WebSocket>` in onData closure | PTY already fires one event; iteration over a Set is sufficient |

**Key insight:** The per-session client Set pattern is structurally simpler than using an EventEmitter for fan-out. An EventEmitter adds listener management complexity without benefit when the client count is small (personal tool) and the broadcast logic is trivial.

---

## Common Pitfalls

### Pitfall 1: onData Listener Accumulation (Memory Leak)

**What goes wrong:** Server accumulates PTY data listeners and WebSocket send callbacks without bound. After 20 reconnections, 20 closures fire on every PTY data event — 19 of which reference closed/garbage-collected WebSocket objects. Memory climbs steadily.

**Why it happens:** `session.pty.onData(handler)` is called inside the WS `connection` callback. Each reconnect adds another listener. node-pty's `IEvent` implementation does not deduplicate listeners.

**How to avoid:** Register `onData` exactly ONCE per session. Maintain a `Set<WebSocket>` for clients. `ws.on('close')` removes from Set. `exitDisposable` disposes `dataDisposable` on PTY exit.

**Warning signs:** `node --inspect` memory profile shows growing Set of callbacks in PTY internals; `ps` shows server RSS climbing on each browser refresh.

### Pitfall 2: Ping Interval Not Cleared on WS Close

**What goes wrong:** `setInterval` fires on a closed WebSocket, producing unhandled errors or silently accumulating unclearable timers.

**Why it happens:** `setInterval` reference not stored and cleared in the `close` event handler.

**How to avoid:** Always store the interval ID: `const interval = setInterval(...)`. Clear in both `close` and `error` handlers: `ws.on('close', () => clearInterval(interval))`.

**Warning signs:** `Error: WebSocket is not open: readyState 3 (CLOSED)` in server logs every 30 seconds after a client disconnects.

### Pitfall 3: Race Condition on Replay vs Live Data (None — But Explain Why)

**What might be feared:** A new client connects, replay starts, and simultaneously a new PTY chunk arrives and is broadcast before replay finishes.

**Why it is NOT a problem here:** Node.js is single-threaded. The replay `ws.send(buffer.join(''))` call and the subsequent `clients.add(ws)` (or vice versa — order matters) both execute synchronously within the same `connection` callback microtask. The `onData` callback fires on the next event loop turn. As long as `replayBuffer()` is called and `clients.add(ws)` happens in the same synchronous block, no live data fires in between.

**How to ensure safety:** In the connection handler, call `replayBuffer(ws, session)` then `clients.add(ws)` in that order, without any `await` in between.

### Pitfall 4: Writing to Exited PTY

**What goes wrong:** Client sends `{"type":"input","data":"..."}` after the PTY has exited. `pty.write()` on a dead process throws or is silently dropped, potentially crashing the handler.

**Why it happens:** Race between browser detecting exit and still sending input.

**How to avoid:** Guard all `pty.write()` and `pty.resize()` calls with `session.status === 'running'` check (shown in Pattern 5 above). node-pty does not guarantee safe behavior when writing to an exited process.

**Warning signs:** `Error: write after end` or `EPIPE` errors in server logs.

### Pitfall 5: Concurrent WS Clients Share `wss.clients` Set

**What goes wrong:** Broadcast logic uses `wss.clients.forEach(...)` — this iterates ALL sessions' clients, not just the one for the session being piped. Session A's PTY output is sent to Session B's browser tab.

**Why it happens:** `wss.clients` is the WebSocketServer-level Set — it contains every connected client across all sessions.

**How to avoid:** Maintain a per-session `Map<sessionId, Set<WebSocket>>` or use a closure-scoped `Set<WebSocket>` in the per-session handler. Never use `wss.clients` for per-session broadcasts.

**Warning signs:** Two concurrent sessions mixing each other's terminal output in the browser.

### Pitfall 6: Malformed JSON from Client Crashes Handler

**What goes wrong:** Client (or attacker) sends non-JSON over WebSocket. `JSON.parse()` throws; if not caught, the `message` event handler crashes and the WebSocket connection is dropped ungracefully.

**Why it happens:** `ws` library does not validate message format before firing the `message` event.

**How to avoid:** Always wrap `JSON.parse()` in try/catch. Send `{"type":"error","message":"Invalid JSON"}` on parse failure and continue (do not close the connection for a single bad message unless security policy requires it).

### Pitfall 7: Large Ring Buffer Sent as Individual ws.send() Calls

**What goes wrong:** On reconnect, code iterates `session.buffer` and calls `ws.send(chunk)` for each entry — 1000 separate WebSocket frames for a full buffer. Browser receives 1000 message events; xterm.js parses 1000 times rather than once.

**Why it happens:** Naive "send each chunk" loop instead of `buffer.join('')`.

**How to avoid:** CONTEXT.md decision: send as a single string chunk (`session.buffer.join('')`). One frame, one `write()` call to xterm.js. Faster and simpler.

---

## Code Examples

### Complete Session Connection Handler Skeleton

```typescript
// Source: ws 8.x README + node-pty 1.1.0 typings + CONTEXT.md protocol decisions
// File: src/ws/session.ws.handler.ts

import { WebSocket } from 'ws';
import { IDisposable } from 'node-pty';
import { SessionRecord } from '../sessions/session.types';

const BUFFER_LIMIT = 1000;
const PING_INTERVAL_MS = 30_000;

// Per-session client registry — Map lives as long as the session does
const sessionClients = new Map<string, Set<WebSocket>>();

export function getOrCreateClientSet(sessionId: string): Set<WebSocket> {
  if (!sessionClients.has(sessionId)) {
    sessionClients.set(sessionId, new Set());
  }
  return sessionClients.get(sessionId)!;
}

export function handleSessionConnection(ws: WebSocket, session: SessionRecord): void {
  const clients = getOrCreateClientSet(session.id);

  // --- Replay ring buffer before live stream ---
  if (session.buffer.length > 0 && ws.readyState === WebSocket.OPEN) {
    ws.send(session.buffer.join(''));
  }

  // --- Add to broadcast set (AFTER replay — order matters for race safety) ---
  clients.add(ws);

  // --- Keepalive ---
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
      clients.delete(ws);
    }
  }, PING_INTERVAL_MS);

  // --- Client message handling ---
  ws.on('message', (raw: Buffer | string) => {
    let msg: unknown;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      return;
    }
    if (typeof msg !== 'object' || msg === null || !('type' in msg)) return;
    const { type } = msg as { type: string };
    switch (type) {
      case 'input': {
        const { data } = msg as { data?: string };
        if (typeof data === 'string' && session.status === 'running') {
          session.pty.write(data);
        }
        break;
      }
      case 'resize': {
        const { cols, rows } = msg as { cols?: number; rows?: number };
        if (typeof cols === 'number' && typeof rows === 'number' && session.status === 'running') {
          session.pty.resize(cols, rows);
        }
        break;
      }
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      default:
        ws.send(JSON.stringify({ type: 'error', message: `Unknown type: ${type}` }));
    }
  });

  // --- Per-connection cleanup ---
  const onClose = () => {
    clearInterval(pingInterval);
    clients.delete(ws);
  };
  ws.on('close', onClose);
  ws.on('error', onClose);
}

// Called ONCE per session (not per connection) — in ws.upgrade.ts setup
export function initSessionBroadcast(session: SessionRecord): IDisposable {
  const clients = getOrCreateClientSet(session.id);

  const dataDisposable = session.pty.onData((chunk: string) => {
    // Append to ring buffer
    session.buffer.push(chunk);
    if (session.buffer.length > BUFFER_LIMIT) {
      session.buffer.shift();
    }
    // Broadcast to all open clients
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(chunk);
      }
    }
  });

  const exitDisposable = session.pty.onExit(({ exitCode }) => {
    const msg = JSON.stringify({ type: 'exit', exitCode });
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
        client.close(1000, 'Session exited');
      }
    }
    clients.clear();
    sessionClients.delete(session.id);
    dataDisposable.dispose();
    exitDisposable.dispose();
  });

  return dataDisposable; // caller can dispose on server shutdown
}
```

### Updated SessionRecord Type

```typescript
// src/sessions/session.types.ts — add buffer field
export interface SessionRecord {
  id: string;
  pid: number;
  pty: pty.IPty;
  cwd: string;
  createdAt: Date;
  status: 'running' | 'exited';
  buffer: string[];   // Phase 2 addition — ring buffer, max 1000 chunks
}
```

In `createSession()` (session.registry.ts), initialise the buffer as an empty array:
```typescript
const record: SessionRecord = {
  // ... existing fields ...
  buffer: [],
};
```

### Updated ws.upgrade.ts — Replace 501 with handleUpgrade

```typescript
// src/ws/ws.upgrade.ts — Phase 2 version
// Source: ws 8.x README, noServer pattern
import http from 'http';
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { parse } from 'url';
import { getSession } from '../sessions/session.registry';
import { handleSessionConnection, initSessionBroadcast } from './session.ws.handler';

const wss = new WebSocketServer({ noServer: true });
const broadcastInited = new Set<string>(); // track which sessions have onData registered

export function attachWebSocketBridge(server: http.Server): void {
  server.on('upgrade', (req, socket, head) => {
    const { pathname, query } = parse(req.url ?? '', true);
    const token = query.token as string | undefined;

    // Auth
    try {
      jwt.verify(token ?? '', process.env.JWT_SECRET!, { algorithms: ['HS256'] });
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\nContent-Length: 0\r\n\r\n');
      socket.destroy();
      return;
    }

    // Route match
    const match = pathname?.match(/^\/sessions\/([^/]+)\/ws$/);
    if (!match) {
      socket.write('HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n');
      socket.destroy();
      return;
    }

    const session = getSession(match[1]);
    if (!session) {
      socket.write('HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n');
      socket.destroy();
      return;
    }

    // Init broadcast pipeline once per session
    if (!broadcastInited.has(session.id)) {
      broadcastInited.add(session.id);
      initSessionBroadcast(session);
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      handleSessionConnection(ws, session);
    });
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pty.on('data', ...)` event emitter | `pty.onData(listener)` returning `IDisposable` | node-pty 0.9.0 | Clean disposable pattern; multiple listeners supported without manual EventEmitter management |
| socket.io for WebSocket + event bus | Raw `ws` library with manual message routing | Project decision | No socket.io namespace overhead; JSON protocol is explicit and debuggable |
| Sending PTY output as base64 binary | Raw UTF-8 string direct to xterm.js | xterm.js design | xterm.js `Terminal.write()` accepts strings natively; no encode/decode overhead |
| `wss = new WebSocketServer({ server: httpServer })` | `noServer: true` + manual `handleUpgrade` | ws 7.x+ | Full control over routing and auth before upgrade; required for per-path routing |

**Deprecated/outdated:**
- `ws.on('message', ...)` receiving `Buffer` only: In `ws` 8.x, messages arrive as `Buffer | ArrayBuffer | Buffer[]` depending on `binaryType`. For text frames (which is all we send), `raw.toString()` is safe. Avoid assuming `typeof raw === 'string'` — always call `.toString()`.
- Socket.io for this use case: Adds 50-100KB of protocol overhead and a namespace abstraction that provides no benefit when protocol is simple and manually defined.

---

## Open Questions

1. **When to initialise `initSessionBroadcast` (per-session onData registration)**
   - What we know: CONTEXT.md says ring buffer accumulates from spawn time. This implies `initSessionBroadcast` should be called at session creation, not at first WS connect — otherwise output before the first client connects is not buffered.
   - What's unclear: Phase 1's `session.registry.ts` does not have a hook point for Phase 2 to register at spawn time. Either Phase 2 calls `initSessionBroadcast` from `createSession()` (coupling concern) or from the first WS connection (misses pre-connection output).
   - Recommendation: Call `initSessionBroadcast` from within `createSession()` in session.registry.ts (or a post-create hook). The coupling is acceptable — Phase 2 owns the WS bridge and the buffer population. Alternatively, accept that output before the first WS connect is not buffered (first connection will see live data only — no replay). **For planning: treat `initSessionBroadcast` as called from first WS connect with a note that pre-connect output is not buffered. If the user connects immediately after spawning, no data is lost.**

2. **Exited session reconnect behaviour**
   - What we know: `session.status === 'exited'` is set by Phase 1's onExit handler. CONTEXT.md does not specify whether WS connections to exited sessions are allowed.
   - What's unclear: Should a reconnect to an exited session replay the buffer and immediately send `{"type":"exit","exitCode":N}`, or return a 404/410?
   - Recommendation: Allow the upgrade, replay buffer, then immediately send `{"type":"exit"}` message and close. This gives the browser a chance to show the final output before the session is cleaned up. The planner should add this as a task.

3. **Buffer initialisation location (session.registry.ts vs session.ws.handler.ts)**
   - What we know: `SessionRecord.buffer` field must be added to the type in Phase 2. `createSession()` in registry.ts must initialise it as `[]`.
   - What's unclear: Whether modifying session.registry.ts (a Phase 1 file) in Phase 2 is acceptable.
   - Recommendation: Yes — `session.types.ts` and `session.registry.ts` are deliberately designed to be extended by Phase 2 (CONTEXT.md explicitly states this). Adding `buffer: []` to the record initialisation in `createSession()` is the correct approach.

---

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30.3.0 + superwstest 2.1.1 + ts-jest |
| Config file | `jest.config.ts` (created in Phase 1 Wave 0) |
| Quick run command | `npx jest --testPathPattern=session.ws --runInBand` |
| Full suite command | `npx jest --runInBand` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SESS-03 | New WS connect replays full ring buffer as single string before live data | integration | `npx jest --testPathPattern=session.ws --runInBand` | Wave 0 |
| SESS-03 | WS connect to session with empty buffer — no replay message sent, live stream starts | integration | `npx jest --testPathPattern=session.ws --runInBand` | Wave 0 |
| SESS-03 | Ring buffer capped at 1000 entries — 1001st push evicts oldest | unit | `npx jest --testPathPattern=ring.buffer --runInBand` | Wave 0 |
| SESS-05 | PTY exit broadcasts `{"type":"exit","exitCode":N}` to all connected WS clients | integration | `npx jest --testPathPattern=session.ws --runInBand` | Wave 0 |
| SESS-05 | Server closes WS after sending exit message | integration | `npx jest --testPathPattern=session.ws --runInBand` | Wave 0 |
| TERM-01 | PTY output chunk forwarded as raw UTF-8 string (not JSON-wrapped) to WS clients | unit | `npx jest --testPathPattern=session.ws.handler --runInBand` | Wave 0 |
| TERM-02 | `{"type":"input","data":"..."}` writes data to PTY via `pty.write()` | unit | `npx jest --testPathPattern=session.ws.handler --runInBand` | Wave 0 |
| TERM-02 | Input message with session status='exited' does NOT call pty.write() | unit | `npx jest --testPathPattern=session.ws.handler --runInBand` | Wave 0 |
| TERM-03 | `{"type":"resize","cols":120,"rows":40}` calls `pty.resize(120, 40)` | unit | `npx jest --testPathPattern=session.ws.handler --runInBand` | Wave 0 |
| TERM-03 | Resize message with session status='exited' does NOT call pty.resize() | unit | `npx jest --testPathPattern=session.ws.handler --runInBand` | Wave 0 |
| AUTH-03 (carried) | WS upgrade without ?token rejected 401 | integration | `npx jest --testPathPattern=ws.upgrade --runInBand` | Exists (Phase 1) |
| AUTH-03 (new) | WS upgrade to /sessions/:id/ws with valid token + valid session completes handshake | integration | `npx jest --testPathPattern=ws.upgrade --runInBand` | Update Phase 1 file |

### Test Implementation Notes

**For integration tests (superwstest):** superwstest wraps an `http.Server` (not just an Express app), so test setup must create the real HTTP server with `attachWebSocketBridge` attached — matching the production `server.ts` pattern.

**Mock shape for node-pty in Phase 2 tests:** The Phase 1 mock at `tests/__mocks__/node-pty.ts` must be extended to support:
- `onData` returning an `IDisposable` (an object with `dispose: jest.fn()`)
- `onExit` returning an `IDisposable` (same)
- `write: jest.fn()`
- `resize: jest.fn()`
- A way to trigger the `onData` and `onExit` callbacks from tests (store the listener and call it manually)

Example mock extension:
```typescript
// tests/__mocks__/node-pty.ts — Phase 2 additions
export function makeMockPty() {
  let dataListener: ((data: string) => void) | null = null;
  let exitListener: ((e: { exitCode: number }) => void) | null = null;
  return {
    pid: 12345,
    kill: jest.fn(),
    write: jest.fn(),
    resize: jest.fn(),
    onData: jest.fn((listener: (data: string) => void) => {
      dataListener = listener;
      return { dispose: jest.fn() };
    }),
    onExit: jest.fn((listener: (e: { exitCode: number }) => void) => {
      exitListener = listener;
      return { dispose: jest.fn() };
    }),
    // Test helper — simulate PTY output
    _emitData(chunk: string) { dataListener?.(chunk); },
    // Test helper — simulate PTY exit
    _emitExit(exitCode: number) { exitListener?.({ exitCode }); },
  };
}
```

### Sampling Rate
- **Per task commit:** `npx jest --testPathPattern=(session.ws|ring.buffer) --passWithNoTests --runInBand`
- **Per wave merge:** `npx jest --runInBand`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/session.ws.handler.test.ts` — unit tests for handleSessionConnection, initSessionBroadcast (TERM-01, TERM-02, TERM-03, SESS-03, SESS-05)
- [ ] `tests/session.ws.integration.test.ts` — superwstest integration tests for full WS connect/replay/exit cycle (SESS-03, SESS-05)
- [ ] `tests/__mocks__/node-pty.ts` — update existing mock to add `_emitData`, `_emitExit` helpers and IDisposable returns for `onData`/`onExit`
- [ ] `npm install --save-dev superwstest` — superwstest not yet installed

*(All other test infrastructure — jest.config.ts, ts-jest, existing mocks — was created in Phase 1 Wave 0)*

---

## Sources

### Primary (HIGH confidence)
- [ws 8.x README — websockets/ws GitHub](https://github.com/websockets/ws/blob/master/README.md) — noServer pattern, handleUpgrade signature, broadcast pattern, ping/pong keepalive
- [ws 8.x API docs — websockets/ws doc/ws.md](https://github.com/websockets/ws/blob/master/doc/ws.md) — WebSocketServer constructor options, ws.send(), ws.close() vs ws.terminate(), readyState constants
- [node-pty 1.1.0 typings — microsoft/node-pty](https://github.com/microsoft/node-pty/blob/main/typings/node-pty.d.ts) — IPty.onData (IEvent<string>), IPty.onExit (IEvent<{exitCode, signal}>), IDisposable, resize(), write(), kill()
- npm registry — ws 8.20.0 (2026-03-21), node-pty 1.1.0 (2026-03-12), superwstest 2.1.1 — versions confirmed 2026-04-01

### Secondary (MEDIUM confidence)
- [xterm.js flow control guide — xtermjs.org](https://xtermjs.org/docs/guides/flowcontrol/) — confirmed flow control is a known concern; concluded v1 does not require it (personal tool, not high-throughput CI)
- [WebSocket memory leak patterns — oneuptime.com](https://oneuptime.com/blog/post/2026-01-24-websocket-memory-leak-issues/view) — named handler removal pattern; confirmed double cleanup (close + error)
- [node-pty IDisposable discussion — microsoft/node-pty #612](https://github.com/microsoft/node-pty/discussions/612) — confirmed multiple onData listeners are supported via IDisposable pattern

### Tertiary (LOW confidence)
- WebSearch results for superwstest testing patterns — library docs provide authoritative guidance; WebSearch results were supplementary

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — ws 8.20.0 and node-pty 1.1.0 versions confirmed against npm registry; no new production dependencies needed
- Architecture: HIGH — handleUpgrade pattern from official ws README; IDisposable from official node-pty typings; protocol from locked CONTEXT.md decisions
- Pitfalls: HIGH (listener accumulation, ping interval leak, concurrent client Set) — confirmed from official docs and recent authoritative sources

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable ecosystem; ws and node-pty have slow release cadence)
