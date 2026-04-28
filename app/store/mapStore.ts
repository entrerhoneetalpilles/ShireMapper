import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { v4 as uuidv4 } from "uuid";
import type {
  MapDocument,
  MapNode,
  Layer,
  MapSettings,
  GridSettings,
  AtmosphereSettings,
} from "../types/map";

// ─────────────────────────────────────────────────────────────────────────────
// Default values
// ─────────────────────────────────────────────────────────────────────────────

const defaultGrid: GridSettings = {
  visible: true,
  type: "square",
  size: 32,
  color: "#cccccc",
  opacity: 0.5,
  snapEnabled: false,
};

const defaultAtmosphere: AtmosphereSettings = {
  lightingEnabled: false,
  sunAngle: 180,
  sunElevation: 45,
  sunColor: "#FFFDE7",
  ambientLight: 1.0,
  shadowLength: 1.5,
  shadowOpacity: 0.5,
  weatherType: "none",
  weatherIntensity: 0.5,
  fogColor: "#CCCCCC",
  fogOpacity: 0.3,
  templateName: null,
};

const defaultSettings: MapSettings = {
  title: "Untitled Map",
  description: "",
  author: "",
  canvasWidth: 2048,
  canvasHeight: 2048,
  backgroundColor: "#1a1a2e",
  grid: defaultGrid,
  atmosphere: defaultAtmosphere,
};

/** Build the five default layers */
function buildDefaultLayers(): Layer[] {
  return [
    { id: uuidv4(), name: "Background", visible: true, locked: false, opacity: 1, nodeIds: [] },
    { id: uuidv4(), name: "Structures", visible: true, locked: false, opacity: 1, nodeIds: [] },
    { id: uuidv4(), name: "Paths", visible: true, locked: false, opacity: 1, nodeIds: [] },
    { id: uuidv4(), name: "Objects", visible: true, locked: false, opacity: 1, nodeIds: [] },
    { id: uuidv4(), name: "Overlay", visible: true, locked: false, opacity: 1, nodeIds: [] },
  ];
}

function buildDefaultDocument(): MapDocument {
  const layers = buildDefaultLayers();
  return {
    id: uuidv4(),
    version: "1.0.0",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: defaultSettings,
    layers,
    nodes: {},
    exportAreas: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Store shape
// ─────────────────────────────────────────────────────────────────────────────

export interface MapState {
  document: MapDocument;
  selectedNodeIds: string[];
  activeLayerId: string;

  // Document-level
  setDocument: (doc: MapDocument) => void;

  // Node actions
  addNode: (node: MapNode) => void;
  updateNode: (id: string, patch: Partial<MapNode>) => void;
  removeNode: (id: string) => void;
  moveNode: (id: string, x: number, y: number) => void;

  // Selection
  setSelectedNodes: (ids: string[]) => void;

  // Active layer
  setActiveLayer: (layerId: string) => void;

  // Layer actions
  addLayer: (name: string) => void;
  updateLayer: (id: string, patch: Partial<Omit<Layer, "id">>) => void;
  removeLayer: (id: string) => void;
  /** Move layer at `fromIndex` to `toIndex` */
  reorderLayers: (fromIndex: number, toIndex: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store implementation
// ─────────────────────────────────────────────────────────────────────────────

const initialDocument = buildDefaultDocument();

export const useMapStore = create<MapState>()(
  immer((set) => ({
    document: initialDocument,
    selectedNodeIds: [],
    activeLayerId: initialDocument.layers[1].id, // "Structures" layer as default active

    // ── Document ──────────────────────────────────────────────────────────────

    setDocument: (doc) =>
      set((state) => {
        state.document = doc;
        state.selectedNodeIds = [];
        state.activeLayerId = doc.layers[0]?.id ?? "";
      }),

    // ── Nodes ─────────────────────────────────────────────────────────────────

    addNode: (node) =>
      set((state) => {
        state.document.nodes[node.id] = node;
        const layer = state.document.layers.find((l) => l.id === node.layerId);
        if (layer) {
          layer.nodeIds.push(node.id);
        }
        state.document.updatedAt = new Date().toISOString();
      }),

    updateNode: (id, patch) =>
      set((state) => {
        const existing = state.document.nodes[id];
        if (!existing) return;
        // Merge the patch; the discriminated union means we cast through unknown
        state.document.nodes[id] = {
          ...existing,
          ...(patch as Partial<MapNode>),
        } as MapNode;
        state.document.updatedAt = new Date().toISOString();
      }),

    removeNode: (id) =>
      set((state) => {
        delete state.document.nodes[id];
        for (const layer of state.document.layers) {
          layer.nodeIds = layer.nodeIds.filter((nid) => nid !== id);
        }
        state.selectedNodeIds = state.selectedNodeIds.filter((nid) => nid !== id);
        state.document.updatedAt = new Date().toISOString();
      }),

    moveNode: (id, x, y) =>
      set((state) => {
        const node = state.document.nodes[id];
        if (!node) return;
        node.x = x;
        node.y = y;
        state.document.updatedAt = new Date().toISOString();
      }),

    // ── Selection ─────────────────────────────────────────────────────────────

    setSelectedNodes: (ids) =>
      set((state) => {
        state.selectedNodeIds = ids;
      }),

    // ── Active layer ──────────────────────────────────────────────────────────

    setActiveLayer: (layerId) =>
      set((state) => {
        state.activeLayerId = layerId;
      }),

    // ── Layers ────────────────────────────────────────────────────────────────

    addLayer: (name) =>
      set((state) => {
        const newLayer: Layer = {
          id: uuidv4(),
          name,
          visible: true,
          locked: false,
          opacity: 1,
          nodeIds: [],
        };
        state.document.layers.push(newLayer);
        state.activeLayerId = newLayer.id;
        state.document.updatedAt = new Date().toISOString();
      }),

    updateLayer: (id, patch) =>
      set((state) => {
        const layer = state.document.layers.find((l) => l.id === id);
        if (!layer) return;
        Object.assign(layer, patch);
        state.document.updatedAt = new Date().toISOString();
      }),

    removeLayer: (id) =>
      set((state) => {
        // Remove all nodes belonging to this layer
        const layer = state.document.layers.find((l) => l.id === id);
        if (!layer) return;
        for (const nodeId of layer.nodeIds) {
          delete state.document.nodes[nodeId];
        }
        state.document.layers = state.document.layers.filter((l) => l.id !== id);
        // Update active layer if it was the one removed
        if (state.activeLayerId === id) {
          state.activeLayerId = state.document.layers[0]?.id ?? "";
        }
        state.selectedNodeIds = state.selectedNodeIds.filter(
          (nid) => !layer.nodeIds.includes(nid)
        );
        state.document.updatedAt = new Date().toISOString();
      }),

    reorderLayers: (fromIndex, toIndex) =>
      set((state) => {
        const layers = state.document.layers;
        if (
          fromIndex < 0 ||
          fromIndex >= layers.length ||
          toIndex < 0 ||
          toIndex >= layers.length
        ) {
          return;
        }
        const [moved] = layers.splice(fromIndex, 1);
        layers.splice(toIndex, 0, moved);
        state.document.updatedAt = new Date().toISOString();
      }),
  }))
);
