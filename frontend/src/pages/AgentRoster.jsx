import React, { useState } from 'react';
import { useData, SHEET_TABS } from '../lib/data.jsx';
import { Crown, Bot, X, Activity, FileText, Shield, Clock, FileCheck2 } from 'lucide-react';

const HEALTH_COLOR = {
  'Healthy': '#22c55e',
  'Active':  '#22c55e',
  'OK':      '#22c55e',
  'Green':   '#22c55e',
  'Degraded':'#eab308',
  'Warning': '#eab308',
  'Yellow':  '#eab308',
  'Down':    '#ef4444',
  'Critical':'#ef4444',
  'Red':     '#ef4444',
};

function healthDot(h) {
  return HEALTH_COLOR[String(h || '').trim()] || '#6b7280';
}

export default function AgentRoster() {
  const { tabs } = useData();
  const tab = tabs[SHEET_TABS[3]];
  const agents = tab?.rows || [];
  const [selected, setSelected] = useState(null);

  return (
    <div className="space-y-6">
      {/* Mr. Chase node */}
      <div className="flex justify-center">
        <div className="panel p-4 w-64 text-center border-[#3b82f6]/40">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#3b82f6]/15 border border-[#3b82f6]/40 flex items-center justify-center">
            <Crown size={20} className="text-[#3b82f6]" />
          </div>
          <div className="mt-2 font-semibold text-white">Mr. Chase</div>
          <div className="text-xs text-[#9ca3af]">Principal</div>
        </div>
      </div>

      {/* Connector lines */}
      {agents.length > 0 && (
        <div className="hidden md:flex justify-center">
          <svg width="100%" height="40" viewBox="0 0 800 40" preserveAspectRatio="none" className="max-w-4xl">
            <line x1="400" y1="0" x2="400" y2="20" stroke="#1e1e2e" strokeWidth="2" />
            <line x1="80" y1="20" x2="720" y2="20" stroke="#1e1e2e" strokeWidth="2" />
            {agents.map((_, i) => {
              const x = 80 + ((720 - 80) * i) / Math.max(agents.length - 1, 1);
              return <line key={i} x1={x} y1="20" x2={x} y2="40" stroke="#1e1e2e" strokeWidth="2" />;
            })}
          </svg>
        </div>
      )}

      {/* Agent grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {agents.map((a) => (
          <button
            key={a._rowIndex}
            onClick={() => setSelected(a)}
            className="panel p-4 text-center hover:border-[#3b82f6]/40 transition cursor-pointer"
          >
            <div className="relative w-12 h-12 mx-auto rounded-full bg-[#1a1a24] border border-[#1e1e2e] flex items-center justify-center">
              <Bot size={20} className="text-[#9ca3af]" />
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#12121a]"
                style={{ background: healthDot(a.Health || a.Status) }}
              />
            </div>
            <div className="mt-2 font-semibold text-sm text-white truncate">
              {a['Agent Name'] || a.Agent || a.Name || '—'}
            </div>
            <div className="text-[11px] text-[#9ca3af] truncate">{a.Role || ''}</div>
          </button>
        ))}
      </div>

      {agents.length === 0 && (
        <div className="panel p-10 text-center text-[#9ca3af] text-sm">
          No agents in roster yet.
        </div>
      )}

      {selected && <AgentDrawer agent={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function AgentDrawer({ agent, onClose }) {
  const dot = healthDot(agent.Health || agent.Status);
  const pairs = [
    ['Role', agent.Role],
    ['Current Assignment', agent['Current Assignment'] || agent.Assignment],
    ['Status', agent.Status],
    ['Health', agent.Health, dot],
    ['Last Active', agent['Last Active']],
    ['Context File', agent['Context File']],
    ['Security Policy', agent['Security Policy'] || agent['Security Policy Version']],
    ['Last Audit', agent['Last Audit']],
    ['Audit Result', agent['Audit Result']],
    ['Health Notes', agent['Health Notes']],
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-md h-full bg-[#12121a] border-l border-[#1e1e2e] overflow-y-auto fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 h-12 border-b border-[#1e1e2e] bg-[#0f0f17]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: dot }} />
            <div className="text-sm font-semibold">{agent.Agent || agent.Name}</div>
          </div>
          <button className="text-[#9ca3af] hover:text-white" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {pairs.map(([k, v, color]) => v ? (
            <div key={k}>
              <div className="text-[10px] uppercase tracking-wider text-[#6b7280] flex items-center gap-1">
                {iconFor(k)} {k}
              </div>
              <div
                className="text-sm mt-0.5 break-words"
                style={color ? { color } : undefined}
              >
                {String(v)}
              </div>
            </div>
          ) : null)}
        </div>
      </div>
    </div>
  );
}

function iconFor(k) {
  switch (k) {
    case 'Role':                    return <Bot size={11} />;
    case 'Current Assignment':      return <FileText size={11} />;
    case 'Status':
    case 'Health':                  return <Activity size={11} />;
    case 'Last Active':             return <Clock size={11} />;
    case 'Context File':            return <FileText size={11} />;
    case 'Security Policy':
    case 'Security Policy Version': return <Shield size={11} />;
    case 'Last Audit':
    case 'Audit Result':            return <FileCheck2 size={11} />;
    default:                        return null;
  }
}
