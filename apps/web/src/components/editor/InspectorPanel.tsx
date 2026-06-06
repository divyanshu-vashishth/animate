"use client";

import React from "react";
import { useEditorStore } from "@/stores/editor-store";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EditorPanel } from "./editor-panel";
import { IconTrash, IconMusic, IconArrowUp, IconArrowDown, IconArrowBarUp, IconArrowBarDown } from "@tabler/icons-react";
import { toast } from "sonner";

export function InspectorPanel({ className }: { className?: string }) {
  const document = useEditorStore((s) => s.document);
  const setDocument = useEditorStore((s) => s.setDocument);
  const selectedEntityIds = useEditorStore((s) => s.selectedEntityIds);
  const setSelectedEntity = useEditorStore((s) => s.setSelectedEntity);
  const selectedAudioTrackId = useEditorStore((s) => s.selectedAudioTrackId);
  const setSelectedAudioTrack = useEditorStore((s) => s.setSelectedAudioTrack);
  const reorderEntity = useEditorStore((s) => s.reorderEntity);

  const duration = document?.timeline?.duration ?? 10;
  const entityId = selectedEntityIds[0];
  const entity = document?.entities.find((item) => item.id === entityId);
  const track = document?.audioTracks?.find((item) => item.id === selectedAudioTrackId);

  if (!document) return null;

  if (!entity && !track) {
    return (
      <EditorPanel title="Inspector" className={className ?? "max-h-48 shrink-0"}>
        <div className="flex h-full items-center justify-center p-4 text-center select-none">
          <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
            Select any canvas element or timeline layer/music track to inspect properties
          </p>
        </div>
      </EditorPanel>
    );
  }

  // Audio track update helpers
  const updateTrackProperty = (key: string, val: any) => {
    if (!track) return;
    const updated = document.audioTracks?.map((t) => {
      if (t.id === track.id) {
        return {
          ...t,
          [key]: val,
        };
      }
      return t;
    }) || [];

    setDocument({
      ...document,
      audioTracks: updated,
    });
  };

  const handleDeleteTrack = () => {
    if (!track) return;
    const updated = document.audioTracks?.filter((t) => t.id !== track.id) || [];
    setDocument({
      ...document,
      audioTracks: updated,
    });
    setSelectedAudioTrack(null);
    toast.success(`Removed soundtrack "${track.name}"`);
  };

  if (track) {
    return (
      <EditorPanel title="Music Inspector" className={className ?? "max-h-none overflow-y-auto"}>
        <div className="flex flex-col gap-5 p-4 text-xs font-medium">
          
          {/* SECTION 1: DETAILS */}
          <div className="flex flex-col gap-2">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 select-none">
              Audio Details
            </h4>
            <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-2 bg-muted/20 p-2.5 rounded-lg border border-border/20">
              <span className="text-muted-foreground select-none">Type</span>
              <span className="font-extrabold uppercase text-[10px] text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded border border-purple-400/20 w-fit">
                Soundtrack
              </span>
              <span className="text-muted-foreground select-none">Name</span>
              <Input
                value={track.name}
                onChange={(e) => updateTrackProperty("name", e.target.value)}
                className="h-7 text-xs font-semibold px-2 py-0.5 rounded border border-border/40 focus:border-purple-400"
              />
            </div>
          </div>

          {/* SECTION 2: VOLUME CONTROL */}
          <div className="flex flex-col gap-2">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 select-none">
              Volume Settings
            </h4>
            <div className="flex flex-col gap-3 bg-muted/20 p-3 rounded-lg border border-border/20">
              <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                <span>Volume Level</span>
                <span className="font-black">{Math.round((track.volume ?? 0.8) * 100)}%</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={track.volume ?? 0.8}
                  onChange={(e) => updateTrackProperty("volume", parseFloat(e.target.value))}
                  className="h-1.5 flex-1 accent-[#8b3dff] rounded bg-neutral-900 cursor-pointer"
                />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={Math.round((track.volume ?? 0.8) * 100)}
                  onChange={(e) => {
                    const percent = Math.max(0, Math.min(100, Number(e.target.value)));
                    updateTrackProperty("volume", percent / 100);
                  }}
                  className="h-7.5 w-14 shrink-0 text-center text-xs font-semibold p-1"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: VISUAL MUSIC SEGMENT TRIMMER */}
          <div className="flex flex-col gap-2">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 select-none">
              Music Trimmer
            </h4>
            <div className="bg-muted/20 p-3 rounded-lg border border-border/20 flex flex-col gap-4">
              
              {/* Waveform Crop Area */}
              <div className="relative h-14 bg-neutral-950/80 rounded-md border border-border/20 overflow-hidden flex items-center justify-center">
                {/* Waveform Background */}
                <div className="absolute inset-0 flex items-center justify-between px-2 opacity-20">
                  {Array.from({ length: 42 }).map((_, idx) => {
                    const heights = [40, 20, 60, 30, 80, 50, 70, 90, 45, 65, 35, 75, 55, 85, 25, 65, 40, 55, 75, 30, 60, 45, 80, 20, 50, 75, 40, 90, 35, 70, 55, 85, 25, 65, 40, 50, 75, 30, 60, 45, 80, 40];
                    const h = heights[idx % heights.length];
                    return (
                      <div 
                        key={idx} 
                        className="w-[2px] bg-purple-400 rounded-full shrink-0"
                        style={{ height: `${h}%` }}
                      />
                    );
                  })}
                </div>

                {/* Selected Segment Highlight Overlay */}
                {(() => {
                  const songTotalLength = 180; // assume typical 3 min audio asset length
                  const startOffset = track.audioStartOffset ?? 0;
                  const playDuration = track.duration ?? 10;
                  
                  const leftPercent = (startOffset / songTotalLength) * 100;
                  const widthPercent = (playDuration / songTotalLength) * 100;

                  return (
                    <div 
                      style={{
                        left: `${Math.min(95, leftPercent)}%`,
                        width: `${Math.max(5, Math.min(100 - leftPercent, widthPercent))}%`,
                      }}
                      className="absolute top-0 bottom-0 bg-[#8b3dff]/20 border-x-2 border-[#8b3dff] flex items-center justify-center transition-all"
                    >
                      {/* Inner Highlighted Waveform */}
                      <div className="w-full h-full flex items-center justify-between px-1 overflow-hidden pointer-events-none opacity-90">
                        {Array.from({ length: 24 }).map((_, idx) => {
                          const heights = [60, 30, 80, 50, 70, 90, 45, 65, 35, 75, 55, 85, 25, 65, 40, 55, 75, 30, 60, 45, 80, 20, 50, 75];
                          const h = heights[idx % heights.length];
                          return (
                            <div 
                              key={idx} 
                              className="w-[2px] bg-purple-300 rounded-full shrink-0"
                              style={{ height: `${h}%` }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Centered current timeframe display */}
                <div className="absolute bottom-1 right-2 bg-neutral-950/90 px-1.5 py-0.5 rounded text-[8px] font-bold text-purple-300 border border-purple-500/20">
                  {Math.floor((track.audioStartOffset ?? 0) / 60)}:
                  {String(Math.floor((track.audioStartOffset ?? 0) % 60)).padStart(2, "0")} - {Math.floor(((track.audioStartOffset ?? 0) + track.duration) / 60)}:
                  {String(Math.floor(((track.audioStartOffset ?? 0) + track.duration) % 60)).padStart(2, "0")}
                </div>
              </div>

              {/* Sliders with friendly names */}
              <div className="flex flex-col gap-3.5">
                
                {/* 1. Starts At (Timeline Location) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                    <span>Starts at (in video)</span>
                    <span className="font-black">{(track.startTime ?? 0).toFixed(1)}s</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={duration}
                      step={0.1}
                      value={track.startTime ?? 0}
                      onChange={(e) => updateTrackProperty("startTime", Number(e.target.value))}
                      className="h-1.5 flex-1 accent-[#8b3dff] rounded bg-neutral-900 cursor-pointer"
                    />
                    <Input
                      type="number"
                      min={0}
                      max={duration}
                      step={0.1}
                      value={Number((track.startTime ?? 0).toFixed(1))}
                      onChange={(e) => updateTrackProperty("startTime", Math.max(0, Math.min(duration, Number(e.target.value))))}
                      className="h-7.5 w-14 shrink-0 text-center text-xs font-semibold p-1"
                    />
                  </div>
                </div>

                {/* 2. Song Section (Start Trim) */}
                <div className="flex flex-col gap-1.5 border-t border-border/10 pt-3">
                  <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                    <span>Song Section (Start)</span>
                    <span className="font-black">{(track.audioStartOffset ?? 0)}s</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={180}
                      step={1}
                      value={track.audioStartOffset ?? 0}
                      onChange={(e) => updateTrackProperty("audioStartOffset", Number(e.target.value))}
                      className="h-1.5 flex-1 accent-[#8b3dff] rounded bg-neutral-900 cursor-pointer"
                    />
                    <Input
                      type="number"
                      min={0}
                      max={300}
                      value={track.audioStartOffset ?? 0}
                      onChange={(e) => updateTrackProperty("audioStartOffset", Math.max(0, Number(e.target.value)))}
                      className="h-7.5 w-14 shrink-0 text-center text-xs font-semibold p-1"
                    />
                  </div>
                </div>

                {/* 3. Play Length */}
                <div className="flex flex-col gap-1.5 border-t border-border/10 pt-3">
                  <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                    <span>Play Length</span>
                    <span className="font-black">{track.duration}s</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={duration}
                      step={1}
                      value={track.duration}
                      onChange={(e) => updateTrackProperty("duration", Number(e.target.value))}
                      className="h-1.5 flex-1 accent-[#8b3dff] rounded bg-neutral-900 cursor-pointer"
                    />
                    <Input
                      type="number"
                      min={1}
                      max={duration}
                      value={track.duration}
                      onChange={(e) => updateTrackProperty("duration", Math.max(1, Number(e.target.value)))}
                      className="h-7.5 w-14 shrink-0 text-center text-xs font-semibold p-1"
                    />
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* SECTION 5: DELETE */}
          <div className="border-t border-border/30 pt-4 mt-2">
            <Button
              onClick={handleDeleteTrack}
              variant="destructive"
              className="w-full h-9 text-xs gap-2 shadow-lg shadow-rose-500/10 hover:scale-[1.01] transition-transform"
            >
              <IconTrash className="h-4 w-4 shrink-0" />
              Delete Soundtrack
            </Button>
          </div>

        </div>
      </EditorPanel>
    );
  }

  if (!entity) return null;

  // General state helper to update any property in the store
  const updateProperty = (key: string, val: any) => {
    if (!entity) return;
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
    if (!entity) return;
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
    if (!entity) return;
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

            <Label htmlFor="inp-rot" className="text-muted-foreground">Rotation</Label>
            <div className="flex items-center gap-2">
              <input
                id="inp-rot"
                type="range"
                min={-180}
                max={180}
                step={1}
                value={entity.transform.rotation ?? 0}
                onChange={(e) => updateTransform("rotation", Number(e.target.value))}
                className="h-1.5 flex-1 accent-primary rounded bg-neutral-900 cursor-pointer"
              />
              <Input
                type="number"
                value={entity.transform.rotation ?? 0}
                onChange={(e) => updateTransform("rotation", Number(e.target.value))}
                className="h-7.5 w-12 shrink-0 text-center text-xs font-semibold p-1"
              />
              <span className="text-[10px] font-bold text-muted-foreground shrink-0">deg</span>
            </div>

            <Label className="text-muted-foreground">Flip Sprite</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={entity.transform.scaleX === -1 ? "default" : "outline"}
                size="sm"
                onClick={() => updateTransform("scaleX", entity.transform.scaleX === -1 ? 1 : -1)}
                className="flex-1 text-[10px] h-7 font-semibold"
              >
                Horizontal
              </Button>
              <Button
                type="button"
                variant={entity.transform.scaleY === -1 ? "default" : "outline"}
                size="sm"
                onClick={() => updateTransform("scaleY", entity.transform.scaleY === -1 ? 1 : -1)}
                className="flex-1 text-[10px] h-7 font-semibold"
              >
                Vertical
              </Button>
            </div>

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

            {entity.type === "sprite" && (
              <>
                <Label htmlFor="inp-sprite-w" className="text-muted-foreground">Width px</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="inp-sprite-w"
                    type="range"
                    min={10}
                    max={640}
                    step={5}
                    value={(entity as any).width ?? 120}
                    onChange={(e) => updateProperty("width", Number(e.target.value))}
                    className="h-1.5 flex-1 accent-primary rounded bg-neutral-900 cursor-pointer"
                  />
                  <span className="w-10 font-black text-right">{(entity as any).width ?? 120}px</span>
                </div>

                <Label htmlFor="inp-sprite-h" className="text-muted-foreground">Height px</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="inp-sprite-h"
                    type="range"
                    min={10}
                    max={400}
                    step={5}
                    value={(entity as any).height ?? 120}
                    onChange={(e) => updateProperty("height", Number(e.target.value))}
                    className="h-1.5 flex-1 accent-primary rounded bg-neutral-900 cursor-pointer"
                  />
                  <span className="w-10 font-black text-right">{(entity as any).height ?? 120}px</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* SECTION: ARRANGEMENT / LAYERING */}
        <div className="flex flex-col gap-2">
          <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 select-none">
            Arrangement
          </h4>
          <div className="grid grid-cols-2 gap-2 bg-muted/20 p-2.5 rounded-lg border border-border/20">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                reorderEntity(entity.id, "up");
                toast.success(`Moved "${entity.name || "element"}" forward`);
              }}
              className="h-8 text-[10px] font-bold gap-1 hover:border-primary/40"
              title="Bring Forward"
            >
              <IconArrowUp className="h-3.5 w-3.5" />
              Bring Forward
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                reorderEntity(entity.id, "down");
                toast.success(`Moved "${entity.name || "element"}" backward`);
              }}
              className="h-8 text-[10px] font-bold gap-1 hover:border-primary/40"
              title="Send Backward"
            >
              <IconArrowDown className="h-3.5 w-3.5" />
              Send Backward
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                reorderEntity(entity.id, "top");
                toast.success(`Brought "${entity.name || "element"}" to front`);
              }}
              className="h-8 text-[10px] font-bold gap-1 hover:border-primary/40 col-span-1"
              title="Bring to Front"
            >
              <IconArrowBarUp className="h-3.5 w-3.5" />
              Bring to Front
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                reorderEntity(entity.id, "bottom");
                toast.success(`Sent "${entity.name || "element"}" to back`);
              }}
              className="h-8 text-[10px] font-bold gap-1 hover:border-primary/40 col-span-1"
              title="Send to Back"
            >
              <IconArrowBarDown className="h-3.5 w-3.5" />
              Send to Back
            </Button>
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
