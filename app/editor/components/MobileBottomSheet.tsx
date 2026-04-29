'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// MobileBottomSheet
// ─────────────────────────────────────────────────────────────────────────────

interface MobileBottomSheetProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Height of the sheet when fully open. Defaults to '70vh'. */
  height?: string;
}

/**
 * Slide-up bottom sheet for mobile panels (Properties, Layers, AssetBrowser).
 * Renders as a fixed overlay at the bottom of the viewport, with a drag
 * handle, title and close button.
 */
export function MobileBottomSheet({
  title,
  isOpen,
  onClose,
  children,
  height = '70vh',
}: MobileBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-label={title}
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl bg-[#16213E] border-t border-[#2a3a6a] shadow-2xl"
        style={{ height, maxHeight: '85vh' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#2a3a6a]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#2a3a6a] shrink-0">
          <span className="text-sm font-semibold text-amber-300">{title}</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-300 hover:bg-amber-900/20 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </>
  );
}
