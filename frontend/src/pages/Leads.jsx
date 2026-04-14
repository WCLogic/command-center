import React, { useMemo, useState } from 'react';
import { useData, SHEET_TABS } from '../lib/data.jsx';
import { isTrueish } from '../lib/parseRows.js';
import { TrendingUp, Calendar, Users as UsersIcon, Building, Filter as FilterIcon, X } from 'lucide-react';

const STAGES = [
  'Researched',
  'Identified',
  'Outreach Drafted',
  'Contacted',
  'Followed Up',
  'Meeting Booked',
];

const STAGE_COLORS = {
  'Researched':       '#6b7280',
  'Identified':       '#8b5cf6',
  'Outreach Drafted': '#0ea5e9',
  'Contacted':        '#3b82f6',
  'Followed Up':      '#eab308',
  'Meeting Booked':   '#22c55e',
};

const ROLE_BADGE = {
  'Perm':       { bg: 'bg-[#3b82f6]/15', text: 'text-[#93c5fd]', border: 'border-[#3b82f6]/30' },
  'Consulting': { bg: 'bg-[#a855f7]/15', text: 'text-[#d8b4fe]', border: 'border-[#a855f7]/30' },
};

export default function Leads() {
  const { tabs, loading } = useData();
  const tab = tabs[SHEET_TABS[0]];
  const allLeads = tab?.rows || [];

  const [filters, setFilters] = useState({
    roleType: 'All',
    industry: 'All',
    existingClient: 'All',  // All / Yes / No
    stage: 'All',
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
      if (filters.stage    !== 'All' && l['Pipeline Stage'] !== filters.stage) return false;
      if (filters.existingClient === 'Yes' && !isTrueish(l['Existing Client'])) return false;
      if (filters.existingClient === 'No'  &&  isTrueish(l['Existing Client'])) return false;
      return true;
    });
  }, [allLeads, filters]);

  const existingClientLeads = useMemo(
    () => allLeads.filter((l) => isTrueish(l['Existing Client'])),
    [allLeads]
  );

  const byStage = useMemo(() => {
    const map = Object.fromEntries(STAGES.map((s) => [s, []]));
    filtered.forEach((l) => {
      const s = l['Pipeline Stage'];
      if (map[s]) map[s].push(l);
      else map['Researched'].push(l); // bucket unknowns
    });
    return map;
  }, [filtered]);

  const meetingsBooked = byStage['Meeting Booked']?.length || 0;
  const contacted = (byStage['Contacted']?.length || 0) +
                    (byStage['Followed Up']?.length || 0) +
                    (byStage['Meeting Booked']?.length || 0);
  const conversion = contacted > 0 ? Math.round((meetingsBooked / contacted) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={UsersIcon} label="Total Leads"     value={allLeads.length} />
        <Stat icon={Calendar} label="Meetings Booked" value={meetingsBooked} accent="#22c55e" />
        <Stat icon={TrendingUp} label="Contacted → Meeting" value={conversion + '%'} accent="#3b82f6" />
        <Stat icon={Building} label="Existing Client Reqs" value={existingClientLeads.length} accent="#eab308" />
      </div>

      {/* Filters */}
      <div className="panel p-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-sm text-[#9ca3af] mr-2">
          <FilterIcon size={14} /> Filters
        </div>
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
        <Select
          label="Existing Client"
          value={filters.existingClient}
          onChange={(v) => setFilters((f) => ({ ...f, existingClient: v }))}
          options={['All', 'Yes', 'No']}
        />
        <Select
          label="Stage"
          value={filters.stage}
          onChange={(v) => setFilters((f) => ({ ...f, stage: v }))}
          options={['All', ...STAGES]}
        />
      </div>

      {/* Existing-client section */}
      {existingClientLeads.length > 0 && (
        <div className="panel p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-[#eab308] tracking-wide">
              Existing Client — Open Requisitions
            </div>
            <div className="text-xs text-[#9ca3af]">{existingClientLeads.length} open</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {existingClientLeads.map((l) => (
              <LeadCard key={l._rowIndex + '-ec'} lead={l} compact onClick={() => setSelected(l)} />
            ))}
          </div>
        </div>
      )}

      {/* Kanban */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 min-w-max">
          {STAGES.map((stage) => (
            <KanbanColumn
              key={stage}
              title={stage}
              leads={byStage[stage] || []}
              onSelect={setSelected}
            />
          ))}
        </div>
      </div>

      {!loading && allLeads.length === 0 && (
        <div className="panel p-10 text-center text-[#9ca3af] text-sm">
          No leads yet. Add some via Scout or directly in the Sheet.
        </div>
      )}

      {selected && <LeadDrawer lead={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-[#9ca3af] uppercase tracking-wider">{label}</div>
        <Icon size={16} className="text-[#6b7280]" />
      </div>
      <div className="mt-2 text-2xl font-semibold" style={{ color: accent || '#e5e7eb' }}>{value}</div>
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="flex items-center gap-2 text-xs text-[#9ca3af]">
      <span>{label}:</span>
      <select
        className="input text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function KanbanColumn({ title, leads, onSelect }) {
  const color = STAGE_COLORS[title] || '#6b7280';
  return (
    <div className="w-72 flex-shrink-0 panel p-3 flex flex-col max-h-[calc(100vh-340px)] min-h-80">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <span className="text-xs text-[#6b7280] panel-2 px-2 py-0.5">{leads.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {leads.length === 0 ? (
          <div className="text-xs text-[#4b5563] italic py-4 text-center">empty</div>
        ) : leads.map((l) => (
          <LeadCard key={l._rowIndex} lead={l} onClick={() => onSelect(l)} />
        ))}
      </div>
    </div>
  );
}

function LeadCard({ lead, onClick, compact }) {
  const role = ROLE_BADGE[lead['Role Type']] || ROLE_BADGE['Perm'];
  return (
    <button
      onClick={onClick}
      className="panel-2 w-full text-left p-3 hover:border-[#3b82f6]/40 transition cursor-pointer"
    >
      <div className="text-sm font-medium text-white truncate">
        {lead.Company || '—'}
      </div>
      <div className="text-xs text-[#9ca3af] truncate mt-0.5">
        {lead['Contact Name'] || '—'}{lead['Contact Title'] ? ` · ${lead['Contact Title']}` : ''}
      </div>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {lead['Role Type'] && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${role.bg} ${role.text} ${role.border}`}>
            {lead['Role Type']}
          </span>
        )}
        {!compact && lead.Industry && (
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#1e1e2e] bg-[#0d0d14] text-[#9ca3af]">
            {lead.Industry}
          </span>
        )}
        {isTrueish(lead['Existing Client']) && (
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#eab308]/30 bg-[#eab308]/10 text-[#fde047]">
            Existing
          </span>
        )}
      </div>
    </button>
  );
}

function LeadDrawer({ lead, onClose }) {
  const fields = [
    ['Company', lead.Company],
    ['Contact', `${lead['Contact Name'] || ''} ${lead['Contact Title'] ? `(${lead['Contact Title']})` : ''}`.trim()],
    ['LinkedIn', lead['LinkedIn URL']],
    ['Industry', lead.Industry],
    ['Location', lead.Location],
    ['Source', lead.Source],
    ['Role Type', lead['Role Type']],
    ['Pipeline Stage', lead['Pipeline Stage']],
    ['Last Action', `${lead['Last Action'] || ''} ${lead['Last Action Date'] ? `(${lead['Last Action Date']})` : ''}`.trim()],
    ['Next Step', `${lead['Next Step'] || ''} ${lead['Next Step Date'] ? `(${lead['Next Step Date']})` : ''}`.trim()],
    ['Existing Client', isTrueish(lead['Existing Client']) ? 'Yes' : 'No'],
    ['Created', lead['Created Date']],
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-md h-full bg-[#12121a] border-l border-[#1e1e2e] overflow-y-auto fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 h-12 border-b border-[#1e1e2e] bg-[#0f0f17]">
          <div className="text-sm font-semibold truncate">{lead.Company || 'Lead detail'}</div>
          <button className="text-[#9ca3af] hover:text-white" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {fields.map(([k, v]) => v ? (
            <div key={k}>
              <div className="text-[10px] uppercase tracking-wider text-[#6b7280]">{k}</div>
              <div className="text-sm text-[#e5e7eb] mt-0.5 break-words">
                {k === 'LinkedIn' && /^https?:\/\//.test(v)
                  ? <a href={v} target="_blank" rel="noreferrer" className="text-[#3b82f6] hover:underline">{v}</a>
                  : String(v)}
              </div>
            </div>
          ) : null)}
          {lead.Notes && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#6b7280]">Notes</div>
              <div className="panel-2 p-3 mt-1 text-sm whitespace-pre-wrap">{lead.Notes}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
