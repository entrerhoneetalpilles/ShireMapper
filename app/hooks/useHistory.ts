'use client';

import { useCallback } from 'react';
import { useHistoryStore } from '@/app/store/historyStore';
import { useMapStore } from '@/app/store/mapStore';

// ─────────────────────────────────────────────────────────────────────────────
// useHistory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps the history store and map store to provide undo/redo functionality.
 *
 * Usage:
 *   const { pushHistory, undo, redo, canUndo, canRedo } = useHistory();
 *
 *   // Before mutating the map document, snapshot the current state:
 *   pushHistory();
 *   mapStore.addNode(...);
 *
 *   // Undo the last mutation:
 *   undo();
 */
export function useHistory(): {
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
} {
  // ── History store selectors ──────────────────────────────────────────────
  const historyPast = useHistoryStore((s) => s.past);
  const historyFuture = useHistoryStore((s) => s.future);
  const pushState = useHistoryStore((s) => s.pushState);
  const historyUndo = useHistoryStore((s) => s.undo);
  const historyRedo = useHistoryStore((s) => s.redo);

  // ── Map store selectors ──────────────────────────────────────────────────
  const currentDocument = useMapStore((s) => s.document);
  const setDocument = useMapStore((s) => s.setDocument);

  // ── Derived flags ────────────────────────────────────────────────────────
  const canUndo = historyPast.length > 0;
  const canRedo = historyFuture.length > 0;

  // ── Actions ──────────────────────────────────────────────────────────────

  /**
   * Captures the current map document onto the history stack.
   * Call this *before* applying any mutation to the document.
   */
  const pushHistory = useCallback(() => {
    pushState(currentDocument);
  }, [pushState, currentDocument]);

  /**
   * Restores the previous map document state.
   * Moves the current document to the redo stack.
   */
  const undo = useCallback(() => {
    const previous = historyUndo(currentDocument);
    if (previous !== null) {
      setDocument(previous);
    }
  }, [historyUndo, currentDocument, setDocument]);

  /**
   * Re-applies a previously undone map document state.
   * Moves the current document to the undo stack.
   */
  const redo = useCallback(() => {
    const next = historyRedo(currentDocument);
    if (next !== null) {
      setDocument(next);
    }
  }, [historyRedo, currentDocument, setDocument]);

  return { pushHistory, undo, redo, canUndo, canRedo };
}
