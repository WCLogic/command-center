import React, { useMemo, useState } from 'react';
import { useData, SHEET_TABS } from '../lib/data.jsx';
import { isTrueish } from '../lib/parseRows.js';
import { X } from 'lucide-react';

/**
 * Leads & Outreach — kanban of the RSC pipeline.
 *
 * Visual rules:
 *  - Stage colors reduced to small dots on column headers; no stage-coded
 *    column backgrounds, no multi-hued badges.
 *  - Role type badge is intentionally muted (Perm = neutral, Consulting =
 *    neutral-variant). Color is reserved for the accent, not categories.
 *  - Existing-client rows get a muted yellow dot, not a full panel.
 */
const STAGES = [
  'Researched',
  'Identified',
  'Outreach Drafted',
  'Contacted',
  'Followed Up',
  'Meeting Booked',
];

const STAGE_DOT = {
  'Researched':       '#71717a',
  'Identified':       '#a1a1aa',
  'Outreach Drafted': '#3b82f6',
  'Contacted':        '#3b82f6',
  'Followed Up':      '#eab308',
  'Meeting Booked':   '#22c55e',
};

export default function Leads() {
  const { tabs, loading } = useData();
  const tab = tabs[SHEET_TABS[0]];
  const allLeads = tab?.rows || [];

  const [filters, setFilters] = useState({
    roleType: 'All',
    industry: 'All',
    existingClient: false,
  });
  const [selected, setSelected] = useState(null);

  const industries = useMemo(() => {
    const s = new Set();
    allLeads.forEach((l) => { if (l.Industry) s.add(l.Industry); });
    return ['All', ...Array.from(s).sort()];
  }, [allLeads]);

  const filtered = useMemo(() => {
    return allLeads.filter((l) => {
      if (filters.roleType !== 'All' && l['Role Type'] !== filters.roleType) return false;
      if (filters.industry !== 'All' && l.Industry !== filters.industry) return false;
      if (filters.existingClient && !isTrueish(l['Existing Client'])) return false;
      return true;
    });
  }, [allLeads, filters]);

  const byStage = useMemo(() => {
    const map = Object.fromEntries(STAGES.map((s) => [s, []]));
    filtered.forEach((l) => {
      const s = l['Pipeline Stage'];
      if (map[s]) map[s].push(l);
      else map['Researched'].push(l);
    });
    return map;
  }, [filtered]);

  const meetingsBooked = byStage['Meeting Booked']?.length || 0;
  const contacted =
    (byStage['Contacted']?.length || 0) +
    (byStage['Followed Up']?.length || 0) +
    (byStage['Meeting Booked']?.length || 0);
  const conversion = contacted > 0 ? Math.round((meetingsBooked / contacted) * 100) : 0;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Leads & Outreach"
        subtitle="RSC pipeline — Scout's primary workspace"
      />

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <Metric label="Total Leads" value={allLeads.length} />
        <Metric label="Meetings Booked" value={meetingsBooked} accent />
        <Metric label="Conversion" value={`${conversion}%`} />
      </div>

      {/* Filter bar */}
      <div className="panel p-3 flex flex-wrap items-center gap-3">
        <FilterLabel>Filters</FilterLabel>
        <Select
          label="Role"
          value={filters.roleType}
          onChange={(v) => setFilters((f) => ({ ...f, roleType: v }))}
          options={['All', 'Perm', 'Consulting']}
        />
        <Select
          label="Industry"
          value={filters.industry}
          onChange={(v) => setFilters((f) => ({ ...f, industry: v }))}
          options={industries}
        />
        <Toggle
          label="Existing clients only"
          checked={filters.existingClient}
          onChange={(v) => setFilters((f) => ({ ...f, existingClient: v }))}
        />
      </div>

      {/* Kanban */}
      <div className="overflow-x-auto pb-2 -mx-4 md:-mx-8 px-4 md:px-8">
        <div className="flex gap-3 min-w-max">
          {STAGES.map((stage) => (
            <Column
              key={stage}
              title={stage}
              leads={byStage[stage] || []}
              onSelect={setSelected}
            />
          ))}
        </div>
      </div>

      {!loading && allLeads.length === 0 && (
        <div className="panel p-10 text-center text-[#a1a1aa] text-sm">
          No leads yet.
        </div>
      )}

      {selected && <LeadDrawer lead={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div>
        <h1 className="text-lg font-semibold text-[#fafafa] tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-[12px] text-[#71717a] mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, accent }) {
  return (
    <div className="panel px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-[#71717a]">{label}</div>
      <div
        className="mt-1.5 text-2xl font-semibold tabular-nums"
        style={{ color: accent ? '#3b82f6' : '#fafafa' }}
      >
        {value}
      </div>
    </div>
  );
}

function FilterLabel({ children }) {
  return (
    <span className="text-[11px] uppercase tracking-wider text-[#71717a] mr-1">
      {children}
    </span>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="flex items-center gap-2 text-[12px] text-[#a1a1aa]">
      <span>{label}</span>
      <select
        className="input text-[12px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-[12px] text-[#a1a1aa] select-none cursor-pointer">
      <span
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative w-8 h-4 rounded-full transition"
        style={{ background: checked ? '#3b82f6' : '#3f3f46' }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition"
          style={{ transform: checked ? 'translateX(16px)' : 'none' }}
        />
      </span>
      <span onClick={() => onChange(!checked)}>{label}</span>
    </label>
  );
}

function Column({ title, leads, onSelect }) {
  const dot = STAGE_DOT[title] || '#71717a';
  return (
    <div className="w-72 flex-shrink-0 panel p-3 flex flex-col max-h-[calc(100vh-360px)] min-h-80">
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
          <span className="text-[12px] font-medium text-[#fafafa]">{title}</span>
        </div>
        <span className="text-[11px] text-[#71717a] tabular-nums">{leads.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
        {leads.length === 0 ? (
          <div className="text-[11px] text-[#52525b] italic py-4 text-center">empty</div>
        ) : leads.map((l) => (
          <LeadCard key={l._rowIndex} lead={l} onClick={() => onSelect(l)} />
        ))}
      </div>
    </div>
  );
}

function LeadCard({ lead, onClick }) {
  return (
    <button
      onClick={onClick}
      className="panel-sub w-full text-left p-3 hover:border-[#3f3f46] transition cursor-pointer"
    >
      <div className="text-[13px] font-semibold text-[#fafafa] truncate">
        {lead.Company || '—'}
      </div>
      <div className="text-[12px] text-[#a1a1aa] truncate mt-0.5">
        {lead['Contact Name'] || '—'}
        {lead['Contact Title'] ? (
          <span className="text-[#71717a]"> · {lead['Contact Title']}</span>
        ) : null}
      </div>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {lead['Role Type'] && (
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#27272a] bg-[#18181b] text-[#a1a1aa] uppercase tracking-wider">
            {lead['Role Type']}
          </span>
        )}
        {isTrueish(lead['Existing Client']) && (
          <span
            className="flex items-center gap-1 text-[10px] text-[#eab308]"
            title="Existing client"
          >
            <span className="w-1 h-1 rounded-full bg-[#eab308]" />
            Existing
          </span>
        )}
      </div>
    </button>
  );
}

function LeadDrawer({ lead, onClose }) {
  const fields = [
    ['Company',        lead.Company],
    ['Contact',        joinContact(lead)],
    ['LinkedIn',       lead['LinkedIn URL']],
    ['Industry',       lead.Industry],
    ['Location',       lead.Location],
    ['Source',         lead.Source],
    ['Role Type',      lead['Role Type']],
    ['Pipeline Stage', lead['Pipeline Stage']],
    ['Last Action',    joinAction(lead['Last Action'], lead['Last Action Date'])],
    ['Next Step',      joinAction(lead['Next Step'], lead['Next Step Date'])],
    ['Existing Client', isTrueish(lead['Existing Client']) ? 'Yes' : 'No'],
    ['Created',        lead['Created Date']],
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-md h-full bg-[#18181b] border-l border-[#27272a] overflow-y-auto fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 h-12 border-b border-[#27272a] bg-[#18181b]">
          <div className="text-sm font-semibold text-[#fafafa] truncate">
            {lead.Company || 'Lead'}
          </div>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {fields.map(([k, v]) => v ? (
            <div key={k}>
              <div className="text-[10px] uppercase tracking-wider text-[#71717a]">{k}</div>
              <div className="text-[13px] text-[#fafafa] mt-0.5 break-words">
                {k === 'LinkedIn' && /^https?:\/\//.test(v)
                  ? <a href={v} target="_blank" rel="noreferrer" className="text-[#3b82f6] hover:underline">{v}</a>
                  : String(v)}
              </div>
            </div>
          ) : null)}
          {lead.Notes && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#71717a]">Notes</div>
              <div className="panel-sub p-3 mt-1 text-[13px] whitespace-pre-wrap text-[#fafafa]">
                {lead.Notes}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function joinContact(l) {
  const parts = [l['Contact Name'], l['Contact Title'] ? `(${l['Contact Title']})` : null].filter(Boolean);
  return parts.join(' ').trim();
}

function joinAction(a, d) {
  if (!a && !d) return '';
  return [a, d ? `(${d})` : null].filter(Boolean).join(' ');
}
