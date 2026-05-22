import type { EasingType, KeyframeData, TimelineData, TrackData } from "@stickman/shared";

function ease(t: number, easing: EasingType): number {
  switch (easing) {
    case "easeIn":
      return t * t;
    case "easeOut":
      return t * (2 - t);
    case "easeInOut":
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    case "linear":
    case "none":
    default:
      return t;
  }
}

function interpolateKeyframes(
  keyframes: KeyframeData[],
  time: number
): number | string | boolean | undefined {
  if (keyframes.length === 0) return undefined;
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  if (time <= sorted[0]!.time) return sorted[0]!.value;
  if (time >= sorted[sorted.length - 1]!.time) return sorted[sorted.length - 1]!.value;

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    if (time >= a.time && time <= b.time) {
      if (typeof a.value === "string" || typeof b.value === "string") {
        return time < (a.time + b.time) / 2 ? a.value : b.value;
      }
      if (typeof a.value === "boolean") return a.value;
      const t = (time - a.time) / (b.time - a.time);
      const eased = ease(t, b.easing);
      return (a.value as number) + ((b.value as number) - (a.value as number)) * eased;
    }
  }
  return sorted[sorted.length - 1]!.value;
}

export interface EvaluatedProperty {
  entityId: string;
  property: string;
  value: number | string | boolean;
}

export function evaluateTimeline(timeline: TimelineData, time: number): EvaluatedProperty[] {
  const results: EvaluatedProperty[] = [];
  for (const track of timeline.tracks) {
    const value = interpolateKeyframes(track.keyframes, time);
    if (value !== undefined) {
      results.push({ entityId: track.entityId, property: track.property, value });
    }
  }
  return results;
}

export function getOrCreateTrack(
  timeline: TimelineData,
  entityId: string,
  property: string
): TrackData {
  let track = timeline.tracks.find((t) => t.entityId === entityId && t.property === property);
  if (!track) {
    track = {
      id: crypto.randomUUID(),
      entityId,
      property,
      keyframes: [],
    };
    timeline.tracks.push(track);
  }
  return track;
}
