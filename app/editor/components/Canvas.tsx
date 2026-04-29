'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useMapStore } from '@/app/store/mapStore';
import { useToolStore } from '@/app/store/toolStore';
import { useCanvasEngine } from '@/app/hooks/useCanvasEngine';
import { useHistory } from '@/app/hooks/useHistory';
import { useKeyboard } from '@/app/hooks/useKeyboard';
import { useTouchInteraction } from '@/app/hooks/useTouchInteraction';
import { SceneManager } from '@/app/lib/pixi/sceneManager';
import { snapPoint } from '@/app/lib/pixi/snapHelper';
import { assetManifest } from '@/app/lib/assetManifest';
import type { ObjectNode, PathNode, PathPoint, PlotNode } from '@/app/types/map';

// ─────────────────────────────────────────────────────────────────────────────
// Node factory helpers
// ─────────────────────────────────────────────────────────────────────────────

function createObjectNode(
  x: number,
  y: number,
  assetId: string,
  layerId: string,
): ObjectNode {
  const asset = assetManifest.find((a) => a.id === assetId);
  return {
    id: crypto.randomUUID(),
    type: 'object',
    layerId,
    x,
    y,
    label: asset?.name ?? 'Object',
    locked: false,
    visible: true,
    zIndex: 0,
    rotation: 0,
    opacity: 1,
    tags: [],
    metadata: {},
    assetId,
    width: asset?.naturalWidth ?? 64,
    height: asset?.naturalHeight ?? 64,
    flipX: false,
    flipY: false,
    tintColor: null,
    placementMode: 'grounded',
    depthLayer: 'mid',
    elevationHeight: 1,
  };
}

function createPathNode(
  points: PathPoint[],
  layerId: string,
  pathType: string,
): PathNode {
  return {
    id: crypto.randomUUID(),
    type: 'path',
    layerId,
    x: 0,
    y: 0,
    label: 'Path',
    locked: false,
    visible: true,
    zIndex: 0,
    rotation: 0,
    opacity: 1,
    tags: [],
    metadata: {},
    pathType: pathType as PathNode['pathType'],
    points,
    closed: false,
    strokeColor: '#ffffff',
    strokeWidth: 2,
    strokeOpacity: 1,
    dashPattern: [],
    autoFill: {
      enabled: false,
      leftColor: '#00000000',
      rightColor: '#00000000',
      blendWidth: 0,
    },
    bridgeStyle: 'none',
  };
}

function createPlotNode(
  points: PathPoint[],
  layerId: string,
  plotType: string,
): PlotNode {
  return {
    id: crypto.randomUUID(),
    type: 'plot',
    layerId,
    x: 0,
    y: 0,
    label: 'Plot',
    locked: false,
    visible: true,
    zIndex: 0,
    rotation: 0,
    opacity: 1,
    tags: [],
    metadata: {},
    plotType: plotType as PlotNode['plotType'],
    vertices: points.map((p) => ({ x: p.x, y: p.y })),
    fillColor: '#2d6a4f',
    strokeColor: '#ffffff',
    strokeWidth: 2,
    autoFill: {
      enabled: false,
      fillColor: '#2d6a4f',
      fillOpacity: 0.6,
      scatterAssetIds: [],
      scatterDensity: 0.1,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas component
// ─────────────────────────────────────────────────────────────────────────────

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { engine, isReady } = useCanvasEngine(containerRef);

  // Stores
  const document = useMapStore((s) => s.document);
  const selectedNodeIds = useMapStore((s) => s.selectedNodeIds);
  const activeLayerId = useMapStore((s) => s.activeLayerId);
  const addNode = useMapStore((s) => s.addNode);
  const moveNode = useMapStore((s) => s.moveNode);
  const setSelectedNodes = useMapStore((s) => s.setSelectedNodes);

  const activeTool = useToolStore((s) => s.activeTool);
  const activeAssetId = useToolStore((s) => s.activeAssetId);
  const activePathType = useToolStore((s) => s.activePathType);
  const activePlotType = useToolStore((s) => s.activePlotType);
  const snapEnabled = useToolStore((s) => s.snapEnabled);

  const { pushHistory } = useHistory();
  const { spaceHeld, altHeld } = useKeyboard();

  // Keep latest mutable values in refs so touch handlers (stable refs) can
  // read them without being recreated on every render.
  const engineRef = useRef(engine);
  engineRef.current = engine;
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;
  const activeAssetIdRef = useRef(activeAssetId);
  activeAssetIdRef.current = activeAssetId;
  const activeLayerIdRef = useRef(activeLayerId);
  activeLayerIdRef.current = activeLayerId;
  const activePathTypeRef = useRef(activePathType);
  activePathTypeRef.current = activePathType;
  const activePlotTypeRef = useRef(activePlotType);
  activePlotTypeRef.current = activePlotType;
  const snapEnabledRef = useRef(snapEnabled);
  snapEnabledRef.current = snapEnabled;
  const documentRef = useRef(document);
  documentRef.current = document;
  const addNodeRef = useRef(addNode);
  addNodeRef.current = addNode;
  const setSelectedNodesRef = useRef(setSelectedNodes);
  setSelectedNodesRef.current = setSelectedNodes;
  const sceneManagerGetter = useCallback(() => sceneManagerRef.current, []);
  const engineGetter = useCallback(() => engineRef.current, []);

  // Touch: onTap is called by useTouchInteraction when a finger lifts without
  // significant movement. We execute the current tool action at those coords.
  const handleTap = useCallback((screenX: number, screenY: number) => {
    const eng = engineRef.current;
    if (!eng) return;
    const raw = eng.screenToWorld(screenX, screenY);
    const world = snapPoint(raw.x, raw.y, documentRef.current.settings.grid, snapEnabledRef.current, false);
    const tool = activeToolRef.current;

    switch (tool) {
      case 'select': {
        const nodeId = sceneManagerGetter()?.getNodeAtPosition(world.x, world.y) ?? null;
        setSelectedNodesRef.current(nodeId ? [nodeId] : []);
        break;
      }
      case 'object': {
        const assetId = activeAssetIdRef.current;
        if (!assetId) return;
        const layerId = activeLayerIdRef.current;
        const node = createObjectNode(world.x, world.y, assetId, layerId);
        addNodeRef.current(node);
        break;
      }
      case 'path': {
        const point: PathPoint = { x: world.x, y: world.y };
        inProgressPointsRef.current = [...inProgressPointsRef.current, point];
        setInProgressPoints([...inProgressPointsRef.current]);
        break;
      }
      case 'plot': {
        const point: PathPoint = { x: world.x, y: world.y };
        inProgressPointsRef.current = [...inProgressPointsRef.current, point];
        setInProgressPoints([...inProgressPointsRef.current]);
        break;
      }
    }
  }, [sceneManagerGetter]);

  const touch = useTouchInteraction(engineGetter, handleTap);

  // Scene manager ref
  const sceneManagerRef = useRef<SceneManager | null>(null);

  // Ghost sprite ref for object tool preview
  const ghostNodeRef = useRef<import('@/app/lib/pixi/ObjectNode').ObjectNodeSprite | null>(null);

  // Drag state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ screenX: number; screenY: number; worldX: number; worldY: number } | null>(null);
  const dragNodeOriginsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Pan state
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);

  // In-progress path/plot points
  const [inProgressPoints, setInProgressPoints] = useState<PathPoint[]>([]);
  const inProgressPointsRef = useRef<PathPoint[]>([]);

  // Preview path node ref
  const previewPathRef = useRef<import('@/app/lib/pixi/PathNode').PathNodeGraphics | null>(null);
  const previewPlotRef = useRef<import('@/app/lib/pixi/PlotNode').PlotNodeGraphics | null>(null);

  // ── SceneManager setup ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!isReady || !engine) return;

    const manager = new SceneManager(engine);
    sceneManagerRef.current = manager;
    manager.syncWithDocument(document);

    return () => {
      manager.destroy();
      sceneManagerRef.current = null;
    };
    // Only run once when engine becomes ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, engine]);

  // ── Sync document changes to scene ────────────────────────────────────────

  useEffect(() => {
    if (!sceneManagerRef.current) return;
    sceneManagerRef.current.syncWithDocument(document);
  }, [document]);

  // ── Sync selection ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!sceneManagerRef.current) return;
    sceneManagerRef.current.selectNodes(selectedNodeIds);
  }, [selectedNodeIds]);

  // ── Ghost cleanup on tool change ──────────────────────────────────────────

  useEffect(() => {
    if (!engine) return;
    if (activeTool !== 'object') {
      if (ghostNodeRef.current) {
        engine.selectionContainer.removeChild(ghostNodeRef.current);
        ghostNodeRef.current.destroy({ children: true });
        ghostNodeRef.current = null;
      }
    }
    if (activeTool !== 'path' && activeTool !== 'plot') {
      clearPathPreview();
      clearPlotPreview();
      inProgressPointsRef.current = [];
      setInProgressPoints([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, engine]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getWorldPosition = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): { x: number; y: number } => {
      if (!engine) return { x: 0, y: 0 };
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const world = engine.screenToWorld(screenX, screenY);
      return snapPoint(world.x, world.y, document.settings.grid, snapEnabled, altHeld);
    },
    [engine, document.settings.grid, snapEnabled, altHeld],
  );

  const getScreenPosition = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): { x: number; y: number } => {
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    [],
  );

  function clearPathPreview(): void {
    if (previewPathRef.current) {
      if (previewPathRef.current.parent) {
        previewPathRef.current.parent.removeChild(previewPathRef.current);
      }
      previewPathRef.current.destroy({ children: true });
      previewPathRef.current = null;
    }
  }

  function clearPlotPreview(): void {
    if (previewPlotRef.current) {
      if (previewPlotRef.current.parent) {
        previewPlotRef.current.parent.removeChild(previewPlotRef.current);
      }
      previewPlotRef.current.destroy({ children: true });
      previewPlotRef.current = null;
    }
  }

  // ── Pointer event handlers ─────────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!engine) return;

      // Touch events (1-finger tap/pan, 2-finger pinch) are handled entirely
      // by useTouchInteraction — skip mouse handling for them.
      if (e.pointerType === 'touch') {
        touch.onPointerDown(e);
        return;
      }

      const screen = getScreenPosition(e);
      const world = getWorldPosition(e);

      // Space+drag = pan regardless of active tool
      if (spaceHeld) {
        isPanningRef.current = true;
        panStartRef.current = screen;
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        return;
      }

      // Right-click: cancel ghost / in-progress operations
      if (e.button === 2) {
        if (activeTool === 'object' && ghostNodeRef.current) {
          engine.selectionContainer.removeChild(ghostNodeRef.current);
          ghostNodeRef.current.destroy({ children: true });
          ghostNodeRef.current = null;
        }
        if (activeTool === 'path' || activeTool === 'plot') {
          clearPathPreview();
          clearPlotPreview();
          inProgressPointsRef.current = [];
          setInProgressPoints([]);
        }
        return;
      }

      switch (activeTool) {
        case 'select': {
          const nodeId = sceneManagerRef.current?.getNodeAtPosition(world.x, world.y) ?? null;
          if (nodeId) {
            if (!selectedNodeIds.includes(nodeId)) {
              setSelectedNodes([nodeId]);
            }
            // Start drag
            isDraggingRef.current = true;
            dragStartRef.current = { screenX: screen.x, screenY: screen.y, worldX: world.x, worldY: world.y };
            // Record original positions for all selected nodes
            const origins = new Map<string, { x: number; y: number }>();
            const ids = selectedNodeIds.includes(nodeId) ? selectedNodeIds : [nodeId];
            for (const id of ids) {
              const node = document.nodes[id];
              if (node) {
                origins.set(id, { x: node.x, y: node.y });
              }
            }
            dragNodeOriginsRef.current = origins;
            (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
          } else {
            setSelectedNodes([]);
          }
          break;
        }

        case 'object': {
          const assetId = activeAssetId;
          if (!assetId) return;

          // Remove ghost
          if (ghostNodeRef.current) {
            engine.selectionContainer.removeChild(ghostNodeRef.current);
            ghostNodeRef.current.destroy({ children: true });
            ghostNodeRef.current = null;
          }

          // Create and add node
          const newNode = createObjectNode(world.x, world.y, assetId, activeLayerId);
          pushHistory();
          addNode(newNode);
          break;
        }

        case 'path': {
          const point: PathPoint = { x: world.x, y: world.y };
          inProgressPointsRef.current = [...inProgressPointsRef.current, point];
          setInProgressPoints([...inProgressPointsRef.current]);
          break;
        }

        case 'plot': {
          const point: PathPoint = { x: world.x, y: world.y };
          inProgressPointsRef.current = [...inProgressPointsRef.current, point];
          setInProgressPoints([...inProgressPointsRef.current]);
          break;
        }
      }
    },
    [
      engine,
      activeTool,
      activeAssetId,
      activeLayerId,
      selectedNodeIds,
      document.nodes,
      spaceHeld,
      getScreenPosition,
      getWorldPosition,
      pushHistory,
      addNode,
      setSelectedNodes,
      touch,
    ],
  );

  const handlePointerMove = useCallback(
    async (e: React.PointerEvent<HTMLDivElement>) => {
      if (!engine) return;

      if (e.pointerType === 'touch') {
        touch.onPointerMove(e);
        return;
      }

      const screen = getScreenPosition(e);
      const world = getWorldPosition(e);

      // Panning
      if (isPanningRef.current && panStartRef.current) {
        const dx = screen.x - panStartRef.current.x;
        const dy = screen.y - panStartRef.current.y;
        engine.pan(dx, dy);
        panStartRef.current = screen;
        return;
      }

      switch (activeTool) {
        case 'select': {
          if (isDraggingRef.current && dragStartRef.current) {
            const dx = world.x - dragStartRef.current.worldX;
            const dy = world.y - dragStartRef.current.worldY;
            for (const [id, origin] of dragNodeOriginsRef.current) {
              const node = document.nodes[id];
              if (node && !node.locked) {
                moveNode(id, origin.x + dx, origin.y + dy);
              }
            }
          }
          break;
        }

        case 'object': {
          const assetId = activeAssetId;
          if (!assetId) break;

          if (!ghostNodeRef.current) {
            // Lazy import to avoid circular dependency at module level
            const { ObjectNodeSprite } = await import('@/app/lib/pixi/ObjectNode');
            const ghostNode = createObjectNode(world.x, world.y, assetId, activeLayerId);
            const ghost = ObjectNodeSprite.create(ghostNode, assetManifest);
            ghost.alpha = 0.5;
            engine.selectionContainer.addChild(ghost);
            ghostNodeRef.current = ghost;
          } else {
            ghostNodeRef.current.x = world.x;
            ghostNodeRef.current.y = world.y;
          }
          break;
        }

        case 'path': {
          if (inProgressPointsRef.current.length < 1) break;

          const { PathNodeGraphics } = await import('@/app/lib/pixi/PathNode');

          clearPathPreview();

          const previewPoints = [...inProgressPointsRef.current, { x: world.x, y: world.y }];
          const previewNode = createPathNode(previewPoints, activeLayerId, activePathType);
          const preview = new PathNodeGraphics(previewNode);
          preview.alpha = 0.6;
          engine.selectionContainer.addChild(preview);
          previewPathRef.current = preview;
          break;
        }

        case 'plot': {
          if (inProgressPointsRef.current.length < 1) break;

          const { PlotNodeGraphics } = await import('@/app/lib/pixi/PlotNode');

          clearPlotPreview();

          const previewPoints = [...inProgressPointsRef.current, { x: world.x, y: world.y }];
          const previewNode = createPlotNode(previewPoints, activeLayerId, activePlotType);
          const preview = new PlotNodeGraphics(previewNode);
          preview.alpha = 0.6;
          engine.selectionContainer.addChild(preview);
          previewPlotRef.current = preview;
          break;
        }
      }
    },
    [
      engine,
      activeTool,
      activeAssetId,
      activeLayerId,
      activePathType,
      activePlotType,
      document.nodes,
      getScreenPosition,
      getWorldPosition,
      moveNode,
      touch,
    ],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!engine) return;

      if (e.pointerType === 'touch') {
        touch.onPointerUp(e);
        return;
      }

      if (isPanningRef.current) {
        isPanningRef.current = false;
        panStartRef.current = null;
        return;
      }

      if (activeTool === 'select' && isDraggingRef.current) {
        // Push history after drag ends
        isDraggingRef.current = false;
        dragStartRef.current = null;
        dragNodeOriginsRef.current.clear();
        pushHistory();
      }
    },
    [engine, activeTool, pushHistory],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!engine) return;

      if (activeTool === 'path') {
        clearPathPreview();
        const pts = inProgressPointsRef.current;
        if (pts.length >= 2) {
          const newNode = createPathNode(pts, activeLayerId, activePathType);
          pushHistory();
          addNode(newNode);
        }
        inProgressPointsRef.current = [];
        setInProgressPoints([]);
      } else if (activeTool === 'plot') {
        clearPlotPreview();
        const pts = inProgressPointsRef.current;
        if (pts.length >= 3) {
          const newNode = createPlotNode(pts, activeLayerId, activePlotType);
          pushHistory();
          addNode(newNode);
        }
        inProgressPointsRef.current = [];
        setInProgressPoints([]);
      }
    },
    [engine, activeTool, activeLayerId, activePathType, activePlotType, pushHistory, addNode],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (!engine) return;
      e.preventDefault();

      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const centerX = e.clientX - rect.left;
      const centerY = e.clientY - rect.top;

      // Ctrl+wheel = zoom, plain wheel = pan (vertical scroll)
      if (e.ctrlKey || e.metaKey) {
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        engine.zoom(factor, centerX, centerY);
      } else {
        engine.pan(-e.deltaX, -e.deltaY);
      }
    },
    [engine],
  );

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="flex-1 w-full h-full"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={(e) => e.pointerType === 'touch' && touch.onPointerCancel(e)}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
      style={{
        cursor: spaceHeld ? 'grab' : activeTool === 'object' ? 'crosshair' : 'default',
        touchAction: 'none', // prevent browser pinch-zoom and scroll on canvas
      }}
    />
  );
}

export default Canvas;
