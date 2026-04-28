import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { AtmosphereSettings } from "../types/map";

// ─────────────────────────────────────────────────────────────────────────────
// Store shape
// ─────────────────────────────────────────────────────────────────────────────

export interface AtmosphereState extends AtmosphereSettings {
  updateAtmosphere: (partial: Partial<AtmosphereSettings>) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default atmosphere values
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Store implementation
// ─────────────────────────────────────────────────────────────────────────────

export const useAtmosphereStore = create<AtmosphereState>()(
  immer((set) => ({
    ...defaultAtmosphere,

    updateAtmosphere: (partial) =>
      set((state) => {
        Object.assign(state, partial);
      }),
  }))
);
