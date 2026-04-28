// ─────────────────────────────────────────────────────────────────────────────
// Tool types
// ─────────────────────────────────────────────────────────────────────────────

export type ToolType = "select" | "object" | "path" | "plot" | "room" | "export";

// ─────────────────────────────────────────────────────────────────────────────
// Sub-type enumerations
// ─────────────────────────────────────────────────────────────────────────────

export type PathType =
  | "road"
  | "dirt_road"
  | "cobblestone"
  | "river"
  | "stream"
  | "coastline"
  | "trail"
  | "wall"
  | "fence"
  | "bridge"
  | "custom";

export type PlotType =
  | "farmland"
  | "forest"
  | "grassland"
  | "desert"
  | "tundra"
  | "swamp"
  | "mountain"
  | "lake"
  | "ocean"
  | "urban"
  | "ruins"
  | "custom";

export type RoomType =
  | "bedroom"
  | "great_hall"
  | "kitchen"
  | "dungeon"
  | "throne_room"
  | "library"
  | "armory"
  | "stable"
  | "chapel"
  | "garden"
  | "corridor"
  | "custom";

// ─────────────────────────────────────────────────────────────────────────────
// Path nodes
// ─────────────────────────────────────────────────────────────────────────────

export interface PathPoint {
  x: number;
  y: number;
  /** Optional bezier control point in */
  cpIn?: { x: number; y: number };
  /** Optional bezier control point out */
  cpOut?: { x: number; y: number };
}

export interface PathAutoFill {
  enabled: boolean;
  /** Fill color on the left side of the path direction */
  leftColor: string;
  /** Fill color on the right side of the path direction */
  rightColor: string;
  blendWidth: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Plot nodes
// ─────────────────────────────────────────────────────────────────────────────

export interface PlotAutoFill {
  enabled: boolean;
  fillColor: string;
  fillOpacity: number;
  /** Asset IDs to scatter randomly inside the plot */
  scatterAssetIds: string[];
  scatterDensity: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Room nodes
// ─────────────────────────────────────────────────────────────────────────────

export interface DoorPosition {
  /** 0–1 normalised position along the wall */
  wallIndex: number;
  offset: number;
  width: number;
  /** open | closed | locked */
  state: "open" | "closed" | "locked";
  label?: string;
}

export interface WindowPosition {
  wallIndex: number;
  offset: number;
  width: number;
  label?: string;
}

export interface RoomAutoDecorate {
  enabled: boolean;
  /** Asset IDs placed at preset anchor points inside the room */
  furnitureAssetIds: string[];
  wallDecorationAssetIds: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Base node
// ─────────────────────────────────────────────────────────────────────────────

export interface BaseNode {
  id: string;
  layerId: string;
  label: string;
  locked: boolean;
  visible: boolean;
  /** Z-order within the layer (higher = drawn on top) */
  zIndex: number;
  x: number;
  y: number;
  rotation: number;
  opacity: number;
  tags: string[];
  metadata: Record<string, string | number | boolean>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Concrete node types
// ─────────────────────────────────────────────────────────────────────────────

export interface ObjectNode extends BaseNode {
  type: "object";
  assetId: string;
  width: number;
  height: number;
  flipX: boolean;
  flipY: boolean;
  tintColor: string | null;
}

export interface PathNode extends BaseNode {
  type: "path";
  pathType: PathType;
  points: PathPoint[];
  closed: boolean;
  strokeColor: string;
  strokeWidth: number;
  strokeOpacity: number;
  dashPattern: number[];
  autoFill: PathAutoFill;
}

export interface PlotNode extends BaseNode {
  type: "plot";
  plotType: PlotType;
  /** Polygon vertices relative to the node's (x, y) origin */
  vertices: { x: number; y: number }[];
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  autoFill: PlotAutoFill;
}

export interface RoomNode extends BaseNode {
  type: "room";
  roomType: RoomType;
  width: number;
  height: number;
  wallColor: string;
  wallThickness: number;
  floorColor: string;
  floorPattern: string;
  doors: DoorPosition[];
  windows: WindowPosition[];
  autoDecorate: RoomAutoDecorate;
}

/** Discriminated union of all map node kinds */
export type MapNode = ObjectNode | PathNode | PlotNode | RoomNode;

// ─────────────────────────────────────────────────────────────────────────────
// Layer
// ─────────────────────────────────────────────────────────────────────────────

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  /** Ordered list of node IDs belonging to this layer */
  nodeIds: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Export area
// ─────────────────────────────────────────────────────────────────────────────

export interface ExportArea {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Asset definition
// ─────────────────────────────────────────────────────────────────────────────

export interface AssetDefinition {
  id: string;
  name: string;
  category: string;
  /** SVG data URI or URL */
  src: string;
  /** Natural dimensions for layout hints */
  naturalWidth: number;
  naturalHeight: number;
  tags: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Map settings
// ─────────────────────────────────────────────────────────────────────────────

export interface GridSettings {
  visible: boolean;
  type: "square" | "hex" | "isometric";
  size: number;
  color: string;
  opacity: number;
  snapEnabled: boolean;
}

export interface AtmosphereSettings {
  lightingEnabled: boolean;
  sunAngle: number;
  sunElevation: number;
  sunColor: string;
  ambientLight: number;
  shadowLength: number;
  shadowOpacity: number;
  weatherType: "none" | "rain" | "snow" | "fog" | "storm";
  weatherIntensity: number;
  fogColor: string;
  fogOpacity: number;
  templateName: string | null;
}

export interface MapSettings {
  title: string;
  description: string;
  author: string;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  grid: GridSettings;
  atmosphere: AtmosphereSettings;
}

// ─────────────────────────────────────────────────────────────────────────────
// Top-level document
// ─────────────────────────────────────────────────────────────────────────────

export interface MapDocument {
  id: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  settings: MapSettings;
  /** Ordered array of layers (index 0 = bottom) */
  layers: Layer[];
  /** All nodes keyed by ID for O(1) lookup */
  nodes: Record<string, MapNode>;
  exportAreas: ExportArea[];
}
