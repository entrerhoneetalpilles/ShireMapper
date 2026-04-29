// No 'use client' — pure PixiJS utility, not a React module.
import type { MapDocument, MapNode, ObjectNode, PathNode, PlotNode } from '@/app/types/map';
import type { DepthLayer } from '@/app/types/map';
import { assetManifest } from '@/app/lib/assetManifest';
import type { CanvasEngine } from './canvasEngine';
import { ObjectNodeSprite } from './ObjectNode';
import { PathNodeGraphics } from './PathNode';
import { PlotNodeGraphics } from './PlotNode';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type DisplayObject = ObjectNodeSprite | PathNodeGraphics | PlotNodeGraphics;

const DEPTH_LAYER_ORDER: Record<DepthLayer, number> = {
  ground: 0,
  low: 1,
  mid: 2,
  high: 3,
  overhead: 4,
};

// ─────────────────────────────────────────────────────────────────────────────
// SceneManager
// ─────────────────────────────────────────────────────────────────────────────

export class SceneManager {
  private engine: CanvasEngine;
  private displayObjects: Map<string, DisplayObject> = new Map();
  /** nodeId → ObjectNode reference for lighting lookups */
  private nodeCache: Map<string, ObjectNode> = new Map();

  constructor(engine: CanvasEngine) {
    this.engine = engine;
  }

  // ── Document sync ───────────────────────────────────────────────────────────

  syncWithDocument(doc: MapDocument): void {
    const nodeIds = new Set(Object.keys(doc.nodes));

    // Remove display objects for nodes that no longer exist
    for (const [id, displayObj] of this.displayObjects) {
      if (!nodeIds.has(id)) {
        this.removeDisplayObject(id, displayObj);
        this.nodeCache.delete(id);
      }
    }

    // Ensure layers exist in the engine for all document layers
    for (const layer of doc.layers) {
      this.engine.addLayerContainer(layer.id);
      this.engine.setLayerVisible(layer.id, layer.visible);
      this.engine.setLayerOpacity(layer.id, layer.opacity);
    }

    // Sync layer order
    this.engine.setLayerOrder(doc.layers.map((l) => l.id));

    // Add/update display objects for all current nodes
    for (const [id, node] of Object.entries(doc.nodes)) {
      if (this.displayObjects.has(id)) {
        // Update existing display object
        this.updateDisplayObject(id, node);
      } else {
        // Create new display object
        this.createDisplayObject(node, doc);
      }

      // Keep a reference to ObjectNode data for lighting
      if (node.type === 'object') {
        this.nodeCache.set(id, node as ObjectNode);
      }
    }

    // Re-sort all layers by depth after sync
    for (const layer of doc.layers) {
      this.sortObjectsByDepth(layer.id);
    }
  }

  // ── Selection ───────────────────────────────────────────────────────────────

  selectNodes(nodeIds: string[]): void {
    const selectedSet = new Set(nodeIds);
    for (const [id, displayObj] of this.displayObjects) {
      displayObj.setSelected(selectedSet.has(id));
    }
  }

  // ── Hit testing ─────────────────────────────────────────────────────────────

  getNodeAtPosition(worldX: number, worldY: number): string | null {
    // Iterate in reverse order so top-most objects are checked first
    const entries = Array.from(this.displayObjects.entries()).reverse();
    for (const [id, displayObj] of entries) {
      if (!displayObj.visible) continue;

      if (displayObj instanceof ObjectNodeSprite) {
        // Use PixiJS hit testing via containsPoint on local bounds
        const local = displayObj.toLocal({ x: worldX, y: worldY });
        const bounds = displayObj.getLocalBounds();
        if (
          local.x >= bounds.x &&
          local.x <= bounds.x + bounds.width &&
          local.y >= bounds.y &&
          local.y <= bounds.y + bounds.height
        ) {
          return id;
        }
      } else if (displayObj instanceof PathNodeGraphics || displayObj instanceof PlotNodeGraphics) {
        // Simple bounding-box hit test for paths and plots
        const local = displayObj.toLocal({ x: worldX, y: worldY });
        const bounds = displayObj.getLocalBounds();
        if (
          local.x >= bounds.x &&
          local.x <= bounds.x + bounds.width &&
          local.y >= bounds.y &&
          local.y <= bounds.y + bounds.height
        ) {
          return id;
        }
      }
    }
    return null;
  }

  // ── Depth sorting ────────────────────────────────────────────────────────────

  /**
   * Sort all ObjectNodeSprite children in a layer container by:
   *   1. depthLayer (ground=0 … overhead=4)
   *   2. then by node.y (painters algorithm — lower y = painted earlier)
   * Assigns zIndex and calls container.sortChildren().
   */
  private sortObjectsByDepth(layerId: string): void {
    const container = this.engine.getLayerContainer(layerId);
    if (!container) return;

    // Gather ObjectNodeSprite children with their sort key
    const sprites: Array<{ sprite: ObjectNodeSprite; sortKey: number }> = [];

    for (const child of container.children) {
      if (child instanceof ObjectNodeSprite) {
        const nodeData = this.nodeCache.get(child.nodeId);
        const depthOrder = DEPTH_LAYER_ORDER[child._depthLayer] ?? 2;
        // Combine depth layer (primary) with y position (secondary)
        // Use 100000 as a large multiplier so depth layer always dominates
        const y = nodeData?.y ?? child.y;
        sprites.push({ sprite: child, sortKey: depthOrder * 100000 + y });
      }
    }

    // Assign ascending zIndex values based on sort order
    sprites.sort((a, b) => a.sortKey - b.sortKey);
    sprites.forEach(({ sprite }, index) => {
      sprite.zIndex = index;
    });

    container.sortableChildren = true;
    container.sortChildren();
  }

  // ── Lighting ─────────────────────────────────────────────────────────────────

  /**
   * Iterate all ObjectNodeSprites across all layers and update their shadow
   * graphics according to the current sun parameters.
   */
  applyLighting(sunAngle: number, sunElevation: number, lightingEnabled: boolean): void {
    for (const [id, displayObj] of this.displayObjects) {
      if (!(displayObj instanceof ObjectNodeSprite)) continue;

      const nodeData = this.nodeCache.get(id);
      const elevationHeight = nodeData?.elevationHeight ?? 1;
      const placementMode = nodeData?.placementMode ?? 'grounded';

      displayObj.applyLighting(sunAngle, sunElevation, elevationHeight, placementMode);
      displayObj.setLightingVisible(lightingEnabled);
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private createDisplayObject(node: MapNode, doc: MapDocument): void {
    let displayObj: DisplayObject | null = null;
    const layerContainer = this.engine.getLayerContainer(node.layerId);

    if (!layerContainer) return;

    switch (node.type) {
      case 'object': {
        displayObj = ObjectNodeSprite.create(node as ObjectNode, assetManifest);
        break;
      }
      case 'path': {
        displayObj = new PathNodeGraphics(node as PathNode);
        break;
      }
      case 'plot': {
        displayObj = new PlotNodeGraphics(node as PlotNode);
        break;
      }
      case 'room': {
        // Room rendering not yet implemented — skip silently
        return;
      }
    }

    if (displayObj) {
      layerContainer.addChild(displayObj);
      this.displayObjects.set(node.id, displayObj);
    }
  }

  private updateDisplayObject(id: string, node: MapNode): void {
    const displayObj = this.displayObjects.get(id);
    if (!displayObj) return;

    switch (node.type) {
      case 'object':
        if (displayObj instanceof ObjectNodeSprite) {
          displayObj.updateFromNode(node as ObjectNode);
        }
        break;
      case 'path':
        if (displayObj instanceof PathNodeGraphics) {
          displayObj.updateFromNode(node as PathNode);
        }
        break;
      case 'plot':
        if (displayObj instanceof PlotNodeGraphics) {
          displayObj.updateFromNode(node as PlotNode);
        }
        break;
    }
  }

  private removeDisplayObject(id: string, displayObj: DisplayObject): void {
    if (displayObj.parent) {
      displayObj.parent.removeChild(displayObj);
    }
    displayObj.destroy({ children: true });
    this.displayObjects.delete(id);
  }

  // ── Public accessors ────────────────────────────────────────────────────────

  getDisplayObject(nodeId: string): DisplayObject | undefined {
    return this.displayObjects.get(nodeId);
  }

  destroy(): void {
    for (const [id, displayObj] of this.displayObjects) {
      this.removeDisplayObject(id, displayObj);
    }
    this.displayObjects.clear();
    this.nodeCache.clear();
  }
}
