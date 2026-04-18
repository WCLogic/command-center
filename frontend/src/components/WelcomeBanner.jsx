import React from 'react';
import { Info, X } from 'lucide-react';

/**
 * First-load dismissible welcome banner.
 *
 * Dismissed state lives in React useState (per spec — no localStorage).
 * Re-appears on every page load by design.
 */
export default function WelcomeBanner({ onDismiss }) {
  return (
    <div className="panel p-4 flex items-start gap-3 fade-in">
      <div className="w-8 h-8 rounded-md bg-[#18181b] border border-[#27272a] flex items-center justify-center flex-shrink-0">
        <Info size={15} className="text-[#3b82f6]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[#fafafa]">
          Welcome to your Command Center.
        </div>
        <div className="text-[13px] text-[#a1a1aa] mt-1 leading-relaxed">
          Your AI agents keep this data current. Actions on the Leads tab
          (Mark Contacted, Mark Follow-up Sent, Mark Responded, Close) are
          now available — enter your Command Center token once per session
          when prompted. The token is held in memory only and clears on tab
          close or 30 minutes of inactivity.
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="btn-ghost btn"
        aria-label="Dismiss welcome banner"
      >
        <X size={14} />
      </button>
    </div>
  );
}
