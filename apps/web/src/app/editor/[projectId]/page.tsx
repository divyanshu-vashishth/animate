"use client";

import { useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { authClient } from "@stickman/auth/client";
import { Toolbar } from "@/components/editor/Toolbar";
import { AssetsPanel } from "@/components/editor/AssetsPanel";
import { LayersPanel } from "@/components/editor/LayersPanel";
import { CanvasDropZone } from "@/components/editor/CanvasDropZone";
import { TimelinePanel } from "@/components/editor/TimelinePanel";
import { InspectorPanel } from "@/components/editor/InspectorPanel";
import { useEditorStore } from "@/stores/editor-store";
import { api } from "@/lib/api";
import { commandBus } from "@/lib/command-bus";
import { AUTOSAVE_DEBOUNCE_MS } from "@stickman/shared";

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const setProject = useEditorStore((s) => s.setProject);
  const document = useEditorStore((s) => s.document);
  const isDirty = useEditorStore((s) => s.isDirty);
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      router.replace("/sign-in");
      return;
    }
    void (async () => {
      try {
        const { projects } = await api.listProjects();
        const project = projects.find((x) => x.id === projectId);
        if (!project) throw new Error("Project not found");
        const { document: doc } = await api.getDocument(projectId);
        setProject(projectId, project.name, doc);
      } catch {
        router.replace("/dashboard");
      }
    })();
  }, [projectId, router, setProject, session, isPending]);

  const save = useCallback(async () => {
    if (!projectId || !document || !isDirty) return;
    useEditorStore.getState().setSaving(true);
    try {
      await api.saveDocument(projectId, document);
      useEditorStore.getState().setDirty(false);
    } finally {
      useEditorStore.getState().setSaving(false);
    }
  }, [projectId, document, isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => void save(), AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [isDirty, document, save]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <AssetsPanel />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1">
            <LayersPanel />
            <CanvasDropZone />
          </div>
          <TimelinePanel />
        </div>
      </div>
      <InspectorPanel />
    </div>
  );
}
