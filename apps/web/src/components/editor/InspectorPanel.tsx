"use client";

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
  const entity = document?.entities.find((e) => e.id === selectedEntityIds[0]);

  if (!entity) {
    return (
      <EditorPanel title="Inspector" className="max-h-48 shrink-0">
        <p className="p-4 text-xs text-white/50">Select an entity to inspect</p>
      </EditorPanel>
    );
  }

  return (
    <EditorPanel title="Inspector" className="max-h-48 shrink-0 overflow-auto">
      <div className="grid grid-cols-2 gap-2 p-3 text-xs">
        <label>Name</label>
        <input className="rounded bg-white/5 px-2 py-1" value={entity.name} readOnly />
        <label>X</label>
        <input
          type="number"
          className="rounded bg-white/5 px-2 py-1"
          value={Math.round(entity.transform.x)}
          onChange={(e) =>
            commandBus.dispatch({
              type: "SetEntityTransform",
              entityId: entity.id,
              transform: { x: Number(e.target.value) },
            })
          }
        />
        <label>Y</label>
        <input
          type="number"
          className="rounded bg-white/5 px-2 py-1"
          value={Math.round(entity.transform.y)}
          onChange={(e) =>
            commandBus.dispatch({
              type: "SetEntityTransform",
              entityId: entity.id,
              transform: { y: Number(e.target.value) },
            })
          }
        />
        {entity.type === "sprite" && (
          <>
            <label>Clip</label>
            <span className="text-violet-300">{entity.clip}</span>
            <label>Play</label>
            <button
              className="rounded bg-violet-600/40 px-2 py-1 text-left"
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
            </button>
          </>
        )}
        {entity.type === "rig" && (
          <>
            <label>Pose</label>
            <select
              className="rounded bg-white/5 px-2 py-1"
              value={entity.pose}
              onChange={(e) =>
                commandBus.dispatch({
                  type: "SetEntityPose",
                  entityId: entity.id,
                  pose: e.target.value,
                })
              }
            >
              {DEFAULT_POSES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id}
                </option>
              ))}
            </select>
            <label className="col-span-2 mt-2 font-semibold text-white/60">Bones</label>
            {BONE_IDS.map((boneId) => (
              <div key={boneId} className="contents">
                <label>{boneId}</label>
                <input
                  type="number"
                  step={0.1}
                  className="rounded bg-white/5 px-2 py-1"
                  value={entity.boneRotations?.[boneId] ?? 0}
                  onChange={(e) =>
                    commandBus.dispatch({
                      type: "SetBoneRotation",
                      entityId: entity.id,
                      boneId,
                      rotation: Number(e.target.value),
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
