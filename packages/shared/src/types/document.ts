import type { FaceState, MouthShape } from "./rig.js";
import type { ShapeKind } from "./shapes.js";

export type EntityId = string;
export type LayerId = string;

export interface TransformData {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface LayerData {
  id: LayerId;
  name: string;
  order: number;
  visible: boolean;
  locked: boolean;
}

export interface SpriteEntityData {
  id: EntityId;
  type: "sprite";
  name: string;
  layerId: LayerId;
  clip: string;
  transform: TransformData;
  playing?: boolean;
  width?: number;
  height?: number;
  startTime?: number;
  endTime?: number;
}

export interface RigEntityData {
  id: EntityId;
  type: "rig";
  name: string;
  layerId: LayerId;
  rigId: string;
  pose: string;
  face?: FaceState;
  mouth?: MouthShape;
  transform: TransformData;
  boneRotations?: Record<string, number>;
  width?: number;
  height?: number;
  startTime?: number;
  endTime?: number;
  style?: {
    strokeColor?: string;
    strokeWidth?: number;
    opacity?: number;
  };
}

export type EffectKind = "speedTrail" | "afterimage" | "impactBurst" | "dust" | "screenFlash";

export interface EffectEntityData {
  id: EntityId;
  type: "effect";
  name: string;
  layerId: LayerId;
  effect: EffectKind;
  transform: TransformData;
  width: number;
  height: number;
  color?: string;
  opacity?: number;
  intensity?: number;
  sourceEntityId?: EntityId;
  startTime: number;
  endTime: number;
}

export interface TextEntityData {
  id: EntityId;
  type: "text";
  name: string;
  layerId: LayerId;
  text: string;
  transform: TransformData;
  fontSize?: number;
  color?: string;
  startTime?: number;
  endTime?: number;
}

export interface ImageEntityData {
  id: EntityId;
  type: "image";
  name: string;
  layerId: LayerId;
  src: string;
  transform: TransformData;
  width?: number;
  height?: number;
  startTime?: number;
  endTime?: number;
}

export interface ShapeEntityData {
  id: EntityId;
  type: "shape";
  name: string;
  layerId: LayerId;
  shape: ShapeKind;
  transform: TransformData;
  width: number;
  height: number;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  text?: string;
  opacity?: number;
  startTime?: number;
  endTime?: number;
}

export type EntityData =
  | SpriteEntityData
  | RigEntityData
  | TextEntityData
  | ImageEntityData
  | ShapeEntityData
  | EffectEntityData;

export interface StageData {
  width: number;
  height: number;
  backgroundColor?: string;
}

export interface AudioTrackData {
  id: string;
  name: string;
  url: string;
  volume: number; // 0 to 1
  startTime: number; // playhead offset in seconds
  duration: number; // in seconds
  audioStartOffset?: number; // offset within the original audio file in seconds
  category?: "music" | "sfx" | "voice";
  pan?: number;
  fadeIn?: number;
  fadeOut?: number;
}

export interface VoiceTrackData {
  id: string;
  name: string;
  text: string;
  voiceName?: string;
  lang?: string;
  rate: number; // 0.5 to 2
  pitch: number; // 0 to 2
  volume: number; // 0 to 1
  startTime: number; // playhead offset in seconds
  duration: number; // in seconds
  speakerId?: string;
  renderedAudioUrl?: string;
  renderedMimeType?: string;
  generationStatus?: "pending" | "ready" | "failed";
}

export interface CombatProjectMetadata {
  sourcePrompt: string;
  seed: number;
  duration: number;
  intensity: "grounded" | "cinematic" | "extreme";
  winner: "fighterA" | "fighterB" | "draw" | "auto";
  moveCallouts: boolean;
  plan: unknown;
  contacts?: Array<{
    beatId: string;
    time: number;
    actorId: "fighterA" | "fighterB";
    targetId: "fighterA" | "fighterB";
    x: number;
    y: number;
    strikeBone: "forearmR" | "calfR";
  }>;
}

export interface ProjectDocument {
  version: number;
  sceneMode?: "teaching" | "combat";
  stage: StageData;
  layers: LayerData[];
  entities: EntityData[];
  timeline?: import("./timeline.js").TimelineData;
  audioTracks?: AudioTrackData[];
  voiceTracks?: VoiceTrackData[];
  combat?: CombatProjectMetadata;
}

export function normalizeProjectDocument(document: ProjectDocument): ProjectDocument {
  return {
    ...document,
    version: 2,
    sceneMode: document.sceneMode ?? "teaching",
    timeline: document.timeline
      ? { ...document.timeline, fps: document.timeline.fps || (document.sceneMode === "combat" ? 24 : 60) }
      : document.timeline,
    audioTracks: document.audioTracks ?? [],
    voiceTracks: document.voiceTracks ?? [],
  };
}

export function createDefaultDocument(preset: "16:9" | "9:16" | "1:1" | "4:3" = "16:9"): ProjectDocument {
  const bgLayerId = crypto.randomUUID();
  const charLayerId = crypto.randomUUID();
  
  let width = 640;
  let height = 360;
  if (preset === "9:16") {
    width = 360;
    height = 640;
  } else if (preset === "1:1") {
    width = 500;
    height = 500;
  } else if (preset === "4:3") {
    width = 480;
    height = 360;
  }

  return {
    version: 2,
    sceneMode: "teaching",
    stage: { width, height, backgroundColor: "#FFFFFF" },
    layers: [
      { id: bgLayerId, name: "Background", order: 0, visible: true, locked: false },
      { id: charLayerId, name: "Characters", order: 1, visible: true, locked: false },
    ],
    entities: [],
  };
}
