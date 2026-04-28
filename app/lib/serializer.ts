import type { MapDocument } from '@/app/types/map';

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Basic structural validation — checks that the required top-level fields
 * are present and have the expected types.
 */
export function validateMapDocument(obj: unknown): obj is MapDocument {
  if (typeof obj !== 'object' || obj === null) return false;
  const doc = obj as Record<string, unknown>;

  if (typeof doc['version'] !== 'string') return false;
  if (!Array.isArray(doc['layers'])) return false;

  const settings = doc['settings'];
  if (typeof settings !== 'object' || settings === null) return false;
  const s = settings as Record<string, unknown>;
  if (typeof s['canvasWidth'] !== 'number') return false;
  if (typeof s['canvasHeight'] !== 'number') return false;

  if (typeof doc['id'] !== 'string') return false;
  if (typeof doc['nodes'] !== 'object' || doc['nodes'] === null) return false;

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Version migration
// ─────────────────────────────────────────────────────────────────────────────

function migrateDocument(doc: MapDocument): MapDocument {
  // v1.0.0 — no migration needed, pass through
  return doc;
}

// ─────────────────────────────────────────────────────────────────────────────
// Serialize
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Serialize a MapDocument to a pretty-printed JSON string.
 */
export function serializeMap(doc: MapDocument): string {
  return JSON.stringify(doc, null, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Deserialize
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse and validate a JSON string, returning a MapDocument.
 * Throws if the JSON is malformed or fails validation.
 */
export function deserializeMap(json: string): MapDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid JSON: could not parse map file.');
  }

  if (!validateMapDocument(parsed)) {
    throw new Error('Invalid map document: missing required fields.');
  }

  return migrateDocument(parsed);
}

// ─────────────────────────────────────────────────────────────────────────────
// Download
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trigger a browser download of the map document as a .shiremap.json file.
 */
export function downloadMapJSON(doc: MapDocument, filename?: string): void {
  const json = serializeMap(doc);
  const name = filename ?? `${doc.settings.title || 'map'}.shiremap.json`;

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  // Clean up after a short delay to allow the download to start
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Load from File
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read a File object as text, parse, validate, and return a MapDocument.
 */
export async function loadMapFromFile(file: File): Promise<MapDocument> {
  const text = await file.text();
  return deserializeMap(text);
}
