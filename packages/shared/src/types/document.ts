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
  | ShapeEntityData;

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
}

export interface ProjectDocument {
  version: number;
  stage: StageData;
  layers: LayerData[];
  entities: EntityData[];
  timeline?: import("./timeline.js").TimelineData;
  audioTracks?: AudioTrackData[];
  voiceTracks?: VoiceTrackData[];
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
    version: 1,
    stage: { width, height, backgroundColor: "#FFFFFF" },
    layers: [
      { id: bgLayerId, name: "Background", order: 0, visible: true, locked: false },
      { id: charLayerId, name: "Characters", order: 1, visible: true, locked: false },
    ],
    entities: [],
  };
}
