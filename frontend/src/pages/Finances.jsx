import React from 'react';
import { Lock, DollarSign, BarChart3, Wallet, TrendingUp, Briefcase } from 'lucide-react';

export default function Finances() {
  const planned = [
    { icon: Wallet,     label: 'Salary tracking' },
    { icon: BarChart3,  label: 'Budgeting' },
    { icon: TrendingUp, label: 'Investment analysis' },
    { icon: DollarSign, label: 'Cash flow' },
    { icon: Briefcase,  label: 'Long-term planning' },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="panel p-8 md:p-10 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-[#1a1a24] border border-[#1e1e2e] flex items-center justify-center">
          <Lock size={22} className="text-[#6b7280]" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-white">Finances — Pending Scrooge Onboarding</h2>
        <p className="mt-2 text-sm text-[#9ca3af] max-w-xl mx-auto">
          This section will contain interactive financial dashboards including salary tracking, budgeting,
          investment analysis, cash flow, and planning. Locked until Scrooge is online and the data sources are wired.
        </p>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
          {planned.map(({ icon: Icon, label }) => (
            <div key={label} className="panel-2 p-3 opacity-60">
              <Icon size={18} className="mx-auto text-[#6b7280]" />
              <div className="mt-2 text-xs text-[#9ca3af]">{label}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 inline-flex items-center gap-2 text-[11px] uppercase tracking-wider text-[#6b7280] panel-2 px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#eab308] animate-pulse" />
          Coming soon
        </div>
      </div>
    </div>
  );
}
