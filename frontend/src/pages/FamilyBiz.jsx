import React, { useState } from 'react';
import { useData, SHEET_TABS } from '../lib/data.jsx';
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';

/**
 * Family Businesses — 3x2 grid (desktop) / 2x3 (tablet) / 1x6 (mobile).
 *
 * Alert badge: domain expiry for Logic Management. The badge attaches to
 * the card itself rather than a top-of-page banner — closer to the signal,
 * less visual noise.
 */
const STATUS_COLOR = {
  Active:   '#22c55e',
  Planning: '#3b82f6',
  Pending:  '#eab308',
  'On Hold':'#a1a1aa',
};

function statusColor(s) {
  return STATUS_COLOR[s] || '#a1a1aa';
}

// Logic Management domain renewal — spec'd in COMMAND_CENTER_SPEC.md §3.2
const DOMAIN_EXPIRY = new Date('2026-05-17T00:00:00');
const ALERT_WINDOW_DAYS = 60;

function domainAlertFor(biz, today = new Date()) {
  const name = biz['Business Name'] || '';
  if (!/logic management/i.test(name)) return null;
  const days = Math.ceil((DOMAIN_EXPIRY - today) / 86_400_000);
  if (days <= 0 || days > ALERT_WINDOW_DAYS) return null;
  return {
    days,
    text: days === 1
      ? 'Domain expires tomorrow'
      : `Domain expires in ${days} days`,
  };
}

export default function FamilyBiz() {
  const { tabs, loading } = useData();
  const tab = tabs[SHEET_TABS[1]];
  const businesses = tab?.rows || [];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Family Businesses"
        subtitle="Entity registry — status, open items, and notes"
      />

      {!loading && businesses.length === 0 && (
        <div className="panel p-10 text-center text-[#a1a1aa] text-sm">
          No family business records yet.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {businesses.map((b) => (
          <BizCard key={b._rowIndex} biz={b} />
        ))}
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

function BizCard({ biz }) {
  const [open, setOpen] = useState(false);
  const status = biz.Status || 'Active';
  const color = statusColor(status);
  const openItems = parseOpenItems(biz['Open Items']);
  const alert = domainAlertFor(biz);

  return (
    <div className="panel overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-3 flex items-start justify-between hover:bg-[#1f1f23] transition"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-[#fafafa] truncate">
              {biz['Business Name'] || '—'}
            </span>
            {alert && (
              <span
                className="flex-shrink-0 flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#eab308] border border-[#eab308]/40 rounded px-1.5 py-0.5"
                title={alert.text}
              >
                <AlertTriangle size={10} />
                Alert
              </span>
            )}
          </div>
          {biz.Category && (
            <div className="mt-1">
              <span className="text-[10px] uppercase tracking-wider text-[#71717a]">
                {biz.Category}
              </span>
            </div>
          )}
          <div className="flex items-center gap-3 mt-2 text-[12px]">
            <span className="flex items-center gap-1.5 text-[#a1a1aa]">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
              {status}
            </span>
            {openItems.length > 0 && (
              <span className="text-[#71717a]">
                {openItems.length} open item{openItems.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>
        <div className="text-[#71717a] pt-1 flex-shrink-0">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </button>

      {open && (
        <div className="border-t border-[#27272a] px-4 py-4 space-y-3 fade-in">
          {alert && (
            <div className="panel-sub border-[#eab308]/40 p-3 flex items-start gap-2">
              <AlertTriangle size={14} className="text-[#eab308] flex-shrink-0 mt-0.5" />
              <div className="text-[12px]">
                <div className="text-[#fafafa] font-medium">{alert.text}</div>
                <div className="text-[#a1a1aa] mt-0.5">
                  Logic Management domain expires {formatDate(DOMAIN_EXPIRY)}. Renew to avoid disruption.
                </div>
              </div>
            </div>
          )}

          {biz['Entity Type']   && <Field label="Entity Type"   value={biz['Entity Type']} />}
          {biz['Key Contact']   && <Field label="Key Contact"   value={biz['Key Contact']} />}
          {biz['Last Updated']  && <Field label="Last Updated"  value={biz['Last Updated']} />}

          {openItems.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#71717a] mb-1.5">
                Open Items
              </div>
              <ul className="space-y-1.5">
                {openItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-[#fafafa]">
                    <span className="w-1 h-1 rounded-full bg-[#71717a] mt-2 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {biz.Notes && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#71717a] mb-1">
                Notes
              </div>
              <div className="panel-sub p-3 text-[13px] whitespace-pre-wrap text-[#fafafa]">
                {biz.Notes}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }) {
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
  const isUrl   = /^https?:\/\//.test(String(value));
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[#71717a]">{label}</div>
      <div className="text-[13px] text-[#fafafa] mt-0.5 break-words">
        {isUrl && !isEmail
          ? <a href={value} target="_blank" rel="noreferrer" className="text-[#3b82f6] hover:underline">{value}</a>
          : String(value)}
      </div>
    </div>
  );
}

function parseOpenItems(s) {
  if (!s) return [];
  return String(s)
    .split(/[\n;|]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function formatDate(d) {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
