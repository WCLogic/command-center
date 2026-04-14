/**
 * Worker API client.
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
  appendRow(tab, row) {
    return http('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tab, mode: 'append', values: [row] }),
    });
  },
  updateRange(tab, range, values) {
    return http('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tab, mode: 'update', range, values }),
    });
  },
  setCell(tab, row, col, value) {
    return http('/cell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tab, row, col, value }),
    });
  },
};

export const HAS_API = !!API_URL;
