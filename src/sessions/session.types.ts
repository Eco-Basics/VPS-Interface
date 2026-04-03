import type * as pty from 'node-pty';
import type { WebSocket } from 'ws';

/**
 * Internal registry record — includes the pty object for Phase 2 I/O piping.
 * Phase 2 (02-02) adds buffer (ring buffer of PTY output) and clients (connected WS set).
 */
export interface SessionRecord {
  id: string;
  pid: number;
  pty: pty.IPty;
  cwd: string;
  command: string;
  createdAt: Date;
  status: 'running' | 'exited';
  /** Ring buffer of PTY output chunks, capped at 1000 entries for reconnect replay. */
  buffer: string[];
  /** Active WebSocket clients streaming this session. Owned by the registry. */
  clients: Set<WebSocket>;
}

/**
 * External API response shape — pty object omitted (not JSON-serializable).
 * Used in GET /sessions and POST /sessions responses.
 */
export interface SessionListItem {
  id: string;
  pid: number;
  cwd: string;
  command: string;
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
    command: record.command,
    createdAt: record.createdAt.toISOString(),
    status: record.status,
  };
}
