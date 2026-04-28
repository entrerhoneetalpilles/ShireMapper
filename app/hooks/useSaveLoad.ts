'use client';

import { useState, useRef, useCallback } from 'react';
import { useMapStore } from '@/app/store/mapStore';
import {
  serializeMap,
  deserializeMap,
  downloadMapJSON,
  loadMapFromFile,
} from '@/app/lib/serializer';
import type { MapDocument } from '@/app/types/map';

// ─────────────────────────────────────────────────────────────────────────────
// useSaveLoad
// ─────────────────────────────────────────────────────────────────────────────

export interface SaveLoadResult {
  /** Download the current document as a .shiremap.json file */
  saveLocal: () => void;
  /** Load a map from a File object, replacing the current document */
  loadFromFile: (file: File) => Promise<void>;
  /** Parse a raw JSON string and load into the store */
  loadFromJSON: (json: string) => void;
  /** True when the document has unsaved changes */
  hasPendingChanges: boolean;
  /** Timestamp of the last successful save, or null if never saved */
  lastSavedAt: Date | null;
}

export function useSaveLoad(): SaveLoadResult {
  const document = useMapStore((s) => s.document);
  const setDocument = useMapStore((s) => s.setDocument);

  // Snapshot of the last saved document, serialized for cheap comparison
  const savedSnapshotRef = useRef<string>(serializeMap(document));
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Derive pending changes by comparing current serialization to snapshot
  const currentSerialized = serializeMap(document);
  const hasPendingChanges = currentSerialized !== savedSnapshotRef.current;

  // ── Actions ───────────────────────────────────────────────────────────────

  const saveLocal = useCallback(() => {
    downloadMapJSON(document);
    savedSnapshotRef.current = serializeMap(document);
    setLastSavedAt(new Date());
  }, [document]);

  const loadFromJSON = useCallback(
    (json: string) => {
      const loaded: MapDocument = deserializeMap(json);
      setDocument(loaded);
      savedSnapshotRef.current = serializeMap(loaded);
      setLastSavedAt(new Date());
    },
    [setDocument],
  );

  const loadFromFileCallback = useCallback(
    async (file: File) => {
      const loaded = await loadMapFromFile(file);
      setDocument(loaded);
      savedSnapshotRef.current = serializeMap(loaded);
      setLastSavedAt(new Date());
    },
    [setDocument],
  );

  return {
    saveLocal,
    loadFromFile: loadFromFileCallback,
    loadFromJSON,
    hasPendingChanges,
    lastSavedAt,
  };
}
