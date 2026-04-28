// No 'use client' — pure PixiJS utility, not a React module.
import type { MapDocument, MapNode, ObjectNode, PathNode, PlotNode } from '@/app/types/map';
import { assetManifest } from '@/app/lib/assetManifest';
import type { CanvasEngine } from './canvasEngine';
import { ObjectNodeSprite } from './ObjectNode';
import { PathNodeGraphics } from './PathNode';
import { PlotNodeGraphics } from './PlotNode';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type DisplayObject = ObjectNodeSprite | PathNodeGraphics | PlotNodeGraphics;

// ─────────────────────────────────────────────────────────────────────────────
// SceneManager
// ─────────────────────────────────────────────────────────────────────────────

export class SceneManager {
  private engine: CanvasEngine;
  private displayObjects: Map<string, DisplayObject> = new Map();

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
  }
}
