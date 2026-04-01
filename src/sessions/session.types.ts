import type * as pty from 'node-pty';

/**
 * Internal registry record — includes the pty object for Phase 2 I/O piping.
 * Shape locked in CONTEXT.md: { id, pid, pty, cwd, createdAt, status }
 * Phase 2 (02-02) will extend this with buffer and clients fields — keep extensible.
 */
export interface SessionRecord {
  id: string;
  pid: number;
  pty: pty.IPty;
  cwd: string;
  createdAt: Date;
  status: 'running' | 'exited';
}

/**
 * External API response shape — pty object omitted (not JSON-serializable).
 * Used in GET /sessions and POST /sessions responses.
 */
export interface SessionListItem {
  id: string;
  pid: number;
  cwd: string;
  createdAt: string; // ISO 8601 string for JSON serialization
  status: 'running' | 'exited';
}

/**
 * Convert a SessionRecord to its API-safe representation.
 */
export function toListItem(record: SessionRecord): SessionListItem {
  return {
    id: record.id,
    pid: record.pid,
    cwd: record.cwd,
    createdAt: record.createdAt.toISOString(),
    status: record.status,
  };
}
