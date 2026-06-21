"use client";

import React, { useState, useRef, useEffect } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { spriteManifest, spriteUrl } from "@stickman/shared";
import type { RigBoneId, ShapeKind } from "@stickman/shared";
import { toast } from "sonner";
import { createPresenterRigEntity, createShapeEntity } from "@/lib/teaching-entities";
import { RigEntityView } from "./RigEntityView";
import { ShapeEntityView } from "./ShapeEntityView";
import { EffectEntityView } from "./EffectEntityView";
import { evaluateProperty, getActiveKeyframeTime } from "@/lib/timeline-evaluator";

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
        const clipStart = getActiveKeyframeTime(document, entity.id, "spriteAnimation.clip", timelineTime);
        const frameIndex = Math.floor((timelineTime - clipStart) * fps) % clipData.frames.length;
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

    if (clip === "teaching/rig/presenter") {
      newEntity = createPresenterRigEntity(
        document.layers[0]?.id || "default-layer",
        x,
        y,
        document.timeline?.duration ?? 5
      );
    } else if (clip.startsWith("teaching/shape/")) {
      const kind = clip.replace("teaching/shape/", "") as ShapeKind;
      newEntity = createShapeEntity(
        kind,
        document.layers[0]?.id || "default-layer",
        x,
        y,
        document.timeline?.duration ?? 5
      );
    } else if (clip.startsWith("http") || clip.startsWith("data:")) {
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
      const docWidth = document.stage.width || 640;
      const docHeight = document.stage.height || 360;
      newEntity = {
        id: crypto.randomUUID(),
        type: "sprite" as const,
        name: cleanName,
        layerId: document.layers[0]?.id || "default-layer",
        clip,
        transform: { x: docWidth / 2, y: docHeight, rotation: 0, scaleX: 1, scaleY: 1 },
        startTime: 0,
        endTime: document.timeline?.duration ?? 5,
        width: docWidth,
        height: docHeight,
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

  const handleRigBoneRotationChange = (entityId: string, boneId: RigBoneId, rotation: number) => {
    if (!document) return;
    setDocument({
      ...document,
      entities: document.entities.map((item: any) => {
        if (item.id !== entityId || item.type !== "rig") return item;
        return {
          ...item,
          boneRotations: {
            ...(item.boneRotations ?? {}),
            [boneId]: rotation,
          },
        };
      }),
    });
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
  const layerOrder = new Map((document?.layers || []).map((layer) => [layer.id, layer.order]));
  const visibleEntities = (document?.entities || []).filter((entity: any) => {
    const start = entity.startTime ?? 0;
    const end = entity.endTime ?? document?.timeline?.duration ?? 10;
    return timelineTime >= start && timelineTime <= end;
  }).sort((a, b) => (layerOrder.get(a.layerId) ?? 0) - (layerOrder.get(b.layerId) ?? 0));

  const activeBg = document?.stage.backgroundColor || "#FFFFFF";

  return (
    <div 
      className="flex h-full w-full items-center justify-center bg-neutral-900/80 p-8 select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* DYNAMIC STAGE CANVAS CONTAINER */}
      <div
        ref={canvasRef}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={handleViewportClick}
        style={{ 
          backgroundColor: activeBg,
          width: `${document?.stage?.width || 640}px`,
          height: `${document?.stage?.height || 360}px`
        }}
        className="relative shadow-2xl rounded-lg border border-border/10 overflow-hidden transition-all duration-300 shrink-0"
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

          if (entity.type === "rig") {
            return (
              <RigEntityView
                key={entity.id}
                entity={entity}
                document={document}
                timelineTime={timelineTime}
                isSelected={isSelected}
                isDraggingThis={isDraggingThis}
                evaluateProperty={evaluateProperty}
                handleMouseDown={handleMouseDown}
                onBoneRotationChange={(boneId, value) => handleRigBoneRotationChange(entity.id, boneId, value)}
              />
            );
          }

          if (entity.type === "shape") {
            const fillColor = evaluateProperty(document, entity.id, "shape.fillColor", timelineTime, entity.fillColor ?? "transparent");
            const strokeColor = evaluateProperty(document, entity.id, "shape.strokeColor", timelineTime, entity.strokeColor ?? "#111827");
            const opacity = evaluateProperty(document, entity.id, "opacity", timelineTime, entity.opacity ?? 1);
            return (
              <ShapeEntityView
                key={entity.id}
                entity={{
                  ...entity,
                  fillColor: typeof fillColor === "string" ? fillColor : entity.fillColor,
                  strokeColor: typeof strokeColor === "string" ? strokeColor : entity.strokeColor,
                  opacity: typeof opacity === "number" ? opacity : entity.opacity,
                }}
                x={x}
                y={y}
                rotation={rotation}
                scaleX={scaleX}
                scaleY={scaleY}
                width={width}
                height={height}
                isSelected={isSelected}
                handleMouseDown={handleMouseDown}
              />
            );
          }

          if (entity.type === "effect") return <EffectEntityView key={entity.id} entity={entity} time={timelineTime} />;

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
