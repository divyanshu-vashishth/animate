import type { PixiRenderer } from "../renderer/pixi-renderer.js";
import type { World } from "../ecs/world.js";

export class RenderSystem {
  constructor(
    private world: World,
    private renderer: PixiRenderer
  ) {}

  sync(): void {
    const entities = this.world.query("transform", "render");
    for (const id of entities) {
      const transform = this.world.getComponent(id, "transform")!;
      const render = this.world.getComponent(id, "render")!;
      const display = this.renderer.getDisplay(render.displayObjectId);
      if (!display) continue;

      display.container.x = transform.x;
      display.container.y = transform.y;
      display.container.rotation = transform.rotation;
      display.container.scale.set(transform.scaleX, transform.scaleY);

      const layerMeta = this.world.getComponent(id, "layerMeta");
      if (layerMeta) {
        display.container.visible = layerMeta.visible;
        display.container.alpha = layerMeta.locked ? 0.6 : 1;
      }

      const selectable = this.world.getComponent(id, "selectable");
      if (selectable?.selected && display.sprite) {
        display.sprite.tint = 0xaaccff;
      } else if (display.sprite) {
        display.sprite.tint = 0xffffff;
      }
    }
  }
}
