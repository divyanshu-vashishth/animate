import type { ProjectDocument, TransformData } from "./document.js";

export type EditorCommand =
  | { type: "LoadDocument"; document: ProjectDocument }
  | { type: "AddEntity"; clip: string; layerId: string; x: number; y: number; name?: string }
  | { type: "AddRigEntity"; rigId: string; layerId: string; x: number; y: number; name?: string }
  | { type: "RemoveEntity"; entityId: string }
  | { type: "MoveEntity"; entityId: string; x: number; y: number }
  | { type: "SetEntityTransform"; entityId: string; transform: Partial<TransformData> }
  | { type: "SelectEntity"; entityId: string | null }
  | { type: "SetLayerVisibility"; layerId: string; visible: boolean }
  | { type: "SetLayerLocked"; layerId: string; locked: boolean }
  | { type: "AddLayer"; name: string }
  | { type: "RemoveLayer"; layerId: string }
  | { type: "ReorderLayer"; layerId: string; order: number }
  | { type: "SetEntityClip"; entityId: string; clip: string }
  | { type: "PlayClip"; entityId: string; clip: string; loop?: boolean }
  | { type: "SetPlayback"; playing: boolean }
  | { type: "SeekTimeline"; time: number }
  | { type: "AddKeyframe"; trackId: string; time: number; value: number | string | boolean }
  | { type: "MoveKeyframe"; trackId: string; keyframeId: string; time: number }
  | { type: "CameraPan"; dx: number; dy: number }
  | { type: "CameraZoom"; scale: number; centerX?: number; centerY?: number }
  | { type: "ConvertToRig"; entityId: string }
  | { type: "SetEntityPose"; entityId: string; pose: string }
  | { type: "SetBoneRotation"; entityId: string; boneId: string; rotation: number };

export type CommandHandler = (command: EditorCommand) => void;

export class CommandBus {
  private handler: CommandHandler | null = null;

  setHandler(handler: CommandHandler): void {
    this.handler = handler;
  }

  dispatch(command: EditorCommand): void {
    this.handler?.(command);
  }
}
