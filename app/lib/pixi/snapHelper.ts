import type { GridSettings } from '@/app/types/map';

// ─────────────────────────────────────────────────────────────────────────────
// Square grid snapping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Snaps a world-space point to the nearest square-grid intersection or cell
 * centre depending on `snapToIntersections`.
 *
 * Grid intersections are at multiples of gridSize.
 * Cell centres are at (n + 0.5) * gridSize.
 */
export function snapToSquareGrid(
  worldX: number,
  worldY: number,
  gridSize: number,
  snapToIntersections: boolean,
): { x: number; y: number } {
  if (snapToIntersections) {
    return {
      x: Math.round(worldX / gridSize) * gridSize,
      y: Math.round(worldY / gridSize) * gridSize,
    };
  }
  // Snap to cell centre
  return {
    x: (Math.floor(worldX / gridSize) + 0.5) * gridSize,
    y: (Math.floor(worldY / gridSize) + 0.5) * gridSize,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hex grid snapping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts axial hex coordinates to a world-space hex centre.
 */
function axialToWorld(
  q: number,
  r: number,
  size: number,
  flat: boolean,
): { x: number; y: number } {
  if (flat) {
    return {
      x: size * (1.5 * q),
      y: size * ((Math.sqrt(3) / 2) * q + Math.sqrt(3) * r),
    };
  }
  return {
    x: size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r),
    y: size * (1.5 * r),
  };
}

/**
 * Converts a world-space point to fractional axial hex coordinates.
 */
function worldToAxialFrac(
  x: number,
  y: number,
  size: number,
  flat: boolean,
): { q: number; r: number } {
  if (flat) {
    const q = (2 / 3) * (x / size);
    const r = ((-1 / 3) * x + (Math.sqrt(3) / 3) * y) / size;
    return { q, r };
  }
  const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / size;
  const r = ((2 / 3) * y) / size;
  return { q, r };
}

/**
 * Rounds fractional cube hex coordinates to the nearest integer hex.
 * Uses the standard "round then fix the largest error" algorithm.
 */
function cubeRound(
  fq: number,
  fr: number,
): { q: number; r: number } {
  const fs = -fq - fr;

  let q = Math.round(fq);
  let r = Math.round(fr);
  let s = Math.round(fs);

  const qDiff = Math.abs(q - fq);
  const rDiff = Math.abs(r - fr);
  const sDiff = Math.abs(s - fs);

  if (qDiff > rDiff && qDiff > sDiff) {
    q = -r - s;
  } else if (rDiff > sDiff) {
    r = -q - s;
  }
  // s is the discarded third coordinate; we don't need it after rounding.

  return { q, r };
}

/**
 * Snaps a world-space point to the nearest hex centre.
 *
 * @param flat  true = flat-top hexes, false = pointy-top hexes
 */
export function snapToHexGrid(
  worldX: number,
  worldY: number,
  gridSize: number,
  flat: boolean,
): { x: number; y: number } {
  const frac = worldToAxialFrac(worldX, worldY, gridSize, flat);
  const { q, r } = cubeRound(frac.q, frac.r);
  return axialToWorld(q, r, gridSize, flat);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main snap dispatcher
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a snapped world-space point based on the active grid settings.
 *
 * Snap is disabled when:
 *   - `snapEnabled` is false AND `altHeld` is false (normal free movement)
 *   - `snapEnabled` is true AND `altHeld` is true  (alt overrides snap off)
 *
 * In other words: alt key always inverts the current snap setting.
 */
export function snapPoint(
  worldX: number,
  worldY: number,
  gridSettings: GridSettings,
  snapEnabled: boolean,
  altHeld: boolean,
): { x: number; y: number } {
  // Alt key toggles snap: if snap is on, alt turns it off (and vice-versa).
  const effectiveSnap = altHeld ? !snapEnabled : snapEnabled;

  if (!effectiveSnap || !gridSettings.visible) {
    return { x: worldX, y: worldY };
  }

  const { size, type } = gridSettings;

  switch (type) {
    case 'hex':
      // Default to flat-top for hex grids.
      return snapToHexGrid(worldX, worldY, size, true);

    case 'isometric':
      // Isometric uses square-grid intersection snapping at the given size.
      return snapToSquareGrid(worldX, worldY, size, true);

    case 'square':
    default:
      // Snap to intersections by default for square grids.
      return snapToSquareGrid(worldX, worldY, size, true);
  }
}
