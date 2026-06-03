"use client";

import React, { useState, useRef, useEffect } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { spriteManifest, spriteUrl } from "@stickman/shared";
import { toast } from "sonner";

// Keyframe property evaluator to support smooth animations on canvas
const evaluateProperty = (document: any, entityId: string, property: string, time: number, defaultValue: any) => {
  if (!document || !document.timeline || !document.timeline.tracks) {
    return defaultValue;
  }
  const track = document.timeline.tracks.find(
    (t: any) => t.entityId === entityId && t.property === property
  );
  if (!track || !track.keyframes || track.keyframes.length === 0) {
    return defaultValue;
  }

  // Sort keyframes by ascending time
  const keyframes = [...track.keyframes].sort((a, b) => a.time - b.time);

  // Time is before or at the first keyframe
  if (time <= keyframes[0].time) {
    return keyframes[0].value;
  }
  // Time is after or at the last keyframe
  if (time >= keyframes[keyframes.length - 1].time) {
    return keyframes[keyframes.length - 1].value;
  }

  // Linear/Discrete interpolation between matching keyframes
  for (let i = 0; i < keyframes.length - 1; i++) {
    const kfA = keyframes[i];
    const kfB = keyframes[i + 1];
    if (time >= kfA.time && time <= kfB.time) {
      if (typeof kfA.value === "number" && typeof kfB.value === "number") {
        const ratio = (time - kfA.time) / (kfB.time - kfA.time);
        return kfA.value + (kfB.value - kfA.value) * ratio;
      }
      return kfA.value; // Discrete transition for strings, booleans, clips, texts
    }
  }
};

interface CanvasSpriteEntityProps {
  entity: any;
  document: any;
  timelineTime: number;
  isSelected: boolean;
  isDraggingThis: boolean;
  handleMouseDown: (e: React.MouseEvent, id: string) => void;
}

function CanvasSpriteEntity({
  entity,
  document,
  timelineTime,
  isSelected,
  isDraggingThis,
  handleMouseDown,
}: CanvasSpriteEntityProps) {
  const [hasError, setHasError] = useState(false);

  // Reset error state if entity clip/name changes
  useEffect(() => {
    setHasError(false);
  }, [entity.clip, entity.id]);

  // Resolve animated transformations
  const x = isDraggingThis 
    ? entity.transform.x 
    : evaluateProperty(document, entity.id, "transform.x", timelineTime, entity.transform.x);
  const y = isDraggingThis 
    ? entity.transform.y 
    : evaluateProperty(document, entity.id, "transform.y", timelineTime, entity.transform.y);
  const rotation = evaluateProperty(document, entity.id, "transform.rotation", timelineTime, entity.transform.rotation ?? 0);
  const scaleX = evaluateProperty(document, entity.id, "transform.scaleX", timelineTime, entity.transform.scaleX ?? 1);
  const scaleY = evaluateProperty(document, entity.id, "transform.scaleY", timelineTime, entity.transform.scaleY ?? 1);
  const width = evaluateProperty(document, entity.id, "width", timelineTime, entity.width ?? 120);
  const height = evaluateProperty(document, entity.id, "height", timelineTime, entity.height ?? 120);

  const clip = evaluateProperty(document, entity.id, "spriteAnimation.clip", timelineTime, entity.clip || "");
  let frameSrc = "";

  if (clip.startsWith("extras/prop/")) {
    const propName = clip.split("/").pop()!;
    frameSrc = `/sprites/Extras/${propName}`;
  } else if (clip.startsWith("extras/background/")) {
    const bgName = clip.split("/").pop()!;
    frameSrc = `/sprites/Extras/${bgName}`;
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

  // If there's no frameSrc or if it failed to load, and it is NOT selected, we render nothing.
  if ((!frameSrc || hasError) && !isSelected) {
    return null;
  }

  return (
    <div
      onMouseDown={(e) => handleMouseDown(e, entity.id)}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(-50%, -100%) rotate(${rotation}deg) scale(${scaleX}, ${scaleY})`,
      }}
      className={`cursor-grab active:cursor-grabbing rounded transition-shadow overflow-hidden ${
        isSelected
          ? "outline-2 outline-dashed outline-sky-400 bg-sky-500/10 shadow-lg shadow-sky-500/10"
          : "hover:outline-1 hover:outline-dashed hover:outline-muted-foreground/30"
      }`}
    >
      {frameSrc && !hasError ? (
        <img
          src={frameSrc}
          style={{
            width: "100%",
            height: "100%",
          }}
          className="object-contain pointer-events-none select-none"
          alt={entity.name}
          onError={() => {
            setHasError(true);
          }}
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-accent rounded text-[10px] text-muted-foreground select-none">
          {entity.name || "Sprite"} (Empty)
        </div>
      )}
    </div>
  );
}

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
  const draggedRef = useRef(false);

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

    if (clip.startsWith("http") || clip.startsWith("data:")) {
      newEntity = {
        id: crypto.randomUUID(),
        type: "image" as const,
        name: "Uploaded Element",
        layerId: document.layers[0]?.id || "default-layer",
        src: clip,
        transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
        startTime: 0,
        endTime: document.timeline?.duration ?? 5,
        width: 120,
        height: 120,
      };
    } else if (clip.startsWith("extras/prop/")) {
      const filename = clip.split("/").pop()!;
      const cleanName = filename.replace(".png", "");
      newEntity = {
        id: crypto.randomUUID(),
        type: "sprite" as const,
        name: cleanName,
        layerId: document.layers[0]?.id || "default-layer",
        clip,
        transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
        startTime: 0,
        endTime: document.timeline?.duration ?? 5,
        width: 120,
        height: 120,
      };
    } else if (clip.startsWith("extras/background/")) {
      const filename = clip.split("/").pop()!;
      const cleanName = filename.replace(".png", "");
      newEntity = {
        id: crypto.randomUUID(),
        type: "sprite" as const,
        name: cleanName,
        layerId: document.layers[0]?.id || "default-layer",
        clip,
        transform: { x: 320, y: 360, rotation: 0, scaleX: 1, scaleY: 1 },
        startTime: 0,
        endTime: document.timeline?.duration ?? 5,
        width: 640,
        height: 360,
      };
    } else {
      const parsed = clip.split("/");
      if (parsed.length === 2) {
        const [character, action] = parsed;
        newEntity = {
          id: crypto.randomUUID(),
          type: "sprite" as const,
          name: `${character} (${action})`,
          layerId: document.layers[0]?.id || "default-layer",
          clip,
          transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
          startTime: 0,
          endTime: document.timeline?.duration ?? 5,
          width: 120,
          height: 120,
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
    draggedRef.current = false;

    const entity = document?.entities.find((item) => item.id === entityId);
    if (!entity) return;

    // Use current active animated position as drag start initial baseline coordinates
    const curX = evaluateProperty(document, entityId, "transform.x", timelineTime, entity.transform.x);
    const curY = evaluateProperty(document, entityId, "transform.y", timelineTime, entity.transform.y);

    setDragState({
      entityId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: curX,
      initialY: curY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState || !document) return;

    draggedRef.current = true;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;

    const nextX = Math.round(dragState.initialX + dx);
    const nextY = Math.round(dragState.initialY + dy);

    // 1. Update coordinates in base entities list
    const nextEntities = document.entities.map((item) => {
      if (item.id === dragState.entityId) {
        return {
          ...item,
          transform: {
            ...item.transform,
            x: nextX,
            y: nextY,
          },
        };
      }
      return item;
    });

    // 2. Also update keyframes if tracks exist for transform.x or transform.y
    let nextTracks = document.timeline?.tracks || [];
    const hasTracks = nextTracks.some(
      (t: any) => t.entityId === dragState.entityId && (t.property === "transform.x" || t.property === "transform.y")
    );

    if (hasTracks) {
      nextTracks = nextTracks.map((track: any) => {
        if (track.entityId === dragState.entityId && (track.property === "transform.x" || track.property === "transform.y")) {
          const isX = track.property === "transform.x";
          const val = isX ? nextX : nextY;

          // Find if there is an existing keyframe close to the current time (within 0.05s)
          const keyframes = [...track.keyframes];
          const existingKfIndex = keyframes.findIndex((kf: any) => Math.abs(kf.time - timelineTime) < 0.05);

          if (existingKfIndex !== -1) {
            keyframes[existingKfIndex] = {
              ...keyframes[existingKfIndex],
              value: val,
            };
          } else {
            keyframes.push({ time: timelineTime, value: val });
            keyframes.sort((a: any, b: any) => a.time - b.time);
          }

          return {
            ...track,
            keyframes,
          };
        }
        return track;
      });
    }

    setDocument({
      ...document,
      entities: nextEntities,
      timeline: {
        ...document.timeline,
        tracks: nextTracks,
      } as any,
    });
  };

  const handleMouseUp = () => {
    setDragState(null);
  };

  const handleViewportClick = (e: React.MouseEvent) => {
    if (draggedRef.current) {
      // Just finished dragging, consume the click event without deselecting
      draggedRef.current = false;
      return;
    }
    if (e.target === e.currentTarget) {
      setSelectedEntity(null);
    }
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
        onClick={handleViewportClick}
        style={{ backgroundColor: activeBg }}
        className="relative h-[360px] w-[640px] shadow-2xl rounded-lg border border-border/10 overflow-hidden"
      >
        {/* BLACK BASE LINE */}
        <div 
          className="absolute left-0 right-0 bottom-[60px] h-[3px] bg-black opacity-85" 
          title="Base Ground Line" 
        />

        {/* DYNAMIC RENDERING OF VISIBLE ENTITIES */}
        {visibleEntities.map((entity: any) => {
          const isSelected = selectedEntityIds.includes(entity.id);
          const isDraggingThis = !!(dragState && dragState.entityId === entity.id);

          // Resolve animated transformations
          const x = isDraggingThis 
            ? entity.transform.x 
            : evaluateProperty(document, entity.id, "transform.x", timelineTime, entity.transform.x);
          const y = isDraggingThis 
            ? entity.transform.y 
            : evaluateProperty(document, entity.id, "transform.y", timelineTime, entity.transform.y);
          const rotation = evaluateProperty(document, entity.id, "transform.rotation", timelineTime, entity.transform.rotation ?? 0);
          const scaleX = evaluateProperty(document, entity.id, "transform.scaleX", timelineTime, entity.transform.scaleX ?? 1);
          const scaleY = evaluateProperty(document, entity.id, "transform.scaleY", timelineTime, entity.transform.scaleY ?? 1);
          const width = evaluateProperty(document, entity.id, "width", timelineTime, entity.width ?? 120);
          const height = evaluateProperty(document, entity.id, "height", timelineTime, entity.height ?? 120);

          // 1. SPRITE RENDER (Stickman character actions or standard prop assets)
          if (entity.type === "sprite") {
            return (
              <CanvasSpriteEntity
                key={entity.id}
                entity={entity}
                document={document}
                timelineTime={timelineTime}
                isSelected={isSelected}
                isDraggingThis={isDraggingThis}
                handleMouseDown={handleMouseDown}
              />
            );
          }

          // 2. TEXT RENDER
          if (entity.type === "text") {
            const text = evaluateProperty(document, entity.id, "text", timelineTime, entity.text || "");
            const fontSize = evaluateProperty(document, entity.id, "fontSize", timelineTime, entity.fontSize ?? 24);
            const color = evaluateProperty(document, entity.id, "color", timelineTime, entity.color ?? "#000000");

            return (
              <div
                key={entity.id}
                onMouseDown={(e) => handleMouseDown(e, entity.id)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "absolute",
                  left: `${x}px`,
                  top: `${y}px`,
                  fontSize: `${fontSize}px`,
                  color: color,
                  fontFamily: "var(--font-sans), sans-serif",
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                  transform: `rotate(${rotation}deg) scale(${scaleX}, ${scaleY})`,
                }}
                className={`px-3 py-1 cursor-grab active:cursor-grabbing rounded transition-shadow select-none ${
                  isSelected
                    ? "outline-2 outline-dashed outline-sky-400 bg-sky-500/10 shadow-lg shadow-sky-500/10"
                    : "hover:outline-1 hover:outline-dashed hover:outline-muted-foreground/30"
                }`}
              >
                {text}
              </div>
            );
          }

          // 3. IMAGE RENDER (Custom Base64 uploads)
          if (entity.type === "image") {
            const height = evaluateProperty(document, entity.id, "height", timelineTime, entity.height ?? 120);

            return (
              <div
                key={entity.id}
                onMouseDown={(e) => handleMouseDown(e, entity.id)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "absolute",
                  left: `${x}px`,
                  top: `${y}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                  transform: `translate(-50%, -100%) rotate(${rotation}deg) scale(${scaleX}, ${scaleY})`,
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
