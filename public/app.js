'use strict';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const state = {
  token: localStorage.getItem('vps_jwt'),
  sessions: [],        // Array of session records — see shape below
  activeSessionId: null,
};

// Session record shape (all fields present from creation):
// { id, label, status, ws, terminal, fitAddon, tabEl, wrapperEl, idleTimer }

// ---------------------------------------------------------------------------
// View helpers
// ---------------------------------------------------------------------------

function showLogin() {
  document.getElementById('login-view').hidden = false;
  document.getElementById('terminal-view').hidden = true;
}

async function showTerminal() {
  document.getElementById('login-view').hidden = true;
  document.getElementById('terminal-view').hidden = false;

  const response = await apiFetch('/sessions');
  const sessions = await response.json();

  document.getElementById('tab-list').innerHTML = '';
  document.getElementById('terminal-panels').innerHTML = '';
  state.sessions = [];

  sessions.forEach((session) => {
    createTab(session);
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
// WebSocket stub (implemented in plan 03-04)
// ---------------------------------------------------------------------------

function connectWebSocket(record) {
  // Stub — implemented in plan 03-04
  void record;
}

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

  const tabEl = document.createElement('button');
  tabEl.className = 'tab';
  tabEl.dataset.sessionId = session.id;
  tabEl.innerHTML = `
    <span class="status-dot ${session.status || 'running'}"></span>
    <span class="tab-label">${session.label || session.name || `Session ${state.sessions.length + 1}`}</span>
    <span class="close-btn" role="button" aria-label="Close tab">×</span>
  `;

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
    label: session.label || session.name || `Session ${state.sessions.length + 1}`,
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
  document.getElementById('new-session-modal').hidden = false;
}

document.getElementById('new-session-cancel').addEventListener('click', () => {
  document.getElementById('new-session-modal').hidden = true;
});

document.getElementById('new-session-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const cwd = document.getElementById('cwd-input').value.trim();
  const shellType = document.querySelector('input[name="session-type"]:checked')?.value;
  const body = shellType === 'bash' ? { cwd, command: 'bash' } : { cwd };

  const response = await apiFetch('/sessions', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const session = await response.json();
  const record = createTab(session);
  document.getElementById('new-session-modal').hidden = true;
  connectWebSocket(record);
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
