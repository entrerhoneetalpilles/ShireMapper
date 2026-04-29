'use client';

import { useRef } from 'react';
import type { CanvasEngine } from '@/app/lib/pixi/canvasEngine';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Movement threshold in px below which a touch is considered a tap. */
const TAP_THRESHOLD = 8;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PointerState {
  id: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
}

export interface TouchWorldPosition {
  screenX: number;
  screenY: number;
}

export interface TouchInteractionHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Unified touch interaction hook for the map canvas.
 *
 * Interaction model:
 *  - 1 finger, small move (< TAP_THRESHOLD px) → tap → calls onTap(screenX, screenY)
 *  - 1 finger, larger move                     → pan the viewport
 *  - 2 fingers                                 → pinch-zoom + midpoint pan
 *
 * Returns STABLE handler references (stored in a ref) so they never appear
 * in useCallback dependency arrays and never cause re-render loops.
 *
 * Only intercepts touch (pointerType === 'touch') events.
 * Mouse events fall through untouched.
 */
export function useTouchInteraction(
  engineGetter: () => CanvasEngine | null,
  onTap: (screenX: number, screenY: number) => void,
): TouchInteractionHandlers {
  const pointers = useRef<Map<number, PointerState>>(new Map());
  const isPanning = useRef(false);
  const lastPanPos = useRef<{ x: number; y: number } | null>(null);

  // Pinch state
  const lastPinchDist = useRef<number | null>(null);
  const lastPinchMid = useRef<{ x: number; y: number } | null>(null);

  // Keep latest callbacks without recreating handlers
  const engineGetterRef = useRef(engineGetter);
  engineGetterRef.current = engineGetter;
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;

  // ── Helpers ────────────────────────────────────────────────────────────────

  function getRect(e: React.PointerEvent<HTMLDivElement>) {
    return (e.currentTarget as HTMLDivElement).getBoundingClientRect();
  }

  function dist(a: PointerState, b: PointerState) {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  function mid(a: PointerState, b: PointerState) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function isTap(p: PointerState) {
    return Math.hypot(p.x - p.startX, p.y - p.startY) < TAP_THRESHOLD;
  }

  // ── Stable handlers (created once, stored in refs) ─────────────────────────

  const handlers = useRef<TouchInteractionHandlers>({
    onPointerDown(e) {
      if (e.pointerType !== 'touch') return;

      const rect = getRect(e);
      const p: PointerState = {
        id: e.pointerId,
        startX: e.clientX - rect.left,
        startY: e.clientY - rect.top,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      pointers.current.set(e.pointerId, p);
      e.currentTarget.setPointerCapture(e.pointerId);

      const count = pointers.current.size;

      if (count === 1) {
        // Potential pan or tap — wait for move to decide
        isPanning.current = false;
        lastPanPos.current = { x: p.x, y: p.y };
        lastPinchDist.current = null;
        lastPinchMid.current = null;
      } else if (count === 2) {
        // Second finger — switch to pinch mode, cancel any pan
        isPanning.current = false;
        const [a, b] = Array.from(pointers.current.values()) as [PointerState, PointerState];
        lastPinchDist.current = dist(a, b);
        lastPinchMid.current = mid(a, b);
      }
    },

    onPointerMove(e) {
      if (e.pointerType !== 'touch') return;
      if (!pointers.current.has(e.pointerId)) return;

      const rect = getRect(e);
      const p = pointers.current.get(e.pointerId)!;
      p.x = e.clientX - rect.left;
      p.y = e.clientY - rect.top;

      const engine = engineGetterRef.current();
      if (!engine) return;

      const count = pointers.current.size;

      if (count === 2) {
        // ── Pinch zoom + two-finger pan ─────────────────────────────────────
        const [a, b] = Array.from(pointers.current.values()) as [PointerState, PointerState];
        const newDist = dist(a, b);
        const newMid = mid(a, b);

        if (lastPinchDist.current !== null && lastPinchDist.current > 0) {
          engine.zoom(newDist / lastPinchDist.current, newMid.x, newMid.y);
        }
        if (lastPinchMid.current) {
          engine.pan(newMid.x - lastPinchMid.current.x, newMid.y - lastPinchMid.current.y);
        }
        lastPinchDist.current = newDist;
        lastPinchMid.current = newMid;
      } else if (count === 1) {
        // ── Single-finger pan (once past tap threshold) ─────────────────────
        const movedFromStart = Math.hypot(p.x - p.startX, p.y - p.startY);

        if (movedFromStart >= TAP_THRESHOLD) {
          isPanning.current = true;
        }

        if (isPanning.current && lastPanPos.current) {
          engine.pan(p.x - lastPanPos.current.x, p.y - lastPanPos.current.y);
        }
        lastPanPos.current = { x: p.x, y: p.y };
      }
    },

    onPointerUp(e) {
      if (e.pointerType !== 'touch') return;

      const p = pointers.current.get(e.pointerId);
      const wasTap = p ? isTap(p) : false;
      const wasOnlyPointer = pointers.current.size === 1;

      pointers.current.delete(e.pointerId);

      if (pointers.current.size < 2) {
        lastPinchDist.current = null;
        lastPinchMid.current = null;
      }

      if (wasOnlyPointer && wasTap && !isPanning.current && p) {
        // Tap detected — forward to tool handler
        onTapRef.current(p.x, p.y);
      }

      if (pointers.current.size === 0) {
        isPanning.current = false;
        lastPanPos.current = null;
      }
    },

    onPointerCancel(e) {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size === 0) {
        isPanning.current = false;
        lastPanPos.current = null;
        lastPinchDist.current = null;
        lastPinchMid.current = null;
      }
    },
  });

  return handlers.current;
}
