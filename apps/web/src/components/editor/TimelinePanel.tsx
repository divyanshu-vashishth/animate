"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EditorPanel } from "./editor-panel";
import { commandBus } from "@/lib/command-bus";
import { useEditorStore } from "@/stores/editor-store";
import { api } from "@/lib/api";
import type { EditorCommand } from "@stickman/shared";

export function TimelinePanel() {
  const document = useEditorStore((s) => s.document);
  const timelineTime = useEditorStore((s) => s.setTimelineTime);
  const time = useEditorStore((s) => s.timelineTime);
  const selectedEntityIds = useEditorStore((s) => s.selectedEntityIds);
  const [aiPrompt, setAiPrompt] = useState("fighter combo attack");

  const timeline = document?.timeline;
  const duration = timeline?.duration ?? 5;

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    timelineTime(t);
    commandBus.dispatch({ type: "SeekTimeline", time: t });
  };

  const handleAddKeyframe = () => {
    const entityId = selectedEntityIds[0];
    if (!entityId || !document) return;
    const entity = document.entities.find((e) => e.id === entityId);
    if (!entity) return;

    const tl = document.timeline ?? { duration: 5, fps: 60, tracks: [] };
    let track = tl.tracks.find(
      (t) => t.entityId === entityId && t.property === "transform.x"
    );
    if (!track) {
      track = {
        id: crypto.randomUUID(),
        entityId,
        property: "transform.x",
        keyframes: [],
      };
      tl.tracks.push(track);
    }
    track.keyframes.push({
      id: crypto.randomUUID(),
      time,
      value: entity.transform.x,
      easing: "easeInOut",
    });
    track.keyframes.sort((a, b) => a.time - b.time);
    const updated = { ...document, timeline: tl };
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
        if (cmd.type !== "AddEntity" || document?.layers[1]) {
          if (cmd.type === "AddEntity" && document?.layers[1]) {
            commandBus.dispatch({
              ...cmd,
              layerId: document.layers[1]!.id,
            });
          } else {
            commandBus.dispatch(cmd);
          }
        }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "AI generation failed");
    }
  };

  return (
    <EditorPanel title="Timeline" className="h-40 shrink-0">
      <div className="flex h-full flex-col p-3">
        <div className="mb-2 flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={duration}
            step={0.01}
            value={time}
            onChange={handleScrub}
            className="flex-1"
          />
          <span className="w-16 text-xs tabular-nums">
            {time.toFixed(2)}s / {duration}s
          </span>
          <Button size="sm" variant="outline" onClick={handleAddKeyframe}>
            + Keyframe
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {timeline?.tracks.map((track) => (
            <div key={track.id} className="mb-1 flex items-center gap-2 text-[10px]">
              <span className="w-32 truncate text-white/50">
                {track.entityId.slice(0, 8)}… {track.property}
              </span>
              <div className="relative h-4 flex-1 rounded bg-white/5">
                {track.keyframes.map((kf) => (
                  <div
                    key={kf.id}
                    className="absolute top-0 h-4 w-2 -translate-x-1/2 rounded-full bg-violet-500"
                    style={{ left: `${(kf.time / duration) * 100}%` }}
                    title={`${kf.time}s = ${kf.value}`}
                  />
                ))}
              </div>
            </div>
          ))}
          {(!timeline?.tracks || timeline.tracks.length === 0) && (
            <p className="text-xs text-white/40">Add keyframes with a selected entity</p>
          )}
        </div>

        <div className="mt-2 flex gap-2 border-t border-white/10 pt-2">
          <input
            className="flex-1 rounded bg-white/5 px-2 py-1 text-xs"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
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
