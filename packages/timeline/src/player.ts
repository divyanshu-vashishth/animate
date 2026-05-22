import type { TimelineData } from "@stickman/shared";
import { evaluateTimeline } from "./evaluator.js";

export type TimelineApplyFn = (props: ReturnType<typeof evaluateTimeline>) => void;

type FrameHandle = number | ReturnType<typeof setTimeout>;

function requestFrame(callback: () => void): FrameHandle {
  const raf = (globalThis as { requestAnimationFrame?: (cb: () => void) => number })
    .requestAnimationFrame;
  return raf ? raf(callback) : setTimeout(callback, 16);
}

function cancelFrame(handle: FrameHandle): void {
  const caf = (globalThis as { cancelAnimationFrame?: (handle: number) => void })
    .cancelAnimationFrame;
  if (caf && typeof handle === "number") {
    caf(handle);
    return;
  }
  clearTimeout(handle);
}

export class TimelinePlayer {
  private time = 0;
  private playing = false;
  private lastTimestamp = 0;
  private rafId: FrameHandle | null = null;

  constructor(
    private timeline: TimelineData,
    private onApply: TimelineApplyFn,
    private onTimeUpdate?: (time: number) => void
  ) {}

  setTimeline(timeline: TimelineData): void {
    this.timeline = timeline;
  }

  getTime(): number {
    return this.time;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  play(): void {
    if (this.playing) return;
    this.playing = true;
    this.lastTimestamp = performance.now();
    this.tick();
  }

  pause(): void {
    this.playing = false;
    if (this.rafId !== null) {
      cancelFrame(this.rafId);
      this.rafId = null;
    }
  }

  stop(): void {
    this.pause();
    this.seek(0);
  }

  seek(time: number): void {
    this.time = Math.max(0, Math.min(time, this.timeline.duration));
    this.apply();
    this.onTimeUpdate?.(this.time);
  }

  private tick = (): void => {
    if (!this.playing) return;
    const now = performance.now();
    const dt = (now - this.lastTimestamp) / 1000;
    this.lastTimestamp = now;
    this.time += dt;
    if (this.time >= this.timeline.duration) {
      this.time = this.timeline.duration;
      this.pause();
    }
    this.apply();
    this.onTimeUpdate?.(this.time);
    this.rafId = requestFrame(this.tick);
  };

  private apply(): void {
    const props = evaluateTimeline(this.timeline, this.time);
    this.onApply(props);
  }
}
