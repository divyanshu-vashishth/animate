export type UpdateFn = (dt: number) => void;
export type RenderFn = () => void;

export class GameLoop {
  private running = false;
  private rafId: number | null = null;
  private lastTime = 0;

  constructor(
    private onUpdate: UpdateFn,
    private onRender: RenderFn
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.tick();
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick = (): void => {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    this.onUpdate(dt);
    this.onRender();
    this.rafId = requestAnimationFrame(this.tick);
  };
}
