import { Router } from 'express';
import { createSession, getSession, killSession, listSessions } from './session.registry';
import { toListItem } from './session.types';

export const sessionRouter = Router();

// POST /sessions — spawn a new PTY session
sessionRouter.post('/', (req, res) => {
  const { cwd } = req.body as { cwd?: string };

  if (!cwd) {
    res.status(400).json({ error: 'cwd field is required' });
    return;
  }

  try {
    const record = createSession(cwd);
    res.status(201).json(toListItem(record));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to spawn session';
    res.status(500).json({ error: message });
  }
});

// GET /sessions — list all sessions (running and exited)
sessionRouter.get('/', (_req, res) => {
  res.json(listSessions());
});

// DELETE /sessions/:id — kill session with SIGTERM + SIGKILL fallback
sessionRouter.delete('/:id', (req, res) => {
  const { id } = req.params;

  if (!getSession(id)) {
    res.status(404).json({ error: `Session not found: ${id}` });
    return;
  }

  killSession(id);
  res.json({ message: `Session ${id} termination initiated` });
});
