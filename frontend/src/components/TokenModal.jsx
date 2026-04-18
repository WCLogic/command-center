import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { setToken } from '../lib/auth.js';

/**
 * Session token entry modal.
 *
 * Rendered by parent on-demand when a write action is requested without a
 * valid session token (or after 401/403 clears it).
 *
 * Password-type input so the token never rests in cleartext on screen.
 * On save, calls setToken() (sessionStorage) and invokes `onSuccess`,
 * which callers use to trigger the originally-requested write.
 */
export default function TokenModal({ open, onClose, onSuccess, reason }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setValue('');
      // Focus after transition frame.
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function submit(e) {
    e?.preventDefault?.();
    const ok = setToken(value);
    if (!ok) return;
    setValue('');
    onSuccess?.();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Enter Command Center token"
    >
      <div className="absolute inset-0 bg-black/70" />

      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="relative w-full max-w-md panel p-5 fade-in"
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="text-[13px] font-semibold text-[#fafafa]">
              Enable actions this session
            </div>
            <div className="text-[12px] text-[#a1a1aa] mt-1 leading-relaxed">
              Enter your Command Center token to sign writes for this tab.
              The token is held in memory only and clears after 30 min of
              inactivity or when you close this tab.
            </div>
            {reason && (
              <div className="text-[11px] text-[#71717a] mt-2 italic">{reason}</div>
            )}
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            aria-label="Cancel"
          >
            <X size={14} />
          </button>
        </div>

        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-[#71717a]">
            Token
          </span>
          <input
            ref={inputRef}
            type="password"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="input w-full mt-1 font-mono"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="••••••••••••"
          />
        </label>

        <div className="flex items-center justify-end gap-2 mt-4">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn"
            style={{ borderColor: '#3b82f6', color: '#3b82f6' }}
            disabled={!value.trim()}
          >
            Save for session
          </button>
        </div>
      </form>
    </div>
  );
}
