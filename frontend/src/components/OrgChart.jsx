import React from 'react';

/**
 * Hierarchical org chart for the agent roster.
 *
 * Structure (fixed — mirrors the operating team):
 *
 *                        [WC]
 *                         |
 *   +-------+-------+-----+-----+-------+
 *   |       |       |           |       |
 *  [J]     [E]     [S]         [B]     [$]
 *                               |
 *                              [N]   <- Nolan is a sub-agent of Billboard
 *
 * Sheet data flows in via `agentByName` (keyed by Agent Name). If a node is
 * not present in the sheet, it still renders with its hardcoded identity --
 * structural hierarchy does not blink in and out as data loads.
 */
const PRINCIPAL = { initials: 'WC', name: 'Mr. Chase', role: 'Principal' };

const AGENTS = [
  { initials: 'J', name: 'Jarvis',    role: 'Executive Assistant' },
  { initials: 'E', name: 'EagleEye',  role: 'CISO' },
  { initials: 'S', name: 'Scout',     role: 'President of BD' },
  { initials: 'B', name: 'Billboard', role: 'Head of Marketing' },
  { initials: '$', name: 'Scrooge',   role: 'CFO' },
];

const SUB_AGENT = {
  parent: 'Billboard',
  initials: 'N',
  name: 'Nolan',
  role: 'Content Producer',
};

const HEALTH_COLOR = {
  Healthy: '#22c55e',
  Active:  '#22c55e',
  Green:   '#22c55e',
  OK:      '#22c55e',
  Warning: '#eab308',
  Degraded:'#eab308',
  Yellow:  '#eab308',
  Error:   '#ef4444',
  Critical:'#ef4444',
  Red:     '#ef4444',
  Offline: '#71717a',
  Idle:    '#71717a',
};

function statusDot(val) {
  const k = String(val || '').trim();
  return HEALTH_COLOR[k] || '#71717a';
}

export default function OrgChart({ agentByName = {}, onSelect }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[620px] flex flex-col items-center pt-2 pb-4">
        {/* Principal */}
        <Node agent={PRINCIPAL} principal />

        {/* Vertical stem from principal to bus */}
        <Segment height={20} />

        {/* Horizontal bus spanning the five children */}
        <BranchBus count={AGENTS.length} />

        {/* Row of five primary agents (+ Billboard's Nolan branch) */}
        <div className="grid grid-cols-5 w-full max-w-3xl">
          {AGENTS.map((a) => {
            const hasSub = a.name === SUB_AGENT.parent;
            const sheet = agentByName[a.name];
            return (
              <div key={a.name} className="flex flex-col items-center px-2">
                <Node
                  agent={a}
                  sheet={sheet}
                  onClick={sheet ? () => onSelect?.(sheet) : undefined}
                />
                {hasSub && (
                  <>
                    <Segment height={18} />
                    <Node agent={SUB_AGENT} sub />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Segment({ height = 16 }) {
  return (
    <div
      aria-hidden
      style={{ width: 1, height, background: '#27272a' }}
    />
  );
}

function BranchBus({ count }) {
  // Horizontal line spans the centers of the outer two columns.
  // Each column's center is at ((100/count)/2)% of the container.
  const edge = `${100 / count / 2}%`;
  return (
    <div className="relative w-full max-w-3xl">
      <div
        aria-hidden
        className="absolute top-0 h-px"
        style={{ background: '#27272a', left: edge, right: edge }}
      />
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex justify-center">
            <div style={{ width: 1, height: 20, background: '#27272a' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Node({ agent, sheet, principal, sub, onClick }) {
  const size = principal ? 56 : sub ? 40 : 48;
  const fontSize = principal ? 16 : sub ? 12 : 14;
  const clickable = !!onClick;
  const dotColor = sheet ? statusDot(sheet.Health || sheet.Status) : '#3f3f46';

  const ringClass = principal
    ? 'border border-[#3f3f46] bg-[#27272a]'
    : 'border border-[#3b82f6]/60 bg-[#18181b]';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={[
        'flex flex-col items-center text-center',
        clickable ? 'cursor-pointer group' : 'cursor-default',
      ].join(' ')}
    >
      <div
        className={[
          'relative rounded-full flex items-center justify-center transition',
          ringClass,
          clickable ? 'group-hover:border-[#3b82f6]' : '',
        ].join(' ')}
        style={{ width: size, height: size }}
      >
        <span
          className="font-semibold text-[#fafafa]"
          style={{ fontSize, letterSpacing: '0.02em' }}
        >
          {agent.initials}
        </span>
        {!principal && (
          <span
            aria-hidden
            className="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-[#09090b]"
            style={{ width: 10, height: 10, background: dotColor }}
          />
        )}
      </div>
      <div className="mt-2 text-[12px] font-medium text-[#fafafa] leading-tight">
        {agent.name}
      </div>
      <div
        className="text-[10px] text-[#71717a] leading-tight mt-0.5 uppercase tracking-wider"
        style={{ maxWidth: 120 }}
      >
        {agent.role}
      </div>
    </button>
  );
}
