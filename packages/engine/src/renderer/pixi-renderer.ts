import { Application, Assets, Container, Sprite, Texture } from "pixi.js";
import type { SpriteManifest } from "@stickman/shared";
import { spriteUrl } from "@stickman/shared";

export interface DisplayObjectEntry {
  container: Container;
  sprite?: Sprite;
}

export class PixiRenderer {
  app: Application;
  stageRoot: Container;
  layerContainers = new Map<string, Container>();
  displayObjects = new Map<string, DisplayObjectEntry>();
  private textureCache = new Map<string, Texture>();
  private initialized = false;

  constructor(
    public width: number,
    public height: number,
    private manifest: SpriteManifest
  ) {
    this.app = new Application();
    this.stageRoot = new Container();
  }

  async init(canvas: HTMLCanvasElement): Promise<void> {
    await this.app.init({
      canvas,
      width: this.width,
      height: this.height,
      backgroundColor: 0x171717,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    this.app.stage.addChild(this.stageRoot);
    this.stageRoot.sortableChildren = true;
    this.initialized = true;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.app.renderer.resize(width, height);
  }

  ensureLayer(layerId: string, order: number): Container {
    let layer = this.layerContainers.get(layerId);
    if (!layer) {
      layer = new Container();
      layer.label = layerId;
      layer.zIndex = order;
      this.layerContainers.set(layerId, layer);
      this.stageRoot.addChild(layer);
      this.stageRoot.sortChildren();
    }
    layer.zIndex = order;
    this.stageRoot.sortChildren();
    return layer;
  }

  removeLayer(layerId: string): void {
    const layer = this.layerContainers.get(layerId);
    if (layer) {
      this.stageRoot.removeChild(layer);
      layer.destroy({ children: true });
      this.layerContainers.delete(layerId);
    }
  }

  async getTexture(folder: string, filename: string): Promise<Texture> {
    const key = `${folder}/${filename}`;
    let tex = this.textureCache.get(key);
    if (!tex) {
      const url = spriteUrl(folder, filename);
      tex = await Assets.load<Texture>(url);
      this.textureCache.set(key, tex);
    }
    return tex;
  }

  async createSpriteDisplay(
    id: string,
    layerId: string,
    folder: string,
    filename: string
  ): Promise<DisplayObjectEntry> {
    const layer = this.layerContainers.get(layerId);
    if (!layer) throw new Error(`Layer ${layerId} not found`);

    const container = new Container();
    container.label = id;
    const tex = await this.getTexture(folder, filename);
    const sprite = new Sprite(tex);
    sprite.anchor.set(0.5, 1);
    container.addChild(sprite);

    const entry: DisplayObjectEntry = { container, sprite };
    this.displayObjects.set(id, entry);
    layer.addChild(container);
    return entry;
  }

  createRigDisplay(id: string, layerId: string): DisplayObjectEntry {
    const layer = this.layerContainers.get(layerId);
    if (!layer) throw new Error(`Layer ${layerId} not found`);
    const container = new Container();
    container.label = id;
    const entry: DisplayObjectEntry = { container };
    this.displayObjects.set(id, entry);
    layer.addChild(container);
    return entry;
  }

  getDisplay(id: string): DisplayObjectEntry | undefined {
    return this.displayObjects.get(id);
  }

  removeDisplay(id: string): void {
    const entry = this.displayObjects.get(id);
    if (entry) {
      entry.container.parent?.removeChild(entry.container);
      entry.container.destroy({ children: true });
      this.displayObjects.delete(id);
    }
  }

  getClipInfo(clip: string): { folder: string; frames: string[]; fps: number } | null {
    if (clip.startsWith("extras/")) {
      const parts = clip.split("/");
      const filename = parts[parts.length - 1];
      if (!filename) return null;
      return { folder: "Extras", frames: [filename], fps: 1 };
    }
    const [character, action] = clip.split("/");
    if (!character || !action) return null;
    const charData = this.manifest.characters[character];
    if (!charData) return null;
    const clipData = charData[action];
    if (!clipData) return null;
    return { folder: clipData.folder, frames: clipData.frames, fps: clipData.fps };
  }

  render(): void {
    this.app.render();
  }

  destroy(): void {
    if (!this.initialized) return;
    this.initialized = false;
    try {
      this.app.destroy(true);
    } catch {
      // App may be partially torn down (e.g. React Strict Mode double unmount)
    }
    this.textureCache.clear();
    this.displayObjects.clear();
    this.layerContainers.clear();
  }

  async captureFrame(): Promise<Blob> {
    const canvas = this.app.canvas as HTMLCanvasElement;
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to capture frame"));
      }, "image/png");
    });
  }
}
