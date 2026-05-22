export type EasingType = "linear" | "easeIn" | "easeOut" | "easeInOut" | "none";

export interface KeyframeData {
  id: string;
  time: number;
  value: number | string | boolean;
  easing: EasingType;
}

export interface TrackData {
  id: string;
  entityId: string;
  property: string;
  keyframes: KeyframeData[];
}

export interface TimelineData {
  duration: number;
  fps: number;
  tracks: TrackData[];
}

export function createDefaultTimeline(duration = 5): TimelineData {
  return { duration, fps: 60, tracks: [] };
}
