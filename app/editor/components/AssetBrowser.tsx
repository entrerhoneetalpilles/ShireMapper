'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useToolStore } from '@/app/store/toolStore';
import { assetsByCategory, assetCategories } from '@/app/lib/assetManifest';
import type { AssetDefinition } from '@/app/types/map';

// ─────────────────────────────────────────────────────────────────────────────
// Category tab labels (display names mapped from raw category keys)
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  buildings: 'Buildings',
  vegetation: 'Vegetation',
  walls: 'Walls',
  furniture: 'Furniture',
  water: 'Water',
  roads: 'Roads',
  decorative: 'Decorative',
  misc: 'Misc',
};

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
        'flex flex-col items-center gap-1 p-1 rounded transition-colors shrink-0',
        isActive
          ? 'border-2 border-blue-400 bg-blue-900/30'
          : 'border-2 border-transparent hover:border-[#0F3460] hover:bg-[#0F3460]/40',
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
      <span className="text-xs text-gray-400 truncate max-w-[68px] leading-tight">
        {asset.name}
      </span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function AssetBrowser() {
  const activeAssetCategory = useToolStore((s) => s.activeAssetCategory);
  const setActiveAssetCategory = useToolStore((s) => s.setActiveAssetCategory);
  const activeAssetId = useToolStore((s) => s.activeAssetId);
  const setActiveAssetId = useToolStore((s) => s.setActiveAssetId);

  const [collapsed, setCollapsed] = useState(false);

  // Use manifest categories, falling back to the CATEGORY_LABELS keys
  const tabs = assetCategories.length > 0 ? assetCategories : Object.keys(CATEGORY_LABELS);
  const currentAssets: AssetDefinition[] = assetsByCategory[activeAssetCategory] ?? [];

  return (
    <div
      className={[
        'bg-[#16213E] border-t border-[#0F3460] flex flex-col transition-all duration-200',
        collapsed ? 'h-9' : 'h-[150px]',
      ].join(' ')}
    >
      {/* Header bar: category tabs + collapse toggle */}
      <div className="flex items-center h-9 shrink-0 border-b border-[#0F3460] px-2 gap-1 overflow-x-auto scrollbar-none">
        {/* Category tabs */}
        <div className="flex items-center gap-0.5 flex-1">
          {tabs.map((cat) => (
            <button
              key={cat}
              title={CATEGORY_LABELS[cat] ?? cat}
              onClick={() => setActiveAssetCategory(cat)}
              className={[
                'px-2.5 py-1 rounded text-xs whitespace-nowrap transition-colors',
                activeAssetCategory === cat
                  ? 'bg-[#0F3460] text-gray-100 border border-[#E94560]/60'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#0F3460]/50',
              ].join(' ')}
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>

        {/* Collapse toggle */}
        <button
          title={collapsed ? 'Expand asset browser' : 'Collapse asset browser'}
          onClick={() => setCollapsed((c) => !c)}
          className="ml-auto text-gray-500 hover:text-gray-300 transition-colors shrink-0"
        >
          {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Asset grid */}
      {!collapsed && (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex items-start gap-2 px-2 py-1 h-full">
            {currentAssets.length === 0 ? (
              <p className="text-xs text-gray-600 self-center px-2">
                No assets in this category.
              </p>
            ) : (
              currentAssets.map((asset) => (
                <AssetThumb
                  key={asset.id}
                  asset={asset}
                  isActive={activeAssetId === asset.id}
                  onSelect={() => {
                    setActiveAssetId(asset.id);
                    setActiveAssetCategory(asset.category);
                  }}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
