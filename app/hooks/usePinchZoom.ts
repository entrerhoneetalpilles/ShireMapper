'use client';

import { useRef, useCallback } from 'react';
import type { CanvasEngine } from '@/app/lib/pixi/canvasEngine';

// ─────────────────────────────────────────────────────────────────────────────
// Pinch-zoom and two-finger pan for touch devices
// ─────────────────────────────────────────────────────────────────────────────

interface PointerState {
  id: number;
  x: number;
  y: number;
}

function distance(a: PointerState, b: PointerState): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function midpoint(a: PointerState, b: PointerState): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export interface PinchZoomHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  /** True while two fingers are actively pinching (suppress other interactions) */
  isPinching: boolean;
}

/**
 * Returns pointer-event handlers that implement pinch-to-zoom and two-finger
 * pan on a PixiJS CanvasEngine. Attach these to the canvas container div.
 *
 * Single-pointer events are passed through untouched — only the two-pointer
 * case is intercepted here.
 */
export function usePinchZoom(engineGetter: () => CanvasEngine | null): PinchZoomHandlers {
  const pointers = useRef<Map<number, PointerState>>(new Map());
  const lastPinchDistance = useRef<number | null>(null);
  const lastMidpoint = useRef<{ x: number; y: number } | null>(null);
  const isPinchingRef = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.set(e.pointerId, { id: e.pointerId, x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values()) as [PointerState, PointerState];
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      lastPinchDistance.current = distance(a, b);
      const mid = midpoint(a, b);
      lastMidpoint.current = { x: mid.x - rect.left, y: mid.y - rect.top };
      isPinchingRef.current = true;
    }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { id: e.pointerId, x: e.clientX, y: e.clientY });

    if (pointers.current.size !== 2 || !isPinchingRef.current) return;

    const engine = engineGetter();
    if (!engine) return;

    e.stopPropagation();

    const [a, b] = Array.from(pointers.current.values()) as [PointerState, PointerState];
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const newDist = distance(a, b);
    const newMid = midpoint(a, b);
    const midScreen = { x: newMid.x - rect.left, y: newMid.y - rect.top };

    // ── Pinch zoom ─────────────────────────────────────────────────────────
    if (lastPinchDistance.current !== null && lastPinchDistance.current > 0) {
      const factor = newDist / lastPinchDistance.current;
      engine.zoom(factor, midScreen.x, midScreen.y);
    }
    lastPinchDistance.current = newDist;

    // ── Two-finger pan ────────────────────────────────────────────────────
    if (lastMidpoint.current) {
      const dx = midScreen.x - lastMidpoint.current.x;
      const dy = midScreen.y - lastMidpoint.current.y;
      engine.pan(dx, dy);
    }
    lastMidpoint.current = midScreen;
  }, [engineGetter]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);

    if (pointers.current.size < 2) {
      lastPinchDistance.current = null;
      lastMidpoint.current = null;
      isPinchingRef.current = false;
    }
  }, [engineGetter]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    get isPinching() { return isPinchingRef.current; },
  };
}
