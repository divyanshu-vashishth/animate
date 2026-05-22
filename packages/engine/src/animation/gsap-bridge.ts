import gsap from "gsap";
import type { EvaluatedProperty } from "@stickman/timeline";
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
