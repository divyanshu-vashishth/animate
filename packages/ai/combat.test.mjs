import test from "node:test";
import assert from "node:assert/strict";
import { combatGenerationRequestSchema, compileCombatPlan, createFallbackCombatPlan } from "./dist/index.js";
import { RIG_VIEWBOX, resolveRigGeometry } from "../shared/dist/index.js";

const requestFor = (duration = 20, overrides = {}) => combatGenerationRequestSchema.parse({
  prompt: "Strength fights Speed in a clean arena", duration, intensity: "cinematic", winner: "fighterB",
  moveCallouts: true, seed: 4242,
  fighters: [{ id: "fighterA", name: "Strength", color: "#C62828" }, { id: "fighterB", name: "Speed", color: "#3949AB" }],
  ...overrides,
});

for (const duration of [10, 20, 30]) {
  test(`compiles a deterministic ${duration}s combat document`, () => {
    const request = requestFor(duration);
    const plan = createFallbackCombatPlan(request);
    const first = compileCombatPlan(request, plan);
    assert.deepEqual(first, compileCombatPlan(request, plan));
    assert.equal(first.version, 2);
    assert.equal(first.sceneMode, "combat");
    assert.deepEqual(first.stage, { width: 640, height: 360, backgroundColor: "#FFFFFF" });
    assert.equal(first.timeline?.duration, duration);
    assert.equal(first.timeline?.fps, 24);
    assert.equal(first.entities.filter((entity) => entity.type === "rig").length, 2);
    assert.ok(first.entities.some((entity) => entity.type === "effect" && entity.effect === "impactBurst"));
    assert.ok(first.audioTracks?.every((track) => track.url.startsWith("data:audio/wav;base64,")));
    assert.ok(first.timeline?.tracks.every((track) => track.keyframes.every((keyframe) => keyframe.time >= 0 && keyframe.time <= duration)));
  });
}

test("combat remains voice-free even when an older client requests callouts", () => {
  const request = requestFor(20, { moveCallouts: true });
  const document = compileCombatPlan(request, createFallbackCombatPlan(request));
  assert.equal(document.voiceTracks?.length, 0);
  assert.ok((document.audioTracks?.length ?? 0) > 0);
});

test("hit frames place the striking hand or foot on the target body before recoil", () => {
  const request = requestFor(20);
  const plan = createFallbackCombatPlan(request);
  const document = compileCombatPlan(request, plan);
  const fighters = document.entities.filter((entity) => entity.type === "rig");
  const fighterByPlanId = { fighterA: fighters[0], fighterB: fighters[1] };
  const latestValue = (entityId, property, time, fallback) => {
    const track = document.timeline.tracks.find((candidate) => candidate.entityId === entityId && candidate.property === property);
    return track?.keyframes.filter((keyframe) => keyframe.time <= time + 1e-9).at(-1)?.value ?? fallback;
  };

  for (const contact of document.combat.contacts) {
    const beat = plan.beats.find((candidate) => candidate.id === contact.beatId);
    if (beat?.outcome !== "hit") continue;
    const actor = fighterByPlanId[contact.actorId];
    const target = fighterByPlanId[contact.targetId];
    const actorX = latestValue(actor.id, "transform.x", contact.time, actor.transform.x);
    const actorY = latestValue(actor.id, "transform.y", contact.time, actor.transform.y);
    const facing = latestValue(actor.id, "transform.scaleX", contact.time, actor.transform.scaleX);
    const pose = latestValue(actor.id, "rig.pose", contact.time, actor.pose);
    const strike = resolveRigGeometry(pose).segments.find((segment) => segment.boneId === contact.strikeBone).end;
    const handX = actorX + strike.x * (actor.width / RIG_VIEWBOX.width) * facing;
    const handY = actorY - actor.height + (strike.y - RIG_VIEWBOX.y) * (actor.height / RIG_VIEWBOX.height);
    assert.ok(Math.abs(handX - contact.x) < 0.001, `${contact.beatId} strike x missed contact`);
    assert.ok(Math.abs(handY - contact.y) < 0.001, `${contact.beatId} strike y missed contact`);

    const targetX = latestValue(target.id, "transform.x", contact.time, target.transform.x);
    const expectedSurface = 8.5 * (actor.width / RIG_VIEWBOX.width);
    assert.ok(Math.abs(Math.abs(targetX - contact.x) - expectedSurface) < 0.001, `${contact.beatId} did not touch the target body`);
    assert.ok(document.entities.some((entity) => entity.type === "effect" && entity.effect === "impactBurst" && Math.abs(entity.startTime - contact.time) < 0.001 && Math.abs(entity.transform.x - contact.x) < 0.001));
    assert.ok(document.audioTracks.some((track) => track.name.includes("impact") && Math.abs(track.startTime - contact.time) < 0.001));
  }
});

test("intensity deterministically scales combat effects", () => {
  const groundedRequest = requestFor(20, { intensity: "grounded" });
  const extremeRequest = requestFor(20, { intensity: "extreme" });
  const plan = createFallbackCombatPlan(groundedRequest);
  const grounded = compileCombatPlan(groundedRequest, plan);
  const extreme = compileCombatPlan(extremeRequest, plan);
  const maxEffectIntensity = (document) => Math.max(...document.entities.filter((entity) => entity.type === "effect").map((entity) => entity.intensity));
  assert.ok(maxEffectIntensity(extreme) > maxEffectIntensity(grounded));
});

test("offensive moves use authored anticipation, drive, contact, recoil, and recovery poses", () => {
  const request = requestFor(20);
  const plan = createFallbackCombatPlan(request);
  const document = compileCombatPlan(request, plan);
  const fighters = document.entities.filter((entity) => entity.type === "rig");
  const fighterByPlanId = { fighterA: fighters[0], fighterB: fighters[1] };
  const defensive = new Set(["block", "dodge", "recover"]);

  for (const beat of plan.beats.filter((candidate) => !defensive.has(candidate.move))) {
    const actor = fighterByPlanId[beat.actorId];
    const poseTrack = document.timeline.tracks.find((track) => track.entityId === actor.id && track.property === "rig.pose");
    const boneTracks = document.timeline.tracks.filter((track) => track.entityId === actor.id && track.property.startsWith("rig.bones."));
    const poses = poseTrack.keyframes
      .filter((keyframe) => keyframe.time >= beat.start - 1e-9 && keyframe.time <= beat.start + beat.duration + 1e-9)
      .map((keyframe) => keyframe.value);
    assert.ok(new Set(poses).size >= 5, `${beat.id} ${beat.move} did not contain a complete authored motion`);
    assert.ok(
      boneTracks.every((track) =>
        track.keyframes
          .filter((keyframe) => keyframe.time >= beat.start - 1e-9 && keyframe.time <= beat.start + beat.duration + 1e-9)
          .every((keyframe) => keyframe.easing !== "none")
      ),
      `${beat.id} ${beat.move} contains a snapping joint keyframe`
    );
  }

  const kick = plan.beats.find((beat) => beat.move === "kick");
  assert.ok(kick, "fallback choreography should contain a kick");
  const kickActor = fighterByPlanId[kick.actorId];
  const kickPoses = document.timeline.tracks
    .find((track) => track.entityId === kickActor.id && track.property === "rig.pose")
    .keyframes.filter((keyframe) => keyframe.time >= kick.start && keyframe.time <= kick.start + kick.duration)
    .map((keyframe) => keyframe.value);
  const order = ["combat_kick_load", "combat_kick_chamber", "combat_kick_extend", "combat_kick_contact", "combat_kick_follow", "combat_kick_plant"];
  let previous = -1;
  for (const pose of order) {
    const at = kickPoses.indexOf(pose);
    assert.ok(at > previous, `kick is missing ordered pose ${pose}`);
    previous = at;
  }
});

test("knockdown rotation is bounded and reset before every new beat", () => {
  const request = requestFor(20);
  const plan = createFallbackCombatPlan(request);
  const document = compileCombatPlan(request, plan);
  const fighters = document.entities.filter((entity) => entity.type === "rig");
  for (const fighter of fighters) {
    const rotationTrack = document.timeline.tracks.find((track) => track.entityId === fighter.id && track.property === "transform.rotation");
    assert.ok(rotationTrack.keyframes.every((keyframe) => Math.abs(keyframe.value) <= 45), "whole-body reaction rotation became anatomically unstable");
  }
  for (const beat of plan.beats) {
    for (const fighter of fighters) {
      const rotationTrack = document.timeline.tracks.find((track) => track.entityId === fighter.id && track.property === "transform.rotation");
      assert.ok(rotationTrack.keyframes.some((keyframe) => Math.abs(keyframe.time - beat.start) < 0.001 && keyframe.value === 0));
    }
  }
});

test("rejects unsupported durations", () => {
  assert.equal(combatGenerationRequestSchema.safeParse({ ...requestFor(20), duration: 9 }).success, false);
  assert.equal(combatGenerationRequestSchema.safeParse({ ...requestFor(20), duration: 31 }).success, false);
});
