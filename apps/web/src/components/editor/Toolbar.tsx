"use client";

import {
  IconDeviceFloppy,
  IconArrowLeft,
  IconSun,
  IconMoon,
  IconLayoutSidebarRightCollapse,
  IconLayoutSidebarRightExpand,
  IconPlus,
  IconMinus,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useEditorStore } from "@/stores/editor-store";
import { api } from "@/lib/api";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function Toolbar() {
  const projectId = useEditorStore((s) => s.projectId);
  const isDirty = useEditorStore((s) => s.isDirty);
  const isSaving = useEditorStore((s) => s.isSaving);
  const document = useEditorStore((s) => s.document);
  const setDocument = useEditorStore((s) => s.setDocument);

  const inspectorCollapsed = useEditorStore((s) => s.inspectorCollapsed);
  const setInspectorCollapsed = useEditorStore((s) => s.setInspectorCollapsed);

  // Collapse and Theme States
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  const toggleTheme = () => {
    const nextTheme = isDarkMode ? "light" : "dark";
    setTheme(nextTheme);
    toast.success(`Switched to ${nextTheme === "dark" ? "Dark" : "Light"} Mode`);
  };

  const handleSave = async () => {
    if (!projectId || !document) return;
    useEditorStore.getState().setSaving(true);
    try {
      await api.saveDocument(projectId, document);
      useEditorStore.getState().setDirty(false);
      toast.success("Project saved successfully");
    } catch {
      toast.error("Failed to save project");
    } finally {
      useEditorStore.getState().setSaving(false);
    }
  };

  // Adjust timeline project duration in seconds
  const currentDuration = document?.timeline?.duration ?? 10;

  const handleDurationChange = (change: number) => {
    if (!document) return;
    const newDuration = Math.max(1, currentDuration + change);
    
    // Scale or cap entities that fall outside the new duration
    const adjustedEntities = document.entities.map((ent: any) => {
      const start = ent.startTime ?? 0;
      const end = ent.endTime ?? 10;
      return {
        ...ent,
        startTime: Math.min(start, newDuration),
        endTime: Math.min(end, newDuration),
      };
    });

    const updatedTimeline = {
      ...(document.timeline ?? { fps: 60, tracks: [] }),
      duration: newDuration,
    };

    setDocument({
      ...document,
      entities: adjustedEntities,
      timeline: updatedTimeline,
    });
    toast.success(`Duration changed to ${newDuration} seconds`);
  };

  return (
    <div className="flex h-12 items-center justify-between border-b bg-card px-3 select-none">
      <div className="flex items-center gap-2">
        <Link href="/dashboard">
          <Button
            variant="ghost"
            size="icon-xs"
            className="h-8 w-8 hover:bg-accent hover:text-primary rounded-md"
            title="Back to Dashboard"
          >
            <IconArrowLeft className="h-4.5 w-4.5" />
          </Button>
        </Link>
        <span className="mr-3 truncate text-sm font-black tracking-wide bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
          Stickman Studio
        </span>
        
        <Separator orientation="vertical" className="h-5" />

        {/* DURATION CONTROLLER */}
        <div className="flex items-center gap-1.5 ml-2">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => handleDurationChange(-1)}
            disabled={currentDuration <= 1}
            className="h-7 w-7 text-muted-foreground hover:text-primary"
            title="Decrease duration by 1s"
          >
            <IconMinus className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[11px] font-extrabold text-foreground bg-accent/40 px-2.5 py-0.5 rounded border border-border/15">
            Duration: {currentDuration}s
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => handleDurationChange(1)}
            className="h-7 w-7 text-muted-foreground hover:text-primary"
            title="Increase duration by 1s"
          >
            <IconPlus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Button 
          size="sm" 
          variant={isDirty ? "default" : "outline"} 
          className={`h-8 text-xs font-semibold ${isDirty ? "shadow-lg shadow-primary/20" : "hover:border-primary/50"}`}
          onClick={handleSave} 
          disabled={!isDirty || isSaving}
        >
          <IconDeviceFloppy data-icon="inline-start" className="h-3.5 w-3.5" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
        
        <Separator orientation="vertical" className="mx-1 h-5" />
        
        {/* Theme Toggle Button */}
        <Button
          variant="ghost"
          size="icon-xs"
          className="h-8 w-8 hover:text-primary rounded-md"
          onClick={toggleTheme}
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? (
            <IconSun className="h-4.5 w-4.5" />
          ) : (
            <IconMoon className="h-4.5 w-4.5" />
          )}
        </Button>

        {/* Inspector Collapse Toggle */}
        <Button
          variant="ghost"
          size="icon-xs"
          className="h-8 w-8 hover:text-primary rounded-md"
          onClick={() => setInspectorCollapsed(!inspectorCollapsed)}
          title={inspectorCollapsed ? "Expand Inspector Panel" : "Collapse Inspector Panel"}
        >
          {inspectorCollapsed ? (
            <IconLayoutSidebarRightExpand className="h-4.5 w-4.5" />
          ) : (
            <IconLayoutSidebarRightCollapse className="h-4.5 w-4.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
