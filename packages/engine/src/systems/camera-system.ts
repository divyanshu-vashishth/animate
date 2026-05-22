import type { PixiRenderer } from "../renderer/pixi-renderer.js";

export class CameraSystem {
  panX = 0;
  panY = 0;
  zoom = 1;

  constructor(private renderer: PixiRenderer) {}

  pan(dx: number, dy: number): void {
    this.panX += dx;
    this.panY += dy;
    this.apply();
  }

  setZoom(scale: number): void {
    this.zoom = Math.max(0.1, Math.min(5, scale));
    this.apply();
  }

  apply(): void {
    const root = this.renderer.stageRoot;
    root.x = this.panX;
    root.y = this.panY;
    root.scale.set(this.zoom);
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.panX) / this.zoom,
      y: (screenY - this.panY) / this.zoom,
    };
  }
}
