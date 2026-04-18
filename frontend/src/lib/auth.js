/**
 * Session-scoped token auth for the Command Center dashboard.
 *
 * DESIGN CONSTRAINTS (per 2026-04-17 security review):
 *   - Token lives in sessionStorage ONLY. Never localStorage, cookies, IndexedDB.
 *   - Tab close wipes the token automatically (sessionStorage semantics).
 *   - 30 minutes of inactivity wipes the token even in an open tab.
 *   - 401/403 from the Worker also wipes the token and forces re-prompt.
 *   - Token never appears in the bundle, in env vars baked in at build time,
 *     in logs, or in error messages surfaced to the user.
 *
 * RESIDUAL RISK (acknowledged):
 *   - XSS in this bundle would leak the token during the active session.
 *     Mitigations: strict CSP in index.html, no inline scripts, no eval,
 *     pinned deps, gh-pages origin-locked CORS on the Worker.
 *   - A shared browser profile with the tab left open would allow another
 *     local user to act within the 30-minute idle window.
 *
 * This is INTERIM auth. The intended long-term design is Cloudflare Access
 * with Google Workspace SSO — see CLOUDFLARE_ACCESS_MIGRATION_SPEC.md.
 */

const TOKEN_KEY = 'cc_token';
const ACTIVITY_KEY = 'cc_token_last_activity';
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const listeners = new Set();

function notify() {
  listeners.forEach((fn) => {
    try { fn(); } catch { /* swallow — never log */ }
  });
}

function safeSessionStorage() {
  // sessionStorage can be unavailable (private mode on some browsers, storage blocked).
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    // Touch to verify access is allowed.
    window.sessionStorage.getItem(TOKEN_KEY);
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function now() { return Date.now(); }

/** Clear token + activity marker. Safe to call multiple times. */
export function clearToken() {
  const s = safeSessionStorage();
  if (!s) return;
  s.removeItem(TOKEN_KEY);
  s.removeItem(ACTIVITY_KEY);
  notify();
}

/**
 * Retrieve token if present and not idle-expired. Returns null otherwise.
 * Calling this also refreshes the activity timestamp when a valid token
 * is returned — so active usage extends the session window.
 */
export function getToken() {
  const s = safeSessionStorage();
  if (!s) return null;

  const t = s.getItem(TOKEN_KEY);
  if (!t) return null;

  const last = parseInt(s.getItem(ACTIVITY_KEY) || '0', 10);
  if (!last || now() - last > IDLE_TIMEOUT_MS) {
    clearToken();
    return null;
  }

  // Extend activity window on successful retrieval.
  s.setItem(ACTIVITY_KEY, String(now()));
  return t;
}

/** Store the token and start the activity window. */
export function setToken(token) {
  const s = safeSessionStorage();
  if (!s) return false;
  const trimmed = String(token || '').trim();
  if (!trimmed) return false;
  s.setItem(TOKEN_KEY, trimmed);
  s.setItem(ACTIVITY_KEY, String(now()));
  notify();
  return true;
}

/** Cheap presence check that also enforces idle expiry. */
export function hasValidToken() {
  return getToken() !== null;
}

/** Subscribe to token state changes. Returns unsubscribe fn. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Structured auth error thrown by the API layer on 401/403. */
export class AuthRequiredError extends Error {
  constructor(status) {
    super('Authentication required');
    this.name = 'AuthRequiredError';
    this.status = status;
  }
}
