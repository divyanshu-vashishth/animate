"use client";

import React from "react";
import { useEditorStore } from "@/stores/editor-store";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EditorPanel } from "./editor-panel";
import { IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";

export function InspectorPanel({ className }: { className?: string }) {
  const document = useEditorStore((s) => s.document);
  const setDocument = useEditorStore((s) => s.setDocument);
  const selectedEntityIds = useEditorStore((s) => s.selectedEntityIds);
  const setSelectedEntity = useEditorStore((s) => s.setSelectedEntity);

  const duration = document?.timeline?.duration ?? 5;
  const entityId = selectedEntityIds[0];
  const entity = document?.entities.find((item) => item.id === entityId);

  if (!document) return null;

  if (!entity) {
    return (
      <EditorPanel title="Inspector" className={className ?? "max-h-48 shrink-0"}>
        <div className="flex h-full items-center justify-center p-4 text-center select-none">
          <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
            Select any canvas element or timeline layer to inspect properties
          </p>
        </div>
      </EditorPanel>
    );
  }

  // General state helper to update any property in the store
  const updateProperty = (key: string, val: any) => {
    const updatedEntities = document.entities.map((ent) => {
      if (ent.id === entity.id) {
        return {
          ...ent,
          [key]: val,
        };
      }
      return ent;
    });

    setDocument({
      ...document,
      entities: updatedEntities,
    });
  };

  const updateTransform = (key: string, val: number) => {
    const updatedEntities = document.entities.map((ent) => {
      if (ent.id === entity.id) {
        return {
          ...ent,
          transform: {
            ...ent.transform,
            [key]: val,
          },
        };
      }
      return ent;
    });

    setDocument({
      ...document,
      entities: updatedEntities,
    });
  };

  const handleDeleteEntity = () => {
    const updatedEntities = document.entities.filter((ent) => ent.id !== entity.id);
    setDocument({
      ...document,
      entities: updatedEntities,
    });
    setSelectedEntity(null);
    toast.success(`Removed layer "${entity.name || "element"}"`);
  };

  return (
    <EditorPanel title="Inspector" className={className ?? "max-h-none overflow-y-auto"}>
      <div className="flex flex-col gap-5 p-4 text-xs font-medium">
        
        {/* SECTION 1: IDENTITY & TYPE */}
        <div className="flex flex-col gap-2">
          <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 select-none">
            Layer Details
          </h4>
          <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-2 bg-muted/20 p-2.5 rounded-lg border border-border/20">
            <span className="text-muted-foreground select-none">Type</span>
            <span className="font-extrabold uppercase text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 w-fit">
              {entity.type}
            </span>
            <span className="text-muted-foreground select-none">Name</span>
            <Input
              value={entity.name}
              onChange={(e) => updateProperty("name", e.target.value)}
              className="h-7 text-xs font-semibold px-2 py-0.5 rounded border border-border/40 focus:border-primary"
            />
          </div>
        </div>

        {/* SECTION 2: CANVAS TRANSFORM */}
        <div className="flex flex-col gap-2">
          <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 select-none">
            Alignment
          </h4>
          <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-3">
            <Label htmlFor="inp-x" className="text-muted-foreground">X coord</Label>
            <Input
              id="inp-x"
              type="number"
              value={entity.transform.x}
              onChange={(e) => updateTransform("x", Math.round(Number(e.target.value)))}
              className="h-7.5 text-xs font-semibold"
            />

            <Label htmlFor="inp-y" className="text-muted-foreground">Y coord</Label>
            <Input
              id="inp-y"
              type="number"
              value={entity.transform.y}
              onChange={(e) => updateTransform("y", Math.round(Number(e.target.value)))}
              className="h-7.5 text-xs font-semibold"
            />

            {/* Custom image dimensions */}
            {entity.type === "image" && (
              <>
                <Label htmlFor="inp-w" className="text-muted-foreground">Width px</Label>
                <Input
                  id="inp-w"
                  type="number"
                  value={(entity as any).width ?? 120}
                  onChange={(e) => updateProperty("width", Math.max(10, Math.round(Number(e.target.value))))}
                  className="h-7.5 text-xs font-semibold"
                />

                <Label htmlFor="inp-h" className="text-muted-foreground">Height px</Label>
                <Input
                  id="inp-h"
                  type="number"
                  value={(entity as any).height ?? 120}
                  onChange={(e) => updateProperty("height", Math.max(10, Math.round(Number(e.target.value))))}
                  className="h-7.5 text-xs font-semibold"
                />
              </>
            )}
          </div>
        </div>

        {/* SECTION 3: TEXT CUSTOMIZATION */}
        {entity.type === "text" && (
          <div className="flex flex-col gap-2">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 select-none">
              Text Style
            </h4>
            <div className="flex flex-col gap-3.5 bg-muted/20 p-3 rounded-lg border border-border/20">
              <div className="flex flex-col gap-1">
                <Label htmlFor="inp-text" className="text-muted-foreground select-none mb-1">Text Value</Label>
                <textarea
                  id="inp-text"
                  value={(entity as any).text}
                  onChange={(e) => updateProperty("text", e.target.value)}
                  className="w-full h-16 rounded border p-2 bg-card border-border/40 text-xs font-semibold outline-none focus:border-primary"
                  placeholder="Enter custom text..."
                />
              </div>

              <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-2">
                <Label htmlFor="inp-size" className="text-muted-foreground select-none">Font Size</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="inp-size"
                    type="range"
                    min={8}
                    max={120}
                    step={1}
                    value={(entity as any).fontSize ?? 24}
                    onChange={(e) => updateProperty("fontSize", Number(e.target.value))}
                    className="h-1.5 flex-1 accent-primary rounded bg-neutral-900 cursor-pointer"
                  />
                  <span className="w-8 font-black text-right">{(entity as any).fontSize ?? 24}</span>
                </div>

                <Label htmlFor="inp-color" className="text-muted-foreground select-none">Color</Label>
                <div className="flex items-center gap-2.5">
                  <input
                    id="inp-color"
                    type="color"
                    value={(entity as any).color ?? "#000000"}
                    onChange={(e) => updateProperty("color", e.target.value)}
                    className="h-7 w-12 rounded cursor-pointer border border-border/30 bg-card"
                  />
                  <span className="font-mono text-[10px] uppercase font-black">
                    {(entity as any).color ?? "#000000"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: TIMELINE SLIDER LIFESPANS */}
        <div className="flex flex-col gap-2">
          <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 select-none">
            Timeline Span
          </h4>
          <div className="flex flex-col gap-3 bg-muted/20 p-3 rounded-lg border border-border/20">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                <span>Start Time</span>
                <span className="font-black">{(entity as any).startTime ?? 0}s</span>
              </div>
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={(entity as any).startTime ?? 0}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  const currentEnd = (entity as any).endTime ?? duration;
                  updateProperty("startTime", Math.min(val, currentEnd));
                }}
                className="h-1.5 w-full accent-primary rounded bg-neutral-900 cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                <span>End Time</span>
                <span className="font-black">{(entity as any).endTime ?? duration}s</span>
              </div>
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={(entity as any).endTime ?? duration}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  const currentStart = (entity as any).startTime ?? 0;
                  updateProperty("endTime", Math.max(val, currentStart));
                }}
                className="h-1.5 w-full accent-primary rounded bg-neutral-900 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: DELETE ELEMENT */}
        <div className="border-t border-border/30 pt-4 mt-2">
          <Button
            onClick={handleDeleteEntity}
            variant="destructive"
            className="w-full h-9 font-black text-xs gap-2 shadow-lg shadow-destructive/10 hover:scale-[1.01] transition-transform"
          >
            <IconTrash className="h-4 w-4 shrink-0" />
            Delete Layer
          </Button>
        </div>

      </div>
    </EditorPanel>
  );
}
