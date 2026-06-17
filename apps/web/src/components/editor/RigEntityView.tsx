"use client";

import { useMemo, useRef, useState } from "react";
import {
  RIG_BONE_BY_ID,
  RIG_BONE_IDS,
  RIG_VIEWBOX,
  getRigPose,
  normalizeAngle,
  resolveRigGeometry,
  type FaceState,
  type MouthShape,
  type RigBoneId,
  type RigEntityData,
} from "@stickman/shared";

type EvaluateProperty = (
  document: unknown,
  entityId: string,
  property: string,
  time: number,
  defaultValue: unknown
) => unknown;

interface RigEntityViewProps {
  entity: RigEntityData;
  document: unknown;
  timelineTime: number;
  isSelected: boolean;
  isDraggingThis: boolean;
  evaluateProperty: EvaluateProperty;
  handleMouseDown: (e: React.MouseEvent, id: string) => void;
  onBoneRotationChange: (boneId: RigBoneId, rotation: number) => void;
}

export function RigEntityView({
  entity,
  document,
  timelineTime,
  isSelected,
  isDraggingThis,
  evaluateProperty,
  handleMouseDown,
  onBoneRotationChange,
}: RigEntityViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingBone, setDraggingBone] = useState<RigBoneId | null>(null);

  const x = isDraggingThis
    ? entity.transform.x
    : Number(evaluateProperty(document, entity.id, "transform.x", timelineTime, entity.transform.x));
  const y = isDraggingThis
    ? entity.transform.y
    : Number(evaluateProperty(document, entity.id, "transform.y", timelineTime, entity.transform.y));
  const rotation = Number(evaluateProperty(document, entity.id, "transform.rotation", timelineTime, entity.transform.rotation ?? 0));
  const scaleX = Number(evaluateProperty(document, entity.id, "transform.scaleX", timelineTime, entity.transform.scaleX ?? 1));
  const scaleY = Number(evaluateProperty(document, entity.id, "transform.scaleY", timelineTime, entity.transform.scaleY ?? 1));
  const width = Number(evaluateProperty(document, entity.id, "width", timelineTime, entity.width ?? 150));
  const height = Number(evaluateProperty(document, entity.id, "height", timelineTime, entity.height ?? 190));
  const pose = String(evaluateProperty(document, entity.id, "rig.pose", timelineTime, entity.pose || "idle_presenter"));
  const poseDef = getRigPose(pose);
  const face = String(evaluateProperty(document, entity.id, "rig.face", timelineTime, entity.face ?? poseDef.face ?? "neutral")) as FaceState;
  const mouth = String(evaluateProperty(document, entity.id, "rig.mouth", timelineTime, entity.mouth ?? poseDef.mouth ?? "closed")) as MouthShape;

  const boneRotations = useMemo(() => {
    const next: Partial<Record<RigBoneId, number>> = {};
    for (const boneId of RIG_BONE_IDS) {
      const fallback = entity.boneRotations?.[boneId] ?? 0;
      const value = evaluateProperty(document, entity.id, `rig.bones.${boneId}`, timelineTime, fallback);
      if (typeof value === "number") next[boneId] = value;
    }
    return next;
  }, [document, entity.boneRotations, entity.id, evaluateProperty, timelineTime]);

  const geometry = useMemo(() => resolveRigGeometry(pose, boneRotations), [pose, boneRotations]);

  const pointerToSvgPoint = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  };

  const updateDraggedBone = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingBone) return;
    const local = pointerToSvgPoint(event);
    if (!local) return;
    const segment = geometry.segments.find((item) => item.boneId === draggingBone);
    const bone = RIG_BONE_BY_ID[draggingBone];
    if (!segment || !bone) return;
    const angle = Math.atan2(local.y - segment.start.y, local.x - segment.start.x);
    onBoneRotationChange(draggingBone, normalizeAngle(angle - bone.baseAngle));
  };

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
      className={`cursor-grab active:cursor-grabbing transition-shadow ${
        isSelected
          ? "outline-2 outline-dashed outline-sky-400 bg-sky-500/10 shadow-lg shadow-sky-500/10"
          : "hover:outline-1 hover:outline-dashed hover:outline-muted-foreground/30"
      }`}
    >
      <svg
        ref={svgRef}
        viewBox={`${RIG_VIEWBOX.x} ${RIG_VIEWBOX.y} ${RIG_VIEWBOX.width} ${RIG_VIEWBOX.height}`}
        className="h-full w-full overflow-visible"
        onPointerMove={updateDraggedBone}
        onPointerUp={() => setDraggingBone(null)}
        onPointerLeave={() => setDraggingBone(null)}
      >
        <g fill="none" stroke="#111827" strokeLinecap="round" strokeLinejoin="round">
          {geometry.segments.map((segment) => {
            if (segment.boneId === "head") return null;
            return (
              <line
                key={segment.boneId}
                x1={segment.start.x}
                y1={segment.start.y}
                x2={segment.end.x}
                y2={segment.end.y}
                strokeWidth={segment.strokeWidth}
              />
            );
          })}
          <circle cx={geometry.headCenter.x} cy={geometry.headCenter.y} r={geometry.headRadius} strokeWidth={4} />
          <FaceMarks cx={geometry.headCenter.x} cy={geometry.headCenter.y} face={face} mouth={mouth} />
        </g>

        {isSelected && (
          <g>
            {geometry.segments
              .filter((segment) => segment.boneId !== "torso" && segment.boneId !== "head")
              .map((segment) => (
                <circle
                  key={`handle-${segment.boneId}`}
                  cx={segment.end.x}
                  cy={segment.end.y}
                  r={5}
                  className="cursor-crosshair fill-sky-400 stroke-white"
                  strokeWidth={2}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    svgRef.current?.setPointerCapture(event.pointerId);
                    setDraggingBone(segment.boneId);
                  }}
                />
              ))}
          </g>
        )}
      </svg>
    </div>
  );
}

function FaceMarks({ cx, cy, face, mouth }: { cx: number; cy: number; face: FaceState; mouth: MouthShape }) {
  const eyeY = cy - 3;
  const mouthY = cy + 6;
  const eyebrow =
    face === "warning"
      ? (
          <>
            <line x1={cx - 8} y1={cy - 10} x2={cx - 2} y2={cy - 8} strokeWidth={2} />
            <line x1={cx + 2} y1={cy - 8} x2={cx + 8} y2={cy - 10} strokeWidth={2} />
          </>
        )
      : face === "thinking" || face === "confused"
        ? (
            <>
              <line x1={cx - 8} y1={cy - 9} x2={cx - 2} y2={cy - 11} strokeWidth={2} />
              <line x1={cx + 2} y1={cy - 11} x2={cx + 8} y2={cy - 9} strokeWidth={2} />
            </>
          )
        : null;

  return (
    <>
      <circle cx={cx - 5} cy={eyeY} r={1.6} fill="#111827" stroke="none" />
      <circle cx={cx + 5} cy={eyeY} r={1.6} fill="#111827" stroke="none" />
      {eyebrow}
      {mouth === "oShape" ? (
        <ellipse cx={cx} cy={mouthY} rx={3} ry={4} strokeWidth={2} />
      ) : mouth === "smallOpen" || mouth === "wideOpen" ? (
        <ellipse cx={cx} cy={mouthY} rx={mouth === "wideOpen" ? 6 : 4} ry={mouth === "wideOpen" ? 4 : 2} strokeWidth={2} />
      ) : mouth === "smile" || face === "smile" || face === "happy" ? (
        <path d={`M ${cx - 6} ${mouthY - 1} Q ${cx} ${mouthY + 5} ${cx + 6} ${mouthY - 1}`} strokeWidth={2} />
      ) : (
        <line x1={cx - 5} y1={mouthY} x2={cx + 5} y2={mouthY} strokeWidth={2} />
      )}
    </>
  );
}
