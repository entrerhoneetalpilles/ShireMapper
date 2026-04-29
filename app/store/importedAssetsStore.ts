import { create } from 'zustand';
import type { ImportedPack, ImportedAsset } from '@/app/lib/dungeondraftImporter';

// ─────────────────────────────────────────────────────────────────────────────
// Store shape
// ─────────────────────────────────────────────────────────────────────────────

export interface ImportedAssetsState {
  packs: ImportedPack[];
  assets: ImportedAsset[];
  importing: boolean;
  progress: { done: number; total: number } | null;
  error: string | null;

  importPack: (file: File) => Promise<void>;
  removePack: (packId: string) => void;
  clearError: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store implementation
// ─────────────────────────────────────────────────────────────────────────────

export const useImportedAssetsStore = create<ImportedAssetsState>()((set, get) => ({
  packs: [],
  assets: [],
  importing: false,
  progress: null,
  error: null,

  importPack: async (file: File) => {
    set({ importing: true, error: null, progress: { done: 0, total: 0 } });
    try {
      const { importDungeondraftPack } = await import('@/app/lib/dungeondraftImporter');
      const { pack, assets } = await importDungeondraftPack(file, (done, total) => {
        set({ progress: { done, total } });
      });

      if (assets.length === 0) {
        throw new Error('Aucun asset trouvé dans ce fichier. Vérifiez que c\'est un pack Dungeondraft valide.');
      }

      set((state) => ({
        packs: [...state.packs, pack],
        assets: [...state.assets, ...assets],
        importing: false,
        progress: null,
      }));
    } catch (err) {
      set({
        importing: false,
        progress: null,
        error: err instanceof Error ? err.message : 'Échec de l\'import',
      });
    }
  },

  removePack: (packId: string) => {
    // Revoke all blob URLs for this pack to free memory
    get().assets
      .filter((a) => a.packId === packId)
      .forEach((a) => {
        try { URL.revokeObjectURL(a.src); } catch { /* ignore */ }
      });

    set((state) => ({
      packs: state.packs.filter((p) => p.id !== packId),
      assets: state.assets.filter((a) => a.packId !== packId),
    }));
  },

  clearError: () => set({ error: null }),
}));
