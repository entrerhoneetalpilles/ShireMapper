'use client';

import { Trash2, FlipHorizontal, FlipVertical } from 'lucide-react';
import { useMapStore } from '@/app/store/mapStore';
import { useToolStore } from '@/app/store/toolStore';
import type { ObjectNode, PathNode, PathType, PlotType, RoomType, PlacementMode, DepthLayer } from '@/app/types/map';

// ─────────────────────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
      {children}
    </p>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2">
      <label className="text-xs text-gray-400 shrink-0 w-20">{label}</label>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function RangeInput({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-[#E94560] cursor-pointer"
      />
      <span className="text-xs text-gray-300 w-10 text-right tabular-nums">
        {value}
      </span>
    </div>
  );
}

function NumberInput({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full bg-[#1A1A2E] border border-[#0F3460] text-gray-100 text-xs rounded px-2 py-1 focus:outline-none focus:border-[#E94560]"
    />
  );
}

function SelectInput<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full bg-[#1A1A2E] border border-[#0F3460] text-gray-100 text-xs rounded px-2 py-1 focus:outline-none focus:border-[#E94560]"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </option>
      ))}
    </select>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={[
        'flex items-center justify-center gap-1 px-2 py-1 rounded text-xs border transition-colors',
        active
          ? 'bg-[#0F3460] border-[#E94560] text-gray-100'
          : 'bg-[#1A1A2E] border-[#0F3460] text-gray-400 hover:bg-[#0F3460]',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ObjectProperties
// ─────────────────────────────────────────────────────────────────────────────

function ObjectProperties({ node }: { node: ObjectNode }) {
  const updateNode = useMapStore((s) => s.updateNode);
  const removeNode = useMapStore((s) => s.removeNode);
  const setSelectedNodes = useMapStore((s) => s.setSelectedNodes);

  // Derive a unified scale from width relative to its natural size (default 64)
  const naturalSize = 64;
  const scaleValue = parseFloat((node.width / naturalSize).toFixed(1));

  function patch(changes: Partial<ObjectNode>) {
    updateNode(node.id, changes);
  }

  function handleDelete() {
    removeNode(node.id);
    setSelectedNodes([]);
  }

  // Shadow is stored in metadata as a boolean
  const shadowEnabled = Boolean(node.metadata['shadow'] ?? false);

  return (
    <div>
      <SectionTitle>Object Properties</SectionTitle>

      <Row label="Rotation">
        <RangeInput
          value={node.rotation}
          min={0}
          max={360}
          step={1}
          onChange={(v) => patch({ rotation: v })}
        />
      </Row>

      <Row label="Scale">
        <RangeInput
          value={scaleValue}
          min={0.1}
          max={5}
          step={0.1}
          onChange={(v) =>
            patch({
              width: Math.round(naturalSize * v),
              height: Math.round(naturalSize * v),
            })
          }
        />
      </Row>

      <Row label="Height">
        <RangeInput
          value={parseFloat(node.height.toFixed(1))}
          min={0}
          max={3}
          step={0.1}
          onChange={(v) => patch({ height: v })}
        />
      </Row>

      <Row label="Opacity">
        <RangeInput
          value={Math.round(node.opacity * 100)}
          min={0}
          max={100}
          step={1}
          onChange={(v) => patch({ opacity: v / 100 })}
        />
      </Row>

      <Row label="Tint">
        <input
          type="text"
          placeholder="#ffffff"
          value={node.tintColor ?? ''}
          onChange={(e) => patch({ tintColor: e.target.value || null })}
          className="w-full bg-[#1A1A2E] border border-[#0F3460] text-gray-100 text-xs rounded px-2 py-1 focus:outline-none focus:border-[#E94560] font-mono"
        />
      </Row>

      <div className="flex gap-2 mt-3">
        <ToggleButton
          active={node.flipX}
          onClick={() => patch({ flipX: !node.flipX })}
          title="Flip Horizontal"
        >
          <FlipHorizontal size={14} />
          <span>Flip H</span>
        </ToggleButton>
        <ToggleButton
          active={node.flipY}
          onClick={() => patch({ flipY: !node.flipY })}
          title="Flip Vertical"
        >
          <FlipVertical size={14} />
          <span>Flip V</span>
        </ToggleButton>
      </div>

      <div className="mt-3">
        <ToggleButton
          active={shadowEnabled}
          onClick={() =>
            patch({ metadata: { ...node.metadata, shadow: !shadowEnabled } })
          }
        >
          Shadow
        </ToggleButton>
      </div>

      <div className="mt-4 pt-3 border-t border-[#0F3460]">
        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 w-full justify-center py-1.5 rounded bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 text-red-400 text-xs transition-colors"
        >
          <Trash2 size={14} />
          Delete Object
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PathProperties
// ─────────────────────────────────────────────────────────────────────────────

const PATH_TYPES: PathType[] = [
  'road',
  'dirt_road',
  'cobblestone',
  'river',
  'stream',
  'coastline',
  'trail',
  'wall',
  'fence',
  'bridge',
  'custom',
];

function PathProperties({ node }: { node: PathNode }) {
  const updateNode = useMapStore((s) => s.updateNode);
  const removeNode = useMapStore((s) => s.removeNode);
  const setSelectedNodes = useMapStore((s) => s.setSelectedNodes);

  function patch(changes: Partial<PathNode>) {
    updateNode(node.id, changes);
  }

  return (
    <div>
      <SectionTitle>Path Properties</SectionTitle>

      <Row label="Type">
        <SelectInput
          value={node.pathType}
          options={PATH_TYPES}
          onChange={(v) => patch({ pathType: v })}
        />
      </Row>

      <Row label="Stroke W.">
        <RangeInput
          value={node.strokeWidth}
          min={1}
          max={32}
          step={1}
          onChange={(v) => patch({ strokeWidth: v })}
        />
      </Row>

      <Row label="Opacity">
        <RangeInput
          value={Math.round(node.opacity * 100)}
          min={0}
          max={100}
          step={1}
          onChange={(v) => patch({ opacity: v / 100 })}
        />
      </Row>

      <Row label="Color">
        <input
          type="text"
          placeholder="#ffffff"
          value={node.strokeColor}
          onChange={(e) => patch({ strokeColor: e.target.value })}
          className="w-full bg-[#1A1A2E] border border-[#0F3460] text-gray-100 text-xs rounded px-2 py-1 focus:outline-none focus:border-[#E94560] font-mono"
        />
      </Row>

      <div className="mt-4 pt-3 border-t border-[#0F3460]">
        <button
          onClick={() => { removeNode(node.id); setSelectedNodes([]); }}
          className="flex items-center gap-1.5 w-full justify-center py-1.5 rounded bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 text-red-400 text-xs transition-colors"
        >
          <Trash2 size={14} />
          Delete Path
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BulkProperties (multiple selection)
// ─────────────────────────────────────────────────────────────────────────────

function BulkProperties({ ids }: { ids: string[] }) {
  const updateNode = useMapStore((s) => s.updateNode);
  const removeNode = useMapStore((s) => s.removeNode);
  const setSelectedNodes = useMapStore((s) => s.setSelectedNodes);

  function handleBulkOpacity(v: number) {
    ids.forEach((id) => updateNode(id, { opacity: v / 100 }));
  }

  function handleBulkDelete() {
    ids.forEach((id) => removeNode(id));
    setSelectedNodes([]);
  }

  return (
    <div>
      <p className="text-sm text-gray-300 mb-3">
        {ids.length} éléments sélectionnés
      </p>

      <Row label="Opacity">
        <RangeInput
          value={100}
          min={0}
          max={100}
          step={1}
          onChange={handleBulkOpacity}
        />
      </Row>

      <div className="mt-4 pt-3 border-t border-[#0F3460]">
        <button
          onClick={handleBulkDelete}
          className="flex items-center gap-1.5 w-full justify-center py-1.5 rounded bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 text-red-400 text-xs transition-colors"
        >
          <Trash2 size={14} />
          Supprimer ({ids.length})
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool-specific panels
// ─────────────────────────────────────────────────────────────────────────────

const ASSET_CATEGORIES = [
  'buildings',
  'vegetation',
  'walls',
  'furniture',
  'water',
  'roads',
  'decorative',
  'misc',
] as const;

function ObjectToolPanel() {
  const activeAssetCategory = useToolStore((s) => s.activeAssetCategory);
  const setActiveAssetCategory = useToolStore((s) => s.setActiveAssetCategory);
  const endlessPaintMode = useToolStore((s) => s.endlessPaintMode);
  const toggleEndlessPaint = useToolStore((s) => s.toggleEndlessPaint);
  const snapEnabled = useToolStore((s) => s.snapEnabled);
  const toggleSnap = useToolStore((s) => s.toggleSnap);

  return (
    <div>
      <SectionTitle>Placement d'objet</SectionTitle>

      <Row label="Catégorie">
        <SelectInput
          value={activeAssetCategory}
          options={[...ASSET_CATEGORIES]}
          onChange={setActiveAssetCategory}
        />
      </Row>

      <div className="flex flex-col gap-2 mt-3">
        <ToggleButton active={endlessPaintMode} onClick={toggleEndlessPaint}>
          Peinture continue
        </ToggleButton>
        <ToggleButton active={snapEnabled} onClick={toggleSnap}>
          Magnétisme grille
        </ToggleButton>
      </div>
    </div>
  );
}

const PATH_TYPE_OPTIONS: PathType[] = [
  'road',
  'dirt_road',
  'cobblestone',
  'river',
  'stream',
  'coastline',
  'trail',
  'wall',
  'fence',
  'bridge',
  'custom',
];

function PathToolPanel() {
  const activePathType = useToolStore((s) => s.activePathType);
  const setActivePathType = useToolStore((s) => s.setActivePathType);

  return (
    <div>
      <SectionTitle>Type de chemin</SectionTitle>
      <Row label="Type">
        <SelectInput
          value={activePathType as PathType}
          options={PATH_TYPE_OPTIONS}
          onChange={setActivePathType}
        />
      </Row>
    </div>
  );
}

const PLOT_TYPE_OPTIONS: PlotType[] = [
  'farmland',
  'forest',
  'grassland',
  'desert',
  'tundra',
  'swamp',
  'mountain',
  'lake',
  'ocean',
  'urban',
  'ruins',
  'custom',
];

function PlotToolPanel() {
  const activePlotType = useToolStore((s) => s.activePlotType);
  const setActivePlotType = useToolStore((s) => s.setActivePlotType);

  return (
    <div>
      <SectionTitle>Type de zone</SectionTitle>
      <Row label="Type">
        <SelectInput
          value={activePlotType as PlotType}
          options={PLOT_TYPE_OPTIONS}
          onChange={setActivePlotType}
        />
      </Row>
    </div>
  );
}

const ROOM_TYPE_OPTIONS: RoomType[] = [
  'bedroom',
  'great_hall',
  'kitchen',
  'dungeon',
  'throne_room',
  'library',
  'armory',
  'stable',
  'chapel',
  'garden',
  'corridor',
  'custom',
];

function RoomToolPanel() {
  const activeRoomType = useToolStore((s) => s.activeRoomType);
  const setActiveRoomType = useToolStore((s) => s.setActiveRoomType);

  return (
    <div>
      <SectionTitle>Type de pièce</SectionTitle>
      <Row label="Type">
        <SelectInput
          value={activeRoomType as RoomType}
          options={ROOM_TYPE_OPTIONS}
          onChange={setActiveRoomType}
        />
      </Row>
    </div>
  );
}

function ExportToolPanel() {
  return (
    <div>
      <SectionTitle>Zone d'export</SectionTitle>
      <p className="text-xs text-gray-400 leading-relaxed">
        Dessinez un rectangle sur le canevas pour définir la zone d'exportation.
      </p>
      <div className="mt-3 space-y-2">
        <Row label="Largeur">
          <NumberInput value={1920} min={64} max={8192} step={1} onChange={() => {}} />
        </Row>
        <Row label="Hauteur">
          <NumberInput value={1080} min={64} max={8192} step={1} onChange={() => {}} />
        </Row>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root panel
// ─────────────────────────────────────────────────────────────────────────────

export default function PropertiesPanel() {
  const activeTool = useToolStore((s) => s.activeTool);
  const selectedNodeIds = useMapStore((s) => s.selectedNodeIds);
  const nodes = useMapStore((s) => s.document.nodes);

  function renderContent() {
    if (activeTool === 'object') return <ObjectToolPanel />;
    if (activeTool === 'path') return <PathToolPanel />;
    if (activeTool === 'plot') return <PlotToolPanel />;
    if (activeTool === 'room') return <RoomToolPanel />;
    if (activeTool === 'export') return <ExportToolPanel />;

    // select tool — context-sensitive
    if (selectedNodeIds.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <p className="text-sm text-gray-400">Sélectionnez un élément</p>
          <p className="text-xs text-gray-600 mt-1">
            Cliquez sur un objet dans le canevas
          </p>
        </div>
      );
    }

    if (selectedNodeIds.length > 1) {
      return <BulkProperties ids={selectedNodeIds} />;
    }

    const node = nodes[selectedNodeIds[0]];
    if (!node) return null;

    if (node.type === 'object') return <ObjectProperties node={node} />;
    if (node.type === 'path') return <PathProperties node={node} />;

    return (
      <p className="text-xs text-gray-400">
        Propriétés non disponibles pour ce type.
      </p>
    );
  }

  return (
    <div className="w-[280px] bg-[#16213E] border-l border-[#0F3460] h-full overflow-y-auto">
      <div className="px-3 py-3">
        <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-3 pb-2 border-b border-[#0F3460]">
          Propriétés
        </h2>
        {renderContent()}
      </div>
    </div>
  );
}
