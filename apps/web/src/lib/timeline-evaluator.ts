import type { ProjectDocument } from "@stickman/shared";

function ease(value: number, easing: string): number {
  if (easing === "easeIn") return value * value;
  if (easing === "easeOut") return value * (2 - value);
  if (easing === "easeInOut") return value < 0.5 ? 2 * value * value : -1 + (4 - 2 * value) * value;
  return value;
}

export function evaluateProperty(
  document: Pick<ProjectDocument, "timeline"> | null | undefined,
  entityId: string,
  property: string,
  time: number,
  defaultValue: unknown
): any {
  const track = document?.timeline?.tracks.find((item) => item.entityId === entityId && item.property === property);
  if (!track?.keyframes.length) return defaultValue;
  const keyframes = [...track.keyframes].sort((a, b) => a.time - b.time);
  if (time <= keyframes[0]!.time) return keyframes[0]!.value;
  if (time >= keyframes.at(-1)!.time) return keyframes.at(-1)!.value;
  for (let index = 0; index < keyframes.length - 1; index++) {
    const current = keyframes[index]!;
    const next = keyframes[index + 1]!;
    if (time < current.time || time > next.time) continue;
    if (current.easing === "none" || typeof current.value !== "number" || typeof next.value !== "number") return current.value;
    const span = Math.max(0.0001, next.time - current.time);
    const ratio = ease((time - current.time) / span, next.easing);
    return current.value + (next.value - current.value) * ratio;
  }
  return defaultValue;
}

export function getActiveKeyframeTime(
  document: Pick<ProjectDocument, "timeline"> | null | undefined,
  entityId: string,
  property: string,
  time: number
): number {
  const track = document?.timeline?.tracks.find((item) => item.entityId === entityId && item.property === property);
  if (!track?.keyframes.length) return 0;
  return [...track.keyframes]
    .filter((keyframe) => keyframe.time <= time)
    .sort((a, b) => b.time - a.time)[0]?.time ?? 0;
}

