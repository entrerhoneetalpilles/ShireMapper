'use client';

import { useEffect, useCallback, useState } from 'react';
import { useMapStore } from '@/app/store/mapStore';
import { useToolStore } from '@/app/store/toolStore';
import { useAtmosphereStore } from '@/app/store/atmosphereStore';
import { useHistory } from '@/app/hooks/useHistory';
import { useSaveLoad } from '@/app/hooks/useSaveLoad';
import { useKeyboardShortcuts } from '@/app/hooks/useKeyboardShortcuts';
import dynamic from 'next/dynamic';
import Header from '@/app/editor/components/Header';
import Toolbar from '@/app/editor/components/Toolbar';
import { Canvas } from '@/app/editor/components/Canvas';
import PropertiesPanel from '@/app/editor/components/PropertiesPanel';
import LayersPanel from '@/app/editor/components/LayersPanel';
import AssetBrowser from '@/app/editor/components/AssetBrowser';

const AtmospherePanel = dynamic(
  () => import('@/app/editor/components/AtmospherePanel'),
  { ssr: false },
);

// ─────────────────────────────────────────────────────────────────────────────
// Editor page
// ─────────────────────────────────────────────────────────────────────────────

export default function EditorPage() {
  // ── Stores ───────────────────────────────────────────────────────────────
  const mapTitle = useMapStore((s) => s.document.settings.title);
  const updateSettings = useMapStore((s) => s.document.settings);
  const setDocument = useMapStore((s) => s.setDocument);
  const document = useMapStore((s) => s.document);
  const selectedNodeIds = useMapStore((s) => s.selectedNodeIds);
  const activeLayerId = useMapStore((s) => s.activeLayerId);
  const removeNode = useMapStore((s) => s.removeNode);
  const setSelectedNodes = useMapStore((s) => s.setSelectedNodes);
  const nodes = useMapStore((s) => s.document.nodes);
  const layers = useMapStore((s) => s.document.layers);

  // ── Atmosphere panel visibility ───────────────────────────────────────────
  const [showAtmosphere, setShowAtmosphere] = useState(false);

  useEffect(() => {
    function handleToggle() { setShowAtmosphere((v) => !v); }
    window.addEventListener('shiremapper:toggle-atmosphere', handleToggle);
    return () => window.removeEventListener('shiremapper:toggle-atmosphere', handleToggle);
  }, []);

  // Suppress unused-variable warnings for stores consumed only for side effects
  void useAtmosphereStore();
  void useToolStore();

  // ── History ──────────────────────────────────────────────────────────────
  const { undo, redo, canUndo, canRedo } = useHistory();

  // ── Save / Load ──────────────────────────────────────────────────────────
  const { saveLocal, loadFromFile, hasPendingChanges } = useSaveLoad();

  // ── Document title ───────────────────────────────────────────────────────
  useEffect(() => {
    const indicator = hasPendingChanges ? '* ' : '';
    window.document.title = `${indicator}${mapTitle || 'Untitled'} — ShireMapper`;
  }, [mapTitle, hasPendingChanges]);

  // ── Map name change ───────────────────────────────────────────────────────
  const handleMapNameChange = useCallback(
    (name: string) => {
      setDocument({ ...document, settings: { ...updateSettings, title: name } });
    },
    [document, updateSettings, setDocument],
  );

  // ── Keyboard shortcut callbacks ───────────────────────────────────────────
  const handleDelete = useCallback(() => {
    selectedNodeIds.forEach((id) => removeNode(id));
    setSelectedNodes([]);
  }, [selectedNodeIds, removeNode, setSelectedNodes]);

  const handleDuplicate = useCallback(() => {
    // Duplication is a canvas-engine concern; dispatch a custom event
    window.dispatchEvent(new CustomEvent('shiremapper:duplicate'));
  }, []);

  const handleSelectAll = useCallback(() => {
    const activeLayer = layers.find((l) => l.id === activeLayerId);
    if (activeLayer) {
      setSelectedNodes(activeLayer.nodeIds.filter((id) => id in nodes));
    }
  }, [layers, activeLayerId, nodes, setSelectedNodes]);

  useKeyboardShortcuts({
    onUndo: undo,
    onRedo: redo,
    onSave: saveLocal,
    onDelete: handleDelete,
    onDuplicate: handleDuplicate,
    onSelectAll: handleSelectAll,
  });

  // ── beforeunload warning ──────────────────────────────────────────────────
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (hasPendingChanges) {
        e.preventDefault();
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasPendingChanges]);

  // ── File drop on the whole page ───────────────────────────────────────────
  useEffect(() => {
    function handleDragOver(e: DragEvent) {
      e.preventDefault();
    }

    function handleDrop(e: DragEvent) {
      e.preventDefault();
      const files = Array.from(e.dataTransfer?.files ?? []);
      const jsonFile = files.find(
        (f) => f.name.endsWith('.json') || f.name.endsWith('.shiremap.json'),
      );
      if (jsonFile) {
        loadFromFile(jsonFile).catch(console.error);
      }
    }

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [loadFromFile]);

  // ── Export handler (placeholder — no PixiJS app ref at this level yet) ────
  const handleExport = useCallback(() => {
    window.dispatchEvent(new CustomEvent('shiremapper:export'));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#1A1A2E]">
      {/* Header — 48px */}
      <Header
        mapName={mapTitle}
        onMapNameChange={handleMapNameChange}
        onSave={saveLocal}
        onExport={handleExport}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {/* Main row */}
      <div className="flex flex-1 overflow-hidden">
        {/* Toolbar — 44px wide */}
        <Toolbar />

        {/* Canvas area */}
        <div className="flex flex-col flex-1 overflow-hidden relative">
          <Canvas />

          {/* Atmosphere panel — floating overlay (Nimblehold-inspired sun dial) */}
          {showAtmosphere && (
            <div className="absolute top-3 right-3 z-50 w-[260px]">
              <AtmospherePanel />
            </div>
          )}

          {/* Asset browser — collapsible, 150px when open */}
          <AssetBrowser />
        </div>

        {/* Right panel — 280px */}
        <div className="flex flex-col w-[280px] overflow-hidden border-l border-[#2a3a6a]">
          <div className="flex-1 overflow-y-auto">
            <PropertiesPanel />
          </div>
          <LayersPanel />
        </div>
      </div>
    </div>
  );
}
