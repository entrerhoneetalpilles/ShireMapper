// No 'use client' — pure PixiJS utility, not a React module.
import { Container, Sprite, Graphics } from 'pixi.js';
import type { ObjectNode, AssetDefinition, PlacementMode, DepthLayer } from '@/app/types/map';

// ─────────────────────────────────────────────────────────────────────────────
// ObjectNodeSprite
// ─────────────────────────────────────────────────────────────────────────────

export class ObjectNodeSprite extends Container {
  public nodeId: string;

  private sprite: Sprite;
  private selectionGraphics: Graphics | null = null;
  private shadowGraphic: Graphics | null = null;
  private assetDef: AssetDefinition | null;

  /** Cached for depth-sort by SceneManager */
  public _placementMode: PlacementMode = 'grounded';
  public _depthLayer: DepthLayer = 'mid';

  constructor(node: ObjectNode, assetManifest: AssetDefinition[]) {
    super();

    this.nodeId = node.id;
    this.assetDef = assetManifest.find((a) => a.id === node.assetId) ?? null;

    // Create sprite from asset src URL (first/only variant)
    const url = this.assetDef?.src ?? '';
    this.sprite = Sprite.from(url);

    // Set pivot to center of sprite
    this.sprite.anchor.set(0.5, 0.5);

    // Enable z-sorting on this container so shadow can sit below sprite
    this.sortableChildren = true;
    this.sprite.zIndex = 1;

    this.addChild(this.sprite);
    this.applyNodeProperties(node);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private applyNodeProperties(node: ObjectNode): void {
    // Position
    this.x = node.x;
    this.y = node.y;

    // Cache placement / depth info for SceneManager
    this._placementMode = node.placementMode ?? 'grounded';
    this._depthLayer = node.depthLayer ?? 'mid';

    // Rotation (stored as degrees, PixiJS uses radians)
    this.rotation = (node.rotation * Math.PI) / 180;

    // Scale from width/height relative to natural asset dimensions
    const naturalW = this.assetDef?.naturalWidth ?? 64;
    const naturalH = this.assetDef?.naturalHeight ?? 64;
    const scaleX = node.width > 0 ? node.width / naturalW : 1;
    const scaleY = node.height > 0 ? node.height / naturalH : 1;

    // Apply flipX / flipY by negating scale
    this.scale.set(
      node.flipX ? -scaleX : scaleX,
      node.flipY ? -scaleY : scaleY,
    );

    // Opacity
    this.alpha = node.opacity;

    // Visibility
    this.visible = node.visible;

    // Tint color
    if (node.tintColor) {
      const hex = parseInt(node.tintColor.replace('#', ''), 16);
      if (!isNaN(hex)) {
        this.sprite.tint = hex;
      }
    } else {
      this.sprite.tint = 0xffffff;
    }
  }

  private getSelectionBounds(): { w: number; h: number } {
    const naturalW = this.assetDef?.naturalWidth ?? 64;
    const naturalH = this.assetDef?.naturalHeight ?? 64;
    return { w: naturalW, h: naturalH };
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  updateFromNode(node: ObjectNode): void {
    this.applyNodeProperties(node);

    // Refresh selection outline bounds if selected
    if (this.selectionGraphics) {
      this.removeChild(this.selectionGraphics);
      this.selectionGraphics.destroy();
      this.selectionGraphics = null;
      this.drawSelectionOutline();
    }
  }

  /**
   * Compute and draw (or update) the cast shadow ellipse based on sun direction
   * and elevation. Call this whenever lighting parameters change.
   */
  applyLighting(
    sunAngle: number,
    sunElevation: number,
    elevationHeight: number,
    placementMode: PlacementMode,
  ): void {
    // Remove old shadow if present
    if (this.shadowGraphic) {
      this.removeChild(this.shadowGraphic);
      this.shadowGraphic.destroy();
      this.shadowGraphic = null;
    }

    const angleRad = (sunAngle * Math.PI) / 180;
    const elevationFactor = 1 - sunElevation / 90;
    const dx = Math.cos(angleRad) * elevationHeight * elevationFactor * 20;
    const dy = Math.sin(angleRad) * elevationHeight * elevationFactor * 20;

    const naturalW = this.assetDef?.naturalWidth ?? 64;
    const shadowW = naturalW * 0.8;
    const shadowH = naturalW * 0.3;

    const shadowAlpha = placementMode === 'floating' ? 0.55 : 0.35;

    const g = new Graphics();
    g.zIndex = 0; // behind sprite (sprite is zIndex=1)

    // For floating mode, offset the sprite upward visually
    if (placementMode === 'floating') {
      this.sprite.y = -elevationHeight * 15;
    } else {
      this.sprite.y = 0;
    }

    // Draw ellipse shadow centred at the shadow offset position
    g.ellipse(dx, dy, shadowW / 2, shadowH / 2);
    g.fill({ color: 0x000000, alpha: shadowAlpha });

    this.shadowGraphic = g;
    this.addChild(g);
    this.sortChildren();
  }

  /**
   * Show or hide the shadow graphic.
   */
  setLightingVisible(visible: boolean): void {
    if (this.shadowGraphic) {
      this.shadowGraphic.visible = visible;
    }
  }

  setSelected(selected: boolean): void {
    if (selected) {
      if (!this.selectionGraphics) {
        this.drawSelectionOutline();
      }
    } else {
      if (this.selectionGraphics) {
        this.removeChild(this.selectionGraphics);
        this.selectionGraphics.destroy();
        this.selectionGraphics = null;
      }
    }
  }

  private drawSelectionOutline(): void {
    const { w, h } = this.getSelectionBounds();
    const g = new Graphics();
    // Draw cyan rounded-rect outline around the sprite (centred at 0,0 because pivot is 0.5)
    g.roundRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, 4);
    g.stroke({ color: 0x00e5ff, width: 2 });
    g.zIndex = 2; // above sprite
    this.selectionGraphics = g;
    this.addChild(g);
    this.sortChildren();
  }

  // ── Static factory ──────────────────────────────────────────────────────────

  static create(node: ObjectNode, manifest: AssetDefinition[]): ObjectNodeSprite {
    return new ObjectNodeSprite(node, manifest);
  }
}
