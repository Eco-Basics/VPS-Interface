# Phase 1: Backend Foundation - Research

**Researched:** 2026-03-31
**Domain:** Node.js HTTP server with JWT auth, bcrypt, node-pty PTY session registry
**Confidence:** HIGH (all core libraries verified against npm registry and official docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Single password login — password stored as bcrypt hash at server startup via `PASSWORD` env var (no config file to accidentally commit)
- JWT issued on successful login; 7-day expiry (personal tool, monthly re-auth would be disruptive)
- No refresh tokens — single JWT, re-login on expiry
- All HTTP endpoints and WebSocket upgrades require valid JWT (validated via `Authorization: Bearer <token>` header or `?token=` query param for WebSocket)
- JWT secret stored in `JWT_SECRET` env var
- Session ID: UUID v4 (standard, collision-free)
- Registry: in-memory `Map<sessionId, SessionRecord>` — intentionally in-memory for v1
- SessionRecord shape: `{ id, pid, pty, cwd, createdAt, status: 'running' | 'exited' }`
- Command: `claude` (assumes on PATH); configurable via `CLAUDE_CMD` env var for non-standard installs
- Default terminal dimensions: 80 cols × 24 rows; updated via resize endpoint
- PTY spawned with the server process's environment (inherits PATH, HOME, etc.)
- Working directory: provided by the API caller (required field — no default)
- API surface: POST /auth/login, POST /sessions, GET /sessions, DELETE /sessions/:id, WS upgrade auth check only (no bridge yet)

### Claude's Discretion
- Exact bcrypt cost factor (recommend 12)
- HTTP server framework choice (Express recommended — well-understood, minimal)
- Session list response shape beyond required fields
- Error response envelope format
- Logging verbosity

### Deferred Ideas (OUT OF SCOPE)
- Session registry persistence across server restarts — v2 RESIL-01
- Session TTL / idle timeout — v2 RESIL-02
- HTTPS termination — handled by Caddy reverse proxy (infrastructure concern, not backend code)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can log in with a password from any browser | bcrypt compare + jsonwebtoken sign pattern documented |
| AUTH-02 | JWT persists across browser refresh (stored client-side) | JWT returned in login response body; client stores in localStorage; 7-day expiry confirmed safe |
| AUTH-03 | All HTTP endpoints and WebSocket connections require a valid JWT | Express middleware pattern + ws `upgrade` event interception documented |
| SESS-01 | User can spawn a Claude Code session in a specified VPS directory | node-pty spawn API verified; `cwd` option confirmed |
| SESS-02 | Session survives browser close — Claude process keeps running server-side | PTY owned by Map registry, not WS handler; onExit updates status only |
| SESS-04 | User can run multiple concurrent sessions simultaneously | Map registry supports arbitrary concurrent sessions; node-pty is not thread-safe but single-threaded Node event loop is safe |
</phase_requirements>

---

## Summary

This phase builds a secured Node.js HTTP server from scratch (greenfield — no existing `package.json`). The two primary technical problems are: (1) a standard JWT + bcrypt authentication flow on Express, and (2) a PTY session registry using `node-pty` that owns the process lifecycle independently of any client connection.

The authentication pattern is well-established and low-risk. The node-pty integration is the higher-risk piece — it is a native C++ module requiring compilation at install time (`node-gyp`), and the VPS must have `build-essential`, `python3`, and `make` installed. Session lifetime must be owned by the registry Map, not by any request handler, so Claude processes continue running after the API client disconnects.

The test strategy uses Jest + Supertest for HTTP integration tests and mocked node-pty for unit tests of session logic. All five phase success criteria can be verified with `curl` plus `ps aux` on the VPS.

**Primary recommendation:** Express + jsonwebtoken + bcrypt + node-pty + uuid, with app/server separation from day one for testability. Install `build-essential` on the VPS before `npm install`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| express | 5.2.1 | HTTP routing and middleware | Industry default; well-understood; minimal; discretion confirmed in CONTEXT.md |
| jsonwebtoken | 9.0.3 | JWT sign/verify | Auth0-maintained; most-used JWT library in Node ecosystem |
| bcrypt | 6.0.0 | Password hashing with cost factor | Native bcrypt (not bcryptjs); faster on server hardware |
| node-pty | 1.1.0 | PTY spawning and management | Microsoft-maintained; only production-ready PTY library for Node; required by PROJECT.md |
| uuid | 13.0.0 | Session ID generation (v4) | Standard per CONTEXT.md decisions |
| ws | 8.20.0 | WebSocket server (upgrade auth check) | Raw WebSocket per PROJECT.md; no socket.io abstraction needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dotenv | (latest) | Load .env into process.env for dev | Development only; production uses actual env vars |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| express | fastify | Fastify is faster but Express is discretion choice; Express middleware ecosystem is more familiar |
| bcrypt | bcryptjs | bcryptjs is pure JS (no native build) — safer install, but slower; use if node-gyp is problematic on target VPS |
| jsonwebtoken | jose | jose is the modern spec-compliant library; jsonwebtoken 9.x is well-supported and simpler |

**Installation:**
```bash
npm init -y
npm install express jsonwebtoken bcrypt node-pty uuid ws
npm install --save-dev jest supertest @types/jest ts-jest typescript @types/node @types/express @types/ws @types/uuid
```

**Version verification (confirmed 2026-03-31):**
- express: 5.2.1 (published 2026-03-28)
- jsonwebtoken: 9.0.3 (published 2026-03-13)
- bcrypt: 6.0.0 (published 2026-03-28)
- node-pty: 1.1.0 (published 2026-03-12)
- uuid: 13.0.0 (latest)
- ws: 8.20.0 (published 2026-03-21)
- jest: 30.3.0
- supertest: 7.2.2

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app.ts              # Express app factory — exported without .listen()
├── server.ts           # Entry point — calls app.listen()
├── auth/
│   ├── auth.router.ts  # POST /auth/login route
│   └── auth.middleware.ts  # JWT validation middleware
├── sessions/
│   ├── session.registry.ts  # Map<string, SessionRecord> — singleton
│   ├── session.router.ts    # POST/GET/DELETE /sessions routes
│   └── session.types.ts     # SessionRecord interface
└── ws/
    └── ws.upgrade.ts   # WebSocket upgrade auth interceptor (Phase 1: reject unauthed only)
```

**Why app/server separation matters:** Supertest needs to import `app` without binding a port. If `app.listen()` is in `app.ts`, tests will conflict or bind ports. Export `app` from `app.ts`; call `app.listen()` only in `server.ts`.

### Pattern 1: JWT Middleware
**What:** Express middleware that validates `Authorization: Bearer <token>` on every protected route.
**When to use:** Applied to all routes except `POST /auth/login`.

```typescript
// Source: jsonwebtoken 9.x npm docs + standard Express middleware pattern
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    // Attach payload to req if needed downstream
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

### Pattern 2: Login Route with bcrypt
**What:** Hash the `PASSWORD` env var once at startup; compare on every login attempt.
**When to use:** Server startup precomputes the hash; the route handler compares at login time.

```typescript
// Source: bcrypt 6.x npm docs
import bcrypt from 'bcrypt';

// At server startup (server.ts)
const BCRYPT_ROUNDS = 12;
export const passwordHash = await bcrypt.hash(process.env.PASSWORD!, BCRYPT_ROUNDS);

// In auth router
router.post('/auth/login', async (req, res) => {
  const { password } = req.body;
  const valid = await bcrypt.compare(password, passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid password' });
  const token = jwt.sign({}, process.env.JWT_SECRET!, { expiresIn: '7d' });
  res.json({ token });
});
```

### Pattern 3: PTY Session Registry
**What:** Singleton `Map<string, SessionRecord>` that owns the PTY lifetime.
**When to use:** All session creation, listing, and deletion goes through this registry.

```typescript
// Source: node-pty 1.1.0 README + IPty interface
import * as pty from 'node-pty';
import { v4 as uuidv4 } from 'uuid';

interface SessionRecord {
  id: string;
  pid: number;
  pty: pty.IPty;
  cwd: string;
  createdAt: Date;
  status: 'running' | 'exited';
}

const sessions = new Map<string, SessionRecord>();

export function createSession(cwd: string): SessionRecord {
  const id = uuidv4();
  const claudeCmd = process.env.CLAUDE_CMD ?? 'claude';
  const ptyProcess = pty.spawn(claudeCmd, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd,
    env: process.env as Record<string, string>,
  });

  const record: SessionRecord = {
    id,
    pid: ptyProcess.pid,
    pty: ptyProcess,
    cwd,
    createdAt: new Date(),
    status: 'running',
  };

  ptyProcess.onExit(() => {
    // Update status in place; do NOT delete from map (Phase 2 needs to inspect exited sessions)
    record.status = 'exited';
  });

  sessions.set(id, record);
  return record;
}

export function killSession(id: string, signal: NodeJS.Signals = 'SIGTERM'): boolean {
  const record = sessions.get(id);
  if (!record || record.status === 'exited') return false;
  record.pty.kill(signal);
  // SIGKILL fallback after 5s
  if (signal === 'SIGTERM') {
    setTimeout(() => {
      if (record.status !== 'exited') record.pty.kill('SIGKILL');
    }, 5000);
  }
  return true;
}
```

### Pattern 4: WebSocket Upgrade Auth Check
**What:** Intercept the `upgrade` event on the raw HTTP server; validate JWT before completing the upgrade. Phase 1 only rejects unauthenticated upgrades — no actual WS bridge yet.

```typescript
// Source: ws 8.x README (upgrade event interception pattern)
import http from 'http';
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { parse } from 'url';

const wss = new WebSocketServer({ noServer: true });
const server = http.createServer(app);

server.on('upgrade', (req, socket, head) => {
  const { query } = parse(req.url ?? '', true);
  const token = query.token as string | undefined;
  try {
    jwt.verify(token ?? '', process.env.JWT_SECRET!);
    // Phase 2 will actually handle this upgrade
    // For Phase 1: reject all upgrades after auth check (no bridge yet)
    socket.write('HTTP/1.1 501 Not Implemented\r\n\r\n');
    socket.destroy();
  } catch {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
  }
});
```

**Note for Phase 1:** The 501 response is intentional — authenticated upgrades are technically valid but not yet handled. This lets Phase 2 simply swap 501 → `wss.handleUpgrade(...)`.

### Anti-Patterns to Avoid
- **Owning the PTY in the request handler:** If the PTY is created inside a route handler and only referenced via a local variable (not the registry), it will be garbage-collected or orphaned when the request ends. Always register in the Map before returning the response.
- **Calling `app.listen()` in `app.ts`:** Blocks Supertest from importing the app without starting a server. Keep `app.ts` as a pure factory.
- **Hash the password on every login request:** `bcrypt.hash` is intentionally slow. Pre-hash once at startup and compare with `bcrypt.compare` on each login.
- **Storing `JWT_SECRET` as a short string:** For a personal tool this is low-risk, but a random 64-char hex string eliminates brute-force risk entirely. Note this in .env.example.
- **Using `pty.kill()` without a SIGKILL fallback:** SIGTERM can be ignored by the child process (e.g., Claude in an interactive state). Always schedule a SIGKILL fallback timer that cancels on `onExit`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT generation and validation | Custom token signing | `jsonwebtoken` | Handles signing algorithms, expiry, timing-safe comparison |
| Password hashing | Custom hash or MD5 | `bcrypt` | Adaptive cost factor, salting, rainbow-table resistance |
| PTY process management | `child_process.spawn` with pipes | `node-pty` | Pipes break interactive prompts; PTY required for ANSI, resize, interactive menus |
| UUID generation | `Math.random()` string | `uuid` v4 | Cryptographically random, collision probability is negligible |
| HTTP integration tests | Manual `http.request` in tests | `supertest` | Handles app lifecycle, port conflicts, response parsing |

**Key insight:** The PTY vs pipe distinction is load-bearing for this project. Claude Code uses interactive terminal features (diff rendering, approve/deny prompts, menus) that require a real PTY. Any pipe-based approach will produce garbled or broken output.

---

## Common Pitfalls

### Pitfall 1: node-pty Native Build Failure
**What goes wrong:** `npm install` fails with `node-gyp rebuild` errors, or the module installs but crashes at runtime.
**Why it happens:** `node-pty` is a native C++ module. VPS must have a C compiler toolchain and Python 3.
**How to avoid:** Before running `npm install`, verify the VPS has: `build-essential` (or `gcc`, `g++`, `make`), `python3`. Install with: `sudo apt-get install -y build-essential python3`
**Warning signs:** Error messages containing `gyp ERR!`, `make: not found`, `python: not found`, or `Cannot find module './build/Release/pty.node'`.

### Pitfall 2: PTY Not Thread-Safe
**What goes wrong:** If ever moved to worker threads or forked processes, node-pty will crash unpredictably.
**Why it happens:** The underlying C library is not re-entrant.
**How to avoid:** Keep all PTY operations on the main Node.js thread. The single-threaded event loop model used here is safe.
**Warning signs:** Only relevant if adding worker threads in future phases.

### Pitfall 3: `pty.kill()` Signal Ignored
**What goes wrong:** `DELETE /sessions/:id` returns 200 but the Claude process remains in `ps aux` indefinitely.
**Why it happens:** Claude may be mid-interaction (waiting for user input). SIGTERM may be handled or deferred.
**How to avoid:** Implement SIGTERM + 5s timeout + SIGKILL fallback as shown in the kill pattern above.
**Warning signs:** `ps aux | grep claude` shows process after DELETE with status still `'running'`.

### Pitfall 4: JWT Secret Undefined at Runtime
**What goes wrong:** `jwt.sign` or `jwt.verify` throws `secretOrPrivateKey must have a value`.
**Why it happens:** `JWT_SECRET` env var not set; `process.env.JWT_SECRET` is `undefined`; using `!` non-null assertion bypasses TypeScript check.
**How to avoid:** Add a startup validation that checks all required env vars (`PASSWORD`, `JWT_SECRET`) and exits with a clear error if missing.
**Warning signs:** `Error: secretOrPrivateKey must have a value` in server logs.

### Pitfall 5: WebSocket Auth via Custom Headers (Browser Limitation)
**What goes wrong:** The browser's `WebSocket()` constructor does not support custom headers — `Authorization: Bearer` cannot be sent on the initial upgrade request.
**Why it happens:** WebSocket API standard does not expose header control.
**How to avoid:** Use `?token=<jwt>` query parameter for WebSocket auth (already decided in CONTEXT.md). This is the standard workaround for browser-based WebSocket JWT auth.
**Warning signs:** If someone designs the WS auth to require an Authorization header from the browser client, it will silently fail in production.

### Pitfall 6: PORT / Server Already Listening in Tests
**What goes wrong:** Tests fail with `EADDRINUSE` because `app.ts` calls `listen()` when imported.
**Why it happens:** No app/server separation.
**How to avoid:** `app.ts` exports the Express `app` object only. `server.ts` imports it and calls `app.listen(PORT)`. Supertest imports only `app.ts`.
**Warning signs:** `Error: listen EADDRINUSE: address already in use :::3000` during `npm test`.

---

## Code Examples

### Startup Env Validation
```typescript
// Source: standard Node.js pattern for required env vars
const REQUIRED_ENV = ['PASSWORD', 'JWT_SECRET'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}
```

### Session List Response Shape (beyond required fields)
```typescript
// Discretion area — recommended shape
interface SessionListItem {
  id: string;
  pid: number;
  cwd: string;
  createdAt: string;  // ISO 8601
  status: 'running' | 'exited';
}
// Note: omit `pty` object from response (not serializable)
```

### Error Response Envelope
```typescript
// Discretion area — recommended consistent shape
res.status(400).json({ error: 'Human-readable error message' });
// Always use `error` key; never include stack traces in responses
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Express 4 + body-parser separate | Express 5 has `express.json()` built-in | Express 5.x | One fewer install; `express.json()` sufficient |
| `jwt.sign` with no algorithm specified | Always specify `algorithms` in verify | jsonwebtoken 9.x security guidance | Prevents algorithm downgrade attacks |
| bcrypt cost factor 10 (default) | Cost factor 12+ recommended for 2025 | Hardware advancement | 10 is now considered below minimum |

**Deprecated/outdated:**
- `node-pty` `on('data')` event style: Replaced by `.onData()` callback API in v0.9.0 — prefer `.onData()` for TypeScript type safety.
- `experimentalUseConpty`: Removed in favor of `useConpty` (ConPTY on Windows only; irrelevant for Linux VPS).

---

## Open Questions

1. **TypeScript vs plain JavaScript**
   - What we know: CONTEXT.md does not specify; PROJECT.md says Node.js backend
   - What's unclear: Whether to use TypeScript for the backend
   - Recommendation: Use TypeScript. The `SessionRecord` interface and IPty types from node-pty make type safety valuable here. ts-jest + ts-node make it low-overhead.

2. **Express 5 vs Express 4**
   - What we know: Current latest is 5.2.1 (published 2026-03-28); Express 5 has async error handling built-in
   - What's unclear: Whether any middleware has Express 5 compatibility issues
   - Recommendation: Use Express 5. It is now stable and current. Async route errors are handled automatically (no need for `try/catch` in every route handler).

3. **bcrypt vs bcryptjs for VPS build reliability**
   - What we know: `bcrypt` (native) is faster; `bcryptjs` (pure JS) requires no compilation
   - What's unclear: Whether the VPS has build-essential already installed
   - Recommendation: Default to `bcrypt` (better performance at cost factor 12). Document `bcryptjs` as a drop-in fallback if node-gyp fails.

---

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30.3.0 + Supertest 7.2.2 + ts-jest 29.4.6 |
| Config file | `jest.config.ts` — Wave 0 gap (does not exist yet) |
| Quick run command | `npx jest --testPathPattern=auth --passWithNoTests` |
| Full suite command | `npx jest --runInBand` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | POST /auth/login with correct password returns 200 + token | integration | `npx jest --testPathPattern=auth.router` | Wave 0 |
| AUTH-01 | POST /auth/login with wrong password returns 401 | integration | `npx jest --testPathPattern=auth.router` | Wave 0 |
| AUTH-02 | JWT payload + 7-day expiry is present in login response | integration | `npx jest --testPathPattern=auth.router` | Wave 0 |
| AUTH-03 | GET /sessions without token returns 401 | integration | `npx jest --testPathPattern=session.router` | Wave 0 |
| AUTH-03 | GET /sessions with valid token returns 200 | integration | `npx jest --testPathPattern=session.router` | Wave 0 |
| AUTH-03 | WS upgrade without token: connection closed with 401 | integration | `npx jest --testPathPattern=ws.upgrade` | Wave 0 |
| AUTH-03 | WS upgrade with valid token: not rejected with 401 (501 or upgrade) | integration | `npx jest --testPathPattern=ws.upgrade` | Wave 0 |
| SESS-01 | POST /sessions with valid cwd returns 201 + sessionId + pid | integration (mocked pty) | `npx jest --testPathPattern=session.router` | Wave 0 |
| SESS-01 | POST /sessions with missing cwd returns 400 | integration | `npx jest --testPathPattern=session.router` | Wave 0 |
| SESS-02 | Session record in registry after client request ends (process not killed) | unit | `npx jest --testPathPattern=session.registry` | Wave 0 |
| SESS-04 | POST /sessions twice yields two distinct session IDs, both status=running | integration (mocked pty) | `npx jest --testPathPattern=session.router` | Wave 0 |

**Note on PTY mocking:** Tests that invoke session creation MUST mock `node-pty` to avoid spawning real `claude` processes in CI. Use `jest.mock('node-pty')` with a mock that returns a stub `IPty` object including `pid`, `onData`, `onExit`, `kill`, `write`, `resize`.

### Sampling Rate
- **Per task commit:** `npx jest --testPathPattern=(auth|session.registry) --passWithNoTests`
- **Per wave merge:** `npx jest --runInBand`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps (must be created before implementation)
- [ ] `package.json` — `npm init` + install all dependencies
- [ ] `tsconfig.json` — TypeScript config targeting Node 20+
- [ ] `jest.config.ts` — ts-jest preset, node environment
- [ ] `tests/auth.router.test.ts` — covers AUTH-01, AUTH-02, AUTH-03 (HTTP)
- [ ] `tests/session.router.test.ts` — covers SESS-01, SESS-04, AUTH-03 (sessions endpoints)
- [ ] `tests/session.registry.test.ts` — covers SESS-02 (unit, no HTTP)
- [ ] `tests/ws.upgrade.test.ts` — covers AUTH-03 (WebSocket upgrade rejection)
- [ ] `tests/__mocks__/node-pty.ts` — manual mock for node-pty to avoid real process spawning

---

## Sources

### Primary (HIGH confidence)
- [npm: node-pty 1.1.0](https://www.npmjs.com/package/node-pty) — version confirmed 2026-03-12; spawn API, IPty interface
- [GitHub: microsoft/node-pty README](https://github.com/microsoft/node-pty/blob/main/README.md) — spawn options, onData, resize, kill, Linux requirements
- [npm: jsonwebtoken 9.0.3](https://www.npmjs.com/package/jsonwebtoken) — version confirmed 2026-03-13
- [npm: bcrypt 6.0.0](https://www.npmjs.com/package/bcrypt) — version confirmed 2026-03-28
- [npm: express 5.2.1](https://www.npmjs.com/package/express) — version confirmed 2026-03-28
- [npm: ws 8.20.0](https://www.npmjs.com/package/ws) — version confirmed 2026-03-21
- [npm: uuid 13.0.0](https://www.npmjs.com/package/uuid) — version confirmed
- [npm: jest 30.3.0](https://www.npmjs.com/package/jest) — version confirmed
- [npm: supertest 7.2.2](https://www.npmjs.com/package/supertest) — version confirmed

### Secondary (MEDIUM confidence)
- [jsDocs.io: node-pty@1.1.0](https://www.jsdocs.io/package/node-pty) — IPty interface member documentation, confirmed against README
- [WebSocket authentication guide — websocket.org](https://websocket.org/guides/security/) — confirmed browsers cannot set custom headers on WS handshake; query param is standard workaround
- [DEV Community: bcrypt cost factor 2025](https://dev.to/nesniv/understanding-bcrypts-work-factor-and-choosing-the-right-value-103m) — cost factor 12 as new minimum; < 500ms on modern hardware
- [Express/Supertest app separation pattern](https://www.sammeechward.com/testing-an-express-app-with-supertest-and-jest) — app.ts / server.ts separation verified pattern

### Tertiary (LOW confidence)
- WebSearch results for node-gyp Linux pitfalls — general pattern; VPS-specific behavior may vary

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all package versions verified against npm registry as of 2026-03-31
- Architecture: HIGH — all patterns verified against official library documentation
- Pitfalls: HIGH (PTY, auth, env validation) / MEDIUM (node-gyp specifics depend on VPS OS version)

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable ecosystem; unlikely to shift in 30 days)
