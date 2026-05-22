"use client";

import { useEffect, useRef } from "react";
import { AnimationEngine } from "@stickman/engine";
import { spriteManifest } from "@stickman/shared";
import { commandBus } from "@/lib/command-bus";
import { useEditorStore } from "@/stores/editor-store";
import { STAGE_WIDTH, STAGE_HEIGHT } from "@stickman/shared";
import type { ProjectDocument, SpriteManifest } from "@stickman/shared";

interface EngineCanvasProps {
  width?: number;
  height?: number;
}

export function EngineCanvas({ width, height }: EngineCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AnimationEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeToolRef = useRef(useEditorStore.getState().activeTool);
  const setSelectedEntity = useEditorStore((s) => s.setSelectedEntity);
  const setDocument = useEditorStore((s) => s.setDocument);
  const setTimelineTime = useEditorStore((s) => s.setTimelineTime);
  const activeTool = useEditorStore((s) => s.activeTool);
  const document = useEditorStore((s) => s.document);

  activeToolRef.current = activeTool;

  // Mount engine once; do not recreate on tool change
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let cancelled = false;
    let engineReady = false;

    const rect = container.getBoundingClientRect();
    const w = width ?? (Math.floor(rect.width) || STAGE_WIDTH);
    const h = height ?? (Math.floor(rect.height) || STAGE_HEIGHT);

    const engine = new AnimationEngine(
      spriteManifest as SpriteManifest,
      w,
      h
    );
    engineRef.current = engine;

    commandBus.setHandler((cmd) => engine.dispatch(cmd));

    engine.on("selectionChange", (id) => setSelectedEntity(id));
    engine.on("documentChange", (doc) => setDocument(doc));
    engine.on("timelineTime", (time) => setTimelineTime(time));

    let isPanning = false;
    let lastX = 0;
    let lastY = 0;
    let draggedEntity: string | null = null;

    const onPointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (
        activeToolRef.current === "pan" ||
        e.button === 1 ||
        (e.button === 0 && e.altKey)
      ) {
        isPanning = true;
        lastX = x;
        lastY = y;
        return;
      }

      const hit = engine.hitTest(x, y);
      if (hit) {
        engine.dispatch({ type: "SelectEntity", entityId: hit });
        draggedEntity = hit;
        lastX = x;
        lastY = y;
      } else {
        engine.dispatch({ type: "SelectEntity", entityId: null });
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (isPanning) {
        engine.dispatch({ type: "CameraPan", dx: x - lastX, dy: y - lastY });
        lastX = x;
        lastY = y;
        return;
      }

      if (draggedEntity) {
        const world = engine.camera.screenToWorld(x, y);
        engine.dispatch({
          type: "MoveEntity",
          entityId: draggedEntity,
          x: world.x,
          y: world.y,
        });
      }
    };

    const onPointerUp = () => {
      isPanning = false;
      draggedEntity = null;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      engine.dispatch({ type: "CameraZoom", scale: engine.camera.zoom * delta });
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    void engine.init(canvas).then(() => {
      if (cancelled) {
        engine.destroy();
        engineRef.current = null;
        return;
      }
      engineReady = true;
      const doc = useEditorStore.getState().document;
      if (doc) {
        engine.dispatch({ type: "LoadDocument", document: doc });
      }
    });

    return () => {
      cancelled = true;
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      commandBus.setHandler(() => {});
      if (engineReady) {
        engine.destroy();
      }
      engineRef.current = null;
    };
  }, [width, height, setSelectedEntity, setDocument, setTimelineTime]);

  // Load project document when fetched from API (not on every engine sync)
  const projectId = useEditorStore((s) => s.projectId);
  const lastLoadedProjectRef = useRef<string | null>(null);
  useEffect(() => {
    if (!document || !engineRef.current || !projectId) return;
    if (lastLoadedProjectRef.current === projectId) return;
    lastLoadedProjectRef.current = projectId;
    engineRef.current.dispatch({ type: "LoadDocument", document });
  }, [document, projectId]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-background">
      <canvas ref={canvasRef} className="h-full w-full touch-none" />
    </div>
  );
}
