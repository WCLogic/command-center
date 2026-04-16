import React from 'react';
import { Info, X } from 'lucide-react';

/**
 * First-load dismissible welcome banner.
 *
 * Dismissed state lives in React useState (per spec — no localStorage).
 * Re-appears on every page load by design: this is a read-only dashboard
 * and the read-only fact is worth reminding the user of each session.
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
          This is a read-only dashboard — your AI agents update data automatically.
          Use the sidebar to navigate between sections.
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
