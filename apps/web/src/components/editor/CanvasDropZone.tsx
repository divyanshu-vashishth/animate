"use client";

import React, { useState, useRef } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { spriteManifest, spriteUrl } from "@stickman/shared";
import { toast } from "sonner";

export function CanvasDropZone() {
  const document = useEditorStore((s) => s.document);
  const setDocument = useEditorStore((s) => s.setDocument);
  const timelineTime = useEditorStore((s) => s.timelineTime);
  const selectedEntityIds = useEditorStore((s) => s.selectedEntityIds);
  const setSelectedEntity = useEditorStore((s) => s.setSelectedEntity);

  // local drag coordinates state for pure mouse translation
  const [dragState, setDragState] = useState<{
    entityId: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!document) return;

    const clip = e.dataTransfer.getData("application/stickman-clip") || e.dataTransfer.getData("text/plain");
    if (!clip) return;

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    // Calculate coordinates relative to the white canvas!
    const x = Math.round(e.clientX - canvasRect.left);
    const y = Math.round(e.clientY - canvasRect.top);

    let newEntity: any = null;

    if (clip.startsWith("extras/prop/")) {
      const filename = clip.split("/").pop()!;
      const cleanName = filename.replace(".png", "");
      newEntity = {
        id: crypto.randomUUID(),
        type: "sprite",
        name: cleanName,
        layerId: document.layers[0]?.id || "default-layer",
        clip,
        transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
        startTime: 0,
        endTime: document.timeline?.duration ?? 5,
      };
    } else {
      const parsed = clip.split("/");
      if (parsed.length === 2) {
        const [character, action] = parsed;
        newEntity = {
          id: crypto.randomUUID(),
          type: "sprite",
          name: `${character} (${action})`,
          layerId: document.layers[0]?.id || "default-layer",
          clip,
          transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
          startTime: 0,
          endTime: document.timeline?.duration ?? 5,
        };
      }
    }

    if (newEntity) {
      const updatedEntities = [...document.entities, newEntity];
      setDocument({
        ...document,
        entities: updatedEntities,
      });
      setSelectedEntity(newEntity.id);
      toast.success(`Added ${newEntity.name} to canvas`);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, entityId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedEntity(entityId);

    const entity = document?.entities.find((item) => item.id === entityId);
    if (!entity) return;

    setDragState({
      entityId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: entity.transform.x,
      initialY: entity.transform.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState || !document) return;

    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;

    const nextEntities = document.entities.map((item) => {
      if (item.id === dragState.entityId) {
        return {
          ...item,
          transform: {
            ...item.transform,
            x: Math.round(dragState.initialX + dx),
            y: Math.round(dragState.initialY + dy),
          },
        };
      }
      return item;
    });

    setDocument({
      ...document,
      entities: nextEntities,
    });
  };

  const handleMouseUp = () => {
    setDragState(null);
  };

  // Filter visible entities according to playhead selection bounds
  const visibleEntities = (document?.entities || []).filter((entity: any) => {
    const start = entity.startTime ?? 0;
    const end = entity.endTime ?? 5;
    return timelineTime >= start && timelineTime <= end;
  });

  const activeBg = document?.stage.backgroundColor || "#FFFFFF";

  return (
    <div 
      className="flex h-full w-full items-center justify-center bg-neutral-900/80 p-8 select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 640x360 WHITE CANVAS CONTAINER */}
      <div
        ref={canvasRef}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={() => setSelectedEntity(null)}
        style={{ backgroundColor: activeBg }}
        className="relative h-[360px] w-[640px] shadow-2xl rounded-lg border border-border/10 overflow-hidden"
      >
        {/* BLACK BASE LINE */}
        <div 
          className="absolute left-0 right-0 bottom-[60px] h-[3px] bg-black opacity-80" 
          title="Base Ground Line" 
        />

        {/* DYNAMIC RENDERING OF VISIBLE ENTITIES */}
        {visibleEntities.map((entity: any) => {
          const isSelected = selectedEntityIds.includes(entity.id);

          // 1. SPRITE RENDER (Stickman character actions or standard prop assets)
          if (entity.type === "sprite") {
            const clip = entity.clip || "";
            let frameSrc = "";

            if (clip.startsWith("extras/prop/")) {
              const propName = clip.split("/").pop()!;
              frameSrc = `/sprites/Props/${propName}`;
            } else if (clip.startsWith("extras/background/")) {
              const bgName = clip.split("/").pop()!;
              frameSrc = `/sprites/Backgrounds/${bgName}`;
            } else {
              const parsed = clip.split("/");
              if (parsed.length === 2) {
                const [character, action] = parsed;
                const charData = (spriteManifest as any).characters[character];
                const clipData = charData ? charData[action] : null;
                if (clipData) {
                  const fps = clipData.fps || 10;
                  const frameIndex = Math.floor(timelineTime * fps) % clipData.frames.length;
                  const frameName = clipData.frames[frameIndex] || clipData.frames[0];
                  frameSrc = spriteUrl(clipData.folder, frameName);
                }
              }
            }

            return (
              <div
                key={entity.id}
                onMouseDown={(e) => handleMouseDown(e, entity.id)}
                style={{
                  position: "absolute",
                  left: `${entity.transform.x}px`,
                  top: `${entity.transform.y}px`,
                  transform: "translate(-50%, -100%)", // base anchor
                }}
                className={`p-1.5 cursor-grab active:cursor-grabbing rounded transition-shadow ${
                  isSelected
                    ? "outline-2 outline-dashed outline-sky-400 bg-sky-500/10 shadow-lg shadow-sky-500/10"
                    : "hover:outline-1 hover:outline-dashed hover:outline-muted-foreground/30"
                }`}
              >
                {frameSrc ? (
                  <img
                    src={frameSrc}
                    style={{
                      height: `${entity.width ?? 120}px`,
                      width: "auto",
                    }}
                    className="object-contain pointer-events-none select-none"
                    alt={entity.name}
                    onError={(e) => {
                      // Fallback in case of asset path issues
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="h-10 w-10 flex items-center justify-center bg-accent rounded text-[10px] text-muted-foreground">
                    Sprite
                  </div>
                )}
              </div>
            );
          }

          // 2. TEXT RENDER
          if (entity.type === "text") {
            return (
              <div
                key={entity.id}
                onMouseDown={(e) => handleMouseDown(e, entity.id)}
                style={{
                  position: "absolute",
                  left: `${entity.transform.x}px`,
                  top: `${entity.transform.y}px`,
                  fontSize: `${entity.fontSize ?? 24}px`,
                  color: entity.color ?? "#000000",
                  fontFamily: "var(--font-sans), sans-serif",
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                }}
                className={`px-3 py-1 cursor-grab active:cursor-grabbing rounded transition-shadow select-none ${
                  isSelected
                    ? "outline-2 outline-dashed outline-sky-400 bg-sky-500/10 shadow-lg shadow-sky-500/10"
                    : "hover:outline-1 hover:outline-dashed hover:outline-muted-foreground/30"
                }`}
              >
                {entity.text}
              </div>
            );
          }

          // 3. IMAGE RENDER (Custom Base64 uploads)
          if (entity.type === "image") {
            return (
              <div
                key={entity.id}
                onMouseDown={(e) => handleMouseDown(e, entity.id)}
                style={{
                  position: "absolute",
                  left: `${entity.transform.x}px`,
                  top: `${entity.transform.y}px`,
                  width: `${entity.width ?? 120}px`,
                  height: `${entity.height ?? 120}px`,
                  transform: "translate(-50%, -100%)", // base anchor
                }}
                className={`cursor-grab active:cursor-grabbing rounded transition-shadow overflow-hidden ${
                  isSelected
                    ? "outline-2 outline-dashed outline-sky-400 bg-sky-500/10 shadow-lg shadow-sky-500/10"
                    : "hover:outline-1 hover:outline-dashed hover:outline-muted-foreground/30"
                }`}
              >
                <img
                  src={entity.src}
                  className="h-full w-full object-contain pointer-events-none select-none"
                  alt={entity.name}
                />
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
