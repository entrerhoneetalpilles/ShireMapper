'use client';

import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { CanvasEngine } from '@/app/lib/pixi/canvasEngine';

// ─────────────────────────────────────────────────────────────────────────────
// useCanvasEngine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initialises a CanvasEngine inside the given container element.
 *
 * - Calls `engine.init()` on mount and `engine.destroy()` on unmount.
 * - Observes container size changes via ResizeObserver and resizes the renderer
 *   accordingly.
 * - Returns the engine instance once it is ready, plus an `isReady` boolean.
 */
export function useCanvasEngine(
  containerRef: RefObject<HTMLDivElement | null>,
): { engine: CanvasEngine | null; isReady: boolean } {
  const engineRef = useRef<CanvasEngine | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // getBoundingClientRect() is more reliable than clientWidth/Height in
    // flex layouts; falls back to reasonable defaults if called before paint.
    const rect = el.getBoundingClientRect();
    const initialWidth = rect.width > 0 ? rect.width : el.clientWidth || 800;
    const initialHeight = rect.height > 0 ? rect.height : el.clientHeight || 600;

    const engine = new CanvasEngine(el, initialWidth, initialHeight);
    engineRef.current = engine;

    let destroyed = false;

    // ResizeObserver — only wired AFTER init() so the renderer exists.
    const observer = new ResizeObserver((entries) => {
      if (!engineRef.current) return;
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) return;
      engineRef.current.getApp().renderer.resize(width, height);
    });

    engine.init().then(() => {
      if (destroyed) {
        engine.destroy();
        return;
      }
      // Resize to actual container dimensions now that the renderer exists.
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        engine.getApp().renderer.resize(r.width, r.height);
      }
      // Start observing only after init so the first callback never hits a
      // null renderer.
      observer.observe(el);
      setIsReady(true);
    });

    // ── Cleanup ──────────────────────────────────────────────────────────────
    return () => {
      destroyed = true;
      observer.disconnect();
      engine.destroy();
      engineRef.current = null;
      setIsReady(false);
    };
    // containerRef is a stable ref object; its .current may change but the ref
    // itself does not, so we deliberately omit it from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { engine: engineRef.current, isReady };
}
