import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { api, HAS_API } from './api.js';
import { rowsToObjects } from './parseRows.js';

const TABS = [
  'Leads & Outreach',
  'Family Businesses',
  'Tasks & To-Dos',
  'Agent Roster',
  'Finances',
];

const DataCtx = createContext(null);

export function DataProvider({ children }) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    lastFetch: null,
    tabs: Object.fromEntries(TABS.map((t) => [t, { headers: [], rows: [], values: [] }])),
  });
  const abortRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!HAS_API) {
      setState((s) => ({
        ...s,
        loading: false,
        error: 'VITE_API_URL is not configured. Frontend cannot reach the Worker.',
      }));
      return;
    }
    try {
      const data = await api.getAllTabs();
      const next = {};
      for (const t of TABS) {
        const values = data.tabs?.[t] || [];
        next[t] = { values, ...rowsToObjects(values) };
      }
      setState({
        loading: false,
        error: null,
        lastFetch: new Date(),
        tabs: next,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err?.message || String(err),
      }));
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  // Optimistic local mutation helpers
  const patchRow = useCallback((tab, rowIndex, fieldName, value) => {
    setState((s) => {
      const t = s.tabs[tab];
      if (!t) return s;
      const rows = t.rows.map((r) =>
        r._rowIndex === rowIndex ? { ...r, [fieldName]: value } : r
      );
      return { ...s, tabs: { ...s.tabs, [tab]: { ...t, rows } } };
    });
  }, []);

  const addRowLocal = useCallback((tab, rowObj) => {
    setState((s) => {
      const t = s.tabs[tab];
      if (!t) return s;
      const nextIdx = (t.values?.length || 1) + 1;
      const newRow = { _rowIndex: nextIdx, ...rowObj };
      return {
        ...s,
        tabs: {
          ...s.tabs,
          [tab]: { ...t, rows: [...t.rows, newRow] },
        },
      };
    });
  }, []);

  const value = { ...state, refresh, patchRow, addRowLocal };
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function useData() {
  const v = useContext(DataCtx);
  if (!v) throw new Error('useData outside DataProvider');
  return v;
}

export const SHEET_TABS = TABS;
