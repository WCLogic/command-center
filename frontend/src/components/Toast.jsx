import React, { useEffect } from 'react';

/**
 * Single transient toast. Parent controls the message via state — when
 * message is non-empty the toast appears and auto-dismisses after 1.6s.
 *
 * Intentionally minimal: no queue, no stacking, no icons. The dashboard
 * needs a "Copied" confirmation and nothing else.
 */
export default function Toast({ message, onDone }) {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => onDone?.(), 1600);
    return () => clearTimeout(id);
  }, [message, onDone]);

  if (!message) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] fade-in"
    >
      <div className="panel px-3 py-1.5 text-[12px] text-[#fafafa]">
        {message}
      </div>
    </div>
  );
}
