// No 'use client' — pure PixiJS utility, not a React module.
import { Container, Graphics } from 'pixi.js';
import type { PathNode } from '@/app/types/map';

// ─────────────────────────────────────────────────────────────────────────────
// PathNodeGraphics
// ─────────────────────────────────────────────────────────────────────────────

export class PathNodeGraphics extends Container {
  public nodeId: string;

  private pathGraphics: Graphics;
  private controlPointGraphics: Graphics | null = null;
  private node: PathNode;

  constructor(node: PathNode) {
    super();

    this.nodeId = node.id;
    this.node = node;

    this.pathGraphics = new Graphics();
    this.addChild(this.pathGraphics);

    this.x = node.x;
    this.y = node.y;
    this.alpha = node.opacity;
    this.visible = node.visible;

    this.drawPath();
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private parseColor(colorStr: string): number {
    // Convert CSS hex color string to PixiJS number
    const hex = colorStr.replace('#', '');
    return parseInt(hex, 16);
  }

  private drawPath(): void {
    const g = this.pathGraphics;
    g.clear();

    const { points, closed, strokeColor, strokeWidth, strokeOpacity, autoFill } = this.node;
    if (points.length < 2) return;

    // Fill if autofill or closed path
    if (closed && autoFill.enabled) {
      g.poly(points.map((p) => ({ x: p.x, y: p.y })));
      g.fill({ color: this.parseColor(autoFill.leftColor), alpha: 0.3 });
    }

    // Draw path lines (simplified: straight lines between points for MVP)
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      g.lineTo(points[i].x, points[i].y);
    }
    if (closed && points.length > 1) {
      g.lineTo(points[0].x, points[0].y);
    }

    g.stroke({
      color: this.parseColor(strokeColor),
      width: strokeWidth,
      alpha: strokeOpacity,
    });
  }

  drawControlPoints(): void {
    if (!this.controlPointGraphics) return;

    const g = this.controlPointGraphics;
    g.clear();

    const { points } = this.node;
    for (const pt of points) {
      g.circle(pt.x, pt.y, 5);
      g.fill({ color: 0x00ffff });
      g.stroke({ color: 0xffffff, width: 1 });
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  updateFromNode(node: PathNode): void {
    this.node = node;
    this.x = node.x;
    this.y = node.y;
    this.alpha = node.opacity;
    this.visible = node.visible;
    this.drawPath();

    if (this.controlPointGraphics) {
      this.drawControlPoints();
    }
  }

  setSelected(selected: boolean): void {
    if (selected) {
      if (!this.controlPointGraphics) {
        this.controlPointGraphics = new Graphics();
        this.addChild(this.controlPointGraphics);
      }
      this.drawControlPoints();
    } else {
      if (this.controlPointGraphics) {
        this.removeChild(this.controlPointGraphics);
        this.controlPointGraphics.destroy();
        this.controlPointGraphics = null;
      }
    }
  }
}
