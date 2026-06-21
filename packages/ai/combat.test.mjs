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

test("rejects unsupported durations", () => {
  assert.equal(combatGenerationRequestSchema.safeParse({ ...requestFor(20), duration: 9 }).success, false);
  assert.equal(combatGenerationRequestSchema.safeParse({ ...requestFor(20), duration: 31 }).success, false);
});
