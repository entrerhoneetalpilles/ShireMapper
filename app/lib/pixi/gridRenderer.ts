import type { Graphics } from 'pixi.js';
import type { GridSettings } from '@/app/types/map';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a CSS hex colour string such as "#cccccc" or "#fff" to the numeric
 * form that PixiJS v8 expects (0xRRGGBB).
 */
function parseHexColor(hex: string): number {
  const cleaned = hex.replace('#', '').trim();
  // Expand shorthand (#abc → #aabbcc)
  const expanded =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned;
  return parseInt(expanded, 16);
}

// ─────────────────────────────────────────────────────────────────────────────
// Square grid
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Draws a square grid onto `graphics`, culled to the visible canvas area.
 *
 * @param viewX   Viewport container x translation (pixels)
 * @param viewY   Viewport container y translation (pixels)
 * @param scale   Viewport container scale (uniform)
 * @param canvasW Canvas width in physical pixels
 * @param canvasH Canvas height in physical pixels
 */
export function drawSquareGrid(
  graphics: Graphics,
  settings: GridSettings,
  viewX: number,
  viewY: number,
  scale: number,
  canvasW: number,
  canvasH: number,
): void {
  graphics.clear();

  const color = parseHexColor(settings.color);
  const alpha = Math.max(0, Math.min(1, settings.opacity));
  const cellSize = settings.size * scale; // screen-space cell size

  if (cellSize < 1) return; // too zoomed out to draw meaningfully

  graphics.setStrokeStyle({ width: 1, color, alpha });

  // World-space coordinates of the canvas corners.
  const worldLeft = -viewX / scale;
  const worldTop = -viewY / scale;
  const worldRight = worldLeft + canvasW / scale;
  const worldBottom = worldTop + canvasH / scale;

  // First grid line index that is ≤ worldLeft / worldTop.
  const startCol = Math.floor(worldLeft / settings.size);
  const startRow = Math.floor(worldTop / settings.size);
  const endCol = Math.ceil(worldRight / settings.size);
  const endRow = Math.ceil(worldBottom / settings.size);

  // Vertical lines
  for (let col = startCol; col <= endCol; col++) {
    const sx = col * settings.size * scale + viewX;
    graphics.moveTo(sx, 0);
    graphics.lineTo(sx, canvasH);
  }

  // Horizontal lines
  for (let row = startRow; row <= endRow; row++) {
    const sy = row * settings.size * scale + viewY;
    graphics.moveTo(0, sy);
    graphics.lineTo(canvasW, sy);
  }

  graphics.stroke();
}

// ─────────────────────────────────────────────────────────────────────────────
// Hex grid
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the six corners of a regular hexagon centred at (cx, cy).
 *
 * @param flat  true = flat-top orientation, false = pointy-top orientation
 */
export function hexCorners(
  cx: number,
  cy: number,
  size: number,
  flat: boolean,
): Array<{ x: number; y: number }> {
  const corners: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 6; i++) {
    // flat-top: angles 0°, 60°, 120°, … ; pointy-top: 30°, 90°, 150°, …
    const angleDeg = flat ? 60 * i : 60 * i + 30;
    const angleRad = (Math.PI / 180) * angleDeg;
    corners.push({
      x: cx + size * Math.cos(angleRad),
      y: cy + size * Math.sin(angleRad),
    });
  }
  return corners;
}

/**
 * Draws a hex grid onto `graphics`, culled to the visible canvas area.
 *
 * Flat-top layout:
 *   horizontal spacing = size * 3/2
 *   vertical   spacing = size * √3
 *   odd columns are offset down by size * √3/2
 *
 * Pointy-top layout:
 *   horizontal spacing = size * √3
 *   vertical   spacing = size * 3/2
 *   odd rows are offset right by size * √3/2
 */
export function drawHexGrid(
  graphics: Graphics,
  settings: GridSettings,
  viewX: number,
  viewY: number,
  scale: number,
  canvasW: number,
  canvasH: number,
): void {
  graphics.clear();

  const color = parseHexColor(settings.color);
  const alpha = Math.max(0, Math.min(1, settings.opacity));
  const size = settings.size; // world-space hex radius

  const screenSize = size * scale;
  if (screenSize < 2) return;

  // Flat-top is the default; we treat the 'hex' type as flat-top.
  const flat = true;

  graphics.setStrokeStyle({ width: 1, color, alpha });

  // World-space bounds of the canvas.
  const worldLeft = -viewX / scale;
  const worldTop = -viewY / scale;
  const worldRight = worldLeft + canvasW / scale;
  const worldBottom = worldTop + canvasH / scale;

  if (flat) {
    // Flat-top spacing
    const colW = size * 1.5; // horizontal distance between hex centres
    const rowH = size * Math.sqrt(3); // vertical distance between hex centres

    const startCol = Math.floor(worldLeft / colW) - 1;
    const endCol = Math.ceil(worldRight / colW) + 1;
    const startRow = Math.floor(worldTop / rowH) - 1;
    const endRow = Math.ceil(worldBottom / rowH) + 1;

    for (let col = startCol; col <= endCol; col++) {
      for (let row = startRow; row <= endRow; row++) {
        const cx = col * colW;
        // Odd columns are shifted down by half a row height.
        const cy = row * rowH + (col % 2 !== 0 ? rowH / 2 : 0);

        // Screen-space centre
        const scx = cx * scale + viewX;
        const scy = cy * scale + viewY;

        // Rough cull: skip hexes entirely outside the canvas with some margin.
        if (
          scx + screenSize < 0 ||
          scx - screenSize > canvasW ||
          scy + screenSize < 0 ||
          scy - screenSize > canvasH
        ) {
          continue;
        }

        const corners = hexCorners(scx, scy, screenSize, true);
        graphics.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < corners.length; i++) {
          graphics.lineTo(corners[i].x, corners[i].y);
        }
        graphics.lineTo(corners[0].x, corners[0].y);
      }
    }
  } else {
    // Pointy-top spacing
    const colW = size * Math.sqrt(3);
    const rowH = size * 1.5;

    const startCol = Math.floor(worldLeft / colW) - 1;
    const endCol = Math.ceil(worldRight / colW) + 1;
    const startRow = Math.floor(worldTop / rowH) - 1;
    const endRow = Math.ceil(worldBottom / rowH) + 1;

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const cy = row * rowH;
        const cx = col * colW + (row % 2 !== 0 ? colW / 2 : 0);

        const scx = cx * scale + viewX;
        const scy = cy * scale + viewY;

        if (
          scx + screenSize < 0 ||
          scx - screenSize > canvasW ||
          scy + screenSize < 0 ||
          scy - screenSize > canvasH
        ) {
          continue;
        }

        const corners = hexCorners(scx, scy, screenSize, false);
        graphics.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < corners.length; i++) {
          graphics.lineTo(corners[i].x, corners[i].y);
        }
        graphics.lineTo(corners[0].x, corners[0].y);
      }
    }
  }

  graphics.stroke();
}
