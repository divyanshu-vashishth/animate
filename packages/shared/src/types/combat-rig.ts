import type { RigBoneId, RigGeometry, RigPoint, RigSegment } from "./rig.js";

export interface CombatBoneProfile {
  startRadius: number;
  endRadius: number;
}

export interface CombatLimbPrimitive extends CombatBoneProfile {
  boneId: RigBoneId;
  segment: RigSegment;
  polygon: [RigPoint, RigPoint, RigPoint, RigPoint];
}

const PROFILES: Record<RigBoneId, CombatBoneProfile> = {
  torso: { startRadius: 6.4, endRadius: 8.2 },
  head: { startRadius: 0, endRadius: 0 },
  upperArmL: { startRadius: 6.2, endRadius: 5.2 },
  forearmL: { startRadius: 5.3, endRadius: 4.2 },
  upperArmR: { startRadius: 6.2, endRadius: 5.2 },
  forearmR: { startRadius: 5.3, endRadius: 4.2 },
  thighL: { startRadius: 7.2, endRadius: 5.9 },
  calfL: { startRadius: 6, endRadius: 4.5 },
  thighR: { startRadius: 7.2, endRadius: 5.9 },
  calfR: { startRadius: 6, endRadius: 4.5 },
};

export const COMBAT_HAND_RADIUS = 6.2;
export const COMBAT_HEAD_RADIUS_SCALE = 1.08;
export const COMBAT_FOOT_LENGTH = 12;

export function getCombatBoneProfile(boneId: RigBoneId): CombatBoneProfile {
  return PROFILES[boneId];
}

export function createCombatLimbPrimitive(segment: RigSegment): CombatLimbPrimitive {
  const profile = getCombatBoneProfile(segment.boneId);
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const length = Math.max(0.001, Math.hypot(dx, dy));
  const px = -dy / length;
  const py = dx / length;
  return {
    boneId: segment.boneId,
    segment,
    ...profile,
    polygon: [
      { x: segment.start.x + px * profile.startRadius, y: segment.start.y + py * profile.startRadius },
      { x: segment.end.x + px * profile.endRadius, y: segment.end.y + py * profile.endRadius },
      { x: segment.end.x - px * profile.endRadius, y: segment.end.y - py * profile.endRadius },
      { x: segment.start.x - px * profile.startRadius, y: segment.start.y - py * profile.startRadius },
    ],
  };
}

export function getCombatLimbs(geometry: RigGeometry): CombatLimbPrimitive[] {
  return geometry.segments
    .filter((segment) => segment.boneId !== "head")
    .map(createCombatLimbPrimitive);
}

export function isCombatRig(rigId: string | undefined, poseId: string | undefined): boolean {
  return rigId === "combat-vector-v2" || rigId === "combat-stickman" || Boolean(poseId?.startsWith("combat_"));
}
