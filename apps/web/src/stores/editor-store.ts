import { create } from "zustand";
import type { LayerData, ProjectDocument } from "@stickman/shared";

export type ActiveTool = "select" | "pan" | "move";

interface EditorState {
  projectId: string | null;
  projectName: string;
  document: ProjectDocument | null;
  selectedEntityIds: string[];
  activeTool: ActiveTool;
  activeLayerId: string | null;
  playbackState: "stopped" | "playing" | "paused";
  timelineTime: number;
  isDirty: boolean;
  isSaving: boolean;

  setProject: (id: string, name: string, doc: ProjectDocument) => void;
  setDocument: (doc: ProjectDocument) => void;
  setSelectedEntity: (id: string | null) => void;
  setActiveTool: (tool: ActiveTool) => void;
  setActiveLayerId: (id: string | null) => void;
  setPlaybackState: (state: "stopped" | "playing" | "paused") => void;
  setTimelineTime: (time: number) => void;
  setDirty: (dirty: boolean) => void;
  setSaving: (saving: boolean) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  projectId: null,
  projectName: "Untitled",
  document: null,
  selectedEntityIds: [],
  activeTool: "select",
  activeLayerId: null,
  playbackState: "stopped",
  timelineTime: 0,
  isDirty: false,
  isSaving: false,

  setProject: (id, name, doc) =>
    set({
      projectId: id,
      projectName: name,
      document: doc,
      activeLayerId: doc.layers[1]?.id ?? doc.layers[0]?.id ?? null,
      isDirty: false,
    }),

  setDocument: (doc) => set({ document: doc, isDirty: true }),

  setSelectedEntity: (id) =>
    set({ selectedEntityIds: id ? [id] : [] }),

  setActiveTool: (tool) => set({ activeTool: tool }),

  setActiveLayerId: (id) => set({ activeLayerId: id }),

  setPlaybackState: (playbackState) => set({ playbackState }),

  setTimelineTime: (timelineTime) => set({ timelineTime }),

  setDirty: (isDirty) => set({ isDirty }),

  setSaving: (isSaving) => set({ isSaving }),
}));
