/**
 * Convert raw Sheets values (header row + data rows) into objects keyed by header.
 * Also returns the header array and original row index for write-back.
 *
 * Filters out rows that are functionally empty — Google returns "FALSE" for
 * checkbox columns on every row in the validated range, so we treat those
 * (and other no-info defaults) as empty for the purpose of row presence.
 */
const EMPTY_DEFAULTS = new Set(['', 'FALSE', 'false']);

function isCellEmpty(c) {
  if (c == null) return true;
  const s = String(c).trim();
  return EMPTY_DEFAULTS.has(s);
}

export function rowsToObjects(values) {
  if (!values || values.length === 0) return { headers: [], rows: [] };
  const headers = values[0].map((h) => String(h ?? '').trim());
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (!r || r.every(isCellEmpty)) continue;
    const obj = { _rowIndex: i + 1 }; // 1-based sheet row
    headers.forEach((h, j) => {
      obj[h] = r[j] ?? '';
    });
    rows.push(obj);
  }
  return { headers, rows };
}

/** Locate column index (1-based) of a given header within a tab. */
export function colIndex(headers, name) {
  const idx = headers.findIndex((h) => h === name);
  return idx >= 0 ? idx + 1 : -1;
}

export function isTrueish(v) {
  if (v === true) return true;
  const s = String(v ?? '').toLowerCase().trim();
  return s === 'true' || s === 'yes' || s === '1' || s === 'x' || s === '✓';
}
