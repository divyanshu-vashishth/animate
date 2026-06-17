import gsap from "gsap";
import type { EvaluatedProperty } from "@stickman/timeline";
import type { FaceState, MouthShape } from "@stickman/shared";
import type { PixiRenderer } from "../renderer/pixi-renderer.js";
import type { World } from "../ecs/world.js";

export class GsapBridge {
  private activeTweens = new Map<string, gsap.core.Tween>();

  constructor(
    private world: World,
    private renderer: PixiRenderer
  ) {}

  killAll(): void {
    for (const tween of this.activeTweens.values()) {
      tween.kill();
    }
    this.activeTweens.clear();
  }

  applyEvaluated(props: EvaluatedProperty[]): void {
    for (const prop of props) {
      const entityId = this.world.getEntityByUuid(prop.entityId);
      if (entityId === undefined) continue;

      if (prop.property === "transform.x" && typeof prop.value === "number") {
        const t = this.world.getComponent(entityId, "transform");
        if (t) t.x = prop.value;
      } else if (prop.property === "transform.y" && typeof prop.value === "number") {
        const t = this.world.getComponent(entityId, "transform");
        if (t) t.y = prop.value;
      } else if (prop.property === "transform.rotation" && typeof prop.value === "number") {
        const t = this.world.getComponent(entityId, "transform");
        if (t) t.rotation = prop.value;
      } else if (prop.property === "spriteAnimation.clip" && typeof prop.value === "string") {
        const anim = this.world.getComponent(entityId, "spriteAnimation");
        if (anim) {
          anim.clip = prop.value;
          anim.currentFrame = 0;
          anim.elapsed = 0;
          anim.playing = true;
        }
      } else if (prop.property === "rig.pose" && typeof prop.value === "string") {
        const rig = this.world.getComponent(entityId, "rig");
        if (rig) rig.pose = prop.value;
      } else if (prop.property === "rig.face" && typeof prop.value === "string") {
        const rig = this.world.getComponent(entityId, "rig");
        if (rig) rig.face = prop.value as FaceState;
      } else if (prop.property === "rig.mouth" && typeof prop.value === "string") {
        const rig = this.world.getComponent(entityId, "rig");
        if (rig) rig.mouth = prop.value as MouthShape;
      } else if (prop.property.startsWith("rig.bones.") && typeof prop.value === "number") {
        const rig = this.world.getComponent(entityId, "rig");
        const boneId = prop.property.replace("rig.bones.", "");
        if (rig) rig.boneRotations[boneId] = prop.value;
      }
    }
  }

  tweenProperty(
    entityUuid: string,
    property: string,
    toValue: number,
    duration: number
  ): void {
    const entityId = this.world.getEntityByUuid(entityUuid);
    if (entityId === undefined) return;
    const key = `${entityUuid}:${property}`;
    this.activeTweens.get(key)?.kill();

    const transform = this.world.getComponent(entityId, "transform");
    if (!transform) return;

    const target: Record<string, number> = {};
    if (property === "transform.x") target.x = toValue;
    else if (property === "transform.y") target.y = toValue;
    else if (property === "transform.rotation") target.rotation = toValue;
    else return;

    const tween = gsap.to(transform, {
      ...target,
      duration,
      ease: "power2.inOut",
      onUpdate: () => {},
    });
    this.activeTweens.set(key, tween);
  }
}
