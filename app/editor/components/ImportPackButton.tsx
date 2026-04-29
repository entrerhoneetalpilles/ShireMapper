'use client';

import { useRef, useCallback } from 'react';
import { Upload, X, Package, AlertCircle, Loader } from 'lucide-react';
import { useImportedAssetsStore } from '@/app/store/importedAssetsStore';

// ─────────────────────────────────────────────────────────────────────────────
// ImportPackButton
// ─────────────────────────────────────────────────────────────────────────────

export default function ImportPackButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { packs, importing, progress, error, importPack, removePack, clearError } =
    useImportedAssetsStore();

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      // Reset input so the same file can be re-imported if needed
      e.target.value = '';
      await importPack(file);
    },
    [importPack],
  );

  return (
    <div className="px-3 py-2 border-t border-[#2a3a6a]">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".dungeondraft_pack"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Import button */}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={importing}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors
          bg-amber-900/20 border border-amber-700/30 text-amber-300
          hover:bg-amber-900/40 hover:border-amber-600/50 active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {importing ? (
          <Loader size={13} className="animate-spin" />
        ) : (
          <Upload size={13} />
        )}
        {importing ? 'Import en cours…' : 'Importer un pack Dungeondraft'}
      </button>

      {/* Progress bar */}
      {importing && progress && progress.total > 0 && (
        <div className="mt-2">
          <div className="h-1 bg-[#1e2a4a] rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-150"
              style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-500 mt-1 text-center">
            {progress.done} / {progress.total} assets
          </p>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mt-2 flex items-start gap-2 p-2 rounded-lg bg-red-900/20 border border-red-700/30">
          <AlertCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-[10px] text-red-300 flex-1">{error}</p>
          <button onClick={clearError} className="text-red-400 hover:text-red-200">
            <X size={11} />
          </button>
        </div>
      )}

      {/* Loaded packs list */}
      {packs.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {packs.map((pack) => (
            <div
              key={pack.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#1e2a4a] border border-[#2a3a6a]"
            >
              <Package size={12} className="text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-amber-200 truncate font-medium">{pack.name}</p>
                <p className="text-[9px] text-gray-500">{pack.assetCount} assets · {pack.author}</p>
              </div>
              <button
                onClick={() => removePack(pack.id)}
                className="text-gray-500 hover:text-red-400 transition-colors shrink-0"
                title="Retirer ce pack"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
