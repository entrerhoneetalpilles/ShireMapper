import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { MapDocument } from "../types/map";

// ─────────────────────────────────────────────────────────────────────────────
// Store shape
// ─────────────────────────────────────────────────────────────────────────────

export interface HistoryState {
  past: MapDocument[];
  future: MapDocument[];
  readonly maxHistory: number;

  /**
   * Push the current document onto the past stack before a mutation.
   * Call this with the document state *before* the change is applied.
   */
  pushState: (doc: MapDocument) => void;

  /**
   * Step backward. Returns the document to restore, or null if there is
   * nothing to undo. Pass the current (post-mutation) document so it can
   * be preserved on the future stack.
   */
  undo: (currentDoc: MapDocument) => MapDocument | null;

  /**
   * Step forward. Returns the document to restore, or null if there is
   * nothing to redo. Pass the current document so it can be pushed onto
   * the past stack.
   */
  redo: (currentDoc: MapDocument) => MapDocument | null;

  /** Wipe both stacks (e.g. after loading a new file). */
  clear: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store implementation
// ─────────────────────────────────────────────────────────────────────────────

const MAX_HISTORY = 100;

export const useHistoryStore = create<HistoryState>()(
  immer((set, get) => ({
    past: [],
    future: [],
    maxHistory: MAX_HISTORY,

    pushState: (doc) =>
      set((state) => {
        state.past.push(doc);
        // Enforce the cap — drop the oldest entry when over the limit
        if (state.past.length > MAX_HISTORY) {
          state.past.shift();
        }
        // Any new action clears the redo stack
        state.future = [];
      }),

    undo: (currentDoc) => {
      const { past } = get();
      if (past.length === 0) return null;

      const previous = past[past.length - 1];

      set((state) => {
        state.past.pop();
        state.future.unshift(currentDoc);
      });

      return previous;
    },

    redo: (currentDoc) => {
      const { future } = get();
      if (future.length === 0) return null;

      const next = future[0];

      set((state) => {
        state.future.shift();
        state.past.push(currentDoc);
        // Cap past after redo too
        if (state.past.length > MAX_HISTORY) {
          state.past.shift();
        }
      });

      return next;
    },

    clear: () =>
      set((state) => {
        state.past = [];
        state.future = [];
      }),
  }))
);
