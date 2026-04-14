import React, { useMemo, useState } from 'react';
import { useData, SHEET_TABS } from '../lib/data.jsx';
import { ChevronDown, ChevronRight, AlertTriangle, Building2, Mail, Phone, FileText } from 'lucide-react';

const STATUS_COLORS = {
  'Healthy':         { bg: '#22c55e', text: '#bbf7d0' },
  'Active':          { bg: '#22c55e', text: '#bbf7d0' },
  'Operational':     { bg: '#22c55e', text: '#bbf7d0' },
  'Renewal Cycle':   { bg: '#3b82f6', text: '#bfdbfe' },
  'Action Required': { bg: '#eab308', text: '#fef08a' },
  'Domain Expiring': { bg: '#eab308', text: '#fef08a' },
  'At Risk':         { bg: '#ef4444', text: '#fecaca' },
  'Inactive':        { bg: '#6b7280', text: '#d1d5db' },
};

function statusStyle(s) {
  return STATUS_COLORS[s] || { bg: '#6b7280', text: '#d1d5db' };
}

export default function FamilyBiz() {
  const { tabs, loading } = useData();
  const tab = tabs[SHEET_TABS[1]];
  const businesses = tab?.rows || [];

  // Domain-expiry alert for Logic Management — May 17, 2026
  const today = new Date();
  const domainExpiry = new Date('2026-05-17T00:00:00');
  const daysUntilExpiry = Math.ceil((domainExpiry - today) / (1000 * 60 * 60 * 24));
  const showDomainAlert = daysUntilExpiry > 0 && daysUntilExpiry <= 60;

  return (
    <div className="space-y-4">
      {showDomainAlert && (
        <div className="panel border-[#eab308]/40 bg-[#eab308]/10 p-4 flex items-start gap-3">
          <AlertTriangle className="text-[#eab308] flex-shrink-0 mt-0.5" size={20} />
          <div>
            <div className="text-sm font-semibold text-[#fde047]">
              Domain Expiry: Logic Management — {daysUntilExpiry} day{daysUntilExpiry === 1 ? '' : 's'} remaining
            </div>
            <div className="text-xs text-[#fcd34d] mt-1">
              Domain expires May 17, 2026. Renew before that date to avoid disruption.
            </div>
          </div>
        </div>
      )}

      {!loading && businesses.length === 0 && (
        <div className="panel p-10 text-center text-[#9ca3af] text-sm">
          No family business records yet.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {businesses.map((b) => (
          <BusinessCard key={b._rowIndex} biz={b} />
        ))}
      </div>
    </div>
  );
}

function BusinessCard({ biz }) {
  const [open, setOpen] = useState(false);
  const status = biz.Status || 'Active';
  const sStyle = statusStyle(status);
  const openItems = parseOpenItems(biz['Open Items']);

  return (
    <div className="panel overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left p-4 flex items-start justify-between hover:bg-[#1a1a24]/50 transition"
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-md bg-[#3b82f6]/15 border border-[#3b82f6]/30 flex items-center justify-center flex-shrink-0">
            <Building2 size={16} className="text-[#3b82f6]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-white">
              {biz['Business Name'] || biz.Business || biz.Entity || 'Unnamed'}
            </div>
            <div className="text-xs text-[#9ca3af] mt-0.5">
              {biz.Category || biz['Entity Type'] || biz.Type || ''}
              {biz['Key Contact'] ? ` · ${biz['Key Contact']}` : ''}
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: sStyle.bg + '26', color: sStyle.text, border: `1px solid ${sStyle.bg}66` }}
              >
                {status}
              </span>
              {openItems.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#eab308]/15 text-[#fde047] border border-[#eab308]/30">
                  {openItems.length} open item{openItems.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-[#6b7280] mt-1 flex-shrink-0">
          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </button>

      {open && (
        <div className="border-t border-[#1e1e2e] p-4 space-y-3 fade-in">
          {Object.keys(biz).filter((k) => !k.startsWith('_') && !['Business','Business Name','Entity','Entity Type','Category','Type','Key Contact','Status','Open Items','Notes'].includes(k) && biz[k]).map((k) => (
            <Field key={k} label={k} value={biz[k]} />
          ))}
          {biz['Entity Type'] && (
            <Field label="Entity Type" value={biz['Entity Type']} />
          )}
          {biz['Key Contact'] && (
            <Field label="Key Contact" value={biz['Key Contact']} />
          )}

          {openItems.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#6b7280] mb-1">Open Items</div>
              <ul className="space-y-1.5">
                {openItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="w-4 h-4 mt-0.5 rounded border border-[#eab308]/40 bg-[#eab308]/5 flex-shrink-0" />
                    <span className="text-[#e5e7eb]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {biz.Notes && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#6b7280] mb-1 flex items-center gap-1">
                <FileText size={11} /> Notes
              </div>
              <div className="panel-2 p-3 text-sm whitespace-pre-wrap text-[#d1d5db]">
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
  const isUrl = /^https?:\/\//.test(String(value));
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[#6b7280]">{label}</div>
      <div className="text-sm text-[#e5e7eb] mt-0.5 break-words flex items-center gap-1.5">
        {isEmail && <Mail size={12} className="text-[#6b7280]" />}
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
