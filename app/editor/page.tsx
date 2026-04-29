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
import MobileToolbar from '@/app/editor/components/MobileToolbar';
import { MobileBottomSheet } from '@/app/editor/components/MobileBottomSheet';
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

  // ── Mobile sheet states ──────────────────────────────────────────────────
  const [mobileSheet, setMobileSheet] = useState<'assets' | 'layers' | 'atmosphere' | null>(null);

  // ── Atmosphere panel visibility ───────────────────────────────────────────
  const [showAtmosphere, setShowAtmosphere] = useState(false);

  useEffect(() => {
    function handleToggle() { setShowAtmosphere((v) => !v); }
    window.addEventListener('shiremapper:toggle-atmosphere', handleToggle);
    return () => window.removeEventListener('shiremapper:toggle-atmosphere', handleToggle);
  }, []);

  const setActiveTool = useToolStore((s) => s.setActiveTool);

  // Suppress unused-variable warning for store consumed only for side effects
  void useAtmosphereStore();

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
    /*
     * h-dvh = 100dvh (dynamic viewport height) — on iOS Safari, 100vh includes
     * the browser chrome which causes bottom content to be clipped. dvh adjusts
     * to the actually-visible viewport. Falls back to h-screen on older browsers.
     */
    <div className="flex flex-col h-dvh w-screen overflow-hidden bg-[#1A1A2E]">
      {/* Header */}
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

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      {/*
       * On mobile the MobileToolbar is fixed-position (not in flow), so we
       * add bottom padding equal to the toolbar's height (~80px) to prevent
       * the canvas from being fully obscured by it.
       */}
      <div className="flex flex-1 overflow-hidden min-h-0 pb-[80px] md:pb-0">

        {/* Left toolbar — desktop only */}
        <div className="hidden md:flex">
          <Toolbar />
        </div>

        {/* Canvas + floating panels */}
        <div className="flex flex-col flex-1 overflow-hidden relative min-w-0">
          <Canvas />

          {/* Atmosphere panel: floating overlay, desktop only */}
          {showAtmosphere && (
            <div className="absolute top-3 right-3 z-50 w-[260px] hidden md:block">
              <AtmospherePanel />
            </div>
          )}

          {/* Asset browser — desktop only */}
          <div className="hidden md:block">
            <AssetBrowser />
          </div>
        </div>

        {/* Right panel — desktop only */}
        <div className="hidden md:flex flex-col w-[280px] overflow-hidden border-l border-[#2a3a6a]">
          <div className="flex-1 overflow-y-auto">
            <PropertiesPanel />
          </div>
          <LayersPanel />
        </div>
      </div>

      {/*
       * Mobile bottom toolbar — fixed at the bottom of the viewport so it
       * cannot be hidden by flex layout bugs or iOS Safari's chrome clipping.
       * The wrapper div is hidden on md+ screens via CSS.
       */}
      <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden">
        <MobileToolbar
          onOpenAssets={() => setMobileSheet('assets')}
          onOpenLayers={() => setMobileSheet('layers')}
          onOpenAtmosphere={() => setMobileSheet('atmosphere')}
        />
      </div>

      {/* ── Mobile bottom sheets ─────────────────────────────────────────── */}
      <MobileBottomSheet
        title="Assets"
        isOpen={mobileSheet === 'assets'}
        onClose={() => setMobileSheet(null)}
        height="60vh"
      >
        <AssetBrowser
          embedded
          onAssetSelect={() => {
            setMobileSheet(null);
            setActiveTool('object');
          }}
        />
      </MobileBottomSheet>

      <MobileBottomSheet
        title="Calques"
        isOpen={mobileSheet === 'layers'}
        onClose={() => setMobileSheet(null)}
        height="60vh"
      >
        <LayersPanel />
        <div className="border-t border-[#2a3a6a] mt-2 pt-2">
          <PropertiesPanel />
        </div>
      </MobileBottomSheet>

      <MobileBottomSheet
        title="Atmosphère"
        isOpen={mobileSheet === 'atmosphere'}
        onClose={() => setMobileSheet(null)}
        height="75vh"
      >
        <AtmospherePanel />
      </MobileBottomSheet>
    </div>
  );
}
