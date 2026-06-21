import { z } from "zod";
import {
  RIG_BONE_IDS,
  RIG_VIEWBOX,
  getRigPose,
  resolveRigGeometry,
  type AudioTrackData,
  type EffectEntityData,
  type ProjectDocument,
  type RigBoneId,
  type TrackData,
} from "@stickman/shared";

export const COMBAT_MOVES = [
  "dash", "lightPunch", "heavyPunch", "kick", "sweep", "dodge", "block", "throw",
  "launch", "airAttack", "counter", "barrage", "knockdown", "recover", "finisher",
] as const;

export const combatGenerationRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
  duration: z.number().min(10).max(30).default(20),
  intensity: z.enum(["grounded", "cinematic", "extreme"]).default("cinematic"),
  winner: z.enum(["fighterA", "fighterB", "draw", "auto"]).default("auto"),
  moveCallouts: z.boolean().default(false),
  seed: z.number().int().min(0).max(2_147_483_647).default(1337),
  fighters: z.tuple([
    z.object({ id: z.literal("fighterA"), name: z.string().trim().min(1).max(40), color: z.string().regex(/^#[0-9a-fA-F]{6}$/) }),
    z.object({ id: z.literal("fighterB"), name: z.string().trim().min(1).max(40), color: z.string().regex(/^#[0-9a-fA-F]{6}$/) }),
  ]),
});

export type CombatGenerationRequest = z.infer<typeof combatGenerationRequestSchema>;

export const combatBeatSchema = z.object({
  id: z.string().min(1),
  start: z.number().min(0),
  duration: z.number().min(0.35).max(4),
  actorId: z.enum(["fighterA", "fighterB"]),
  targetId: z.enum(["fighterA", "fighterB"]),
  move: z.enum(COMBAT_MOVES),
  outcome: z.enum(["hit", "block", "dodge", "miss"]),
  strength: z.number().min(0).max(1),
  callout: z.string().trim().max(32).optional(),
});

export const combatPlanSchema = z.object({
  version: z.literal(1),
  duration: z.number().min(10).max(30),
  beats: z.array(combatBeatSchema).min(4).max(18),
});

export type CombatBeat = z.infer<typeof combatBeatSchema>;
export type CombatPlan = z.infer<typeof combatPlanSchema>;

function rngFromSeed(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicId(seed: number, index: number): string {
  const random = rngFromSeed(seed + index * 7919);
  const hex = Array.from({ length: 32 }, () => Math.floor(random() * 16).toString(16));
  hex[12] = "4";
  hex[16] = ((parseInt(hex[16]!, 16) & 3) | 8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}

export function createFallbackCombatPlan(request: CombatGenerationRequest): CombatPlan {
  const random = rngFromSeed(request.seed);
  const count = Math.max(4, Math.min(12, Math.round(request.duration / 2.4)));
  const start = request.duration * 0.19;
  const finishAt = request.duration * 0.86;
  const spacing = (finishAt - start) / count;
  const standardMoves = ["lightPunch", "kick", "heavyPunch", "sweep", "counter", "throw", "launch", "airAttack", "barrage"] as const;
  const winner = request.winner === "auto" ? (random() > 0.5 ? "fighterA" : "fighterB") : request.winner;
  const beats: CombatBeat[] = [];

  for (let index = 0; index < count; index++) {
    let actorId: "fighterA" | "fighterB" = index % 2 === 0 ? "fighterA" : "fighterB";
    if (index === count - 1 && winner !== "draw") actorId = winner;
    const targetId = actorId === "fighterA" ? "fighterB" : "fighterA";
    const move = index === count - 1 ? "finisher" : standardMoves[Math.floor(random() * standardMoves.length)]!;
    const outcome = index % 4 === 1 && index < count - 2 ? (random() > 0.5 ? "block" : "dodge") : "hit";
    const strength = move === "finisher" ? 1 : 0.42 + random() * 0.48;
    beats.push({
      id: `beat-${index + 1}`,
      start: Number((start + index * spacing).toFixed(3)),
      duration: Number(Math.max(0.7, spacing * 0.88).toFixed(3)),
      actorId,
      targetId,
      move,
      outcome,
      strength,
    });
  }
  return { version: 1, duration: request.duration, beats };
}

function wavDataUrl(kind: string, seed: number): string {
  const sampleRate = 12000;
  const duration = kind.includes("heavy") || kind.includes("slam") ? 0.32 : 0.18;
  const samples = Math.floor(sampleRate * duration);
  const bytes = new Uint8Array(44 + samples * 2);
  const view = new DataView(bytes.buffer);
  const write = (offset: number, value: string) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  write(0, "RIFF"); view.setUint32(4, 36 + samples * 2, true); write(8, "WAVEfmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  write(36, "data"); view.setUint32(40, samples * 2, true);
  const random = rngFromSeed(seed);
  for (let i = 0; i < samples; i++) {
    const p = i / samples;
    const envelope = Math.pow(1 - p, kind.includes("whoosh") ? 1.6 : 3.2);
    const sweep = 140 + (1 - p) * (kind.includes("whoosh") ? 900 : 260);
    const tone = Math.sin((i / sampleRate) * Math.PI * 2 * sweep);
    const noise = random() * 2 - 1;
    const mix = kind.includes("whoosh") ? tone * 0.3 + noise * 0.7 : tone * 0.72 + noise * 0.28;
    view.setInt16(44 + i * 2, Math.max(-32767, Math.min(32767, mix * envelope * 26000)), true);
  }
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

type CombatMove = (typeof COMBAT_MOVES)[number];
type StrikeBone = "forearmR" | "calfR";

interface MovePhases {
  windup: string;
  contact: string;
  follow: string;
  strikeBone: StrikeBone;
}

const DEFENSIVE_MOVES = new Set<CombatMove>(["dodge", "block", "recover"]);

function phasesForMove(move: CombatMove): MovePhases {
  if (move === "kick" || move === "airAttack") {
    return { windup: "combat_kick_chamber", contact: "combat_kick_contact", follow: "combat_kick_follow", strikeBone: "calfR" };
  }
  if (move === "sweep") {
    return { windup: "combat_sweep_windup", contact: "combat_sweep_contact", follow: "combat_sweep_follow", strikeBone: "calfR" };
  }
  if (move === "throw") {
    return { windup: "combat_grapple_windup", contact: "combat_grapple_contact", follow: "combat_throw_follow", strikeBone: "forearmR" };
  }
  if (move === "launch") {
    return { windup: "combat_launch_windup", contact: "combat_launch_contact", follow: "combat_launch_follow", strikeBone: "forearmR" };
  }
  if (["heavyPunch", "knockdown", "finisher"].includes(move)) {
    return { windup: "combat_heavy_windup", contact: "combat_heavy_contact", follow: "combat_heavy_follow", strikeBone: "forearmR" };
  }
  return { windup: "combat_jab_windup", contact: "combat_jab_contact", follow: "combat_jab_retract", strikeBone: "forearmR" };
}

function strikePointForPose(poseId: string, strikeBone: StrikeBone) {
  const segment = resolveRigGeometry(poseId).segments.find((candidate) => candidate.boneId === strikeBone);
  if (!segment) throw new Error(`Missing ${strikeBone} geometry for ${poseId}`);
  return segment.end;
}

export function compileCombatPlan(request: CombatGenerationRequest, plan: CombatPlan): ProjectDocument {
  let idIndex = 1;
  const id = () => deterministicId(request.seed, idIndex++);
  const charactersLayer = id();
  const effectsLayer = id();
  const fighterAId = id();
  const fighterBId = id();
  const baseline = 292;
  const fighterWidth = 118;
  const fighterHeight = 165;
  const duration = request.duration;
  const tracks = new Map<string, TrackData>();
  const effects: EffectEntityData[] = [];
  const audioTracks: AudioTrackData[] = [];
  const contacts: NonNullable<NonNullable<ProjectDocument["combat"]>["contacts"]> = [];
  const positions: Record<"fighterA" | "fighterB", { x: number; y: number }> = {
    fighterA: { x: 185, y: baseline }, fighterB: { x: 455, y: baseline },
  };
  const entityIds = { fighterA: fighterAId, fighterB: fighterBId };
  const localPointToStage = (point: { x: number; y: number }, rootX: number, rootY: number, facing: number) => ({
    x: rootX + point.x * (fighterWidth / RIG_VIEWBOX.width) * facing,
    y: rootY - fighterHeight + (point.y - RIG_VIEWBOX.y) * (fighterHeight / RIG_VIEWBOX.height),
  });

  const trackFor = (entityId: string, property: string) => {
    const key = `${entityId}:${property}`;
    let track = tracks.get(key);
    if (!track) {
      track = { id: id(), entityId, property, keyframes: [] };
      tracks.set(key, track);
    }
    return track;
  };
  const keyframe = (entityId: string, property: string, time: number, value: number | string | boolean, easing: "linear" | "easeIn" | "easeOut" | "easeInOut" | "none" = "easeInOut") => {
    trackFor(entityId, property).keyframes.push({ id: id(), time: Math.max(0, Math.min(duration, time)), value, easing });
  };
  const poseAt = (fighter: "fighterA" | "fighterB", time: number, poseId: string, easing: "easeIn" | "easeOut" | "easeInOut" | "none" = "easeInOut") => {
    const entityId = entityIds[fighter];
    keyframe(entityId, "rig.pose", time, poseId, "none");
    const pose = getRigPose(poseId);
    for (const boneId of RIG_BONE_IDS) keyframe(entityId, `rig.bones.${boneId}`, time, pose.bones[boneId] ?? 0, easing);
  };

  for (const fighter of ["fighterA", "fighterB"] as const) {
    const entityId = entityIds[fighter];
    const offscreenX = fighter === "fighterA" ? -55 : 695;
    keyframe(entityId, "transform.x", 0, offscreenX, "none");
    keyframe(entityId, "transform.x", duration * 0.12, positions[fighter].x, "easeOut");
    keyframe(entityId, "transform.y", 0, baseline, "none");
    keyframe(entityId, "transform.rotation", 0, 0, "none");
    keyframe(entityId, "transform.scaleX", 0, fighter === "fighterA" ? 1 : -1, "none");
    poseAt(fighter, 0, "combat_guard");
  }

  plan.beats.slice().sort((a, b) => a.start - b.start).forEach((beat, index) => {
    const actor = beat.actorId;
    const target = beat.targetId;
    if (actor === target) return;
    const actorEntity = entityIds[actor];
    const targetEntity = entityIds[target];
    const actorPos = positions[actor];
    const targetPos = positions[target];
    const actorStartX = actorPos.x;
    const targetStartX = targetPos.x;
    const intensityScale = request.intensity === "grounded" ? 0.78 : request.intensity === "extreme" ? 1.18 : 1;
    const strength = Math.max(0, Math.min(1, beat.strength * intensityScale));
    const direction = targetPos.x >= actorPos.x ? 1 : -1;
    const windupEnd = beat.start + beat.duration * 0.24;
    const contact = beat.start + beat.duration * 0.54;
    const holdFrames = beat.move === "barrage" ? 6 : strength > 0.72 ? 2 : 1;
    const holdEnd = Math.min(beat.start + beat.duration * 0.8, contact + holdFrames / 24);
    const recover = Math.min(duration - 0.35, beat.start + beat.duration);
    const follow = Math.min(recover - 0.08, holdEnd + beat.duration * 0.16);

    keyframe(actorEntity, "transform.scaleX", beat.start, direction, "none");
    keyframe(targetEntity, "transform.scaleX", beat.start, -direction, "none");
    keyframe(actorEntity, "transform.y", beat.start, baseline, "none");

    if (DEFENSIVE_MOVES.has(beat.move)) {
      keyframe(actorEntity, "transform.x", beat.start, actorStartX, "none");
      poseAt(actor, beat.start, "combat_guard", "none");
      poseAt(actor, windupEnd, beat.move === "block" ? "combat_block" : beat.move === "dodge" ? "combat_dodge" : "combat_crouch", "easeOut");
      if (beat.move === "dodge") {
        const dodgeX = Math.max(70, Math.min(570, actorStartX - direction * 38));
        keyframe(actorEntity, "transform.x", contact, dodgeX, "easeOut");
        actorPos.x = dodgeX;
      }
      poseAt(actor, recover, "combat_guard", "easeOut");
      return;
    }

    const phases = phasesForMove(beat.move);
    const strikePoint = strikePointForPose(phases.contact, phases.strikeBone);
    const bodySurface = 8.5 * (fighterWidth / RIG_VIEWBOX.width);
    const targetSurfaceX = targetStartX - direction * bodySurface;
    const strikeOffsetX = strikePoint.x * (fighterWidth / RIG_VIEWBOX.width) * direction;
    const attackX = targetSurfaceX - strikeOffsetX;
    const actorContactY = beat.move === "airAttack" ? baseline - 8 : baseline;
    const contactPoint = localPointToStage(strikePoint, attackX, actorContactY, direction);
    const didHit = beat.outcome === "hit";

    const strikeTimes = beat.move === "barrage" ? [contact, contact + 2 / 24, contact + 4 / 24] : [contact];
    for (const strikeTime of strikeTimes) {
      contacts.push({ beatId: beat.id, time: strikeTime, actorId: actor, targetId: target, x: contactPoint.x, y: contactPoint.y, strikeBone: phases.strikeBone });
    }

    keyframe(actorEntity, "transform.x", beat.start, actorStartX, "none");
    keyframe(actorEntity, "transform.x", windupEnd, actorStartX + (attackX - actorStartX) * 0.16, "easeIn");
    keyframe(actorEntity, "transform.x", contact, attackX, beat.move === "dash" || beat.move === "barrage" || beat.move === "counter" ? "easeIn" : "easeInOut");
    keyframe(actorEntity, "transform.x", holdEnd, attackX, "none");
    poseAt(actor, beat.start, phases.windup, "none");
    poseAt(actor, contact, phases.contact, "easeIn");
    poseAt(actor, holdEnd, phases.contact, "none");
    poseAt(actor, follow, phases.follow, "easeOut");
    poseAt(actor, recover, "combat_guard", "easeOut");

    const followX = Math.max(70, Math.min(570, attackX + direction * (6 + strength * 8)));
    const recoveryX = Math.max(70, Math.min(570, attackX - direction * (18 + strength * 9)));
    keyframe(actorEntity, "transform.x", follow, followX, "easeOut");
    keyframe(actorEntity, "transform.x", recover, recoveryX, "easeInOut");
    actorPos.x = recoveryX;

    if (beat.move === "barrage") {
      for (const strikeTime of strikeTimes.slice(1)) {
        poseAt(actor, strikeTime - 1 / 24, "combat_jab_retract", "none");
        poseAt(actor, strikeTime, "combat_jab_contact", "none");
        keyframe(actorEntity, "transform.x", strikeTime, attackX, "none");
      }
    }

    if (beat.move === "airAttack") {
      keyframe(actorEntity, "transform.y", windupEnd, baseline - 34, "easeOut");
      keyframe(actorEntity, "transform.y", contact, baseline - 8, "easeIn");
      keyframe(actorEntity, "transform.y", recover, baseline, "easeIn");
    }

    if (didHit) {
      const displacement = 24 + strength * 58;
      const nextTargetX = Math.max(70, Math.min(570, targetStartX + direction * displacement));
      keyframe(targetEntity, "transform.x", contact, targetStartX, "none");
      keyframe(targetEntity, "transform.x", holdEnd, targetStartX, "none");
      keyframe(targetEntity, "transform.x", recover, nextTargetX, "easeOut");
      poseAt(target, contact, "combat_guard", "none");
      poseAt(target, holdEnd, beat.move === "finisher" || beat.move === "knockdown" || beat.move === "sweep" ? "combat_fall" : "combat_hit", "none");
      poseAt(target, recover, beat.move === "finisher" || beat.move === "throw" ? "combat_fall" : "combat_guard", "easeOut");
      targetPos.x = nextTargetX;

      if (beat.move === "throw") {
        const throwApex = holdEnd + (recover - holdEnd) * 0.48;
        keyframe(targetEntity, "transform.x", throwApex, attackX + direction * 34, "easeOut");
        keyframe(targetEntity, "transform.y", holdEnd, baseline, "none");
        keyframe(targetEntity, "transform.y", throwApex, baseline - 52, "easeOut");
        keyframe(targetEntity, "transform.y", recover, baseline, "easeIn");
        keyframe(targetEntity, "transform.rotation", holdEnd, 0, "none");
        keyframe(targetEntity, "transform.rotation", throwApex, direction * 112, "easeOut");
        keyframe(targetEntity, "transform.rotation", recover, direction * 164, "easeIn");
      } else if (["launch", "airAttack", "finisher"].includes(beat.move)) {
        const lift = 38 + strength * 64;
        const apex = holdEnd + (recover - holdEnd) * 0.46;
        keyframe(targetEntity, "transform.y", holdEnd, baseline, "none");
        keyframe(targetEntity, "transform.y", apex, baseline - lift, "easeOut");
        keyframe(targetEntity, "transform.y", recover, baseline, "easeIn");
        keyframe(targetEntity, "transform.rotation", holdEnd, 0, "none");
        keyframe(targetEntity, "transform.rotation", apex, direction * (28 + strength * 48), "easeOut");
        keyframe(targetEntity, "transform.rotation", recover, beat.move === "finisher" ? direction * 92 : 0, "easeIn");
      } else if (beat.move === "sweep") {
        keyframe(targetEntity, "transform.rotation", holdEnd, 0, "none");
        keyframe(targetEntity, "transform.rotation", recover, direction * 76, "easeOut");
      }
    } else if (beat.outcome === "block") {
      poseAt(target, windupEnd, "combat_block", "easeOut");
      poseAt(target, holdEnd, "combat_block", "none");
      poseAt(target, recover, "combat_guard", "easeOut");
      keyframe(targetEntity, "transform.x", contact, targetStartX, "none");
      keyframe(targetEntity, "transform.x", follow, targetStartX + direction * 10, "easeOut");
      keyframe(targetEntity, "transform.x", recover, targetStartX + direction * 5, "easeIn");
      targetPos.x += direction * 5;
    } else if (beat.outcome === "dodge") {
      poseAt(target, windupEnd, "combat_dodge", "easeOut");
      poseAt(target, recover, "combat_guard", "easeOut");
      keyframe(targetEntity, "transform.x", contact, targetStartX + direction * 42, "easeOut");
      keyframe(targetEntity, "transform.x", recover, targetStartX + direction * 24, "easeIn");
      targetPos.x += direction * 24;
    }

    const color = request.fighters.find((fighter) => fighter.id === actor)!.color;
    const fastMove = beat.move === "dash" || beat.move === "barrage" || beat.move === "airAttack" || beat.move === "counter";
    if (fastMove) {
      effects.push({ id: id(), type: "effect", name: "Speed trail", layerId: effectsLayer, effect: "speedTrail", color,
        transform: { x: (actorStartX + attackX) / 2, y: baseline - 76, rotation: 0, scaleX: direction, scaleY: 1 }, width: Math.max(120, Math.abs(attackX - actorStartX)), height: 76,
        opacity: 0.78, intensity: strength, sourceEntityId: actorEntity, startTime: windupEnd, endTime: contact + 0.06 });
      effects.push({ id: id(), type: "effect", name: "Afterimage", layerId: effectsLayer, effect: "afterimage", color,
        transform: { x: attackX - direction * 48, y: baseline, rotation: 0, scaleX: direction, scaleY: 1 }, width: fighterWidth, height: fighterHeight,
        opacity: 0.3, intensity: strength, sourceEntityId: actorEntity, startTime: contact - 0.14, endTime: contact + 0.1 });
    }
    if (Math.abs(attackX - actorStartX) > 55 || strength > 0.72) {
      effects.push({ id: id(), type: "effect", name: "Foot dust", layerId: effectsLayer, effect: "dust", color: "#9CA3AF",
        transform: { x: actorStartX, y: 299, rotation: 0, scaleX: direction, scaleY: 1 }, width: 54, height: 20,
        opacity: 0.42, intensity: strength, startTime: windupEnd, endTime: windupEnd + 0.22 });
    }
    if (didHit) {
      for (const [strikeIndex, strikeTime] of strikeTimes.entries()) {
        effects.push({ id: id(), type: "effect", name: "Impact", layerId: effectsLayer, effect: "impactBurst", color: "#F8D34F",
          transform: { x: contactPoint.x, y: contactPoint.y + (strikeIndex % 2 === 0 ? 0 : 10), rotation: 0, scaleX: 1, scaleY: 1 }, width: 48 + strength * 48,
          height: 48 + strength * 48, opacity: 1, intensity: strength, startTime: strikeTime, endTime: strikeTime + 0.16 });
      }
      if (strength > 0.78) effects.push({ id: id(), type: "effect", name: "Contact flash", layerId: effectsLayer, effect: "screenFlash", color: "#FFFFFF",
        transform: { x: 320, y: 180, rotation: 0, scaleX: 1, scaleY: 1 }, width: 640, height: 360, opacity: 0.36,
        intensity: strength, startTime: contact, endTime: contact + 1 / 24 });
    }

    audioTracks.push({ id: id(), name: "whoosh", url: wavDataUrl("whoosh", request.seed + index * 2), category: "sfx", volume: 0.5 + strength * 0.18,
      startTime: Math.max(0, contact - 0.11), duration: 0.18, pan: direction * 0.2 });
    if (didHit) {
      const impactKind = strength > 0.7 ? "heavy-impact" : "impact";
      for (const [strikeIndex, strikeTime] of strikeTimes.entries()) {
        audioTracks.push({ id: id(), name: impactKind, url: wavDataUrl(impactKind, request.seed + index * 7 + strikeIndex + 1), category: "sfx", volume: 0.72 + strength * 0.2,
          startTime: strikeTime, duration: strength > 0.7 ? 0.32 : 0.18, pan: direction * 0.16 });
      }
    }
  });

  const resolvedWinner = request.winner === "auto" ? plan.beats.at(-1)?.actorId ?? "fighterA" : request.winner;
  if (resolvedWinner !== "draw") {
    poseAt(resolvedWinner, duration - 1.2, "combat_victory", "easeOut");
    poseAt(resolvedWinner === "fighterA" ? "fighterB" : "fighterA", duration - 1.2, "combat_fall", "easeOut");
  }
  for (const track of tracks.values()) track.keyframes.sort((a, b) => a.time - b.time);

  return {
    version: 2,
    sceneMode: "combat",
    stage: { width: 640, height: 360, backgroundColor: "#FFFFFF" },
    layers: [
      { id: charactersLayer, name: "Combatants", order: 1, visible: true, locked: false },
      { id: effectsLayer, name: "Combat Effects", order: 2, visible: true, locked: false },
    ],
    entities: [
      { id: fighterAId, type: "rig", name: request.fighters[0].name, layerId: charactersLayer, rigId: "combat-vector-v2", pose: "combat_guard",
        transform: { x: 185, y: baseline, rotation: 0, scaleX: 1, scaleY: 1 }, width: fighterWidth, height: fighterHeight,
        startTime: 0, endTime: duration, style: { strokeColor: request.fighters[0].color, strokeWidth: 1 } },
      { id: fighterBId, type: "rig", name: request.fighters[1].name, layerId: charactersLayer, rigId: "combat-vector-v2", pose: "combat_guard",
        transform: { x: 455, y: baseline, rotation: 0, scaleX: -1, scaleY: 1 }, width: fighterWidth, height: fighterHeight,
        startTime: 0, endTime: duration, style: { strokeColor: request.fighters[1].color, strokeWidth: 1 } },
      ...effects,
    ],
    timeline: { duration, fps: 24, tracks: [...tracks.values()] },
    audioTracks,
    voiceTracks: [],
    combat: { sourcePrompt: request.prompt, seed: request.seed, duration, intensity: request.intensity, winner: request.winner,
      moveCallouts: false, plan, contacts },
  };
}
