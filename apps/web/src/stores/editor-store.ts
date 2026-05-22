import { create } from "zustand";
import type { ProjectDocument } from "@stickman/shared";

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
  leftPanelTab: string | null;
  inspectorCollapsed: boolean;

  setProject: (id: string, name: string, doc: ProjectDocument) => void;
  setDocument: (doc: ProjectDocument) => void;
  setSelectedEntity: (id: string | null) => void;
  setActiveTool: (tool: ActiveTool) => void;
  setActiveLayerId: (id: string | null) => void;
  setPlaybackState: (state: "stopped" | "playing" | "paused") => void;
  setTimelineTime: (time: number) => void;
  setDirty: (dirty: boolean) => void;
  setSaving: (saving: boolean) => void;
  setLeftPanelTab: (tab: string | null) => void;
  setInspectorCollapsed: (collapsed: boolean) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
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
  leftPanelTab: "video", // Default tab on editor open
  inspectorCollapsed: false,

  setProject: (id, name, doc) =>
    set({
      projectId: id,
      projectName: name,
      document: doc,
      activeLayerId: doc.layers[0]?.id ?? null,
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

  setLeftPanelTab: (leftPanelTab) => set({ leftPanelTab }),

  setInspectorCollapsed: (inspectorCollapsed) => set({ inspectorCollapsed }),
}));
