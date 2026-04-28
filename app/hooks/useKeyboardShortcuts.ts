'use client';

import { useEffect } from 'react';
import { useToolStore } from '@/app/store/toolStore';
import type { ToolType } from '@/app/types/map';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface KeyboardShortcutHandlers {
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSelectAll: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// useKeyboardShortcuts
// ─────────────────────────────────────────────────────────────────────────────

export function useKeyboardShortcuts({
  onUndo,
  onRedo,
  onSave,
  onDelete,
  onDuplicate,
  onSelectAll,
}: KeyboardShortcutHandlers): void {
  const setActiveTool = useToolStore((s) => s.setActiveTool);
  const toggleGrid = useToolStore((s) => s.toggleGrid);
  const toggleSnap = useToolStore((s) => s.toggleSnap);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const key = e.key;

      // ── Undo / Redo ─────────────────────────────────────────────────────
      if (ctrl && !shift && key === 'z') {
        e.preventDefault();
        onUndo();
        return;
      }
      if ((ctrl && key === 'y') || (ctrl && shift && key === 'Z')) {
        e.preventDefault();
        onRedo();
        return;
      }

      // ── Save ─────────────────────────────────────────────────────────────
      if (ctrl && key === 's') {
        e.preventDefault();
        onSave();
        return;
      }

      // ── Delete / Backspace ───────────────────────────────────────────────
      if (key === 'Delete' || key === 'Backspace') {
        // Only fire when not in an input/textarea
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        onDelete();
        return;
      }

      // ── Duplicate ────────────────────────────────────────────────────────
      if (ctrl && key === 'd') {
        e.preventDefault();
        onDuplicate();
        return;
      }

      // ── Select All ───────────────────────────────────────────────────────
      if (ctrl && key === 'a') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        onSelectAll();
        return;
      }

      // ── Tool shortcuts (F-keys) ──────────────────────────────────────────
      const toolKeys: Record<string, ToolType> = {
        F1: 'object',
        F2: 'path',
        F3: 'plot',
        F4: 'room',
        F5: 'select',
        F6: 'export',
      };
      if (key in toolKeys) {
        e.preventDefault();
        setActiveTool(toolKeys[key]!);
        return;
      }

      // ── Grid shortcuts ───────────────────────────────────────────────────
      if (ctrl && key === 'g') {
        e.preventDefault();
        toggleGrid();
        return;
      }
      if (!ctrl && !shift && key === 'g') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        toggleSnap();
        return;
      }

      // ── Rotation shortcuts ───────────────────────────────────────────────
      // [ = -15°, ] = +15° — these are handled downstream by the canvas engine
      // We prevent default here so the browser doesn't intercept them
      if (key === '[' || key === ']') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        // Dispatch a custom event for the canvas to pick up
        window.dispatchEvent(
          new CustomEvent('shiremapper:rotate', {
            detail: { delta: key === '[' ? -15 : 15 },
          }),
        );
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, onRedo, onSave, onDelete, onDuplicate, onSelectAll, setActiveTool, toggleGrid, toggleSnap]);
}
