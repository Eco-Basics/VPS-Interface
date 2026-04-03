import {
  createSession,
  getSession,
  killSession,
  listSessions,
  _clearRegistryForTests,
} from '../src/sessions/session.registry';
import { spawn as mockSpawn, makeMockPty, getMockPtyInstance } from './__mocks__/node-pty';
import type { SessionListItem } from '../src/sessions/session.types';

// node-pty is mocked via jest.config.ts moduleNameMapper — no jest.mock() needed

beforeEach(() => {
  _clearRegistryForTests();
  jest.clearAllMocks();
  jest.useFakeTimers();
  // Reset spawn to return a fresh mock pty each call
  (mockSpawn as jest.Mock).mockImplementation(() => makeMockPty());
});

afterEach(() => {
  jest.useRealTimers();
});

describe('createSession', () => {
  test('SESS-01: returns SessionRecord with id matching UUID v4 pattern', () => {
    const record = createSession('/home/user/project');
    expect(record.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  test('SESS-02: returns SessionRecord with pid from pty.pid', () => {
    const record = createSession('/home/user/project');
    expect(record.pid).toBe(12345);
  });

  test('SESS-02: returns SessionRecord with status === running', () => {
    const record = createSession('/home/user/project');
    expect(record.status).toBe('running');
  });

  test('SESS-02: session is stored in registry Map after creation (same reference)', () => {
    const record = createSession('/home/user/project');
    const retrieved = getSession(record.id);
    expect(retrieved).toBe(record); // same reference
  });

  test('SESS-02: registry.has(record.id) === true after createSession', () => {
    const record = createSession('/home/user/project');
    // getSession returning the record proves registry.has(id) is true
    expect(getSession(record.id)).toBeDefined();
  });

  test('SESS-04: two createSession calls return distinct UUIDs, both status=running', () => {
    const r1 = createSession('/home/user/project1');
    const r2 = createSession('/home/user/project2');
    expect(r1.id).not.toBe(r2.id);
    expect(r1.status).toBe('running');
    expect(r2.status).toBe('running');
  });

  test('SESS-02: pty object stored in registry is same reference as returned record', () => {
    const record = createSession('/home/user/project');
    const retrieved = getSession(record.id)!;
    expect(retrieved.pty).toBe(record.pty);
  });
});

describe('killSession', () => {
  test('calls pty.kill to terminate the process', () => {
    const record = createSession('/home/user/project');
    const mockPty = record.pty as unknown as ReturnType<typeof makeMockPty>;
    killSession(record.id);
    expect(mockPty.kill).toHaveBeenCalled();
  });

  test('returns true for a running session', () => {
    const record = createSession('/home/user/project');
    expect(killSession(record.id)).toBe(true);
  });

  test('on non-Windows: schedules SIGKILL after 5000ms if process has not exited', () => {
    if (process.platform === 'win32') return; // Windows uses kill() without signals
    const record = createSession('/home/user/project');
    const mockPty = record.pty as unknown as ReturnType<typeof makeMockPty>;
    killSession(record.id);
    // record.status is still 'running' (onExit not called)
    jest.advanceTimersByTime(5001);
    expect(mockPty.kill).toHaveBeenCalledWith('SIGKILL');
  });

  test('on non-Windows: does NOT call SIGKILL if process exited before timeout', () => {
    if (process.platform === 'win32') return; // Windows uses kill() without signals
    const record = createSession('/home/user/project');
    const mockPty = record.pty as unknown as ReturnType<typeof makeMockPty>;
    killSession(record.id);
    record.status = 'exited'; // simulate onExit fired
    jest.advanceTimersByTime(5001);
    expect(mockPty.kill).not.toHaveBeenCalledWith('SIGKILL');
  });

  test('returns false for unknown session id', () => {
    expect(killSession('00000000-0000-0000-0000-000000000000')).toBe(false);
  });

  test('returns false for already-exited session', () => {
    const record = createSession('/home/user/project');
    record.status = 'exited';
    expect(killSession(record.id)).toBe(false);
  });
});

describe('listSessions', () => {
  test('returns all sessions including exited ones', () => {
    const r1 = createSession('/home/user/p1');
    const r2 = createSession('/home/user/p2');
    r2.status = 'exited';
    const list = listSessions();
    expect(list).toHaveLength(2);
    expect(list.find((s: SessionListItem) => s.id === r1.id)?.status).toBe('running');
    expect(list.find((s: SessionListItem) => s.id === r2.id)?.status).toBe('exited');
  });

  test('list items do not contain pty property (API-safe)', () => {
    createSession('/home/user/project');
    const list = listSessions();
    expect(list[0]).not.toHaveProperty('pty');
  });
});

describe('Phase 2: ring buffer and client tracking', () => {
  test('SESS-03: createSession initializes buffer as an empty array', () => {
    const record = createSession('/home/user/project');
    expect(record.buffer).toBeDefined();
    expect(Array.isArray(record.buffer)).toBe(true);
    expect(record.buffer).toHaveLength(0);
  });

  test('SESS-03: createSession initializes clients as a Set', () => {
    const record = createSession('/home/user/project');
    expect(record.clients).toBeDefined();
    expect(record.clients).toBeInstanceOf(Set);
    expect(record.clients.size).toBe(0);
  });

  test('SESS-05: buffer is populated when mock PTY emits data', () => {
    const record = createSession('/home/user/project');
    const mockPty = getMockPtyInstance();
    mockPty._emitData('hello world');
    expect(record.buffer).toContain('hello world');
    expect(record.buffer).toHaveLength(1);
  });

  test('SESS-05: buffer evicts oldest entry after 1000 chunks (ring buffer cap)', () => {
    const record = createSession('/home/user/project');
    const mockPty = getMockPtyInstance();
    // Fill to 1000
    for (let i = 0; i < 1000; i++) {
      mockPty._emitData(`chunk-${i}`);
    }
    expect(record.buffer).toHaveLength(1000);
    // Push the 1001st — should evict chunk-0
    mockPty._emitData('chunk-1000');
    expect(record.buffer).toHaveLength(1000);
    expect(record.buffer[0]).toBe('chunk-1');
    expect(record.buffer[999]).toBe('chunk-1000');
  });

  test('TERM-01: PTY data is broadcast to connected clients', () => {
    const record = createSession('/home/user/project');
    const mockPty = getMockPtyInstance();
    const client = {
      OPEN: 1,
      readyState: 1,
      send: jest.fn(),
      close: jest.fn(),
    } as unknown as import('ws').WebSocket;
    record.clients.add(client);
    mockPty._emitData('output data');
    expect(client.send).toHaveBeenCalledWith('output data');
  });

  test('TERM-02: exit emits JSON payload with type and exitCode to connected clients', () => {
    const record = createSession('/home/user/project');
    const mockPty = getMockPtyInstance();
    const client = {
      OPEN: 1,
      readyState: 1,
      send: jest.fn(),
      close: jest.fn(),
    } as unknown as import('ws').WebSocket;
    record.clients.add(client);
    mockPty._emitExit(0);
    expect(client.send).toHaveBeenCalledWith(JSON.stringify({ type: 'exit', exitCode: 0 }));
  });

  test('TERM-03: exit closes all connected clients and clears clients set', () => {
    const record = createSession('/home/user/project');
    const mockPty = getMockPtyInstance();
    const client = {
      OPEN: 1,
      readyState: 1,
      send: jest.fn(),
      close: jest.fn(),
    } as unknown as import('ws').WebSocket;
    record.clients.add(client);
    mockPty._emitExit(1);
    expect(client.close).toHaveBeenCalled();
    expect(record.clients.size).toBe(0);
  });
});
