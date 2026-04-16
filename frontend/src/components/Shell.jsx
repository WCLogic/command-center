import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Crosshair, Building, CheckSquare, Users, DollarSign,
  RefreshCw, Lock,
} from 'lucide-react';
import { useData } from '../lib/data.jsx';
import WelcomeBanner from './WelcomeBanner.jsx';

/**
 * Layout shell:
 *   - Desktop: fixed left sidebar (224px) with icon + label, active-section
 *     accent = 2px left border in blue. Minimal top bar with app name and
 *     refresh control.
 *   - Mobile: sidebar collapses to a bottom tab bar. No hamburger. No
 *     drawer. The five sections are always one tap away.
 *
 * Finances is rendered as a locked item — dimmed, but still navigable so
 * the user can see the placeholder and understand why it's locked.
 */
const NAV = [
  { to: '/leads',    label: 'Leads & Outreach',   icon: Crosshair   },
  { to: '/family',   label: 'Family Businesses',  icon: Building    },
  { to: '/tasks',    label: 'Tasks & To-Dos',     icon: CheckSquare },
  { to: '/agents',   label: 'Agent Roster',       icon: Users       },
  { to: '/finances', label: 'Finances',           icon: DollarSign, locked: true },
];

export default function Shell() {
  const { refresh, loading, error, lastFetch } = useData();
  const [showWelcome, setShowWelcome] = React.useState(true);

  return (
    <div className="min-h-screen flex bg-[#09090b] text-[#fafafa]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r border-[#27272a] bg-[#09090b] flex-shrink-0">
        <SidebarHeader />
        <Nav orientation="vertical" />
        <SidebarFooter />
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          loading={loading}
          error={error}
          lastFetch={lastFetch}
          onRefresh={refresh}
        />

        <main className="flex-1 px-4 md:px-8 py-6 pb-safe overflow-x-hidden">
          <div className="max-w-[1600px] mx-auto space-y-6">
            {showWelcome && <WelcomeBanner onDismiss={() => setShowWelcome(false)} />}

            {error && (
              <div className="panel p-3 flex items-center gap-2 text-sm border-[#ef4444]/40">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                <span className="text-[#fafafa]">Data error:</span>
                <span className="text-[#a1a1aa]">{error}</span>
              </div>
            )}

            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#09090b] border-t border-[#27272a]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <Nav orientation="horizontal" />
      </nav>
    </div>
  );
}

function SidebarHeader() {
  return (
    <div className="h-14 flex items-center px-5 border-b border-[#27272a]">
      <div className="text-[13px] font-semibold tracking-[0.14em] uppercase text-[#fafafa]">
        Command Center
      </div>
    </div>
  );
}

function SidebarFooter() {
  return (
    <div className="px-5 py-4 border-t border-[#27272a] text-[11px] text-[#71717a] tracking-wide">
      v1.0 · Mr. Chase
    </div>
  );
}

function TopBar({ loading, error, lastFetch, onRefresh }) {
  const status =
    loading ? { label: 'Syncing', color: '#3b82f6' } :
    error   ? { label: 'Error',   color: '#ef4444' } :
              { label: 'Live',    color: '#22c55e' };

  return (
    <header className="h-14 flex items-center justify-between px-4 md:px-8 border-b border-[#27272a] bg-[#09090b] sticky top-0 z-30">
      <div className="md:hidden text-[13px] font-semibold tracking-[0.14em] uppercase text-[#fafafa]">
        Command Center
      </div>

      <div className="hidden md:flex items-center gap-2 text-[12px] text-[#a1a1aa]">
        <span
          className={`w-1.5 h-1.5 rounded-full ${loading ? 'animate-pulse' : ''}`}
          style={{ background: status.color }}
        />
        <span className="uppercase tracking-wider text-[10px]">{status.label}</span>
        {lastFetch && !loading && !error && (
          <span className="text-[#71717a]">· Updated {formatTime(lastFetch)}</span>
        )}
      </div>

      <button
        className="btn btn-ghost"
        onClick={onRefresh}
        disabled={loading}
        aria-label="Refresh data"
      >
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        <span className="hidden sm:inline text-[12px]">Refresh</span>
      </button>
    </header>
  );
}

function Nav({ orientation }) {
  const vertical = orientation === 'vertical';
  return (
    <div
      className={
        vertical
          ? 'flex-1 py-3 overflow-y-auto'
          : 'grid grid-cols-5'
      }
    >
      {NAV.map((item) => (
        <NavItem key={item.to} item={item} vertical={vertical} />
      ))}
    </div>
  );
}

function NavItem({ item, vertical }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={false}
      className={({ isActive }) => {
        if (vertical) {
          return [
            'group relative flex items-center gap-3 px-5 py-2.5 text-[13px] transition',
            isActive
              ? 'text-[#fafafa] bg-[#18181b]'
              : 'text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b]',
          ].join(' ');
        }
        return [
          'relative flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] transition',
          isActive
            ? 'text-[#fafafa]'
            : 'text-[#a1a1aa] active:text-[#fafafa]',
        ].join(' ');
      }}
    >
      {({ isActive }) => (
        <>
          {vertical && (
            <span
              aria-hidden
              className="absolute left-0 top-0 bottom-0 w-0.5"
              style={{ background: isActive ? '#3b82f6' : 'transparent' }}
            />
          )}
          {!vertical && isActive && (
            <span
              aria-hidden
              className="absolute top-0 inset-x-6 h-0.5"
              style={{ background: '#3b82f6' }}
            />
          )}
          <Icon
            size={vertical ? 15 : 18}
            className={item.locked ? 'opacity-50' : ''}
          />
          <span className={item.locked ? 'flex items-center gap-1 opacity-60' : ''}>
            {vertical ? (
              <>
                {item.label}
                {item.locked && <Lock size={10} className="inline ml-1 text-[#71717a]" />}
              </>
            ) : (
              shortLabel(item.label)
            )}
          </span>
        </>
      )}
    </NavLink>
  );
}

function shortLabel(label) {
  // Bottom tab bar uses compact labels.
  const map = {
    'Leads & Outreach':  'Leads',
    'Family Businesses': 'Family',
    'Tasks & To-Dos':    'Tasks',
    'Agent Roster':      'Agents',
    'Finances':          'Finances',
  };
  return map[label] || label;
}

function formatTime(d) {
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}
