import * as pty from 'node-pty';
import { v4 as uuidv4 } from 'uuid';
import { SessionRecord, toListItem, SessionListItem } from './session.types';

// Singleton registry — PTY lifetime is owned here, not by any request handler.
// Module-level Map persists for the lifetime of the Node process (implements SESS-02).
// Sessions are never removed from the Map — status transitions to 'exited' on process exit.
export const registry = new Map<string, SessionRecord>();

/**
 * Spawn a new PTY session running the claude command (or CLAUDE_CMD env override).
 * The session is stored in registry before this function returns.
 *
 * cwd: Working directory for the spawned process — required, provided by API caller.
 */
export function createSession(cwd: string): SessionRecord {
  const id = uuidv4();
  const claudeCmd = process.env.CLAUDE_CMD ?? 'claude';

  // Sanitized env — inherited env MUST be cleaned before passing to PTY spawn.
  // SSH vars cause Claude Code detectTerminal() to return 'ssh-session' fallback.
  // CI flag triggers CI/CD detection path in Claude Code.
  // CLAUDE_CONFIG_DIR must be per-session to prevent concurrent session transcript corruption.
  const spawnEnv = { ...process.env } as Record<string, string>;
  delete spawnEnv['SSH_TTY'];
  delete spawnEnv['SSH_CONNECTION'];
  delete spawnEnv['SSH_CLIENT'];
  delete spawnEnv['CI'];
  spawnEnv['TERM'] = 'xterm-256color';
  spawnEnv['COLORTERM'] = 'truecolor';
  spawnEnv['CLAUDE_CONFIG_DIR'] = `/tmp/claude-sessions/${id}`;

  const ptyProcess = pty.spawn(claudeCmd, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd,
    env: spawnEnv,
  });

  const record: SessionRecord = {
    id,
    pid: ptyProcess.pid,
    pty: ptyProcess,
    cwd,
    createdAt: new Date(),
    status: 'running',
  };

  // Register BEFORE returning — PTY is owned by registry from this point forward.
  registry.set(id, record);

  // Update status in-place on exit; do NOT delete from Map.
  // Phase 2 needs to inspect exited sessions (for reconnect decisions).
  ptyProcess.onExit(() => {
    record.status = 'exited';
  });

  return record;
}

/**
 * Retrieve a session by ID. Returns undefined if not found.
 */
export function getSession(id: string): SessionRecord | undefined {
  return registry.get(id);
}

/**
 * Kill a session with SIGTERM, followed by SIGKILL after 5 seconds if still running.
 * Returns false if session not found or already exited.
 */
export function killSession(id: string): boolean {
  const record = registry.get(id);
  if (!record || record.status === 'exited') return false;

  record.pty.kill('SIGTERM');

  // Fallback: SIGKILL after 5s if SIGTERM was ignored by the process
  setTimeout(() => {
    if (record.status !== 'exited') {
      record.pty.kill('SIGKILL');
    }
  }, 5000);

  return true;
}

/**
 * List all sessions (including exited). API responses use toListItem() to strip the pty object.
 */
export function listSessions(): SessionListItem[] {
  return Array.from(registry.values()).map(toListItem);
}

/**
 * Clear registry — test helper only. Do NOT call in production code.
 */
export function _clearRegistryForTests(): void {
  registry.clear();
}
