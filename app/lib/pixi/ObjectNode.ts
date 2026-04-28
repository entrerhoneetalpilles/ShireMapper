// No 'use client' — pure PixiJS utility, not a React module.
import { Container, Sprite, Graphics } from 'pixi.js';
import type { ObjectNode, AssetDefinition } from '@/app/types/map';

// ─────────────────────────────────────────────────────────────────────────────
// ObjectNodeSprite
// ─────────────────────────────────────────────────────────────────────────────

export class ObjectNodeSprite extends Container {
  public nodeId: string;

  private sprite: Sprite;
  private selectionGraphics: Graphics | null = null;
  private assetDef: AssetDefinition | null;

  constructor(node: ObjectNode, assetManifest: AssetDefinition[]) {
    super();

    this.nodeId = node.id;
    this.assetDef = assetManifest.find((a) => a.id === node.assetId) ?? null;

    // Create sprite from asset src URL (first/only variant)
    const url = this.assetDef?.src ?? '';
    this.sprite = Sprite.from(url);

    // Set pivot to center of sprite
    this.sprite.anchor.set(0.5, 0.5);

    this.addChild(this.sprite);
    this.applyNodeProperties(node);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private applyNodeProperties(node: ObjectNode): void {
    // Position
    this.x = node.x;
    this.y = node.y;

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
    // Draw cyan outline around the sprite (centred at 0,0 because pivot is 0.5)
    g.rect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4);
    g.stroke({ color: 0x00ffff, width: 2 });
    this.selectionGraphics = g;
    this.addChild(g);
  }

  // ── Static factory ──────────────────────────────────────────────────────────

  static create(node: ObjectNode, manifest: AssetDefinition[]): ObjectNodeSprite {
    return new ObjectNodeSprite(node, manifest);
  }
}
