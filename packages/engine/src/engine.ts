import type {
  EditorCommand,
  FaceState,
  MouthShape,
  ProjectDocument,
  SpriteManifest,
  TimelineData,
} from "@stickman/shared";
import { createDefaultDocument, createDefaultTimeline } from "@stickman/shared";
import { TimelinePlayer, evaluateTimeline, getOrCreateTrack } from "@stickman/timeline";
import { World } from "./ecs/world.js";
import { PixiRenderer } from "./renderer/pixi-renderer.js";
import { AnimationSystem } from "./systems/animation-system.js";
import { RenderSystem } from "./systems/render-system.js";
import { CameraSystem } from "./systems/camera-system.js";
import { GameLoop } from "./runtime/game-loop.js";
import { GsapBridge } from "./animation/gsap-bridge.js";
import { StickmanRigRenderer } from "./rig/stickman-rig.js";

export type EngineEventMap = {
  selectionChange: (entityId: string | null) => void;
  documentChange: (doc: ProjectDocument) => void;
  timelineTime: (time: number) => void;
};

type EngineListener<K extends keyof EngineEventMap> = EngineEventMap[K];

export class AnimationEngine {
  world = new World();
  renderer: PixiRenderer;
  camera: CameraSystem;
  private animationSystem: AnimationSystem;
  private renderSystem: RenderSystem;
  private gsapBridge: GsapBridge;
  private rigRenderer = new StickmanRigRenderer();
  private gameLoop: GameLoop;
  private timelinePlayer: TimelinePlayer | null = null;
  private document: ProjectDocument = createDefaultDocument();
  private selectedEntityId: string | null = null;
  private listeners = new Map<keyof EngineEventMap, Set<EngineListener<keyof EngineEventMap>>>();

  constructor(
    manifest: SpriteManifest,
    width = 1920,
    height = 1080
  ) {
    this.renderer = new PixiRenderer(width, height, manifest);
    this.camera = new CameraSystem(this.renderer);
    this.animationSystem = new AnimationSystem(this.world, this.renderer);
    this.renderSystem = new RenderSystem(this.world, this.renderer);
    this.gsapBridge = new GsapBridge(this.world, this.renderer);
    this.gameLoop = new GameLoop(
      (dt) => this.update(dt),
      () => this.render()
    );
  }

  async init(canvas: HTMLCanvasElement): Promise<void> {
    await this.renderer.init(canvas);
    await this.loadDocument(this.document);
    this.gameLoop.start();
  }

  on<K extends keyof EngineEventMap>(event: K, fn: EngineEventMap[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(fn as EngineListener<keyof EngineEventMap>);
  }

  private emit<K extends keyof EngineEventMap>(event: K, ...args: Parameters<EngineEventMap[K]>): void {
    for (const fn of this.listeners.get(event) ?? []) {
      (fn as (...a: unknown[]) => void)(...args);
    }
  }

  dispatch(command: EditorCommand): void {
    switch (command.type) {
      case "LoadDocument":
        void this.loadDocument(command.document);
        return;
      case "AddEntity":
        void this.addSpriteEntity(command.clip, command.layerId, command.x, command.y, command.name);
        break;
      case "AddRigEntity":
        void this.addRigEntity(command.rigId, command.layerId, command.x, command.y, command.name);
        break;
      case "RemoveEntity":
        this.removeEntity(command.entityId);
        break;
      case "MoveEntity":
        this.moveEntity(command.entityId, command.x, command.y);
        break;
      case "SetEntityTransform":
        this.setTransform(command.entityId, command.transform);
        break;
      case "SelectEntity":
        this.selectEntity(command.entityId);
        break;
      case "SetLayerVisibility":
        this.setLayerVisibility(command.layerId, command.visible);
        break;
      case "SetLayerLocked":
        this.setLayerLocked(command.layerId, command.locked);
        break;
      case "AddLayer":
        this.addLayer(command.name);
        break;
      case "RemoveLayer":
        this.removeLayer(command.layerId);
        break;
      case "ReorderLayer":
        this.reorderLayer(command.layerId, command.order);
        break;
      case "SetEntityClip":
      case "PlayClip":
        this.setEntityClip(command.entityId, command.clip, command.type === "PlayClip");
        break;
      case "SetPlayback":
        if (command.playing) this.timelinePlayer?.play();
        else this.timelinePlayer?.pause();
        break;
      case "SeekTimeline":
        this.gsapBridge.killAll();
        this.timelinePlayer?.seek(command.time);
        break;
      case "AddKeyframe":
        this.addKeyframe(command.trackId, command.time, command.value);
        break;
      case "MoveKeyframe":
        this.moveKeyframe(command.trackId, command.keyframeId, command.time);
        break;
      case "CameraPan":
        this.camera.pan(command.dx, command.dy);
        break;
      case "CameraZoom":
        this.camera.setZoom(command.scale);
        break;
      case "ConvertToRig":
        void this.convertToRig(command.entityId);
        break;
      case "SetEntityPose":
        this.setEntityPose(command.entityId, command.pose);
        break;
      case "SetRigFace":
        this.setRigFace(command.entityId, command.face);
        break;
      case "SetRigMouth":
        this.setRigMouth(command.entityId, command.mouth);
        break;
      case "SetBoneRotation":
        this.setBoneRotation(command.entityId, command.boneId, command.rotation);
        break;
    }
    this.emitDocumentChange();
  }

  getDocument(): ProjectDocument {
    return structuredClone(this.document);
  }

  getSelectedEntityId(): string | null {
    return this.selectedEntityId;
  }

  hitTest(screenX: number, screenY: number): string | null {
    const world = this.camera.screenToWorld(screenX, screenY);
    const entities = this.world.query("transform", "render");
    for (let i = entities.length - 1; i >= 0; i--) {
      const id = entities[i]!;
      const transform = this.world.getComponent(id, "transform")!;
      const render = this.world.getComponent(id, "render")!;
      const display = this.renderer.getDisplay(render.displayObjectId);
      if (!display) continue;
      const bounds = display.container.getBounds();
      if (
        world.x >= bounds.x &&
        world.x <= bounds.x + bounds.width &&
        world.y >= bounds.y &&
        world.y <= bounds.y + bounds.height
      ) {
        return this.world.getUuid(id) ?? null;
      }
    }
    return null;
  }

  private async loadDocument(doc: ProjectDocument): Promise<void> {
    this.document = structuredClone(doc);
    if (!this.document.timeline) {
      this.document.timeline = createDefaultTimeline();
    }

    for (const id of [...this.world.getAllEntities()]) {
      const render = this.world.getComponent(id, "render");
      if (render) this.renderer.removeDisplay(render.displayObjectId);
      this.world.destroyEntity(id);
    }
    for (const layerId of [...this.renderer.layerContainers.keys()]) {
      this.renderer.removeLayer(layerId);
    }

    for (const layer of [...this.document.layers].sort((a, b) => a.order - b.order)) {
      this.renderer.ensureLayer(layer.id, layer.order);
    }

    for (const entity of this.document.entities) {
      if (entity.type === "sprite") {
        await this.addSpriteEntity(
          entity.clip,
          entity.layerId,
          entity.transform.x,
          entity.transform.y,
          entity.name,
          entity.id
        );
        const eid = this.world.getEntityByUuid(entity.id);
        if (eid !== undefined) {
          const t = this.world.getComponent(eid, "transform")!;
          Object.assign(t, entity.transform);
          if (entity.playing) {
            const anim = this.world.getComponent(eid, "spriteAnimation");
            if (anim) anim.playing = true;
          }
        }
      } else if (entity.type === "rig") {
        await this.addRigEntity(
          entity.rigId,
          entity.layerId,
          entity.transform.x,
          entity.transform.y,
          entity.name,
          entity.id
        );
        const eid = this.world.getEntityByUuid(entity.id);
        if (eid !== undefined) {
          const rig = this.world.getComponent(eid, "rig");
          if (rig) {
            rig.pose = entity.pose;
            rig.boneRotations = entity.boneRotations ?? {};
            rig.face = entity.face;
            rig.mouth = entity.mouth;
          }
          const render = this.world.getComponent(eid, "render");
          const display = render ? this.renderer.getDisplay(render.displayObjectId) : undefined;
          if (display) {
            this.rigRenderer.applyPose(
              display.container,
              rig?.pose ?? entity.pose,
              rig?.boneRotations ?? entity.boneRotations ?? {},
              rig?.face ?? entity.face,
              rig?.mouth ?? entity.mouth
            );
          }
        }
      }
    }

    this.initTimelinePlayer();
    this.renderSystem.sync();
  }

  async captureFrame(): Promise<Blob> {
    this.renderSystem.sync();
    this.renderer.render();
    return this.renderer.captureFrame();
  }

  private initTimelinePlayer(): void {
    this.timelinePlayer?.pause();
    const timeline = this.document.timeline ?? createDefaultTimeline();
    this.timelinePlayer = new TimelinePlayer(
      timeline,
      (props) => {
        this.gsapBridge.applyEvaluated(props);
        this.syncRigDisplays();
        this.renderSystem.sync();
      },
      (time) => this.emit("timelineTime", time)
    );
  }

  private async addSpriteEntity(
    clip: string,
    layerId: string,
    x: number,
    y: number,
    name?: string,
    uuid?: string
  ): Promise<void> {
    const entityUuid = uuid ?? crypto.randomUUID();
    const clipInfo = this.renderer.getClipInfo(clip);
    if (!clipInfo || clipInfo.frames.length === 0) return;

    const displayId = entityUuid;
    await this.renderer.createSpriteDisplay(
      displayId,
      layerId,
      clipInfo.folder,
      clipInfo.frames[0]!
    );

    const entityId = this.world.createEntity(entityUuid);
    this.world.setUuid(entityId, entityUuid);
    this.world.addComponent(entityId, "transform", {
      x,
      y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    });
    this.world.addComponent(entityId, "render", { displayObjectId: displayId, zIndex: 0 });
    this.world.addComponent(entityId, "spriteAnimation", {
      clip,
      playing: false,
      loop: true,
      currentFrame: 0,
      elapsed: 0,
    });
    this.world.addComponent(entityId, "layerMeta", {
      layerId,
      locked: false,
      visible: true,
    });
    this.world.addComponent(entityId, "name", { name: name ?? clip });
    this.world.addComponent(entityId, "combat", {
      hitboxWidth: 40,
      hitboxHeight: 80,
      hitboxOffsetX: 0,
      hitboxOffsetY: -40,
      active: false,
    });

    if (!uuid) {
      this.document.entities.push({
        id: entityUuid,
        type: "sprite",
        name: name ?? clip,
        layerId,
        clip,
        transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
      });
    }
    this.renderSystem.sync();
  }

  private async addRigEntity(
    rigId: string,
    layerId: string,
    x: number,
    y: number,
    name?: string,
    uuid?: string
  ): Promise<void> {
    const entityUuid = uuid ?? crypto.randomUUID();
    const displayId = entityUuid;
    const entry = this.renderer.createRigDisplay(displayId, layerId);
    this.rigRenderer.applyPose(entry.container, "idle_presenter", {}, "smile", "closed");

    const entityId = this.world.createEntity(entityUuid);
    this.world.setUuid(entityId, entityUuid);
    this.world.addComponent(entityId, "transform", {
      x,
      y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    });
    this.world.addComponent(entityId, "render", { displayObjectId: displayId, zIndex: 0 });
    this.world.addComponent(entityId, "rig", {
      rigId,
      pose: "idle_presenter",
      boneRotations: {},
      face: "smile",
      mouth: "closed",
    });
    this.world.addComponent(entityId, "layerMeta", { layerId, locked: false, visible: true });
    this.world.addComponent(entityId, "name", { name: name ?? rigId });
    this.world.addComponent(entityId, "combat", {
      hitboxWidth: 50,
      hitboxHeight: 90,
      hitboxOffsetX: 0,
      hitboxOffsetY: -45,
      active: false,
    });

    if (!uuid) {
      this.document.entities.push({
        id: entityUuid,
        type: "rig",
        name: name ?? rigId,
        layerId,
        rigId,
        pose: "idle_presenter",
        face: "smile",
        mouth: "closed",
        transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
        width: 150,
        height: 190,
      });
    }
    this.renderSystem.sync();
  }

  private setEntityPose(entityUuid: string, pose: string): void {
    const entityId = this.world.getEntityByUuid(entityUuid);
    if (entityId === undefined) return;
    const rig = this.world.getComponent(entityId, "rig");
    const render = this.world.getComponent(entityId, "render");
    if (!rig || !render) return;
    rig.pose = pose;
    const display = this.renderer.getDisplay(render.displayObjectId);
    if (display) this.rigRenderer.applyPose(display.container, pose, rig.boneRotations, rig.face, rig.mouth);
    const docEntity = this.document.entities.find((e) => e.id === entityUuid);
    if (docEntity && docEntity.type === "rig") docEntity.pose = pose;
  }

  private setBoneRotation(entityUuid: string, boneId: string, rotation: number): void {
    const entityId = this.world.getEntityByUuid(entityUuid);
    if (entityId === undefined) return;
    const rig = this.world.getComponent(entityId, "rig");
    const render = this.world.getComponent(entityId, "render");
    if (!rig || !render) return;
    rig.boneRotations[boneId] = rotation;
    const display = this.renderer.getDisplay(render.displayObjectId);
    if (display) this.rigRenderer.applyPose(display.container, rig.pose, rig.boneRotations, rig.face, rig.mouth);
    const docEntity = this.document.entities.find((e) => e.id === entityUuid);
    if (docEntity && docEntity.type === "rig") {
      docEntity.boneRotations = { ...rig.boneRotations };
    }
  }

  private setRigFace(entityUuid: string, face: FaceState): void {
    const entityId = this.world.getEntityByUuid(entityUuid);
    if (entityId === undefined) return;
    const rig = this.world.getComponent(entityId, "rig");
    const render = this.world.getComponent(entityId, "render");
    if (!rig || !render) return;
    rig.face = face;
    const display = this.renderer.getDisplay(render.displayObjectId);
    if (display) this.rigRenderer.applyPose(display.container, rig.pose, rig.boneRotations, rig.face, rig.mouth);
    const docEntity = this.document.entities.find((e) => e.id === entityUuid);
    if (docEntity && docEntity.type === "rig") docEntity.face = rig.face;
  }

  private setRigMouth(entityUuid: string, mouth: MouthShape): void {
    const entityId = this.world.getEntityByUuid(entityUuid);
    if (entityId === undefined) return;
    const rig = this.world.getComponent(entityId, "rig");
    const render = this.world.getComponent(entityId, "render");
    if (!rig || !render) return;
    rig.mouth = mouth;
    const display = this.renderer.getDisplay(render.displayObjectId);
    if (display) this.rigRenderer.applyPose(display.container, rig.pose, rig.boneRotations, rig.face, rig.mouth);
    const docEntity = this.document.entities.find((e) => e.id === entityUuid);
    if (docEntity && docEntity.type === "rig") docEntity.mouth = rig.mouth;
  }

  private async convertToRig(entityUuid: string): Promise<void> {
    const entity = this.document.entities.find((e) => e.id === entityUuid);
    if (!entity || entity.type !== "sprite") return;
    const { layerId, transform, name } = entity;
    this.removeEntity(entityUuid);
    await this.addRigEntity("default", layerId, transform.x, transform.y, name);
  }

  private removeEntity(entityUuid: string): void {
    const entityId = this.world.getEntityByUuid(entityUuid);
    if (entityId !== undefined) {
      const render = this.world.getComponent(entityId, "render");
      if (render) this.renderer.removeDisplay(render.displayObjectId);
      this.world.destroyEntity(entityId);
    }
    this.document.entities = this.document.entities.filter((e) => e.id !== entityUuid);
    if (this.selectedEntityId === entityUuid) this.selectEntity(null);
  }

  private moveEntity(entityUuid: string, x: number, y: number): void {
    const entityId = this.world.getEntityByUuid(entityUuid);
    if (entityId === undefined) return;
    const t = this.world.getComponent(entityId, "transform");
    if (t) {
      t.x = x;
      t.y = y;
    }
    const docEntity = this.document.entities.find((e) => e.id === entityUuid);
    if (docEntity) {
      docEntity.transform.x = x;
      docEntity.transform.y = y;
    }
    this.renderSystem.sync();
  }

  private setTransform(
    entityUuid: string,
    partial: Partial<{ x: number; y: number; rotation: number; scaleX: number; scaleY: number }>
  ): void {
    const entityId = this.world.getEntityByUuid(entityUuid);
    if (entityId === undefined) return;
    const t = this.world.getComponent(entityId, "transform");
    if (t) Object.assign(t, partial);
    const docEntity = this.document.entities.find((e) => e.id === entityUuid);
    if (docEntity) Object.assign(docEntity.transform, partial);
    this.renderSystem.sync();
  }

  private selectEntity(entityUuid: string | null): void {
    for (const id of this.world.query("selectable")) {
      this.world.removeComponent(id, "selectable");
    }
    if (entityUuid) {
      const entityId = this.world.getEntityByUuid(entityUuid);
      if (entityId !== undefined) {
        this.world.addComponent(entityId, "selectable", { selected: true });
      }
    }
    this.selectedEntityId = entityUuid;
    this.renderSystem.sync();
    this.emit("selectionChange", entityUuid);
  }

  private setLayerVisibility(layerId: string, visible: boolean): void {
    const layer = this.document.layers.find((l) => l.id === layerId);
    if (layer) layer.visible = visible;
    for (const id of this.world.query("layerMeta")) {
      const meta = this.world.getComponent(id, "layerMeta")!;
      if (meta.layerId === layerId) meta.visible = visible;
    }
    const container = this.renderer.layerContainers.get(layerId);
    if (container) container.visible = visible;
  }

  private setLayerLocked(layerId: string, locked: boolean): void {
    const layer = this.document.layers.find((l) => l.id === layerId);
    if (layer) layer.locked = locked;
    for (const id of this.world.query("layerMeta")) {
      const meta = this.world.getComponent(id, "layerMeta")!;
      if (meta.layerId === layerId) meta.locked = locked;
    }
  }

  private addLayer(name: string): void {
    const layer = {
      id: crypto.randomUUID(),
      name,
      order: this.document.layers.length,
      visible: true,
      locked: false,
    };
    this.document.layers.push(layer);
    this.renderer.ensureLayer(layer.id, layer.order);
  }

  private removeLayer(layerId: string): void {
    const toRemove = this.document.entities.filter((e) => e.layerId === layerId);
    for (const e of toRemove) this.removeEntity(e.id);
    this.document.layers = this.document.layers.filter((l) => l.id !== layerId);
    this.renderer.removeLayer(layerId);
  }

  private reorderLayer(layerId: string, order: number): void {
    const layer = this.document.layers.find((l) => l.id === layerId);
    if (layer) layer.order = order;
    this.document.layers.sort((a, b) => a.order - b.order);
    for (const l of this.document.layers) {
      const container = this.renderer.layerContainers.get(l.id);
      if (container) container.zIndex = l.order;
    }
    this.renderer.stageRoot.sortChildren();
  }

  private setEntityClip(entityUuid: string, clip: string, play = false): void {
    const entityId = this.world.getEntityByUuid(entityUuid);
    if (entityId === undefined) return;
    const anim = this.world.getComponent(entityId, "spriteAnimation");
    if (anim) {
      anim.clip = clip;
      anim.currentFrame = 0;
      anim.elapsed = 0;
      anim.playing = play;
    }
    const docEntity = this.document.entities.find((e) => e.id === entityUuid);
    if (docEntity && docEntity.type === "sprite") docEntity.clip = clip;
  }

  private addKeyframe(
    trackId: string,
    time: number,
    value: number | string | boolean
  ): void {
    const timeline = this.document.timeline ?? createDefaultTimeline();
    const track = timeline.tracks.find((t) => t.id === trackId);
    if (track) {
      track.keyframes.push({
        id: crypto.randomUUID(),
        time,
        value,
        easing: "easeInOut",
      });
      track.keyframes.sort((a, b) => a.time - b.time);
    }
    this.initTimelinePlayer();
  }

  private moveKeyframe(trackId: string, keyframeId: string, time: number): void {
    const timeline = this.document.timeline;
    if (!timeline) return;
    const track = timeline.tracks.find((t) => t.id === trackId);
    const kf = track?.keyframes.find((k) => k.id === keyframeId);
    if (kf) {
      kf.time = time;
      track!.keyframes.sort((a, b) => a.time - b.time);
    }
  }

  addTrackForEntity(entityId: string, property: string): string {
    const timeline = this.document.timeline ?? createDefaultTimeline();
    this.document.timeline = timeline;
    const track = getOrCreateTrack(timeline, entityId, property);
    this.initTimelinePlayer();
    return track.id;
  }

  private update(dt: number): void {
    this.animationSystem.update(dt);
    this.renderSystem.sync();
  }

  private render(): void {
    this.renderer.render();
  }

  private emitDocumentChange(): void {
    this.syncDocumentFromWorld();
    this.emit("documentChange", this.getDocument());
  }

  private syncDocumentFromWorld(): void {
    for (const entity of this.document.entities) {
      const eid = this.world.getEntityByUuid(entity.id);
      if (eid === undefined) continue;
      const t = this.world.getComponent(eid, "transform");
      if (t) entity.transform = { ...t };
      if (entity.type === "sprite") {
        const anim = this.world.getComponent(eid, "spriteAnimation");
        if (anim) {
          entity.clip = anim.clip;
          entity.playing = anim.playing;
        }
      } else if (entity.type === "rig") {
        const rig = this.world.getComponent(eid, "rig");
        if (rig) {
          entity.pose = rig.pose;
          entity.boneRotations = { ...rig.boneRotations };
          entity.face = rig.face;
          entity.mouth = rig.mouth;
        }
      }
    }
  }

  private syncRigDisplays(): void {
    for (const id of this.world.query("rig", "render")) {
      const rig = this.world.getComponent(id, "rig")!;
      const render = this.world.getComponent(id, "render")!;
      const display = this.renderer.getDisplay(render.displayObjectId);
      if (display) {
        this.rigRenderer.applyPose(display.container, rig.pose, rig.boneRotations, rig.face, rig.mouth);
      }
    }
  }

  destroy(): void {
    this.gameLoop.stop();
    this.timelinePlayer?.pause();
    this.gsapBridge.killAll();
    this.renderer.destroy();
  }
}
