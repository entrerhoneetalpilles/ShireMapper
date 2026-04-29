// ─────────────────────────────────────────────────────────────────────────────
// Dungeondraft pack importer
//
// .dungeondraft_pack files use Godot Engine's PCK binary container format, NOT
// ZIP. Structure:
//
//   [0]  uint32 LE  magic = 0x43504447  ("GDPC" in memory)
//   [4]  uint32 LE  pack_version  (1 = Godot 3, 2 = Godot 4)
//   [8]  uint32 LE  ver_major
//   [12] uint32 LE  ver_minor
//   [16] uint32 LE  ver_patch
//   [20] uint32[16] reserved (64 bytes, all zeros)
//   [84] uint32 LE  file_count
//        [per file]
//          uint32   path_len  (byte length including null terminator)
//          uint8[]  path      (UTF-8, null-terminated, starts with "res://")
//          uint64   offset    (absolute byte offset within this file)
//          uint64   size      (byte size of data)
//          uint8[16] md5
//
// Godot 4 (pack_version == 2) adds extra fields but Dungeondraft uses
// Godot 3 so we only fully implement version 1.
// ─────────────────────────────────────────────────────────────────────────────

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
  category: string;
  /** Blob URL – revoke with URL.revokeObjectURL() when the pack is removed */
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  packId: string;
  packName: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PCK parser
// ─────────────────────────────────────────────────────────────────────────────

const PCK_MAGIC = 0x43504447; // bytes G D P C in little-endian uint32

interface PckEntry {
  /** Full res:// path as stored in the pack, e.g. "res://objects/Pack/Cat/name.png" */
  path: string;
  offset: number;
  size: number;
}

function parsePckIndex(buffer: ArrayBuffer): { entries: PckEntry[]; packVersion: number } {
  const view = new DataView(buffer);

  const magic = view.getUint32(0, true);
  if (magic !== PCK_MAGIC) {
    const b = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
    const hex = Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join(' ');
    throw new Error(
      `Format non reconnu (magic: ${hex}). ` +
        `Assurez-vous que le fichier est bien un .dungeondraft_pack Godot valide.`,
    );
  }

  const packVersion = view.getUint32(4, true);
  // ver_major at 8, ver_minor at 12, ver_patch at 16 — not needed

  // Header size: 4 (magic) + 4 (pack_ver) + 4*3 (versions) + 4*16 (reserved) = 84
  let cursor = 84;

  // Godot 4 extras: flags (uint32) + files_base (uint64)
  // files_base must be added to every entry offset.
  let filesBase = 0;
  if (packVersion >= 2) {
    cursor += 4; // skip flags
    filesBase = Number(view.getBigUint64(cursor, true));
    cursor += 8;
  }

  const fileCount = view.getUint32(cursor, true);
  cursor += 4;

  const decoder = new TextDecoder('utf-8');
  const entries: PckEntry[] = [];

  for (let i = 0; i < fileCount; i++) {
    const pathLen = view.getUint32(cursor, true);
    cursor += 4;

    const pathBytes = new Uint8Array(buffer, cursor, pathLen);
    // Strip null terminator(s) that Godot appends
    const path = decoder.decode(pathBytes).replace(/\0+$/, '');
    cursor += pathLen;

    // offset and size are uint64; convert via BigInt then to number (safe < 2^53)
    // Add filesBase for Godot 4 packs (always 0 for Godot 3)
    const offset = Number(view.getBigUint64(cursor, true)) + filesBase;
    cursor += 8;

    const size = Number(view.getBigUint64(cursor, true));
    cursor += 8;

    // MD5 hash — skip
    cursor += 16;

    // Godot 4 per-file flags
    if (packVersion >= 2) {
      cursor += 4;
    }

    entries.push({ path, offset, size });
  }

  return { entries, packVersion };
}

// ─────────────────────────────────────────────────────────────────────────────
// pack.json schema (Dungeondraft-specific metadata)
// ─────────────────────────────────────────────────────────────────────────────

interface DungeondraftPackJson {
  name?: string;
  id?: string;
  author?: string;
  version?: string;
  category_order?: string[];
  /** { "CategoryName": { "SubTag": ["res://objects/Pack/Cat/file.png"] } } */
  tags?: Record<string, Record<string, string[]>>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

export async function importDungeondraftPack(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<{ pack: ImportedPack; assets: ImportedAsset[] }> {
  const buffer = await file.arrayBuffer();

  // Parse the PCK index
  const { entries, packVersion } = parsePckIndex(buffer);

  // ── Locate and parse pack.json ──────────────────────────────────────────
  let meta: DungeondraftPackJson = {};
  const metaEntry = entries.find((e) =>
    e.path.endsWith('pack.json') || e.path.endsWith('pack.js'),
  );
  if (metaEntry) {
    try {
      const raw = new Uint8Array(buffer, metaEntry.offset, metaEntry.size);
      meta = JSON.parse(new TextDecoder('utf-8').decode(raw));
    } catch {
      // Proceed with defaults if JSON is malformed
    }
  }

  const packId = meta.id ?? crypto.randomUUID();
  const packName = meta.name ?? file.name.replace(/\.dungeondraft_pack$/i, '');
  const packAuthor = meta.author ?? 'Unknown';

  // ── Build path → category map from tags ────────────────────────────────
  const pathToCategory = new Map<string, string>();
  if (meta.tags) {
    for (const [cat, subTags] of Object.entries(meta.tags)) {
      for (const paths of Object.values(subTags)) {
        for (const p of paths) {
          pathToCategory.set(p.toLowerCase(), cat);
        }
      }
    }
  }

  // Debug: log the full PCK manifest so issues can be diagnosed from the browser console.
  if (typeof console !== 'undefined') {
    console.group('[ShireMapper] Dungeondraft PCK import —', file.name);
    console.log('Pack version:', packVersion, '| Total entries:', entries.length);
    const imgPaths = entries.filter((e) => /\.(png|webp|jpg|jpeg)$/i.test(e.path));
    console.log('Image entries:', imgPaths.length);
    imgPaths.forEach((e) => console.log(' ', e.path));
    console.groupEnd();
  }

  // ── Collect image entries ───────────────────────────────────────────────
  // Use a top-level prefix check (not a substring) so that an object in
  // res://objects/PackName/Paths/sign.png is NOT confused with the
  // res://paths/ brush-texture directory.
  const TOP_LEVEL_SKIP = [
    'res://textures/',
    'res://patterns/',
    'res://paths/',   // line/road brush textures
    'res://walls/',   // wall brush textures
  ];

  const imageEntries = entries.filter((e) => {
    const p = e.path.toLowerCase();
    if (!/\.(png|webp|jpg|jpeg)$/i.test(p)) return false;
    // Drop the pack's own preview thumbnail
    const fileName = p.split('/').at(-1) ?? '';
    if (/^preview\.(png|webp|jpg|jpeg)$/.test(fileName)) return false;
    // Drop brush/fill textures that live at the top-level directories
    if (TOP_LEVEL_SKIP.some((s) => p.startsWith(s))) return false;
    return true;
  });

  if (imageEntries.length === 0) {
    throw new Error(
      'Aucun asset image trouvé dans ce pack. ' +
        `Le pack contient ${entries.length} fichier(s) au total (${
          entries.filter((e) => /\.(png|webp|jpg|jpeg)$/i.test(e.path)).length
        } images). Vérifiez la console du navigateur pour voir les chemins détectés.`,
    );
  }

  // ── Extract images and build asset list ────────────────────────────────
  const assets: ImportedAsset[] = [];
  let done = 0;

  for (const entry of imageEntries) {
    const ext = entry.path.split('.').pop()?.toLowerCase() ?? 'png';
    const mime =
      ext === 'webp' ? 'image/webp' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';

    const data = new Uint8Array(buffer, entry.offset, entry.size);
    const blob = new Blob([data], { type: mime });
    const src = URL.createObjectURL(blob);

    const { width, height } = await loadImageDimensions(src);

    // Category: from tags map or derived from path
    const pathLower = entry.path.toLowerCase();
    const category = pathToCategory.get(pathLower) ?? deriveCategoryFromPath(entry.path);
    const name = deriveNameFromPath(entry.path);

    assets.push({
      id: `${packId}::${entry.path}`,
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

/**
 * res://objects/PackName/CategoryName/sub/file.png  →  "CategoryName"
 * res://objects/CategoryName/file.png               →  "CategoryName"
 * anything else                                     →  "Imported"
 */
function deriveCategoryFromPath(resPath: string): string {
  // Strip leading "res://"
  const path = resPath.replace(/^res:\/\//i, '').replace(/\\/g, '/');
  const parts = path.split('/');

  if (parts[0]?.toLowerCase() === 'objects') {
    // objects/PackName/Category/...  → parts[2]
    if (parts.length >= 4) return titleCase(parts[2]);
    // objects/Category/...           → parts[1]
    if (parts.length >= 3) return titleCase(parts[1]);
  }

  // Fallback: second-to-last path segment
  if (parts.length >= 2) return titleCase(parts[parts.length - 2]);
  return 'Imported';
}

function deriveNameFromPath(resPath: string): string {
  const fileName = resPath.split('/').at(-1) ?? resPath;
  const base = fileName.replace(/\.(png|webp|jpg|jpeg)$/i, '');
  return titleCase(base.replace(/[_-]+/g, ' '));
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
