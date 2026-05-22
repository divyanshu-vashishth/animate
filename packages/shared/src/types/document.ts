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
}

export interface RigEntityData {
  id: EntityId;
  type: "rig";
  name: string;
  layerId: LayerId;
  rigId: string;
  pose: string;
  transform: TransformData;
  boneRotations?: Record<string, number>;
}

export type EntityData = SpriteEntityData | RigEntityData;

export interface StageData {
  width: number;
  height: number;
  backgroundColor?: string;
}

export interface ProjectDocument {
  version: number;
  stage: StageData;
  layers: LayerData[];
  entities: EntityData[];
  timeline?: import("./timeline.js").TimelineData;
}

export function createDefaultDocument(): ProjectDocument {
  const bgLayerId = crypto.randomUUID();
  const charLayerId = crypto.randomUUID();
  return {
    version: 1,
    stage: { width: 1920, height: 1080, backgroundColor: "#171717" },
    layers: [
      { id: bgLayerId, name: "Background", order: 0, visible: true, locked: false },
      { id: charLayerId, name: "Characters", order: 1, visible: true, locked: false },
    ],
    entities: [],
  };
}
