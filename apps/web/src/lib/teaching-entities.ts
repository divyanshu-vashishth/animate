import {
  getTeachingShapePreset,
  type FaceState,
  type MouthShape,
  type RigEntityData,
  type ShapeEntityData,
  type ShapeKind,
} from "@stickman/shared";

const defaultTransform = (x: number, y: number) => ({
  x,
  y,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
});

export function createPresenterRigEntity(
  layerId: string,
  x: number,
  y: number,
  duration: number
): RigEntityData {
  return {
    id: crypto.randomUUID(),
    type: "rig",
    name: "Teaching Presenter",
    layerId,
    rigId: "teaching-stickman",
    pose: "idle_presenter",
    face: "smile" satisfies FaceState,
    mouth: "closed" satisfies MouthShape,
    transform: defaultTransform(x, y),
    boneRotations: {},
    width: 150,
    height: 190,
    startTime: 0,
    endTime: duration,
  };
}

export function createShapeEntity(
  kind: ShapeKind,
  layerId: string,
  x: number,
  y: number,
  duration: number
): ShapeEntityData {
  const preset = getTeachingShapePreset(kind);
  return {
    id: crypto.randomUUID(),
    type: "shape",
    name: preset.name,
    layerId,
    shape: kind,
    transform: defaultTransform(x, y),
    width: preset.width,
    height: preset.height,
    fillColor: preset.fillColor,
    strokeColor: preset.strokeColor,
    strokeWidth: preset.strokeWidth,
    startTime: 0,
    endTime: duration,
    opacity: 1,
  };
}
