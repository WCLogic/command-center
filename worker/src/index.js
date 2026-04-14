/**
 * Command Center API Worker
 *
 * Proxies Google Sheets API calls using a service account.
 * Sheet stays private; the Worker is the only holder of the credential.
 *
 * Endpoints:
 *   GET  /?tab=<tabName>                 -> reads entire tab, returns values array
 *   GET  /all                            -> reads all 5 known tabs in one call
 *   POST /                               -> body: { tab, range?, values, mode: 'append'|'update' }
 *   POST /cell                           -> body: { tab, row, col, value }   (1-based row/col)
 *
 * Env:
 *   GOOGLE_SERVICE_ACCOUNT  (secret)  Full service-account JSON as a string
 *   SHEET_ID                (var)     The target spreadsheet ID
 *   ALLOWED_ORIGIN          (var)     CORS origin (https://wclogic.github.io)
 */

const TOKEN_CACHE = { token: null, exp: 0 };

// ---------- CORS ----------
function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(data, env, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(env), 'Content-Type': 'application/json' },
  });
}

function errorJson(message, env, status = 500, extra = {}) {
  return json({ error: message, ...extra }, env, status);
}

// ---------- Base64 URL ----------
function base64UrlEncode(bytes) {
  let s = '';
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < view.length; i++) s += String.fromCharCode(view[i]);
  return btoa(s).replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlEncodeString(str) {
  return base64UrlEncode(new TextEncoder().encode(str));
}

// ---------- Service Account JWT ----------
function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function getAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (TOKEN_CACHE.token && TOKEN_CACHE.exp > now + 60) {
    return TOKEN_CACHE.token;
  }

  if (!env.GOOGLE_SERVICE_ACCOUNT) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT secret not configured');
  }

  let sa;
  try {
    sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
  } catch (e) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT is not valid JSON');
  }

  const header = { alg: 'RS256', typ: 'JWT', kid: sa.private_key_id };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const unsigned =
    base64UrlEncodeString(JSON.stringify(header)) + '.' +
    base64UrlEncodeString(JSON.stringify(claim));

  const keyBuffer = pemToArrayBuffer(sa.private_key);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
    false,
    ['sign']
  );

  const sigBuf = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsigned)
  );

  const jwt = unsigned + '.' + base64UrlEncode(sigBuf);

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error('Token exchange failed: ' + res.status + ' ' + txt);
  }

  const data = await res.json();
  TOKEN_CACHE.token = data.access_token;
  TOKEN_CACHE.exp = now + (data.expires_in || 3600);
  return data.access_token;
}

// ---------- Sheets API ----------
const KNOWN_TABS = [
  'Leads & Outreach',
  'Family Businesses',
  'Tasks & To-Dos',
  'Agent Roster',
  'Finances',
];

async function sheetsGetValues(env, token, tab) {
  const range = encodeURIComponent(tab);
  const url =
    'https://sheets.googleapis.com/v4/spreadsheets/' +
    env.SHEET_ID + '/values/' + range;
  const res = await fetch(url, {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error('Sheets GET failed: ' + res.status + ' ' + txt);
  }
  return await res.json();
}

async function sheetsBatchGet(env, token, tabs) {
  const ranges = tabs.map((t) => 'ranges=' + encodeURIComponent(t)).join('&');
  const url =
    'https://sheets.googleapis.com/v4/spreadsheets/' +
    env.SHEET_ID + '/values:batchGet?' + ranges;
  const res = await fetch(url, {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error('Sheets batchGet failed: ' + res.status + ' ' + txt);
  }
  return await res.json();
}

async function sheetsAppend(env, token, tab, values) {
  const range = encodeURIComponent(tab);
  const url =
    'https://sheets.googleapis.com/v4/spreadsheets/' + env.SHEET_ID +
    '/values/' + range + ':append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error('Sheets append failed: ' + res.status + ' ' + txt);
  }
  return await res.json();
}

async function sheetsUpdate(env, token, tab, range, values) {
  // range is A1-style WITHIN the tab, e.g. "A2:Q2"
  const fullRange = encodeURIComponent(tab + '!' + range);
  const url =
    'https://sheets.googleapis.com/v4/spreadsheets/' + env.SHEET_ID +
    '/values/' + fullRange + '?valueInputOption=USER_ENTERED';
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error('Sheets update failed: ' + res.status + ' ' + txt);
  }
  return await res.json();
}

// ---------- A1 helpers ----------
function colNumToA1(col) {
  // 1-based -> A, B, ..., Z, AA, AB...
  let s = '';
  let n = col;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// ---------- Router ----------
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    try {
      // GET /health
      if (request.method === 'GET' && url.pathname === '/health') {
        return json({ ok: true, time: new Date().toISOString() }, env);
      }

      const token = await getAccessToken(env);

      // GET /all
      if (request.method === 'GET' && url.pathname === '/all') {
        const data = await sheetsBatchGet(env, token, KNOWN_TABS);
        const byTab = {};
        (data.valueRanges || []).forEach((vr, i) => {
          byTab[KNOWN_TABS[i]] = vr.values || [];
        });
        return json({ tabs: byTab }, env);
      }

      // GET /?tab=<name>
      if (request.method === 'GET' && url.pathname === '/') {
        const tab = url.searchParams.get('tab');
        if (!tab) {
          return errorJson('Missing tab query parameter', env, 400);
        }
        const data = await sheetsGetValues(env, token, tab);
        return json({ tab, values: data.values || [] }, env);
      }

      // POST /   body: { tab, values, mode: 'append', range? }
      //         or { tab, range, values, mode: 'update' }
      if (request.method === 'POST' && url.pathname === '/') {
        const body = await request.json();
        if (!body.tab || !body.values) {
          return errorJson('Missing tab or values', env, 400);
        }
        const mode = body.mode || 'append';
        if (mode === 'append') {
          const result = await sheetsAppend(env, token, body.tab, body.values);
          return json({ ok: true, result }, env);
        } else if (mode === 'update') {
          if (!body.range) {
            return errorJson('Missing range for update', env, 400);
          }
          const result = await sheetsUpdate(env, token, body.tab, body.range, body.values);
          return json({ ok: true, result }, env);
        }
        return errorJson('Unknown mode: ' + mode, env, 400);
      }

      // POST /cell   body: { tab, row, col, value }  (1-based row/col)
      if (request.method === 'POST' && url.pathname === '/cell') {
        const body = await request.json();
        if (!body.tab || !body.row || !body.col) {
          return errorJson('Missing tab, row, or col', env, 400);
        }
        const a1 = colNumToA1(body.col) + body.row;
        const result = await sheetsUpdate(env, token, body.tab, a1, [[body.value ?? '']]);
        return json({ ok: true, result }, env);
      }

      return errorJson('Not found', env, 404);
    } catch (err) {
      return errorJson(err.message || String(err), env, 500);
    }
  },
};
