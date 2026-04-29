import type { PathNode, PlotNode, MapDocument, BridgeStyle } from '@/app/types/map';

// ─────────────────────────────────────────────────────────────────────────────
// Geometry helpers
// ─────────────────────────────────────────────────────────────────────────────

interface AABB { x: number; y: number; w: number; h: number }

function getPlotBounds(plot: PlotNode): AABB {
  if (plot.vertices.length === 0) return { x: plot.x, y: plot.y, w: 0, h: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const v of plot.vertices) {
    const wx = plot.x + v.x;
    const wy = plot.y + v.y;
    if (wx < minX) minX = wx;
    if (wy < minY) minY = wy;
    if (wx > maxX) maxX = wx;
    if (wy > maxY) maxY = wy;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/**
 * Liang-Barsky segment-AABB intersection.
 * Returns true if the segment (x1,y1)→(x2,y2) passes through the box.
 */
function segmentIntersectsAABB(
  x1: number, y1: number, x2: number, y2: number,
  { x: bx, y: by, w: bw, h: bh }: AABB,
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0, tMax = 1;

  const tests: [number, number, number][] = [
    [-dx, x1 - bx, bw],
    [dx, bx + bw - x1, bw],
    [-dy, y1 - by, bh],
    [dy, by + bh - y1, bh],
  ];

  for (const [p, q] of tests) {
    if (p === 0) {
      if (q < 0) return false; // parallel and outside
    } else {
      const t = q / p;
      if (p < 0) tMin = Math.max(tMin, t);
      else       tMax = Math.min(tMax, t);
    }
  }
  return tMin <= tMax;
}

// ─────────────────────────────────────────────────────────────────────────────
// Water plot types (Nimblehold-inspired: detect terrain crossings)
// ─────────────────────────────────────────────────────────────────────────────

const WATER_PLOT_TYPES = new Set(['lake', 'ocean', 'water']);

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface TerrainCrossingResult {
  crossesWater: boolean;
  suggestedBridge: BridgeStyle;
  waterPlotIds: string[];
}

/**
 * Nimblehold-inspired: detect if a path node crosses any water-type PlotNodes
 * in the document. If it does, suggest a bridge style.
 *
 * The check uses per-segment AABB intersection against every water plot's
 * bounding box — fast enough for typical map sizes (<1000 nodes).
 */
export function detectPathTerrainCrossings(
  path: PathNode,
  doc: MapDocument,
): TerrainCrossingResult {
  const waterPlots: PlotNode[] = Object.values(doc.nodes).filter(
    (n): n is PlotNode =>
      n.type === 'plot' && WATER_PLOT_TYPES.has(n.plotType),
  );

  if (waterPlots.length === 0 || path.points.length < 2) {
    return { crossesWater: false, suggestedBridge: 'none', waterPlotIds: [] };
  }

  const hitPlotIds = new Set<string>();

  for (let i = 0; i < path.points.length - 1; i++) {
    const a = path.points[i];
    const b = path.points[i + 1];
    for (const plot of waterPlots) {
      if (hitPlotIds.has(plot.id)) continue;
      const bounds = getPlotBounds(plot);
      if (bounds.w === 0 || bounds.h === 0) continue;
      if (segmentIntersectsAABB(a.x, a.y, b.x, b.y, bounds)) {
        hitPlotIds.add(plot.id);
      }
    }
  }

  const waterPlotIds = Array.from(hitPlotIds);
  const crossesWater = waterPlotIds.length > 0;

  // Default to "stone" bridge; a "river"-type path favours "wooden"
  const suggestedBridge: BridgeStyle =
    crossesWater
      ? path.pathType === 'river' || path.pathType === 'stream'
        ? 'none'           // rivers don't bridge themselves
        : 'stone'
      : 'none';

  return { crossesWater, suggestedBridge, waterPlotIds };
}
