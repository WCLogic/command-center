import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Briefcase, Building2, CheckSquare, Users, DollarSign,
  RefreshCw, Activity, Menu, X,
} from 'lucide-react';
import { useData } from '../lib/data.jsx';

const NAV = [
  { to: '/leads',        label: 'Leads & Outreach', icon: Briefcase },
  { to: '/family',       label: 'Family Businesses', icon: Building2 },
  { to: '/tasks',        label: 'Tasks & To-Dos',    icon: CheckSquare },
  { to: '/agents',       label: 'Agent Roster',      icon: Users },
  { to: '/finances',     label: 'Finances',          icon: DollarSign },
];

export default function Shell() {
  const { refresh, loading, error, lastFetch } = useData();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="min-h-screen flex bg-[#0a0a0f] text-[#e5e7eb]">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex flex-col w-60 border-r border-[#1e1e2e] bg-[#12121a]">
        <SidebarBody />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="w-60 bg-[#12121a] border-r border-[#1e1e2e] flex flex-col">
            <SidebarBody onNav={() => setMobileOpen(false)} />
          </div>
          <div className="flex-1 bg-black/60" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 md:px-6 h-14 border-b border-[#1e1e2e] bg-[#0f0f17] sticky top-0 z-30">
          <button
            className="md:hidden btn"
            onClick={() => setMobileOpen(true)}
            aria-label="Open nav"
          >
            <Menu size={16} />
          </button>
          <div className="flex items-center gap-3 text-sm text-[#9ca3af]">
            <Activity size={14} className={loading ? 'animate-pulse text-[#3b82f6]' : 'text-[#22c55e]'} />
            <span>
              {loading ? 'Loading…' :
               error ? <span className="text-[#ef4444]">Error</span> :
               lastFetch ? `Updated ${formatTime(lastFetch)}` : 'Ready'}
            </span>
          </div>
          <button className="btn" onClick={refresh} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </header>

        {error && (
          <div className="mx-4 md:mx-6 mt-4 p-3 rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/10 text-[#fca5a5] text-sm">
            <strong className="text-[#ef4444]">Data error:</strong>{' '}
            {error}
          </div>
        )}

        <main className="flex-1 p-4 md:p-6 fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );

  function SidebarBody({ onNav }) {
    return (
      <>
        <div className="h-14 flex items-center justify-between px-4 border-b border-[#1e1e2e]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#3b82f6] flex items-center justify-center">
              <span className="text-white text-xs font-bold">CC</span>
            </div>
            <div className="text-sm font-semibold tracking-wide">Command Center</div>
          </div>
          <button
            className="md:hidden text-[#9ca3af]"
            onClick={() => setMobileOpen(false)}
            aria-label="Close nav"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNav}
                className={({ isActive }) =>
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ' +
                  (isActive
                    ? 'bg-[#3b82f6]/15 text-white border border-[#3b82f6]/30'
                    : 'text-[#9ca3af] hover:text-white hover:bg-[#1e1e2e] border border-transparent')
                }
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-[#1e1e2e] text-[11px] text-[#6b7280]">
          v1.0 · Mr. Chase
        </div>
      </>
    );
  }
}

function formatTime(d) {
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}
