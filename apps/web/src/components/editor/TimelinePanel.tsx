"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { EditorPanel } from "./editor-panel";
import { commandBus } from "@/lib/command-bus";
import { useEditorStore } from "@/stores/editor-store";
import { api } from "@/lib/api";
import type { EditorCommand } from "@stickman/shared";

export function TimelinePanel() {
  const document = useEditorStore((s) => s.document);
  const setTimelineTime = useEditorStore((s) => s.setTimelineTime);
  const time = useEditorStore((s) => s.timelineTime);
  const selectedEntityIds = useEditorStore((s) => s.selectedEntityIds);
  const [aiPrompt, setAiPrompt] = useState("fighter combo attack");

  const timeline = document?.timeline;
  const duration = timeline?.duration ?? 5;

  const handleScrub = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextTime = parseFloat(event.target.value);
    setTimelineTime(nextTime);
    commandBus.dispatch({ type: "SeekTimeline", time: nextTime });
  };

  const handleAddKeyframe = () => {
    const entityId = selectedEntityIds[0];
    if (!entityId || !document) return;
    const entity = document.entities.find((item) => item.id === entityId);
    if (!entity) return;

    const nextTimeline = document.timeline ?? { duration: 5, fps: 60, tracks: [] };
    let track = nextTimeline.tracks.find(
      (item) => item.entityId === entityId && item.property === "transform.x"
    );
    if (!track) {
      track = {
        id: crypto.randomUUID(),
        entityId,
        property: "transform.x",
        keyframes: [],
      };
      nextTimeline.tracks.push(track);
    }
    track.keyframes.push({
      id: crypto.randomUUID(),
      time,
      value: entity.transform.x,
      easing: "easeInOut",
    });
    track.keyframes.sort((a, b) => a.time - b.time);
    const updated = { ...document, timeline: nextTimeline };
    useEditorStore.getState().setDocument(updated);
    commandBus.dispatch({ type: "LoadDocument", document: updated });
    commandBus.dispatch({
      type: "AddKeyframe",
      trackId: track.id,
      time,
      value: entity.transform.x,
    });
  };

  const handleAiGenerate = async () => {
    try {
      const result = await api.generateAnimation(aiPrompt, selectedEntityIds[0]);
      if (result.timeline && document) {
        const updated = { ...document, timeline: result.timeline };
        useEditorStore.getState().setDocument(updated);
        commandBus.dispatch({ type: "LoadDocument", document: updated });
      }
      for (const cmd of result.commands as EditorCommand[]) {
        if (cmd.type === "AddEntity" && document?.layers[1]) {
          commandBus.dispatch({
            ...cmd,
            layerId: document.layers[1].id,
          });
        } else {
          commandBus.dispatch(cmd);
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI generation failed");
    }
  };

  return (
    <EditorPanel title="Timeline" className="h-40 shrink-0">
      <div className="flex h-full flex-col gap-2 p-3">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={duration}
            step={0.01}
            value={time}
            onChange={handleScrub}
            className="h-2 flex-1 accent-primary"
          />
          <span className="w-20 text-xs tabular-nums text-muted-foreground">
            {time.toFixed(2)}s / {duration}s
          </span>
          <Button size="sm" variant="outline" onClick={handleAddKeyframe}>
            + Keyframe
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {timeline?.tracks.map((track) => (
            <div key={track.id} className="mb-1 flex items-center gap-2 text-[10px]">
              <span className="w-32 truncate text-muted-foreground">
                {track.entityId.slice(0, 8)}... {track.property}
              </span>
              <div className="relative h-4 flex-1 rounded-md bg-muted">
                {track.keyframes.map((keyframe) => (
                  <div
                    key={keyframe.id}
                    className="absolute top-0 h-4 w-2 -translate-x-1/2 rounded-full bg-primary"
                    style={{ left: `${(keyframe.time / duration) * 100}%` }}
                    title={`${keyframe.time}s = ${keyframe.value}`}
                  />
                ))}
              </div>
            </div>
          ))}
          {(!timeline?.tracks || timeline.tracks.length === 0) && (
            <p className="text-xs text-muted-foreground">Add keyframes with a selected entity</p>
          )}
        </div>

        <Separator />
        <div className="flex gap-2">
          <Input
            className="h-8 flex-1 text-xs"
            value={aiPrompt}
            onChange={(event) => setAiPrompt(event.target.value)}
            placeholder="AI prompt: fighter combo..."
          />
          <Button size="sm" onClick={handleAiGenerate}>
            AI Generate
          </Button>
        </div>
      </div>
    </EditorPanel>
  );
}
