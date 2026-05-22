"use client";

import { Button } from "@/components/ui/button";
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
    alert(`Export job started: ${job.id}`);
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
    <div className="flex h-12 items-center gap-2 border-b border-white/10 bg-[hsl(222,20%,10%)] px-4">
      <span className="mr-4 font-bold text-violet-400">Stickman Studio</span>
      <Button
        variant={activeTool === "select" ? "default" : "ghost"}
        size="sm"
        onClick={() => setActiveTool("select")}
      >
        Select
      </Button>
      <Button
        variant={activeTool === "pan" ? "default" : "ghost"}
        size="sm"
        onClick={() => setActiveTool("pan")}
      >
        Pan
      </Button>
      <div className="mx-2 h-6 w-px bg-white/10" />
      <Button size="sm" variant="ghost" onClick={handlePlay}>
        {playbackState === "playing" ? "Pause" : "Play"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => commandBus.dispatch({ type: "SeekTimeline", time: 0 })}
      >
        Stop
      </Button>
      <div className="mx-2 h-6 w-px bg-white/10" />
      <Button size="sm" variant="outline" onClick={handleSave} disabled={!isDirty || isSaving}>
        {isSaving ? "Saving..." : "Save"}
      </Button>
      <Button size="sm" variant="outline" onClick={handleExport}>
        Export
      </Button>
      <Button size="sm" variant="ghost" onClick={handleConvertRig} disabled={!selectedEntityIds[0]}>
        To Rig
      </Button>
    </div>
  );
}
