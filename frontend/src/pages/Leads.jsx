import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown, ChevronRight, Copy, Check, X as XIcon,
  Send, CheckCircle2, MessageSquare, ExternalLink,
} from 'lucide-react';
import { useData, SHEET_TABS } from '../lib/data.jsx';
import { api } from '../lib/api.js';
import { hasValidToken, AuthRequiredError } from '../lib/auth.js';
import TokenModal from '../components/TokenModal.jsx';
import Toast from '../components/Toast.jsx';

/**
 * Leads & Outreach — outreach workflow view (2026-04-17 schema).
 *
 * Three vertically-stacked sections driven by Status + Follow-up Due:
 *   1. Follow-ups Due    Status = "Contacted" AND Follow-up Due <= today+2d
 *   2. New Leads         Status = "New"
 *   3. Contacted / InFlt Status = "Contacted" AND Follow-up Due >  today+2d
 *
 * Writes go through the Worker via session-scoped token (see lib/auth.js).
 * Auto-refresh is handled by DataProvider (60s).
 */

const ROLE_TYPE_OPTIONS = ['All', 'Consulting', 'Perm', 'Both'];
const FOLLOWUP_WINDOW_DAYS = 2;

export default function Leads() {
  const { tabs, loading, refresh, patchRow } = useData();
  const tab = tabs[SHEET_TABS[0]];
  const allLeads = tab?.rows || [];

  const [roleFilter, setRoleFilter] = useState('All');
  const [expanded, setExpanded] = useState(() => new Set());
  const [tokenModal, setTokenModal] = useState({ open: false, pending: null, reason: '' });
  const [toast, setToast] = useState('');
  const [actionError, setActionError] = useState('');

  const toggleExpand = useCallback((id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const showCopied = useCallback(() => setToast('Copied'), []);

  /**
   * Bucketed and filtered leads. Computed from raw rows + role filter.
   * today is computed once per render — good enough for human-scale deadlines.
   */
  const { followupsDue, newLeads, inFlight } = useMemo(() => {
    const today = startOfDay(new Date());
    const cutoff = addDays(today, FOLLOWUP_WINDOW_DAYS);

    const filtered = allLeads.filter((l) => {
      if (roleFilter === 'All') return true;
      return l['Role Type'] === roleFilter;
    });

    const due = [];
    const fresh = [];
    const flight = [];

    for (const l of filtered) {
      const status = l.Status;
      if (status === 'New') {
        fresh.push(l);
      } else if (status === 'Contacted') {
        const fu = parseDate(l['Follow-up Due']);
        if (fu && fu <= cutoff) due.push(l);
        else flight.push(l);
      }
      // Other statuses (Follow-up Sent, Responded, Closed) are hidden from
      // the dashboard — they live in the sheet but aren't actionable here.
    }

    due.sort((a, b) => compareDates(a['Follow-up Due'], b['Follow-up Due']));
    flight.sort((a, b) => compareDates(a['Follow-up Due'], b['Follow-up Due']));
    // Newest Created Date first.
    fresh.sort((a, b) => compareDates(b['Created Date'], a['Created Date']));

    return { followupsDue: due, newLeads: fresh, inFlight: flight };
  }, [allLeads, roleFilter]);

  /**
   * Wrap an async write so auth prompts are handled consistently. If no
   * valid token is present, queue the action and open the modal. On 401/403
   * the api layer clears the token; catch the structured error and re-prompt.
   */
  const runAuthedAction = useCallback(async (fn, reason) => {
    setActionError('');
    const attempt = async () => {
      try {
        await fn();
        return { ok: true };
      } catch (err) {
        if (err instanceof AuthRequiredError) {
          return { ok: false, auth: true };
        }
        setActionError(err?.message || 'Request failed');
        return { ok: false };
      }
    };

    if (!hasValidToken()) {
      setTokenModal({ open: true, pending: fn, reason });
      return;
    }
    const first = await attempt();
    if (first.ok) return;
    if (first.auth) {
      setTokenModal({ open: true, pending: fn, reason: 'Token expired — re-enter to continue.' });
    }
  }, []);

  const onTokenSaved = useCallback(async () => {
    const pending = tokenModal.pending;
    setTokenModal({ open: false, pending: null, reason: '' });
    if (!pending) return;
    try {
      await pending();
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        setTokenModal({ open: true, pending, reason: 'Token rejected — check the value and try again.' });
      } else {
        setActionError(err?.message || 'Request failed');
      }
    }
  }, [tokenModal.pending]);

  // --- Action handlers ------------------------------------------------------

  const markContacted = useCallback((lead) => {
    const today = todayISO();
    const row = lead._rowIndex;
    // Optimistic update; refresh at the end to reconcile.
    patchRow(SHEET_TABS[0], row, 'Status', 'Contacted');
    patchRow(SHEET_TABS[0], row, 'Contacted Date', today);
    runAuthedAction(async () => {
      await api.writeRange({
        tab: SHEET_TABS[0],
        range: `S${row}:T${row}`, // Status, Contacted Date
        values: [['Contacted', today]],
      });
      refresh();
    }, 'Mark lead as Contacted and stamp today\'s date.');
  }, [patchRow, refresh, runAuthedAction]);

  const markFollowupSent = useCallback((lead) => {
    const today = todayISO();
    const row = lead._rowIndex;
    patchRow(SHEET_TABS[0], row, 'Status', 'Follow-up Sent');
    patchRow(SHEET_TABS[0], row, 'Follow-up Sent Date', today);
    runAuthedAction(async () => {
      // Status col S = 19; Follow-up Sent Date col V = 22. Non-contiguous,
      // so two cell writes.
      await api.writeCell({ tab: SHEET_TABS[0], row, col: 19, value: 'Follow-up Sent' });
      await api.writeCell({ tab: SHEET_TABS[0], row, col: 22, value: today });
      refresh();
    }, 'Mark follow-up as sent and stamp today\'s date.');
  }, [patchRow, refresh, runAuthedAction]);

  const markResponded = useCallback((lead) => {
    const row = lead._rowIndex;
    patchRow(SHEET_TABS[0], row, 'Status', 'Responded');
    runAuthedAction(async () => {
      await api.writeCell({ tab: SHEET_TABS[0], row, col: 19, value: 'Responded' });
      refresh();
    }, 'Mark lead as Responded.');
  }, [patchRow, refresh, runAuthedAction]);

  const closeLead = useCallback((lead) => {
    const row = lead._rowIndex;
    patchRow(SHEET_TABS[0], row, 'Status', 'Closed');
    runAuthedAction(async () => {
      await api.writeCell({ tab: SHEET_TABS[0], row, col: 19, value: 'Closed' });
      refresh();
    }, 'Close lead.');
  }, [patchRow, refresh, runAuthedAction]);

  const copyToClipboard = useCallback(async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showCopied();
    } catch {
      setActionError('Clipboard access denied by the browser.');
    }
  }, [showCopied]);

  // --- Render ---------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-[#fafafa] tracking-tight">
          Leads & Outreach
        </h1>
        <div className="text-[12px] text-[#a1a1aa] tabular-nums">
          <span>{followupsDue.length} follow-up{followupsDue.length === 1 ? '' : 's'} due</span>
          <span className="text-[#52525b] mx-2">•</span>
          <span>{newLeads.length} new lead{newLeads.length === 1 ? '' : 's'}</span>
          <span className="text-[#52525b] mx-2">•</span>
          <span>{inFlight.length} in flight</span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="panel p-2 flex items-center gap-1">
        {ROLE_TYPE_OPTIONS.map((opt) => (
          <FilterChip
            key={opt}
            label={opt}
            active={roleFilter === opt}
            onClick={() => setRoleFilter(opt)}
          />
        ))}
      </div>

      {actionError && (
        <div className="panel p-3 flex items-start gap-2 text-[12px] border-[#ef4444]/40">
          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#ef4444] flex-shrink-0" />
          <span className="text-[#fafafa]">{actionError}</span>
          <button className="btn btn-ghost ml-auto" onClick={() => setActionError('')}>
            <XIcon size={12} />
          </button>
        </div>
      )}

      {/* Sections */}
      <Section
        title="Follow-ups Due"
        count={followupsDue.length}
        emptyLabel="No follow-ups due."
      >
        {followupsDue.map((lead) => (
          <FollowupDueRow
            key={lead._rowIndex}
            lead={lead}
            expanded={expanded.has('fu-' + lead._rowIndex)}
            onToggle={() => toggleExpand('fu-' + lead._rowIndex)}
            onCopy={() => copyToClipboard(lead['Follow-up Email'])}
            onMarkSent={() => markFollowupSent(lead)}
            onMarkResponded={() => markResponded(lead)}
          />
        ))}
      </Section>

      <Section
        title="New Leads"
        count={newLeads.length}
        emptyLabel="No new leads."
      >
        {newLeads.map((lead) => (
          <NewLeadRow
            key={lead._rowIndex}
            lead={lead}
            expanded={expanded.has('new-' + lead._rowIndex)}
            onToggle={() => toggleExpand('new-' + lead._rowIndex)}
            onCopy={() => copyToClipboard(lead['Initial Email'])}
            onMarkContacted={() => markContacted(lead)}
            onClose={() => closeLead(lead)}
          />
        ))}
      </Section>

      <Section
        title="Contacted / In Flight"
        count={inFlight.length}
        emptyLabel="Nothing in flight."
      >
        {inFlight.map((lead) => (
          <InFlightRow
            key={lead._rowIndex}
            lead={lead}
            expanded={expanded.has('if-' + lead._rowIndex)}
            onToggle={() => toggleExpand('if-' + lead._rowIndex)}
            onMarkResponded={() => markResponded(lead)}
          />
        ))}
      </Section>

      {!loading && allLeads.length === 0 && (
        <div className="panel p-10 text-center text-[#a1a1aa] text-sm">
          No leads yet.
        </div>
      )}

      <TokenModal
        open={tokenModal.open}
        reason={tokenModal.reason}
        onClose={() => setTokenModal({ open: false, pending: null, reason: '' })}
        onSuccess={onTokenSaved}
      />

      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sections + rows
// -----------------------------------------------------------------------------

function Section({ title, count, emptyLabel, children }) {
  const hasChildren = React.Children.count(children) > 0;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-3 px-1">
        <h2 className="text-[12px] uppercase tracking-wider text-[#a1a1aa]">{title}</h2>
        <span className="text-[11px] text-[#71717a] tabular-nums">{count}</span>
      </div>
      <div className="panel divide-y divide-[#27272a]">
        {hasChildren ? children : (
          <div className="px-4 py-6 text-center text-[12px] text-[#52525b] italic">
            {emptyLabel}
          </div>
        )}
      </div>
    </div>
  );
}

function RowShell({ expanded, onToggle, children, expandedBody }) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-[#1f1f23] transition"
      >
        <span className="text-[#71717a]">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <div className="flex-1 min-w-0">{children}</div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 pl-9 fade-in">{expandedBody}</div>
      )}
    </div>
  );
}

function CollapsedMeta({ company, contact, title, roleType, trailing }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[13px] font-semibold text-[#fafafa] truncate">{company || '—'}</span>
          {roleType && <RoleTypePill value={roleType} />}
        </div>
        <div className="text-[12px] text-[#a1a1aa] truncate mt-0.5">
          {contact || '—'}
          {title && <span className="text-[#71717a]"> · {title}</span>}
        </div>
      </div>
      {trailing && <div className="flex-shrink-0 ml-2">{trailing}</div>}
    </div>
  );
}

function FollowupDueRow({ lead, expanded, onToggle, onCopy, onMarkSent, onMarkResponded }) {
  const daysLeft = daysFromToday(lead['Follow-up Due']);
  return (
    <RowShell
      expanded={expanded}
      onToggle={onToggle}
      expandedBody={(
        <div className="space-y-3">
          <EmailBox label="Follow-up Email" value={lead['Follow-up Email']} />
          <ActionBar>
            <ActionButton icon={Copy} label="Copy Follow-up" onClick={onCopy} />
            <ActionButton icon={Send} label="Mark Follow-up Sent" onClick={onMarkSent} accent />
            <ActionButton icon={CheckCircle2} label="Mark Responded" onClick={onMarkResponded} />
          </ActionBar>
        </div>
      )}
    >
      <CollapsedMeta
        company={lead.Company}
        contact={lead['Contact Name']}
        title={lead['Contact Title']}
        roleType={lead['Role Type']}
        trailing={<DueLabel daysLeft={daysLeft} />}
      />
    </RowShell>
  );
}

function NewLeadRow({ lead, expanded, onToggle, onCopy, onMarkContacted, onClose }) {
  const signal = summarizeSignal(lead.Notes);
  return (
    <RowShell
      expanded={expanded}
      onToggle={onToggle}
      expandedBody={(
        <div className="space-y-3">
          <EmailBox label="Initial Email" value={lead['Initial Email']} />
          <ActionBar>
            <ActionButton icon={Copy} label="Copy Email" onClick={onCopy} />
            <ActionButton icon={Send} label="Mark Contacted" onClick={onMarkContacted} accent />
            <ActionButton icon={XIcon} label="Close Lead" onClick={onClose} />
          </ActionBar>
        </div>
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[13px] font-semibold text-[#fafafa] truncate">{lead.Company || '—'}</span>
            {lead['Role Type'] && <RoleTypePill value={lead['Role Type']} />}
          </div>
          <div className="text-[12px] text-[#a1a1aa] truncate mt-0.5">
            {lead['Contact Name'] || '—'}
            {lead['Contact Title'] && <span className="text-[#71717a]"> · {lead['Contact Title']}</span>}
          </div>
          {signal && (
            <div className="text-[11px] text-[#71717a] truncate mt-1 italic">{signal}</div>
          )}
        </div>
        {lead['LinkedIn URL'] && /^https?:\/\//.test(lead['LinkedIn URL']) && (
          <a
            href={lead['LinkedIn URL']}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[11px] text-[#3b82f6] hover:underline flex-shrink-0 ml-2"
          >
            LinkedIn <ExternalLink size={10} />
          </a>
        )}
      </div>
    </RowShell>
  );
}

function InFlightRow({ lead, expanded, onToggle, onMarkResponded }) {
  const daysLeft = daysFromToday(lead['Follow-up Due']);
  return (
    <RowShell
      expanded={expanded}
      onToggle={onToggle}
      expandedBody={(
        <div className="space-y-3">
          <EmailBox label="Initial Email" value={lead['Initial Email']} />
          <EmailBox label="Follow-up Email" value={lead['Follow-up Email']} />
          <ActionBar>
            <ActionButton icon={MessageSquare} label="View Emails" onClick={onToggle} />
            <ActionButton icon={CheckCircle2} label="Mark Responded" onClick={onMarkResponded} accent />
          </ActionBar>
        </div>
      )}
    >
      <CollapsedMeta
        company={lead.Company}
        contact={lead['Contact Name']}
        title={lead['Contact Title']}
        roleType={lead['Role Type']}
        trailing={<ScheduleLabel daysLeft={daysLeft} />}
      />
    </RowShell>
  );
}

// -----------------------------------------------------------------------------
// Small primitives
// -----------------------------------------------------------------------------

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-3 py-1 text-[12px] rounded transition',
        active
          ? 'bg-[#1e3a5f] text-[#3b82f6] border border-[#3b82f6]/40'
          : 'text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#1f1f23] border border-transparent',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function RoleTypePill({ value }) {
  if (value === 'Consulting') {
    return <Pill bg="#1e3a5f" fg="#3b82f6">Consulting</Pill>;
  }
  if (value === 'Perm') {
    return <Pill bg="#2e1e5f" fg="#8b5cf6">Perm</Pill>;
  }
  if (value === 'Both') {
    return (
      <span className="inline-flex items-center text-[10px] font-medium uppercase tracking-wider rounded overflow-hidden border border-[#27272a] flex-shrink-0">
        <span className="px-1.5 py-0.5" style={{ background: '#1e3a5f', color: '#3b82f6' }}>C</span>
        <span className="px-1.5 py-0.5" style={{ background: '#2e1e5f', color: '#8b5cf6' }}>P</span>
      </span>
    );
  }
  return null;
}

function Pill({ bg, fg, children }) {
  return (
    <span
      className="px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded flex-shrink-0"
      style={{ background: bg, color: fg }}
    >
      {children}
    </span>
  );
}

function DueLabel({ daysLeft }) {
  if (daysLeft === null) return <span className="text-[11px] text-[#71717a]">No due date</span>;
  if (daysLeft < 0) {
    return (
      <span className="text-[11px] font-medium text-[#ef4444] tabular-nums">
        Overdue {Math.abs(daysLeft)}d
      </span>
    );
  }
  if (daysLeft === 0) {
    return <span className="text-[11px] font-medium text-[#eab308] tabular-nums">Due today</span>;
  }
  return (
    <span className="text-[11px] font-medium text-[#eab308] tabular-nums">
      Due in {daysLeft}d
    </span>
  );
}

function ScheduleLabel({ daysLeft }) {
  if (daysLeft === null) return <span className="text-[11px] text-[#71717a]">No schedule</span>;
  return (
    <span className="text-[11px] text-[#a1a1aa] tabular-nums">
      Follow-up in {daysLeft}d
    </span>
  );
}

function EmailBox({ label, value }) {
  if (!value) {
    return (
      <div>
        <div className="text-[10px] uppercase tracking-wider text-[#71717a] mb-1">{label}</div>
        <div className="panel-sub p-3 text-[12px] text-[#52525b] italic">
          (empty — Scout backfills on next run)
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[#71717a] mb-1">{label}</div>
      <pre className="panel-sub p-3 text-[12px] font-mono text-[#fafafa] whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
        {value}
      </pre>
    </div>
  );
}

function ActionBar({ children }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function ActionButton({ icon: Icon, label, onClick, accent }) {
  return (
    <button
      className="btn"
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      style={accent ? { borderColor: '#3b82f6', color: '#3b82f6' } : undefined}
    >
      <Icon size={13} />
      <span>{label}</span>
    </button>
  );
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/**
 * Parse a value that might be a Date-like string in yyyy-mm-dd or a full
 * ISO timestamp. Returns a Date at start-of-day, or null if unparseable.
 */
function parseDate(v) {
  if (!v) return null;
  if (v instanceof Date) return startOfDay(v);
  const s = String(v).trim();
  if (!s) return null;
  // yyyy-mm-dd or yyyy/mm/dd
  const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (!isNaN(d)) return startOfDay(d);
  }
  const d = new Date(s);
  return isNaN(d) ? null : startOfDay(d);
}

function compareDates(a, b) {
  const da = parseDate(a);
  const db = parseDate(b);
  if (da && db) return da - db;
  if (da) return -1;
  if (db) return 1;
  return 0;
}

function daysFromToday(v) {
  const d = parseDate(v);
  if (!d) return null;
  const today = startOfDay(new Date());
  return Math.round((d - today) / (1000 * 60 * 60 * 24));
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Pull the first "Hiring signal:" sentence out of Notes for the collapsed
 * signal line, falling back to the first ~80 chars of Notes.
 */
function summarizeSignal(notes) {
  if (!notes) return '';
  const s = String(notes).trim();
  const m = s.match(/Hiring signal:\s*([^\.\n]+)/i);
  if (m) return 'Signal: ' + m[1].trim();
  return s.length > 80 ? s.slice(0, 77).trim() + '…' : s;
}
