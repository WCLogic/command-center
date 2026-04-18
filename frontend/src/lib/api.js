/**
 * Worker API client.
 *
 * READS (GET) — unauthenticated. CORS-locked at the Worker to this origin.
 *
 * WRITES (POST) — require a session-scoped token. The token is held in
 * memory only for the life of the tab (sessionStorage), is never shipped in
 * the bundle or baked into env vars, and is cleared on 30-minute idle or
 * on any 401/403 response. See lib/auth.js for the contract.
 *
 * ERROR HYGIENE: if a request fails, we do NOT include request bodies,
 * headers, or the token anywhere in the thrown error. The error's body
 * field contains ONLY the Worker's own JSON response (which never echoes
 * the token).
 *
 * VITE_API_URL must be set at build time (or via .env.local for dev).
 */

import { getToken, clearToken, AuthRequiredError } from './auth.js';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

if (!API_URL) {
  // eslint-disable-next-line no-console
  console.warn('[api] VITE_API_URL not set — Worker calls will fail.');
}

async function http(path, init = {}) {
  const res = await fetch(API_URL + path, init);
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

  if (res.status === 401 || res.status === 403) {
    // Auth failure: wipe the stored token and surface a structured error so
    // UI can re-prompt. Do NOT include the original request in the error.
    clearToken();
    throw new AuthRequiredError(res.status);
  }

  if (!res.ok) {
    const msg = data?.error || res.statusText || 'Request failed';
    const err = new Error(msg);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

function authedPost(path, body) {
  const token = getToken();
  if (!token) {
    // Caller is responsible for prompting before calling. This is a
    // defense-in-depth guard.
    throw new AuthRequiredError(0);
  }
  return http(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
    },
    body: JSON.stringify(body),
  });
}

export const api = {
  // --- Reads ---
  health() { return http('/health'); },
  getAllTabs() { return http('/all'); },
  getTab(tab) {
    return http('/?tab=' + encodeURIComponent(tab));
  },

  // --- Writes (authenticated) ---

  /**
   * Update a single cell. Prefer this for point updates — smaller payload,
   * clearer audit log entries.
   */
  writeCell({ tab, row, col, value }) {
    return authedPost('/cell', { tab, row, col, value });
  },

  /**
   * Update a contiguous range. `values` is a 2D array aligned to `range`.
   *
   * NOTE: uses `mode` not `action` for compatibility with the currently-
   * deployed Worker. The Worker has an uncommitted local change that adds
   * `action` as an alias; once that ships, either field works. Keeping
   * `mode` here is the safe default and survives any rollback.
   */
  writeRange({ tab, range, values }) {
    return authedPost('/', { mode: 'update', tab, range, values });
  },
};

export const HAS_API = !!API_URL;
