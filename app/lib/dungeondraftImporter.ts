import JSZip from 'jszip';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ImportedPack {
  id: string;
  name: string;
  author: string;
  assetCount: number;
}

export interface ImportedAsset {
  id: string;
  name: string;
  /** Category string as found in the pack (e.g. "Nature", "Buildings") */
  category: string;
  /** Blob URL — revoke with URL.revokeObjectURL when the pack is removed */
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  packId: string;
  packName: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// .dungeondraft_pack format
// ─────────────────────────────────────────────────────────────────────────────
//
// A .dungeondraft_pack is a ZIP archive. Structure:
//   pack.json                               ← metadata
//   objects/<PackName>/<Category>/<name>.png ← object sprites
//   textures/…, portals/…, paths/…          ← ignored for now
//
// pack.json may look like:
// {
//   "name": "Pack Name",
//   "id":   "pack_id",
//   "author": "Author",
//   "version": "1.0",
//   "category_order": ["Nature", "Buildings"],
//   "tags": {
//     "Nature": { "Trees": ["objects/Pack/Nature/oak.png"] }
//   }
// }
//
// We support both the tags-based and path-scan approaches so that packs
// without a proper pack.json still import cleanly.

interface PackJson {
  name?: string;
  id?: string;
  author?: string;
  version?: string;
  category_order?: string[];
  tags?: Record<string, Record<string, string[]>>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

export async function importDungeondraftPack(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<{ pack: ImportedPack; assets: ImportedAsset[] }> {
  const zip = await JSZip.loadAsync(file);

  // ── Parse pack.json ─────────────────────────────────────────────────────
  let meta: PackJson = {};
  const metaFile = zip.file('pack.json');
  if (metaFile) {
    try {
      meta = JSON.parse(await metaFile.async('text'));
    } catch {
      // continue with empty metadata
    }
  }

  const packId = meta.id ?? crypto.randomUUID();
  const packName = meta.name ?? file.name.replace(/\.dungeondraft_pack$/i, '');
  const packAuthor = meta.author ?? 'Unknown';

  // ── Build path→category map from tags ───────────────────────────────────
  const pathToCategory = new Map<string, string>();
  if (meta.tags) {
    for (const [cat, subTags] of Object.entries(meta.tags)) {
      for (const paths of Object.values(subTags)) {
        for (const p of paths) {
          pathToCategory.set(normalizePath(p), cat);
        }
      }
    }
  }

  // ── Collect image files (objects only, skip textures/paths) ─────────────
  const imageEntries: Array<{ path: string; entry: JSZip.JSZipObject }> = [];
  zip.forEach((relPath, entry) => {
    if (entry.dir) return;
    if (!isImagePath(relPath)) return;
    // Only import object sprites; skip textures, portals, wall tiles, etc.
    const norm = normalizePath(relPath);
    if (shouldSkip(norm)) return;
    imageEntries.push({ path: norm, entry });
  });

  // ── Extract each image and build assets ──────────────────────────────────
  const assets: ImportedAsset[] = [];
  let done = 0;

  for (const { path, entry } of imageEntries) {
    const mimeType = path.endsWith('.webp') ? 'image/webp'
      : path.endsWith('.jpg') || path.endsWith('.jpeg') ? 'image/jpeg'
      : 'image/png';

    const blob = new Blob([await entry.async('arraybuffer')], { type: mimeType });
    const src = URL.createObjectURL(blob);

    const { width, height } = await loadImageDimensions(src);

    const category = pathToCategory.get(path) ?? deriveCategoryFromPath(path);
    const name = deriveNameFromPath(path);

    assets.push({
      id: `${packId}::${path}`,
      name,
      category,
      src,
      naturalWidth: width,
      naturalHeight: height,
      packId,
      packName,
    });

    done++;
    onProgress?.(done, imageEntries.length);
  }

  return {
    pack: { id: packId, name: packName, author: packAuthor, assetCount: assets.length },
    assets,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').toLowerCase().trim();
}

function isImagePath(p: string): boolean {
  return /\.(png|webp|jpg|jpeg)$/i.test(p);
}

const SKIP_PREFIXES = ['textures/', 'patterns/', 'portals/', 'paths/', 'walls/'];

function shouldSkip(normalizedPath: string): boolean {
  return SKIP_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix));
}

/**
 * objects/PackName/Category/sub/name.png  →  "Category"
 * objects/Category/name.png               →  "Category"
 * anything else                           →  "Imported"
 */
function deriveCategoryFromPath(normalizedPath: string): string {
  const parts = normalizedPath.split('/');
  if (parts[0] === 'objects' && parts.length >= 4) return titleCase(parts[2]);
  if (parts[0] === 'objects' && parts.length === 3) return titleCase(parts[1]);
  if (parts.length >= 2) return titleCase(parts[parts.length - 2]);
  return 'Imported';
}

function deriveNameFromPath(normalizedPath: string): string {
  const fileName = normalizedPath.split('/').at(-1) ?? normalizedPath;
  return titleCase(fileName.replace(/\.(png|webp|jpg|jpeg)$/i, '').replace(/[_-]+/g, ' '));
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function loadImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || 128, height: img.naturalHeight || 128 });
    img.onerror = () => resolve({ width: 128, height: 128 });
    img.src = src;
  });
}
