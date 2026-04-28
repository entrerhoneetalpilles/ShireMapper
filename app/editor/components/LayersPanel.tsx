'use client';

import { useState, useRef } from 'react';
import {
  GripVertical,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  Copy,
  Trash2,
} from 'lucide-react';
import { useMapStore } from '@/app/store/mapStore';
import type { Layer } from '@/app/types/map';

// ─────────────────────────────────────────────────────────────────────────────
// Context menu
// ─────────────────────────────────────────────────────────────────────────────

interface ContextMenuState {
  layerId: string;
  x: number;
  y: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer row
// ─────────────────────────────────────────────────────────────────────────────

interface LayerRowProps {
  layer: Layer;
  index: number;
  isActive: boolean;
  isEditing: boolean;
  onSetActive: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onDoubleClick: () => void;
  onRenameCommit: (name: string) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (index: number) => void;
}

function LayerRow({
  layer,
  index,
  isActive,
  isEditing,
  onSetActive,
  onToggleVisibility,
  onToggleLock,
  onDoubleClick,
  onRenameCommit,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
}: LayerRowProps) {
  const [draftName, setDraftName] = useState(layer.name);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleRenameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      onRenameCommit(draftName.trim() || layer.name);
    }
    if (e.key === 'Escape') {
      onRenameCommit(layer.name);
    }
  }

  function handleDoubleClick() {
    setDraftName(layer.name);
    onDoubleClick();
    // Focus input after state update
    setTimeout(() => inputRef.current?.select(), 0);
  }

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(e, index); }}
      onDrop={() => onDrop(index)}
      onContextMenu={onContextMenu}
      onClick={onSetActive}
      className={[
        'flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer select-none group transition-colors',
        isActive
          ? 'bg-[#0F3460] border border-[#E94560]/50'
          : 'hover:bg-[#0F3460]/50 border border-transparent',
      ].join(' ')}
    >
      {/* Drag handle */}
      <GripVertical
        size={14}
        className="text-gray-600 group-hover:text-gray-400 cursor-grab shrink-0"
      />

      {/* Name / rename input */}
      <div className="flex-1 min-w-0" onDoubleClick={handleDoubleClick}>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={() => onRenameCommit(draftName.trim() || layer.name)}
            onKeyDown={handleRenameKeyDown}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            className="w-full bg-[#1A1A2E] border border-[#E94560] text-gray-100 text-xs rounded px-1 py-0.5 focus:outline-none"
          />
        ) : (
          <span className="text-xs text-gray-200 truncate block">
            {layer.name}
          </span>
        )}
      </div>

      {/* Opacity label */}
      <span className="text-xs text-gray-500 tabular-nums w-8 text-right shrink-0">
        {Math.round(layer.opacity * 100)}%
      </span>

      {/* Visibility toggle */}
      <button
        title={layer.visible ? 'Masquer le calque' : 'Afficher le calque'}
        onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
        className="text-gray-500 hover:text-gray-200 transition-colors shrink-0"
      >
        {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>

      {/* Lock toggle */}
      <button
        title={layer.locked ? 'Déverrouiller le calque' : 'Verrouiller le calque'}
        onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
        className="text-gray-500 hover:text-gray-200 transition-colors shrink-0"
      >
        {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function LayersPanel() {
  const layers = useMapStore((s) => s.document.layers);
  const activeLayerId = useMapStore((s) => s.activeLayerId);
  const setActiveLayer = useMapStore((s) => s.setActiveLayer);
  const addLayer = useMapStore((s) => s.addLayer);
  const updateLayer = useMapStore((s) => s.updateLayer);
  const removeLayer = useMapStore((s) => s.removeLayer);
  const reorderLayers = useMapStore((s) => s.reorderLayers);

  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  // Show layers top-to-bottom = front-to-back (reverse of array order)
  const displayedLayers = [...layers].reverse();

  function getRealIndex(displayIndex: number): number {
    return layers.length - 1 - displayIndex;
  }

  function handleDragStart(displayIndex: number) {
    dragIndexRef.current = getRealIndex(displayIndex);
  }

  function handleDragOver(e: React.DragEvent, displayIndex: number) {
    e.preventDefault();
  }

  function handleDrop(displayIndex: number) {
    const fromIndex = dragIndexRef.current;
    const toIndex = getRealIndex(displayIndex);
    if (fromIndex === null || fromIndex === toIndex) return;
    reorderLayers(fromIndex, toIndex);
    dragIndexRef.current = null;
  }

  function handleContextMenu(e: React.MouseEvent, layerId: string) {
    e.preventDefault();
    setContextMenu({ layerId, x: e.clientX, y: e.clientY });
  }

  function closeContextMenu() {
    setContextMenu(null);
  }

  function handleRename(id: string, name: string) {
    updateLayer(id, { name });
    setEditingLayerId(null);
  }

  function handleDuplicate(id: string) {
    const layer = layers.find((l) => l.id === id);
    if (!layer) return;
    addLayer(`${layer.name} (copie)`);
    closeContextMenu();
  }

  function handleDeleteRequest(id: string) {
    setDeleteConfirmId(id);
    closeContextMenu();
  }

  function handleDeleteConfirm() {
    if (deleteConfirmId) {
      removeLayer(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  }

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <div
      className="bg-[#16213E] border-t border-[#0F3460] flex flex-col"
      onClick={() => { closeContextMenu(); }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#0F3460]">
        <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
          Calques
        </h2>
        <button
          title="Ajouter un calque"
          onClick={(e) => { e.stopPropagation(); addLayer('Nouveau calque'); }}
          className="text-gray-400 hover:text-[#E94560] transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Layer list */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {displayedLayers.map((layer, displayIndex) => (
          <LayerRow
            key={layer.id}
            layer={layer}
            index={displayIndex}
            isActive={layer.id === activeLayerId}
            isEditing={editingLayerId === layer.id}
            onSetActive={() => setActiveLayer(layer.id)}
            onToggleVisibility={() =>
              updateLayer(layer.id, { visible: !layer.visible })
            }
            onToggleLock={() =>
              updateLayer(layer.id, { locked: !layer.locked })
            }
            onDoubleClick={() => setEditingLayerId(layer.id)}
            onRenameCommit={(name) => handleRename(layer.id, name)}
            onContextMenu={(e) => {
              e.stopPropagation();
              handleContextMenu(e, layer.id);
            }}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          />
        ))}

        {layers.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-4">
            Aucun calque
          </p>
        )}
      </div>

      {/* Add Layer button (bottom shortcut) */}
      <div className="px-2 py-2 border-t border-[#0F3460]">
        <button
          onClick={() => addLayer('Nouveau calque')}
          className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded text-xs text-gray-400 hover:text-gray-100 hover:bg-[#0F3460] border border-transparent hover:border-[#0F3460] transition-colors"
        >
          <Plus size={14} />
          Ajouter un calque
        </button>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-[#16213E] border border-[#0F3460] rounded shadow-xl py-1 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setEditingLayerId(contextMenu.layerId);
              closeContextMenu();
            }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-300 hover:bg-[#0F3460] hover:text-gray-100 transition-colors"
          >
            Renommer
          </button>
          <button
            onClick={() => handleDuplicate(contextMenu.layerId)}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-300 hover:bg-[#0F3460] hover:text-gray-100 transition-colors"
          >
            <Copy size={12} />
            Dupliquer
          </button>
          <div className="h-px bg-[#0F3460] my-1" />
          <button
            onClick={() => handleDeleteRequest(contextMenu.layerId)}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/30 transition-colors"
          >
            <Trash2 size={12} />
            Supprimer
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div
            className="bg-[#16213E] border border-[#0F3460] rounded-lg p-4 w-64 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-gray-200 mb-1">Supprimer le calque ?</p>
            <p className="text-xs text-gray-500 mb-4">
              Tous les objets de ce calque seront supprimés.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded text-xs bg-[#1A1A2E] border border-[#0F3460] text-gray-400 hover:text-gray-100 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-3 py-1.5 rounded text-xs bg-red-800/60 hover:bg-red-700/70 border border-red-600/50 text-red-300 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
