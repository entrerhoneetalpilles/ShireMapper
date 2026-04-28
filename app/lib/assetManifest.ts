import type { AssetDefinition } from "../types/map";

// ─────────────────────────────────────────────────────────────────────────────
// SVG placeholder helpers
// ─────────────────────────────────────────────────────────────────────────────
// Each placeholder is a small inline SVG encoded as a data URI.
// When real artwork is available, replace the `src` field with the real path.

function rectSvg(fill: string, stroke: string, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect x="2" y="2" width="60" height="60" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
  <text x="32" y="36" font-family="sans-serif" font-size="8" fill="${stroke}" text-anchor="middle">${label}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function polygonSvg(fill: string, stroke: string, points: string, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
  <text x="32" y="58" font-family="sans-serif" font-size="8" fill="${stroke}" text-anchor="middle">${label}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function circleSvg(fill: string, stroke: string, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="28" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
  <text x="32" y="36" font-family="sans-serif" font-size="8" fill="${stroke}" text-anchor="middle">${label}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Asset definitions
// ─────────────────────────────────────────────────────────────────────────────

// ── Buildings ────────────────────────────────────────────────────────────────

const buildingAssets: AssetDefinition[] = [
  {
    id: "bld_house_small",
    name: "Small House",
    category: "buildings",
    src: rectSvg("#c8a96e", "#5c3d1e", "House"),
    naturalWidth: 64,
    naturalHeight: 64,
    tags: ["house", "residential", "small"],
  },
  {
    id: "bld_tavern",
    name: "Tavern",
    category: "buildings",
    src: rectSvg("#b5651d", "#3e1f00", "Tavern"),
    naturalWidth: 64,
    naturalHeight: 64,
    tags: ["tavern", "inn", "social"],
  },
  {
    id: "bld_tower",
    name: "Guard Tower",
    // tall rectangle placeholder
    src: polygonSvg("#8d8d8d", "#333333", "20,60 44,60 44,4 32,0 20,4", "Tower"),
    category: "buildings",
    naturalWidth: 64,
    naturalHeight: 64,
    tags: ["tower", "military", "guard"],
  },
  {
    id: "bld_castle",
    name: "Castle",
    category: "buildings",
    src: rectSvg("#a0a0a0", "#222222", "Castle"),
    naturalWidth: 64,
    naturalHeight: 64,
    tags: ["castle", "fortress", "large"],
  },
];

// ── Vegetation ───────────────────────────────────────────────────────────────

const vegetationAssets: AssetDefinition[] = [
  {
    id: "veg_oak_tree",
    name: "Oak Tree",
    category: "vegetation",
    src: circleSvg("#2d6a2d", "#1a3d1a", "Oak"),
    naturalWidth: 64,
    naturalHeight: 64,
    tags: ["tree", "oak", "deciduous"],
  },
  {
    id: "veg_pine_tree",
    name: "Pine Tree",
    category: "vegetation",
    src: polygonSvg("#1e5c1e", "#0d2e0d", "32,2 58,58 6,58", "Pine"),
    naturalWidth: 64,
    naturalHeight: 64,
    tags: ["tree", "pine", "conifer"],
  },
  {
    id: "veg_bush",
    name: "Bush",
    category: "vegetation",
    src: circleSvg("#4a7c3f", "#1e3d19", "Bush"),
    naturalWidth: 40,
    naturalHeight: 40,
    tags: ["bush", "shrub", "small"],
  },
  {
    id: "veg_mushroom",
    name: "Mushroom",
    category: "vegetation",
    src: polygonSvg("#c0392b", "#7b241c", "32,4 56,32 44,32 44,60 20,60 20,32 8,32", "Shroom"),
    naturalWidth: 32,
    naturalHeight: 48,
    tags: ["mushroom", "fungi", "forest"],
  },
];

// ── Walls ────────────────────────────────────────────────────────────────────

const wallAssets: AssetDefinition[] = [
  {
    id: "wall_stone_segment",
    name: "Stone Wall Segment",
    category: "walls",
    src: rectSvg("#9e9e9e", "#424242", "Stone"),
    naturalWidth: 64,
    naturalHeight: 16,
    tags: ["wall", "stone", "barrier"],
  },
  {
    id: "wall_wooden_fence",
    name: "Wooden Fence",
    category: "walls",
    src: rectSvg("#a0522d", "#4e2309", "Fence"),
    naturalWidth: 64,
    naturalHeight: 16,
    tags: ["fence", "wood", "barrier"],
  },
  {
    id: "wall_gate",
    name: "Gate",
    category: "walls",
    src: rectSvg("#7b6348", "#3e2b1a", "Gate"),
    naturalWidth: 48,
    naturalHeight: 48,
    tags: ["gate", "entrance", "wall"],
  },
];

// ── Furniture ────────────────────────────────────────────────────────────────

const furnitureAssets: AssetDefinition[] = [
  {
    id: "furn_table",
    name: "Table",
    category: "furniture",
    src: rectSvg("#d4a76a", "#7a4e1e", "Table"),
    naturalWidth: 48,
    naturalHeight: 32,
    tags: ["table", "furniture", "interior"],
  },
  {
    id: "furn_bed",
    name: "Bed",
    category: "furniture",
    src: rectSvg("#8b9dc3", "#3a4f7a", "Bed"),
    naturalWidth: 32,
    naturalHeight: 48,
    tags: ["bed", "furniture", "interior"],
  },
  {
    id: "furn_chest",
    name: "Chest",
    category: "furniture",
    src: rectSvg("#a0522d", "#4e2309", "Chest"),
    naturalWidth: 32,
    naturalHeight: 24,
    tags: ["chest", "storage", "interior"],
  },
];

// ── Water features ───────────────────────────────────────────────────────────

const waterAssets: AssetDefinition[] = [
  {
    id: "wat_well",
    name: "Well",
    category: "water",
    src: circleSvg("#6baed6", "#2171b5", "Well"),
    naturalWidth: 32,
    naturalHeight: 32,
    tags: ["well", "water", "village"],
  },
  {
    id: "wat_fountain",
    name: "Fountain",
    category: "water",
    src: circleSvg("#4292c6", "#084594", "Fountain"),
    naturalWidth: 48,
    naturalHeight: 48,
    tags: ["fountain", "water", "decorative"],
  },
];

// ── Roads & paths ─────────────────────────────────────────────────────────────

const roadAssets: AssetDefinition[] = [
  {
    id: "road_cobble_cross",
    name: "Cobblestone Crossroads",
    category: "roads",
    src: rectSvg("#b8a898", "#6b5744", "Cross"),
    naturalWidth: 64,
    naturalHeight: 64,
    tags: ["road", "cobblestone", "crossroads"],
  },
  {
    id: "road_sign_post",
    name: "Sign Post",
    category: "roads",
    src: polygonSvg("#a0522d", "#4e2309", "28,60 36,60 36,28 52,28 52,20 12,20 12,28 28,28", "Sign"),
    naturalWidth: 32,
    naturalHeight: 64,
    tags: ["sign", "road", "marker"],
  },
];

// ── Decorative ───────────────────────────────────────────────────────────────

const decorativeAssets: AssetDefinition[] = [
  {
    id: "dec_campfire",
    name: "Campfire",
    category: "decorative",
    src: polygonSvg("#e74c3c", "#c0392b", "32,4 52,48 32,36 12,48", "Fire"),
    naturalWidth: 32,
    naturalHeight: 48,
    tags: ["campfire", "fire", "camp"],
  },
  {
    id: "dec_statue",
    name: "Statue",
    category: "decorative",
    src: polygonSvg("#bdc3c7", "#7f8c8d", "32,4 44,20 40,20 40,60 24,60 24,20 20,20", "Statue"),
    naturalWidth: 32,
    naturalHeight: 64,
    tags: ["statue", "monument", "decorative"],
  },
  {
    id: "dec_tombstone",
    name: "Tombstone",
    category: "decorative",
    src: polygonSvg("#95a5a6", "#2c3e50", "16,60 48,60 48,24 32,4 16,24", "Tomb"),
    naturalWidth: 32,
    naturalHeight: 64,
    tags: ["tombstone", "graveyard", "cemetery"],
  },
];

// ── Misc ──────────────────────────────────────────────────────────────────────

const miscAssets: AssetDefinition[] = [
  {
    id: "misc_barrel",
    name: "Barrel",
    category: "misc",
    src: circleSvg("#8b5e3c", "#4e2c0e", "Barrel"),
    naturalWidth: 24,
    naturalHeight: 32,
    tags: ["barrel", "storage", "misc"],
  },
  {
    id: "misc_cart",
    name: "Cart",
    category: "misc",
    src: rectSvg("#d4a76a", "#7a4e1e", "Cart"),
    naturalWidth: 48,
    naturalHeight: 32,
    tags: ["cart", "vehicle", "misc"],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Aggregated manifest
// ─────────────────────────────────────────────────────────────────────────────

export const assetManifest: AssetDefinition[] = [
  ...buildingAssets,
  ...vegetationAssets,
  ...wallAssets,
  ...furnitureAssets,
  ...waterAssets,
  ...roadAssets,
  ...decorativeAssets,
  ...miscAssets,
];

/** Assets grouped by category for UI panels */
export const assetsByCategory: Record<string, AssetDefinition[]> = assetManifest.reduce<
  Record<string, AssetDefinition[]>
>((acc, asset) => {
  if (!acc[asset.category]) {
    acc[asset.category] = [];
  }
  acc[asset.category].push(asset);
  return acc;
}, {});

/** All unique category names in insertion order */
export const assetCategories: string[] = Array.from(
  new Set(assetManifest.map((a) => a.category))
);

/** Quick O(1) lookup by asset ID */
export const assetById: Record<string, AssetDefinition> = Object.fromEntries(
  assetManifest.map((a) => [a.id, a])
);

export default assetManifest;
