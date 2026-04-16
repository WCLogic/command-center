import React, { useMemo, useState } from 'react';
import { useData, SHEET_TABS } from '../lib/data.jsx';
import { X, Activity, FileText, Shield, Clock, FileCheck2, ChevronDown, ChevronRight } from 'lucide-react';
import OrgChart from '../components/OrgChart.jsx';

/**
 * Agent Roster — hierarchical org chart + per-agent detail cards.
 *
 * Org chart is fixed (5 primary agents + Nolan as Billboard's sub-agent).
 * Detail cards expand inline for any agent present in the Sheet.
 */
const HEALTH_COLOR = {
  Healthy: '#22c55e',
  Active:  '#22c55e',
  OK:      '#22c55e',
  Green:   '#22c55e',
  Degraded:'#eab308',
  Warning: '#eab308',
  Yellow:  '#eab308',
  Error:   '#ef4444',
  Critical:'#ef4444',
  Red:     '#ef4444',
  Offline: '#71717a',
  Idle:    '#71717a',
};

function healthColor(v) {
  return HEALTH_COLOR[String(v || '').trim()] || '#71717a';
}

export default function AgentRoster() {
  const { tabs } = useData();
  const tab = tabs[SHEET_TABS[3]];
  const agents = tab?.rows || [];

  const agentByName = useMemo(() => {
    const map = {};
    agents.forEach((a) => {
      const name = a['Agent Name'];
      if (name) map[name] = a;
    });
    return map;
  }, [agents]);

  const [drawerAgent, setDrawerAgent] = useState(null);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Agent Roster"
        subtitle="Operational team — hierarchy, status, and audit results"
      />

      {/* Org chart */}
      <div className="panel p-4 md:p-6">
        <OrgChart agentByName={agentByName} onSelect={setDrawerAgent} />
      </div>

      {/* Detail cards */}
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-wider text-[#71717a] px-1">
          Details
        </div>
        {agents.length === 0 ? (
          <div className="panel p-10 text-center text-[#a1a1aa] text-sm">
            No agents in roster yet.
          </div>
        ) : (
          <div className="space-y-2">
            {agents.map((a) => (
              <AgentDetailCard key={a._rowIndex} agent={a} />
            ))}
          </div>
        )}
      </div>

      {drawerAgent && (
        <AgentDrawer agent={drawerAgent} onClose={() => setDrawerAgent(null)} />
      )}
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div>
      <h1 className="text-lg font-semibold text-[#fafafa] tracking-tight">{title}</h1>
      {subtitle && <p className="text-[12px] text-[#71717a] mt-0.5">{subtitle}</p>}
    </div>
  );
}

function AgentDetailCard({ agent }) {
  const [open, setOpen] = useState(false);
  const dot = healthColor(agent.Health || agent.Status);
  const name = agent['Agent Name'] || '—';
  const role = agent.Role || '—';

  return (
    <div className="panel overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#1f1f23] transition text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot }} />
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-[#fafafa] truncate">{name}</div>
            <div className="text-[11px] text-[#71717a] uppercase tracking-wider truncate">{role}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          {agent.Status && (
            <span className="text-[11px] text-[#a1a1aa] hidden sm:inline">{agent.Status}</span>
          )}
          <span className="text-[#71717a]">
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        </div>
      </button>
      {open && (
        <div className="border-t border-[#27272a] px-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 fade-in">
          {agent['Current Assignment'] && (
            <Field label="Current Assignment" value={agent['Current Assignment']} icon={FileText} />
          )}
          {agent.Health && (
            <Field label="Health" value={agent.Health} icon={Activity} color={healthColor(agent.Health)} />
          )}
          {agent['Last Active'] && (
            <Field label="Last Active" value={agent['Last Active']} icon={Clock} />
          )}
          {agent['Last Audit'] && (
            <Field label="Last Audit" value={agent['Last Audit']} icon={FileCheck2} />
          )}
          {agent['Audit Result'] && (
            <Field label="Audit Result" value={agent['Audit Result']} icon={FileCheck2} />
          )}
          {agent['Security Policy'] && (
            <Field label="Security Policy" value={agent['Security Policy']} icon={Shield} />
          )}
          {agent['Health Notes'] && (
            <div className="md:col-span-2">
              <FieldLabel label="Health Notes" />
              <div className="panel-sub p-3 mt-1 text-[13px] text-[#fafafa] whitespace-pre-wrap">
                {agent['Health Notes']}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, icon: Icon, color }) {
  return (
    <div>
      <FieldLabel label={label} icon={Icon} />
      <div
        className="text-[13px] mt-0.5 break-words"
        style={{ color: color || '#fafafa' }}
      >
        {String(value)}
      </div>
    </div>
  );
}

function FieldLabel({ label, icon: Icon }) {
  return (
    <div className="text-[10px] uppercase tracking-wider text-[#71717a] flex items-center gap-1">
      {Icon && <Icon size={10} />} {label}
    </div>
  );
}

function AgentDrawer({ agent, onClose }) {
  const dot = healthColor(agent.Health || agent.Status);
  const pairs = [
    ['Role', agent.Role],
    ['Reports To', agent['Reports To']],
    ['Status', agent.Status],
    ['Health', agent.Health],
    ['Current Assignment', agent['Current Assignment']],
    ['Last Active', agent['Last Active']],
    ['Context File', agent['Context File']],
    ['Security Policy', agent['Security Policy']],
    ['Last Audit', agent['Last Audit']],
    ['Audit Result', agent['Audit Result']],
    ['Health Notes', agent['Health Notes']],
  ];
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-md h-full bg-[#18181b] border-l border-[#27272a] overflow-y-auto fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 h-12 border-b border-[#27272a] bg-[#18181b]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
            <div className="text-sm font-semibold text-[#fafafa]">
              {agent['Agent Name'] || 'Agent'}
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {pairs.map(([k, v]) => v ? (
            <div key={k}>
              <div className="text-[10px] uppercase tracking-wider text-[#71717a]">{k}</div>
              <div className="text-[13px] text-[#fafafa] mt-0.5 break-words">{String(v)}</div>
            </div>
          ) : null)}
        </div>
      </div>
    </div>
  );
}
