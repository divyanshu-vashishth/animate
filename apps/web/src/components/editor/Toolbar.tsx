"use client";

import {
  IconBone,
  IconDeviceFloppy,
  IconDownload,
  IconHandMove,
  IconPointer,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerStop,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { commandBus } from "@/lib/command-bus";
import { useEditorStore } from "@/stores/editor-store";
import { api } from "@/lib/api";

export function Toolbar() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const playbackState = useEditorStore((s) => s.playbackState);
  const setPlaybackState = useEditorStore((s) => s.setPlaybackState);
  const projectId = useEditorStore((s) => s.projectId);
  const selectedEntityIds = useEditorStore((s) => s.selectedEntityIds);
  const isDirty = useEditorStore((s) => s.isDirty);
  const isSaving = useEditorStore((s) => s.isSaving);
  const document = useEditorStore((s) => s.document);

  const handleSave = async () => {
    if (!projectId || !document) return;
    useEditorStore.getState().setSaving(true);
    try {
      await api.saveDocument(projectId, document);
      useEditorStore.getState().setDirty(false);
    } finally {
      useEditorStore.getState().setSaving(false);
    }
  };

  const handleExport = async () => {
    if (!projectId) return;
    const { job } = await api.createRenderJob(projectId, "mp4");
    toast.success("Export job started", {
      description: job.id,
    });
  };

  const handlePlay = () => {
    const playing = playbackState !== "playing";
    commandBus.dispatch({ type: "SetPlayback", playing });
    setPlaybackState(playing ? "playing" : "paused");
  };

  const handleConvertRig = () => {
    const id = selectedEntityIds[0];
    if (id) commandBus.dispatch({ type: "ConvertToRig", entityId: id });
  };

  return (
    <div className="flex h-12 items-center gap-2 border-b bg-card px-3">
      <span className="mr-3 truncate text-sm font-semibold">Stickman Studio</span>
      <Button
        variant={activeTool === "select" ? "default" : "ghost"}
        size="sm"
        onClick={() => setActiveTool("select")}
      >
        <IconPointer data-icon="inline-start" />
        Select
      </Button>
      <Button
        variant={activeTool === "pan" ? "default" : "ghost"}
        size="sm"
        onClick={() => setActiveTool("pan")}
      >
        <IconHandMove data-icon="inline-start" />
        Pan
      </Button>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <Button size="sm" variant="ghost" onClick={handlePlay}>
        {playbackState === "playing" ? (
          <IconPlayerPause data-icon="inline-start" />
        ) : (
          <IconPlayerPlay data-icon="inline-start" />
        )}
        {playbackState === "playing" ? "Pause" : "Play"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => commandBus.dispatch({ type: "SeekTimeline", time: 0 })}
      >
        <IconPlayerStop data-icon="inline-start" />
        Stop
      </Button>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <Button size="sm" variant="outline" onClick={handleSave} disabled={!isDirty || isSaving}>
        <IconDeviceFloppy data-icon="inline-start" />
        {isSaving ? "Saving..." : "Save"}
      </Button>
      <Button size="sm" variant="outline" onClick={handleExport}>
        <IconDownload data-icon="inline-start" />
        Export
      </Button>
      <Button size="sm" variant="ghost" onClick={handleConvertRig} disabled={!selectedEntityIds[0]}>
        <IconBone data-icon="inline-start" />
        To Rig
      </Button>
    </div>
  );
}
