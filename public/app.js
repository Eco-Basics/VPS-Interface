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

function showTerminal() {
  document.getElementById('login-view').hidden = true;
  document.getElementById('terminal-view').hidden = false;
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
  if (options.body && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
    options = Object.assign({}, options, {
      body: JSON.stringify(options.body),
    });
  }

  const res = await fetch(path, Object.assign({}, options, { headers }));

  if (res.status === 401) {
    clearAuthAndRedirect();
    throw new Error('Unauthorized — redirecting to login');
  }

  return res;
}

// ---------------------------------------------------------------------------
// Tab management stubs
// ---------------------------------------------------------------------------

function createTab(session) {
  // Stub — implemented in plan 03-02
  // session: { id, label, status, ws, terminal, fitAddon, tabEl, wrapperEl, idleTimer }
  void session;
}

function switchTab(sessionId) {
  // Stub — implemented in plan 03-02
  void sessionId;
}

function closeTab(sessionId) {
  // Stub — implemented in plan 03-02
  void sessionId;
}

function newSession() {
  // Stub — implemented in plan 03-02
  const modal = document.getElementById('new-session-modal');
  modal.hidden = false;
}

// ---------------------------------------------------------------------------
// Login form
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const newSessionForm = document.getElementById('new-session-form');

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

  // Modal cancel
  if (modalCancelBtn) {
    modalCancelBtn.addEventListener('click', () => {
      document.getElementById('new-session-modal').hidden = true;
    });
  }

  // New session form stub — will be wired fully in plan 03-02
  if (newSessionForm) {
    newSessionForm.addEventListener('submit', (e) => {
      e.preventDefault();
      document.getElementById('new-session-modal').hidden = true;
    });
  }
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function init() {
  const token = localStorage.getItem('vps_jwt');
  if (token) {
    state.token = token;
    // Verify token is still valid by fetching sessions
    try {
      const res = await apiFetch('/sessions');
      if (res.ok) {
        showTerminal();
        return;
      }
    } catch (_) {
      // apiFetch already called clearAuthAndRedirect on 401
    }
  }
  showLogin();
}

init();
