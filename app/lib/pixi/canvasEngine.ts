// No 'use client' — this is a pure PixiJS utility class, not a React module.
import { Application, Container, Graphics } from 'pixi.js';
import type { GridSettings } from '@/app/types/map';
import { drawSquareGrid, drawHexGrid } from './gridRenderer';

// ─────────────────────────────────────────────────────────────────────────────
// CanvasEngine
// ─────────────────────────────────────────────────────────────────────────────

export class CanvasEngine {
  private app: Application;
  private container: HTMLDivElement;
  private width: number;
  private height: number;

  /** Root container that pans/zooms — all map content goes here. */
  private viewport: Container;

  /** Per-layer containers, keyed by layer ID. */
  private layers: Map<string, Container> = new Map();

  /** Graphics object used exclusively to draw the grid. */
  public gridContainer: Graphics;

  /** Container for selection handles; always rendered above map content. */
  public selectionContainer: Container;

  constructor(container: HTMLDivElement, width: number, height: number) {
    this.container = container;
    this.width = width;
    this.height = height;

    this.app = new Application();
    this.viewport = new Container();
    this.gridContainer = new Graphics();
    this.selectionContainer = new Container();
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    await this.app.init({
      background: '#1a1a2e',
      width: this.width,
      height: this.height,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    // Position the canvas to always fill its container, regardless of the
    // renderer's logical size. The ResizeObserver keeps renderer ↔ container
    // in sync; this CSS ensures visual correctness while that sync happens.
    const canvas = this.app.canvas as HTMLCanvasElement;
    canvas.style.display = 'block';
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    this.container.appendChild(canvas);

    // Stage hierarchy: grid → viewport (layers) → selection overlay
    this.app.stage.addChild(this.gridContainer);
    this.app.stage.addChild(this.viewport);
    this.app.stage.addChild(this.selectionContainer);
  }

  destroy(): void {
    this.app.destroy(true, { children: true });
  }

  // ── Accessors ───────────────────────────────────────────────────────────────

  getApp(): Application {
    return this.app;
  }

  getViewport(): Container {
    return this.viewport;
  }

  // ── Layer management ────────────────────────────────────────────────────────

  addLayerContainer(layerId: string): Container {
    if (this.layers.has(layerId)) {
      return this.layers.get(layerId)!;
    }
    const c = new Container();
    this.layers.set(layerId, c);
    this.viewport.addChild(c);
    return c;
  }

  removeLayerContainer(layerId: string): void {
    const c = this.layers.get(layerId);
    if (!c) return;
    this.viewport.removeChild(c);
    c.destroy({ children: true });
    this.layers.delete(layerId);
  }

  getLayerContainer(layerId: string): Container | undefined {
    return this.layers.get(layerId);
  }

  /**
   * Reorders the layer containers inside the viewport to match the provided
   * ordered array of layer IDs (index 0 = bottom, last = top).
   */
  setLayerOrder(layerIds: string[]): void {
    layerIds.forEach((id, index) => {
      const c = this.layers.get(id);
      if (c) {
        c.zIndex = index;
      }
    });
    this.viewport.sortChildren();
  }

  setLayerVisible(layerId: string, visible: boolean): void {
    const c = this.layers.get(layerId);
    if (c) c.visible = visible;
  }

  setLayerOpacity(layerId: string, opacity: number): void {
    const c = this.layers.get(layerId);
    if (c) c.alpha = opacity;
  }

  // ── Grid ────────────────────────────────────────────────────────────────────

  drawGrid(
    settings: GridSettings,
    viewportX: number,
    viewportY: number,
    viewportScale: number,
  ): void {
    this.gridContainer.clear();

    if (!settings.visible) return;

    const w = this.app.renderer.width;
    const h = this.app.renderer.height;

    if (settings.type === 'square' || settings.type === 'isometric') {
      drawSquareGrid(
        this.gridContainer,
        settings,
        viewportX,
        viewportY,
        viewportScale,
        w,
        h,
      );
    } else if (settings.type === 'hex') {
      drawHexGrid(
        this.gridContainer,
        settings,
        viewportX,
        viewportY,
        viewportScale,
        w,
        h,
      );
    }
  }

  clearGrid(): void {
    this.gridContainer.clear();
  }

  // ── Viewport transform ──────────────────────────────────────────────────────

  pan(dx: number, dy: number): void {
    this.viewport.x += dx;
    this.viewport.y += dy;
  }

  /**
   * Zoom the viewport around a screen-space point (centerX, centerY).
   * `factor` is a multiplier (e.g. 1.1 = zoom in 10 %).
   */
  zoom(factor: number, centerX: number, centerY: number): void {
    const before = this.screenToWorld(centerX, centerY);

    this.viewport.scale.x *= factor;
    this.viewport.scale.y *= factor;

    // Reposition so that the world point under the cursor stays fixed.
    const after = this.screenToWorld(centerX, centerY);
    this.viewport.x += (after.x - before.x) * this.viewport.scale.x;
    this.viewport.y += (after.y - before.y) * this.viewport.scale.y;
  }

  // ── Coordinate conversion ───────────────────────────────────────────────────

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const scale = this.viewport.scale.x;
    return {
      x: (screenX - this.viewport.x) / scale,
      y: (screenY - this.viewport.y) / scale,
    };
  }

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const scale = this.viewport.scale.x;
    return {
      x: worldX * scale + this.viewport.x,
      y: worldY * scale + this.viewport.y,
    };
  }

  getViewportState(): { x: number; y: number; scale: number } {
    return {
      x: this.viewport.x,
      y: this.viewport.y,
      scale: this.viewport.scale.x,
    };
  }
}
