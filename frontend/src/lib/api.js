/**
 * Worker API client — READ-ONLY.
 *
 * As of 2026-04-14, the Command Center dashboard is read-only: it pulls from
 * the Sheet via the Worker and displays it. All writes happen out-of-band,
 * executed by the agent team (Scout, Billboard, EagleEye, Scrooge, Jarvis)
 * using bearer-authenticated calls to the Worker. Write endpoints are never
 * called from this bundle — embedding the token in a public asset is the
 * exact exposure we are eliminating.
 *
 * VITE_API_URL must be set at build time (or via .env.local for dev).
 * Example: VITE_API_URL=https://command-center-api.willchasecreate.workers.dev
 */

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

if (!API_URL) {
  // eslint-disable-next-line no-console
  console.warn('[api] VITE_API_URL not set — Worker calls will fail.');
}

async function http(path, init) {
  const res = await fetch(API_URL + path, init);
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const msg = data?.error || res.statusText || 'Request failed';
    const err = new Error(msg);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export const api = {
  health() { return http('/health'); },
  getAllTabs() { return http('/all'); },
  getTab(tab) {
    return http('/?tab=' + encodeURIComponent(tab));
  },
};

export const HAS_API = !!API_URL;
