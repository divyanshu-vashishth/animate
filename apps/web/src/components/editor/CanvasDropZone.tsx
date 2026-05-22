"use client";

import { commandBus } from "@/lib/command-bus";
import { useEditorStore } from "@/stores/editor-store";
import { EngineCanvas } from "./EngineCanvas";

export function CanvasDropZone() {
  const activeLayerId = useEditorStore((s) => s.activeLayerId);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const clip = e.dataTransfer.getData("application/stickman-clip");
    if (!clip || !activeLayerId) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (clip.startsWith("extras/")) {
      const filename = clip.split("/").pop()!;
      commandBus.dispatch({
        type: "AddEntity",
        clip,
        layerId: activeLayerId,
        x,
        y,
        name: filename,
      });
      return;
    }

    const parsed = clip.split("/");
    if (parsed.length === 2) {
      commandBus.dispatch({
        type: "AddEntity",
        clip,
        layerId: activeLayerId,
        x,
        y,
      });
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  return (
    <div
      className="relative min-h-0 flex-1"
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <EngineCanvas />
    </div>
  );
}
