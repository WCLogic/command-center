import React from 'react';
import { Lock } from 'lucide-react';

/**
 * Finances — locked placeholder.
 *
 * Pending Scrooge onboarding (COMMAND_CENTER_SPEC.md §3.5). Rendered in a
 * muted state so it is clearly inactive but still shows what will live here.
 */
export default function Finances() {
  return (
    <div className="space-y-4">
      <SectionHeader
        title="Finances"
        subtitle="Locked — pending Scrooge onboarding"
      />

      <div className="panel p-10 md:p-14 text-center opacity-80">
        <div className="w-12 h-12 mx-auto rounded-full bg-[#18181b] border border-[#27272a] flex items-center justify-center">
          <Lock size={18} className="text-[#71717a]" />
        </div>
        <h2 className="mt-4 text-[15px] font-semibold text-[#a1a1aa]">
          Pending Scrooge onboarding
        </h2>
        <p className="mt-2 text-[13px] text-[#71717a] max-w-md mx-auto">
          Financial dashboards — salary, budget, investments, cash flow — come online
          once Scrooge is fully onboarded and data sources are wired.
        </p>

        <div className="mt-8 inline-flex items-center gap-2 text-[10px] uppercase tracking-wider text-[#71717a]">
          <span className="w-1 h-1 rounded-full bg-[#71717a]" />
          Inactive
        </div>
      </div>
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
