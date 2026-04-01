import {
  createSession,
  getSession,
  killSession,
  listSessions,
  _clearRegistryForTests,
} from '../src/sessions/session.registry';
import { spawn as mockSpawn, makeMockPty } from './__mocks__/node-pty';
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
  test('calls pty.kill with SIGTERM', () => {
    const record = createSession('/home/user/project');
    const mockPty = record.pty as ReturnType<typeof makeMockPty>;
    killSession(record.id);
    expect(mockPty.kill).toHaveBeenCalledWith('SIGTERM');
  });

  test('returns true for a running session', () => {
    const record = createSession('/home/user/project');
    expect(killSession(record.id)).toBe(true);
  });

  test('schedules SIGKILL after 5000ms if process has not exited', () => {
    const record = createSession('/home/user/project');
    const mockPty = record.pty as ReturnType<typeof makeMockPty>;
    killSession(record.id);
    // record.status is still 'running' (onExit not called)
    jest.advanceTimersByTime(5001);
    expect(mockPty.kill).toHaveBeenCalledWith('SIGKILL');
  });

  test('does NOT call SIGKILL if process exited before timeout', () => {
    const record = createSession('/home/user/project');
    const mockPty = record.pty as ReturnType<typeof makeMockPty>;
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
