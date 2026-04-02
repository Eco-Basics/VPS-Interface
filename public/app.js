'use strict';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const state = {
  token: localStorage.getItem('vps_jwt'),
  sessions: [],        // Array of session records — see shape below
  activeSessionId: null,
  nextSessionNumber: 1,
  sessionCounter: 0,   // Monotonically incrementing — never reuses numbers after tab close
};

// Session record shape (all fields present from creation):
// { id, label, status, ws, terminal, fitAddon, tabEl, wrapperEl, idleTimer }

// ---------------------------------------------------------------------------
// View helpers
// ---------------------------------------------------------------------------

function loadSavedDirs() {
  try {
    const raw = localStorage.getItem('vps_saved_dirs');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDirToStorage(dir) {
  const dirs = loadSavedDirs();
  if (!dirs.includes(dir)) {
    dirs.push(dir);
    localStorage.setItem('vps_saved_dirs', JSON.stringify(dirs));
  }
}

function removeSavedDir(dir) {
  const dirs = loadSavedDirs().filter((item) => item !== dir);
  localStorage.setItem('vps_saved_dirs', JSON.stringify(dirs));
}

function renderSavedDirs() {
  const dirs = loadSavedDirs();
  const listEl = document.getElementById('saved-dirs-list');
  listEl.innerHTML = dirs.map((dir) => `
    <div class="saved-dir-item" data-dir="${dir}">
      <span class="saved-dir-path">${dir}</span>
      <button type="button" class="launch-dir-btn" data-action="launch" data-dir="${dir}">Launch</button>
      <button type="button" class="remove-dir-btn" data-action="remove" data-dir="${dir}">Remove</button>
    </div>
  `).join('');
}

function showLogin() {
  document.getElementById('login-view').hidden = false;
  document.getElementById('terminal-view').hidden = true;
}

async function showTerminal() {
  document.getElementById('login-view').hidden = true;
  document.getElementById('terminal-view').hidden = false;

  const response = await apiFetch('/sessions');
  const sessions = await response.json().catch(() => []);

  document.getElementById('tab-list').innerHTML = '';
  document.getElementById('terminal-panels').innerHTML = '';
  state.sessions = [];

  sessions
    .filter((session) => session.status === 'running')
    .forEach((session) => {
      const record = createTab(session);
      connectWebSocket(record);
    });
}

function clearAuthAndRedirect() {
  localStorage.removeItem('vps_jwt');
  state.token = null;
  state.sessions = [];
  state.activeSessionId = null;
  showLogin();
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

async function apiFetch(path, options = {}) {
  const headers = Object.assign({}, options.headers || {});
  if (state.token) {
    headers['Authorization'] = 'Bearer ' + state.token;
  }
  if (options.body) {
    if (typeof options.body === 'object') {
      headers['Content-Type'] = 'application/json';
      options = Object.assign({}, options, {
        body: JSON.stringify(options.body),
      });
    } else if (typeof options.body === 'string' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  const res = await fetch(path, Object.assign({}, options, { headers }));

  if (res.status === 401) {
    clearAuthAndRedirect();
    throw new Error('Unauthorized — redirecting to login');
  }

  return res;
}

// ---------------------------------------------------------------------------
// WebSocket (implemented in plan 03-04)
// ---------------------------------------------------------------------------

function updateTabStatus(sessionId, status) {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) return;

  session.status = status;
  const dot = session.tabEl.querySelector('.status-dot');
  if (dot) {
    dot.className = `status-dot ${status}`;
  }
}

function connectWebSocket(session) {
  const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(
    `${wsProtocol}//${location.host}/sessions/${session.id}/ws?token=${encodeURIComponent(state.token)}`
  );

  session.ws = ws;

  ws.onopen = () => {
    updateTabStatus(session.id, 'running');
    session.fitAddon.fit();
    ws.send(JSON.stringify({
      type: 'resize',
      cols: session.terminal.cols,
      rows: session.terminal.rows,
    }));
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);

      if (message.type === 'output') {
        clearTimeout(session.idleTimer);
        session.terminal.write(message.data);
        updateTabStatus(session.id, 'running');
        session.idleTimer = setTimeout(() => updateTabStatus(session.id, 'idle'), 5000);
        return;
      }

      if (message.type === 'exit') {
        clearTimeout(session.idleTimer);
        session.idleTimer = null;
        updateTabStatus(session.id, 'exited');
        session.terminal.write(`\r\n[Session exited: ${message.exitCode ?? 'unknown'}]\r\n`);
        return;
      }
    } catch {
      clearTimeout(session.idleTimer);
      session.terminal.write(event.data);
      updateTabStatus(session.id, 'running');
      session.idleTimer = setTimeout(() => updateTabStatus(session.id, 'idle'), 5000);
    }
  };

  ws.onclose = () => {
    updateTabStatus(session.id, session.status === 'exited' ? 'exited' : 'idle');
  };

  session.terminal.onData((data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'input', data }));
    }
  });
}

// ---------------------------------------------------------------------------
// Resize propagation (debounced)
// ---------------------------------------------------------------------------

let resizeTimer = null;

window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const activeSession = state.sessions.find((item) => item.id === state.activeSessionId);
    if (!activeSession) return;

    activeSession.fitAddon.fit();

    if (activeSession.ws && activeSession.ws.readyState === WebSocket.OPEN) {
      activeSession.ws.send(JSON.stringify({
        type: 'resize',
        cols: activeSession.terminal.cols,
        rows: activeSession.terminal.rows,
      }));
    }
  }, 100);
});

// ---------------------------------------------------------------------------
// Mobile toolbar
// ---------------------------------------------------------------------------

document.getElementById('mobile-toolbar').addEventListener('click', (event) => {
  const button = event.target.closest('[data-key]');
  if (!button) return;

  const activeSession = state.sessions.find((item) => item.id === state.activeSessionId);
  if (!activeSession) return;

  const sequences = {
    'ctrl-c': '\x03',
    esc: '\x1b',
    tab: '\t',
    up: '\x1b[A',
    down: '\x1b[B',
  };

  if (button.dataset.key === 'keyboard') {
    activeSession.terminal.textarea?.focus();
    return;
  }

  if (button.dataset.key === 'copy') {
    // Use existing selection if any, otherwise select all visible content
    let text = activeSession.terminal.getSelection();
    if (!text) {
      activeSession.terminal.selectAll();
      text = activeSession.terminal.getSelection();
      activeSession.terminal.clearSelection();
    }
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        const orig = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => { button.textContent = orig; }, 1200);
      }).catch(() => {
        button.textContent = 'Failed';
        setTimeout(() => { button.textContent = 'Copy'; }, 1200);
      });
    }
    return;
  }

  const data = sequences[button.dataset.key];
  if (!data) return;

  if (activeSession.ws && activeSession.ws.readyState === WebSocket.OPEN) {
    activeSession.ws.send(JSON.stringify({ type: 'input', data }));
  }
});

// ---------------------------------------------------------------------------
// Tab management
// ---------------------------------------------------------------------------

function createTab(session) {
  const terminal = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    scrollback: 1000,
    theme: { background: '#000000' },
  });

  const fitAddon = new FitAddon.FitAddon();
  terminal.loadAddon(fitAddon);

  const defaultLabel = session.command === 'bash' ? 'Shell' : `Session ${state.nextSessionNumber++}`;
  const label = session.label || session.name || defaultLabel;

  const tabEl = document.createElement('button');
  tabEl.className = 'tab-item';
  tabEl.dataset.sessionId = session.id;
  tabEl.innerHTML = `
    <span class="status-dot ${session.status || 'running'}"></span>
    <span class="tab-label">${label}</span>
    <span class="close-btn" role="button" aria-label="Close tab">×</span>
  `;

  const labelEl = tabEl.querySelector('.tab-label');

  labelEl.addEventListener('dblclick', () => {
    labelEl.dataset.originalValue = labelEl.textContent.trim();
    labelEl.contentEditable = 'true';
    labelEl.focus();
    const range = document.createRange();
    range.selectNodeContents(labelEl);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });

  labelEl.addEventListener('blur', () => {
    const value = labelEl.textContent.trim();
    labelEl.textContent = value || labelEl.dataset.originalValue || 'Session';
    labelEl.contentEditable = 'false';
  });

  labelEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      labelEl.blur();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      labelEl.textContent = labelEl.dataset.originalValue || labelEl.textContent;
      labelEl.contentEditable = 'false';
      labelEl.blur();
    }
  });

  const wrapperEl = document.createElement('div');
  wrapperEl.className = 'terminal-wrapper inactive';
  wrapperEl.dataset.sessionId = session.id;

  const containerEl = document.createElement('div');
  containerEl.className = 'terminal-container';
  wrapperEl.appendChild(containerEl);

  terminal.open(containerEl);
  fitAddon.fit();

  const record = {
    ...session,
    label: label,
    status: session.status || 'running',
    terminal,
    fitAddon,
    ws: null,
    tabEl,
    wrapperEl,
  };

  tabEl.addEventListener('click', (event) => {
    if (event.target.closest('.close-btn')) {
      closeTab(session.id);
      return;
    }
    switchTab(session.id);
  });

  document.getElementById('tab-list').appendChild(tabEl);
  document.getElementById('terminal-panels').appendChild(wrapperEl);

  state.sessions.push(record);
  switchTab(session.id);
  return record;
}

function switchTab(sessionId) {
  state.activeSessionId = sessionId;

  state.sessions.forEach((session) => {
    const active = session.id === sessionId;
    session.tabEl.classList.toggle('active', active);
    session.wrapperEl.classList.toggle('active', active);
    session.wrapperEl.classList.toggle('inactive', !active);
  });

  const activeSession = state.sessions.find((session) => session.id === sessionId);
  if (activeSession) {
    setTimeout(() => activeSession.fitAddon.fit(), 0);
  }
}

async function closeTab(sessionId) {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) return;

  if (session.ws) {
    session.ws.close();
  }

  await apiFetch(`/sessions/${sessionId}`, { method: 'DELETE' });

  session.terminal.dispose();
  session.tabEl.remove();
  session.wrapperEl.remove();

  state.sessions = state.sessions.filter((item) => item.id !== sessionId);

  if (state.activeSessionId === sessionId) {
    const fallback = state.sessions[state.sessions.length - 1];
    state.activeSessionId = fallback ? fallback.id : null;
    if (fallback) {
      switchTab(fallback.id);
    }
  }
}

function newSession() {
  renderSavedDirs();
  document.getElementById('new-session-modal').hidden = false;
}

document.getElementById('new-session-cancel').addEventListener('click', () => {
  document.getElementById('new-session-modal').hidden = true;
});

document.getElementById('new-session-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const cwd = document.getElementById('cwd-input').value.trim();
  const shellType = document.querySelector('input[name="session-type"]:checked')?.value;
  const saveDir = document.getElementById('save-dir-checkbox').checked;
  const body = shellType === 'bash' ? { cwd, command: 'bash' } : { cwd };

  if (saveDir) {
    saveDirToStorage(cwd);
  }

  const response = await apiFetch('/sessions', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    alert(data.error || 'Failed to create session');
    return;
  }
  const record = createTab(data);
  document.getElementById('new-session-modal').hidden = true;
  connectWebSocket(record);
});

document.getElementById('saved-dirs-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  const { action, dir } = button.dataset;
  if (!dir) return;

  if (action === 'launch') {
    newSession();
    document.getElementById('cwd-input').value = dir;
    return;
  }

  if (action === 'remove') {
    removeSavedDir(dir);
    renderSavedDirs();
  }
});

// ---------------------------------------------------------------------------
// Login form
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.hidden = true;

    const password = document.getElementById('password-input').value;
    document.getElementById('password-input').value = '';

    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        loginError.textContent = data.error || 'Wrong password';
        loginError.hidden = false;
        return;
      }

      const data = await res.json();
      state.token = data.token;
      localStorage.setItem('vps_jwt', data.token);
      showTerminal();
    } catch (err) {
      loginError.textContent = 'Connection error';
      loginError.hidden = false;
    }
  });
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function init() {
  const token = localStorage.getItem('vps_jwt');
  if (token) {
    state.token = token;
    try {
      await showTerminal();
      return;
    } catch (_) {
      // apiFetch already called clearAuthAndRedirect on 401
    }
  }
  showLogin();
}

init();
