'use client';

import { useState, useCallback } from 'react';
import type { RefObject } from 'react';
import type { Application } from 'pixi.js';
import { exportToImage } from '@/app/lib/exporter';
import type { ExportOptions } from '@/app/lib/exporter';
import { useMapStore } from '@/app/store/mapStore';

// ─────────────────────────────────────────────────────────────────────────────
// useExport
// ─────────────────────────────────────────────────────────────────────────────

export interface ExportResult {
  exportImage: (options: ExportOptions) => Promise<void>;
  isExporting: boolean;
}

export function useExport(appRef: RefObject<Application | null>): ExportResult {
  const [isExporting, setIsExporting] = useState(false);
  const exportAreas = useMapStore((s) => s.document.exportAreas);
  const mapTitle = useMapStore((s) => s.document.settings.title);

  const exportImage = useCallback(
    async (options: ExportOptions) => {
      const app = appRef.current;
      if (!app) return;

      setIsExporting(true);
      try {
        // Use the first defined export area if one exists, otherwise full canvas
        const area = exportAreas.length > 0 ? exportAreas[0] : null;
        const ext = options.format === 'jpg' ? 'jpg' : 'png';
        const filename = `${mapTitle || 'map'}-export.${ext}`;
        await exportToImage(app, area, options, filename);
      } finally {
        setIsExporting(false);
      }
    },
    [appRef, exportAreas, mapTitle],
  );

  return { exportImage, isExporting };
}

export type { ExportOptions };
