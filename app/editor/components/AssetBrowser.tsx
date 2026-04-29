'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useToolStore } from '@/app/store/toolStore';
import { useImportedAssetsStore } from '@/app/store/importedAssetsStore';
import { assetsByCategory, assetCategories } from '@/app/lib/assetManifest';
import ImportPackButton from './ImportPackButton';
import type { AssetDefinition } from '@/app/types/map';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const BUILTIN_LABELS: Record<string, string> = {
  buildings: 'Buildings',
  vegetation: 'Vegetation',
  terrain: 'Terrain',
  walls: 'Walls',
  furniture: 'Furniture',
  water: 'Water',
  roads: 'Roads',
  decorative: 'Decorative',
  misc: 'Misc',
};

function categoryLabel(cat: string): string {
  return BUILTIN_LABELS[cat] ?? cat;
}

// ─────────────────────────────────────────────────────────────────────────────
// Asset thumbnail
// ─────────────────────────────────────────────────────────────────────────────

interface AssetThumbProps {
  asset: AssetDefinition;
  isActive: boolean;
  onSelect: () => void;
}

function AssetThumb({ asset, isActive, onSelect }: AssetThumbProps) {
  return (
    <button
      title={asset.name}
      onClick={onSelect}
      className={[
        'flex flex-col items-center gap-1 p-1 rounded transition-all duration-150 shrink-0',
        isActive
          ? 'border-2 border-amber-400 bg-amber-900/30 shadow-[0_0_8px_rgba(212,132,74,0.3)]'
          : 'border-2 border-transparent hover:border-amber-700/50 hover:bg-amber-900/10',
      ].join(' ')}
    >
      <img
        src={asset.src}
        alt={asset.name}
        width={64}
        height={64}
        className="w-16 h-16 object-contain rounded"
        draggable={false}
      />
      <span
        className={[
          'text-xs truncate max-w-[68px] leading-tight',
          isActive ? 'text-amber-300' : 'text-gray-400',
        ].join(' ')}
      >
        {asset.name}
      </span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface AssetBrowserProps {
  embedded?: boolean;
  onAssetSelect?: () => void;
}

export default function AssetBrowser({ embedded = false, onAssetSelect }: AssetBrowserProps) {
  const activeAssetCategory = useToolStore((s) => s.activeAssetCategory);
  const setActiveAssetCategory = useToolStore((s) => s.setActiveAssetCategory);
  const activeAssetId = useToolStore((s) => s.activeAssetId);
  const setActiveAssetId = useToolStore((s) => s.setActiveAssetId);

  const importedAssets = useImportedAssetsStore((s) => s.assets);

  const [collapsed, setCollapsed] = useState(false);

  // Merge built-in + imported asset categories
  const allTabs = useMemo(() => {
    const importedCats = Array.from(new Set(importedAssets.map((a) => a.category)));
    const combined = [...assetCategories];
    for (const cat of importedCats) {
      if (!combined.includes(cat)) combined.push(cat);
    }
    return combined;
  }, [importedAssets]);

  // Merge built-in + imported assets for the active category
  const currentAssets = useMemo((): AssetDefinition[] => {
    const builtin = assetsByCategory[activeAssetCategory] ?? [];
    const imported = importedAssets
      .filter((a) => a.category === activeAssetCategory)
      .map(
        (a): AssetDefinition => ({
          id: a.id,
          name: a.name,
          category: a.category,
          src: a.src,
          naturalWidth: a.naturalWidth,
          naturalHeight: a.naturalHeight,
          tags: [a.packName],
        }),
      );
    return [...builtin, ...imported];
  }, [activeAssetCategory, importedAssets]);

  function handleSelect(assetId: string, category: string) {
    setActiveAssetId(assetId);
    setActiveAssetCategory(category);
    onAssetSelect?.();
  }

  if (embedded) {
    return (
      <div className="flex flex-col h-full bg-[#16213E]">
        {/* Category tabs */}
        <div className="flex items-center h-10 shrink-0 border-b border-[#2a3a6a] px-2 gap-1 overflow-x-auto scrollbar-none">
          {allTabs.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveAssetCategory(cat)}
              className={[
                'px-2.5 py-1 rounded text-xs whitespace-nowrap transition-colors shrink-0',
                activeAssetCategory === cat
                  ? 'bg-amber-900/30 text-amber-300 border border-amber-600/50'
                  : 'text-gray-400 hover:text-amber-200 hover:bg-amber-900/10',
              ].join(' ')}
            >
              {categoryLabel(cat)}
            </button>
          ))}
        </div>

        {/* Asset grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {currentAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
              <span className="text-3xl opacity-20">🗺️</span>
              <p className="text-xs text-[#8a8070]">
                Choisissez une catégorie puis touchez un asset pour le placer
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {currentAssets.map((asset) => (
                <AssetThumb
                  key={asset.id}
                  asset={asset}
                  isActive={activeAssetId === asset.id}
                  onSelect={() => handleSelect(asset.id, asset.category)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Import button at the bottom of the sheet */}
        <ImportPackButton />
      </div>
    );
  }

  // ── Desktop inline mode ────────────────────────────────────────────────────
  return (
    <div
      className={[
        'bg-[#16213E] border-t border-[#2a3a6a] flex flex-col transition-all duration-200',
        collapsed ? 'h-9' : 'h-[180px]',
      ].join(' ')}
    >
      {/* Header: category tabs + collapse toggle */}
      <div className="flex items-center h-9 shrink-0 border-b border-[#2a3a6a] px-2 gap-1 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-0.5 flex-1">
          {allTabs.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveAssetCategory(cat)}
              className={[
                'px-2.5 py-1 rounded text-xs whitespace-nowrap transition-colors',
                activeAssetCategory === cat
                  ? 'bg-amber-900/30 text-amber-300 border border-amber-600/50'
                  : 'text-gray-400 hover:text-amber-200 hover:bg-amber-900/10',
              ].join(' ')}
            >
              {categoryLabel(cat)}
            </button>
          ))}
        </div>
        <button
          title={collapsed ? 'Expand' : 'Collapse'}
          onClick={() => setCollapsed((c) => !c)}
          className="ml-auto text-gray-500 hover:text-amber-400 transition-colors shrink-0"
        >
          {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Assets row + import button */}
      {!collapsed && (
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Asset strip */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex items-center gap-2 px-3 py-1 h-full">
              {currentAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1 w-full text-center">
                  <span className="text-2xl opacity-20">🗺️</span>
                  <p className="text-xs text-[#8a8070]">
                    Sélectionnez une catégorie puis cliquez sur un asset
                  </p>
                </div>
              ) : (
                currentAssets.map((asset) => (
                  <AssetThumb
                    key={asset.id}
                    asset={asset}
                    isActive={activeAssetId === asset.id}
                    onSelect={() => handleSelect(asset.id, asset.category)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Import button — right side, fixed width */}
          <div className="w-[160px] shrink-0 border-l border-[#2a3a6a] flex flex-col justify-center p-2">
            <ImportPackButton />
          </div>
        </div>
      )}
    </div>
  );
}
