"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EditorPanel } from "./editor-panel";
import { commandBus } from "@/lib/command-bus";
import { useEditorStore } from "@/stores/editor-store";
import { DEFAULT_POSES } from "@stickman/engine";

const BONE_IDS = [
  "head",
  "torso",
  "upperArmL",
  "forearmL",
  "upperArmR",
  "forearmR",
  "thighL",
  "calfL",
  "thighR",
  "calfR",
] as const;

export function InspectorPanel() {
  const document = useEditorStore((s) => s.document);
  const selectedEntityIds = useEditorStore((s) => s.selectedEntityIds);
  const entity = document?.entities.find((item) => item.id === selectedEntityIds[0]);

  if (!entity) {
    return (
      <EditorPanel title="Inspector" className="max-h-48 shrink-0">
        <p className="p-4 text-xs text-muted-foreground">Select an entity to inspect</p>
      </EditorPanel>
    );
  }

  return (
    <EditorPanel title="Inspector" className="max-h-48 shrink-0 overflow-auto">
      <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-2 p-3 text-xs">
        <Label htmlFor="entity-name" className="text-xs text-muted-foreground">
          Name
        </Label>
        <Input id="entity-name" className="h-8 text-xs" value={entity.name} readOnly />

        <Label htmlFor="entity-x" className="text-xs text-muted-foreground">
          X
        </Label>
        <Input
          id="entity-x"
          type="number"
          className="h-8 text-xs"
          value={Math.round(entity.transform.x)}
          onChange={(event) =>
            commandBus.dispatch({
              type: "SetEntityTransform",
              entityId: entity.id,
              transform: { x: Number(event.target.value) },
            })
          }
        />

        <Label htmlFor="entity-y" className="text-xs text-muted-foreground">
          Y
        </Label>
        <Input
          id="entity-y"
          type="number"
          className="h-8 text-xs"
          value={Math.round(entity.transform.y)}
          onChange={(event) =>
            commandBus.dispatch({
              type: "SetEntityTransform",
              entityId: entity.id,
              transform: { y: Number(event.target.value) },
            })
          }
        />

        {entity.type === "sprite" && (
          <>
            <Label className="text-xs text-muted-foreground">Clip</Label>
            <span className="truncate text-xs">{entity.clip}</span>
            <Label className="text-xs text-muted-foreground">Preview</Label>
            <Button
              size="sm"
              variant="outline"
              className="justify-start"
              onClick={() =>
                commandBus.dispatch({
                  type: "PlayClip",
                  entityId: entity.id,
                  clip: entity.clip,
                  loop: true,
                })
              }
            >
              Preview clip
            </Button>
          </>
        )}

        {entity.type === "rig" && (
          <>
            <Label htmlFor="entity-pose" className="text-xs text-muted-foreground">
              Pose
            </Label>
            <select
              id="entity-pose"
              className="h-8 rounded-4xl border border-input bg-input/30 px-3 text-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={entity.pose}
              onChange={(event) =>
                commandBus.dispatch({
                  type: "SetEntityPose",
                  entityId: entity.id,
                  pose: event.target.value,
                })
              }
            >
              {DEFAULT_POSES.map((pose) => (
                <option key={pose.id} value={pose.id}>
                  {pose.id}
                </option>
              ))}
            </select>
            <div className="col-span-2 pt-2 text-xs font-semibold text-muted-foreground">
              Bones
            </div>
            {BONE_IDS.map((boneId) => (
              <div key={boneId} className="contents">
                <Label htmlFor={`bone-${boneId}`} className="text-xs text-muted-foreground">
                  {boneId}
                </Label>
                <Input
                  id={`bone-${boneId}`}
                  type="number"
                  step={0.1}
                  className="h-8 text-xs"
                  value={entity.boneRotations?.[boneId] ?? 0}
                  onChange={(event) =>
                    commandBus.dispatch({
                      type: "SetBoneRotation",
                      entityId: entity.id,
                      boneId,
                      rotation: Number(event.target.value),
                    })
                  }
                />
              </div>
            ))}
          </>
        )}
      </div>
    </EditorPanel>
  );
}
