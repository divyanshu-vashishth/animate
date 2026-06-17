"use client";

import type { ShapeEntityData } from "@stickman/shared";

interface ShapeEntityViewProps {
  entity: ShapeEntityData;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  width: number;
  height: number;
  isSelected: boolean;
  handleMouseDown: (e: React.MouseEvent, id: string) => void;
}

export function ShapeEntityView({
  entity,
  x,
  y,
  rotation,
  scaleX,
  scaleY,
  width,
  height,
  isSelected,
  handleMouseDown,
}: ShapeEntityViewProps) {
  const stroke = entity.strokeColor ?? "#111827";
  const fill = entity.fillColor ?? "transparent";
  const strokeWidth = entity.strokeWidth ?? 2;

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
        opacity: entity.opacity ?? 1,
        transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${scaleX}, ${scaleY})`,
      }}
      className={`cursor-grab active:cursor-grabbing transition-shadow ${
        isSelected
          ? "outline-2 outline-dashed outline-sky-400 bg-sky-500/10 shadow-lg shadow-sky-500/10"
          : "hover:outline-1 hover:outline-dashed hover:outline-muted-foreground/30"
      }`}
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible">
        <ShapeMarkup shape={entity.shape} width={width} height={height} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        {entity.text && (
          <text
            x={width / 2}
            y={height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            className="select-none fill-foreground text-[14px] font-bold"
          >
            {entity.text}
          </text>
        )}
      </svg>
    </div>
  );
}

function ShapeMarkup({
  shape,
  width,
  height,
  fill,
  stroke,
  strokeWidth,
}: {
  shape: ShapeEntityData["shape"];
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}) {
  const common = {
    fill,
    stroke,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (shape === "box") {
    return <rect x={2} y={2} width={width - 4} height={height - 4} rx={2} {...common} />;
  }
  if (shape === "rounded_box" || shape === "highlight") {
    return <rect x={2} y={2} width={width - 4} height={height - 4} rx={10} {...common} />;
  }
  if (shape === "circle") {
    return <ellipse cx={width / 2} cy={height / 2} rx={width / 2 - 4} ry={height / 2 - 4} {...common} />;
  }
  if (shape === "arrow") {
    return <path d={`M 4 ${height / 2} H ${width - 18} M ${width - 20} ${height / 2 - 10} L ${width - 4} ${height / 2} L ${width - 20} ${height / 2 + 10}`} {...common} />;
  }
  if (shape === "line" || shape === "underline") {
    return <line x1={4} y1={height / 2} x2={width - 4} y2={height / 2} {...common} />;
  }
  if (shape === "database") {
    return (
      <g {...common}>
        <ellipse cx={width / 2} cy={14} rx={width / 2 - 4} ry={12} />
        <path d={`M 4 14 V ${height - 16} A ${width / 2 - 4} 12 0 0 0 ${width - 4} ${height - 16} V 14`} />
        <path d={`M 4 ${height / 2} A ${width / 2 - 4} 12 0 0 0 ${width - 4} ${height / 2}`} />
      </g>
    );
  }
  if (shape === "cloud") {
    return <path d={`M ${width * 0.18} ${height * 0.64} C ${width * 0.03} ${height * 0.62}, ${width * 0.04} ${height * 0.25}, ${width * 0.32} ${height * 0.34} C ${width * 0.39} ${height * 0.02}, ${width * 0.72} ${height * 0.05}, ${width * 0.78} ${height * 0.36} C ${width * 1.03} ${height * 0.32}, ${width * 1.02} ${height * 0.72}, ${width * 0.74} ${height * 0.74} H ${width * 0.18} Z`} {...common} />;
  }
  if (shape === "check") {
    return <path d={`M ${width * 0.18} ${height * 0.54} L ${width * 0.42} ${height * 0.78} L ${width * 0.82} ${height * 0.2}`} {...common} />;
  }
  return <path d={`M ${width * 0.24} ${height * 0.24} L ${width * 0.76} ${height * 0.76} M ${width * 0.76} ${height * 0.24} L ${width * 0.24} ${height * 0.76}`} {...common} />;
}
