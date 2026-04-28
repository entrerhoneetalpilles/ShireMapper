import type { Application } from 'pixi.js';
import type { ExportArea } from '@/app/types/map';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ExportOptions {
  format: 'png' | 'jpg';
  /** JPEG quality, 0.6–1.0 */
  quality: number;
  /** Pixel multiplier for the output image */
  resolution: 1 | 2 | 4;
  includeGrid: boolean;
  includeWeather: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MIME: Record<ExportOptions['format'], string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
};

function triggerDownload(dataUrl: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Export the visible canvas (or a sub-region) to an image file.
 *
 * - If `exportArea` is null, the entire renderer canvas is exported.
 * - If `exportArea` is defined, only that rectangle is exported.
 *   The region is scaled by `options.resolution`.
 */
export async function exportToImage(
  app: Application,
  exportArea: ExportArea | null,
  options: ExportOptions,
  filename?: string,
): Promise<void> {
  const mimeType = MIME[options.format];
  const ext = options.format === 'jpg' ? 'jpg' : 'png';
  const outputFilename = filename ?? `map-export.${ext}`;

  if (exportArea === null) {
    // Full canvas export — pull directly from the renderer canvas
    const dataUrl = app.renderer.canvas.toDataURL(mimeType, options.quality);
    triggerDownload(dataUrl, outputFilename);
    return;
  }

  // Sub-region export — draw a cropped/scaled copy
  const srcCanvas = app.renderer.canvas;
  const srcWidth = exportArea.width;
  const srcHeight = exportArea.height;
  const destWidth = srcWidth * options.resolution;
  const destHeight = srcHeight * options.resolution;

  const MAX_SIDE = 8000;
  if (destWidth > MAX_SIDE || destHeight > MAX_SIDE) {
    alert(
      `Warning: export dimensions (${destWidth}×${destHeight}px) exceed 8000px. ` +
        'Consider using a lower resolution multiplier.',
    );
  }

  const offscreen = document.createElement('canvas');
  offscreen.width = destWidth;
  offscreen.height = destHeight;

  const ctx = offscreen.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2D context for export canvas.');
  }

  ctx.drawImage(
    srcCanvas,
    exportArea.x,
    exportArea.y,
    srcWidth,
    srcHeight,
    0,
    0,
    destWidth,
    destHeight,
  );

  const dataUrl = offscreen.toDataURL(mimeType, options.quality);
  triggerDownload(dataUrl, outputFilename);
}
