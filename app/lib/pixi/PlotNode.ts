// No 'use client' — pure PixiJS utility, not a React module.
import { Container, Graphics } from 'pixi.js';
import type { PlotNode } from '@/app/types/map';

// ─────────────────────────────────────────────────────────────────────────────
// PlotNodeGraphics
// ─────────────────────────────────────────────────────────────────────────────

export class PlotNodeGraphics extends Container {
  public nodeId: string;

  private plotGraphics: Graphics;
  private selectionGraphics: Graphics | null = null;
  private node: PlotNode;

  constructor(node: PlotNode) {
    super();

    this.nodeId = node.id;
    this.node = node;

    this.plotGraphics = new Graphics();
    this.addChild(this.plotGraphics);

    this.x = node.x;
    this.y = node.y;
    this.alpha = node.opacity;
    this.visible = node.visible;

    this.drawPolygon();
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private parseColor(colorStr: string): number {
    const hex = colorStr.replace('#', '');
    return parseInt(hex, 16);
  }

  private drawPolygon(): void {
    const g = this.plotGraphics;
    g.clear();

    const { vertices, fillColor, strokeColor, strokeWidth, autoFill } = this.node;
    if (vertices.length < 3) return;

    const fillAlpha = autoFill.enabled ? autoFill.fillOpacity : 0.6;
    const effectiveFill = autoFill.enabled ? autoFill.fillColor : fillColor;

    g.poly(vertices.map((v) => ({ x: v.x, y: v.y })));
    g.fill({ color: this.parseColor(effectiveFill), alpha: fillAlpha });
    g.stroke({ color: this.parseColor(strokeColor), width: strokeWidth });
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  updateFromNode(node: PlotNode): void {
    this.node = node;
    this.x = node.x;
    this.y = node.y;
    this.alpha = node.opacity;
    this.visible = node.visible;
    this.drawPolygon();

    if (this.selectionGraphics) {
      this.removeChild(this.selectionGraphics);
      this.selectionGraphics.destroy();
      this.selectionGraphics = null;
      this.drawSelectionOverlay();
    }
  }

  setSelected(selected: boolean): void {
    if (selected) {
      if (!this.selectionGraphics) {
        this.drawSelectionOverlay();
      }
    } else {
      if (this.selectionGraphics) {
        this.removeChild(this.selectionGraphics);
        this.selectionGraphics.destroy();
        this.selectionGraphics = null;
      }
    }
  }

  private drawSelectionOverlay(): void {
    const { vertices } = this.node;
    if (vertices.length < 3) return;

    const g = new Graphics();
    // Draw vertex handles as small cyan circles
    for (const v of vertices) {
      g.circle(v.x, v.y, 5);
      g.fill({ color: 0x00ffff });
      g.stroke({ color: 0xffffff, width: 1 });
    }
    // Draw outline
    g.poly(vertices.map((v) => ({ x: v.x, y: v.y })));
    g.stroke({ color: 0x00ffff, width: 2 });

    this.selectionGraphics = g;
    this.addChild(g);
  }
}
