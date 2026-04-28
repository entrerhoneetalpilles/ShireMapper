import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { ToolType } from "../types/map";

// ─────────────────────────────────────────────────────────────────────────────
// Store shape
// ─────────────────────────────────────────────────────────────────────────────

export interface ToolState {
  activeTool: ToolType;
  activePathType: string;
  activePlotType: string;
  activeRoomType: string;
  activeAssetCategory: string;
  activeAssetId: string | null;
  endlessPaintMode: boolean;
  snapEnabled: boolean;
  gridVisible: boolean;

  // Actions
  setActiveTool: (tool: ToolType) => void;
  setActivePathType: (pathType: string) => void;
  setActivePlotType: (plotType: string) => void;
  setActiveRoomType: (roomType: string) => void;
  setActiveAssetCategory: (category: string) => void;
  setActiveAssetId: (id: string | null) => void;
  toggleEndlessPaint: () => void;
  toggleSnap: () => void;
  toggleGrid: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store implementation
// ─────────────────────────────────────────────────────────────────────────────

export const useToolStore = create<ToolState>()(
  immer((set) => ({
    activeTool: "select",
    activePathType: "road",
    activePlotType: "farmland",
    activeRoomType: "great_hall",
    activeAssetCategory: "buildings",
    activeAssetId: null,
    endlessPaintMode: false,
    snapEnabled: false,
    gridVisible: true,

    setActiveTool: (tool) =>
      set((state) => {
        state.activeTool = tool;
      }),

    setActivePathType: (pathType) =>
      set((state) => {
        state.activePathType = pathType;
      }),

    setActivePlotType: (plotType) =>
      set((state) => {
        state.activePlotType = plotType;
      }),

    setActiveRoomType: (roomType) =>
      set((state) => {
        state.activeRoomType = roomType;
      }),

    setActiveAssetCategory: (category) =>
      set((state) => {
        state.activeAssetCategory = category;
      }),

    setActiveAssetId: (id) =>
      set((state) => {
        state.activeAssetId = id;
      }),

    toggleEndlessPaint: () =>
      set((state) => {
        state.endlessPaintMode = !state.endlessPaintMode;
      }),

    toggleSnap: () =>
      set((state) => {
        state.snapEnabled = !state.snapEnabled;
      }),

    toggleGrid: () =>
      set((state) => {
        state.gridVisible = !state.gridVisible;
      }),
  }))
);
