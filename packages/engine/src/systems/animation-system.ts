import type { PixiRenderer } from "../renderer/pixi-renderer.js";
import type { World } from "../ecs/world.js";

export class AnimationSystem {
  constructor(
    private world: World,
    private renderer: PixiRenderer
  ) {}

  update(dt: number): void {
    const entities = this.world.query("spriteAnimation", "render");
    for (const id of entities) {
      const anim = this.world.getComponent(id, "spriteAnimation")!;
      const render = this.world.getComponent(id, "render")!;
      if (!anim.playing) continue;

      const clipInfo = this.renderer.getClipInfo(anim.clip);
      if (!clipInfo || clipInfo.frames.length === 0) continue;

      anim.elapsed += dt;
      const frameDuration = 1 / clipInfo.fps;
      while (anim.elapsed >= frameDuration) {
        anim.elapsed -= frameDuration;
        anim.currentFrame++;
        if (anim.currentFrame >= clipInfo.frames.length) {
          if (anim.loop) {
            anim.currentFrame = 0;
          } else {
            anim.currentFrame = clipInfo.frames.length - 1;
            anim.playing = false;
          }
        }
      }

      const frameName = clipInfo.frames[anim.currentFrame]!;
      const display = this.renderer.getDisplay(render.displayObjectId);
      if (display?.sprite) {
        void this.renderer.getTexture(clipInfo.folder, frameName).then((tex) => {
          if (display.sprite) display.sprite.texture = tex;
        });
      }
    }
  }
}
