"use client";

import type { EffectEntityData } from "@stickman/shared";

export function EffectEntityView({ entity, time }: { entity: EffectEntityData; time: number }) {
  const span = Math.max(0.001, entity.endTime - entity.startTime);
  const progress = Math.max(0, Math.min(1, (time - entity.startTime) / span));
  const opacity = (entity.opacity ?? 1) * Math.sin(Math.PI * Math.min(1, progress + 0.05));
  const color = entity.color ?? "#FFFFFF";
  const common = {
    position: "absolute" as const,
    left: entity.effect === "screenFlash" ? 0 : entity.transform.x - entity.width / 2,
    top: entity.effect === "screenFlash" ? 0 : entity.transform.y - entity.height / 2,
    width: entity.effect === "screenFlash" ? "100%" : entity.width,
    height: entity.effect === "screenFlash" ? "100%" : entity.height,
    opacity,
    pointerEvents: "none" as const,
  };
  if (entity.effect === "screenFlash") return <div style={{ ...common, backgroundColor: color }} />;
  if (entity.effect === "speedTrail") {
    return (
      <svg style={common} viewBox="0 0 150 70" preserveAspectRatio="none">
        {[12, 25, 36, 49, 60].map((y, index) => (
          <line key={y} x1={6 + index * 5} y1={y} x2={145 - index * 9} y2={y - 3} stroke={color} strokeWidth={8 - index} strokeLinecap="round" opacity={0.92 - index * 0.12} />
        ))}
      </svg>
    );
  }
  if (entity.effect === "afterimage") {
    return (
      <svg style={common} viewBox="0 0 105 150" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="11">
        <circle cx="53" cy="24" r="15" fill={color} stroke="none" /><path d="M53 39 L52 88 M52 55 L22 78 M52 56 L83 72 M52 88 L27 137 M52 88 L79 137" />
      </svg>
    );
  }
  if (entity.effect === "dust") {
    return (
      <svg style={common} viewBox="0 0 54 20">
        <ellipse cx="12" cy="15" rx={10 + progress * 4} ry="4" fill={color} opacity="0.55" />
        <ellipse cx="29" cy="11" rx={8 + progress * 5} ry="5" fill={color} opacity="0.42" />
        <ellipse cx="44" cy="15" rx={7 + progress * 3} ry="3" fill={color} opacity="0.32" />
      </svg>
    );
  }
  const rays = Array.from({ length: 12 }, (_, index) => index * 30);
  return (
    <svg style={common} viewBox="-50 -50 100 100" overflow="visible">
      {rays.map((angle) => <line key={angle} x1="12" y1="0" x2={28 + progress * 16} y2="0" stroke={color} strokeWidth="5" strokeLinecap="round" transform={`rotate(${angle})`} />)}
      <circle r={8 + progress * 14} fill={color} />
    </svg>
  );
}
