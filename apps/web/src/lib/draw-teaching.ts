import {
  RIG_VIEWBOX,
  getRigPose,
  resolveRigGeometry,
  type FaceState,
  type MouthShape,
  type RigBoneId,
  type ShapeKind,
} from "@stickman/shared";

type BoneOverrides = Partial<Record<RigBoneId, number>>;

export interface DrawRigOptions {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  width: number;
  height: number;
  pose: string;
  face?: FaceState;
  mouth?: MouthShape;
  boneRotations?: BoneOverrides;
  strokeColor?: string;
}

export interface DrawShapeOptions {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  width: number;
  height: number;
  shape: ShapeKind;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
  text?: string;
}

export function drawRigToCanvas(ctx: CanvasRenderingContext2D, options: DrawRigOptions): void {
  const pose = getRigPose(options.pose);
  const geometry = resolveRigGeometry(pose.id, options.boneRotations ?? {});
  const strokeColor = options.strokeColor ?? "#111827";

  ctx.save();
  ctx.translate(options.x, options.y);
  ctx.rotate((options.rotation * Math.PI) / 180);
  ctx.scale(options.scaleX, options.scaleY);
  ctx.translate(-options.width / 2, -options.height);
  ctx.scale(options.width / RIG_VIEWBOX.width, options.height / RIG_VIEWBOX.height);
  ctx.translate(-RIG_VIEWBOX.x, -RIG_VIEWBOX.y);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = strokeColor;
  for (const segment of geometry.segments) {
    if (segment.boneId === "head") continue;
    ctx.lineWidth = segment.strokeWidth;
    ctx.beginPath();
    ctx.moveTo(segment.start.x, segment.start.y);
    ctx.lineTo(segment.end.x, segment.end.y);
    ctx.stroke();
  }

  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(geometry.headCenter.x, geometry.headCenter.y, geometry.headRadius, 0, Math.PI * 2);
  ctx.stroke();
  drawRigFace(ctx, geometry.headCenter.x, geometry.headCenter.y, options.face ?? pose.face ?? "neutral", options.mouth ?? pose.mouth ?? "closed", strokeColor);
  ctx.restore();
}

function drawRigFace(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  face: FaceState,
  mouth: MouthShape,
  strokeColor: string
): void {
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = strokeColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx - 5, cy - 3, 1.6, 0, Math.PI * 2);
  ctx.arc(cx + 5, cy - 3, 1.6, 0, Math.PI * 2);
  ctx.fill();

  if (face === "confused" || face === "thinking") {
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 9);
    ctx.lineTo(cx - 2, cy - 11);
    ctx.moveTo(cx + 2, cy - 11);
    ctx.lineTo(cx + 8, cy - 9);
    ctx.stroke();
  } else if (face === "warning") {
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 10);
    ctx.lineTo(cx - 2, cy - 8);
    ctx.moveTo(cx + 2, cy - 8);
    ctx.lineTo(cx + 8, cy - 10);
    ctx.stroke();
  }

  ctx.beginPath();
  if (mouth === "oShape") {
    ctx.ellipse(cx, cy + 6, 3, 4, 0, 0, Math.PI * 2);
  } else if (mouth === "smallOpen" || mouth === "wideOpen") {
    ctx.ellipse(cx, cy + 6, mouth === "wideOpen" ? 6 : 4, mouth === "wideOpen" ? 4 : 2, 0, 0, Math.PI * 2);
  } else if (mouth === "smile" || face === "smile" || face === "happy") {
    ctx.moveTo(cx - 6, cy + 5);
    ctx.quadraticCurveTo(cx, cy + 11, cx + 6, cy + 5);
  } else {
    ctx.moveTo(cx - 5, cy + 6);
    ctx.lineTo(cx + 5, cy + 6);
  }
  ctx.stroke();
}

export function drawShapeToCanvas(ctx: CanvasRenderingContext2D, options: DrawShapeOptions): void {
  const stroke = options.strokeColor ?? "#111827";
  const fill = options.fillColor ?? "transparent";
  const lineWidth = options.strokeWidth ?? 2;
  const halfW = options.width / 2;
  const halfH = options.height / 2;

  ctx.save();
  ctx.globalAlpha = options.opacity ?? 1;
  ctx.translate(options.x, options.y);
  ctx.rotate((options.rotation * Math.PI) / 180);
  ctx.scale(options.scaleX, options.scaleY);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  ctx.lineWidth = lineWidth;

  if (options.shape === "box" || options.shape === "rounded_box" || options.shape === "highlight") {
    const radius = options.shape === "box" ? 2 : 10;
    roundedRect(ctx, -halfW, -halfH, options.width, options.height, radius);
    if (fill !== "transparent") ctx.fill();
    ctx.stroke();
  } else if (options.shape === "circle") {
    ctx.beginPath();
    ctx.ellipse(0, 0, halfW, halfH, 0, 0, Math.PI * 2);
    if (fill !== "transparent") ctx.fill();
    ctx.stroke();
  } else if (options.shape === "arrow") {
    ctx.beginPath();
    ctx.moveTo(-halfW, 0);
    ctx.lineTo(halfW - 14, 0);
    ctx.moveTo(halfW - 16, -10);
    ctx.lineTo(halfW, 0);
    ctx.lineTo(halfW - 16, 10);
    ctx.stroke();
  } else if (options.shape === "line" || options.shape === "underline") {
    ctx.beginPath();
    ctx.moveTo(-halfW, 0);
    ctx.lineTo(halfW, 0);
    ctx.stroke();
  } else if (options.shape === "database") {
    drawDatabase(ctx, halfW, halfH, fill);
  } else if (options.shape === "cloud") {
    drawCloud(ctx, halfW, halfH, fill);
  } else if (options.shape === "check") {
    ctx.beginPath();
    ctx.moveTo(-halfW * 0.65, 0);
    ctx.lineTo(-halfW * 0.15, halfH * 0.55);
    ctx.lineTo(halfW * 0.7, -halfH * 0.55);
    ctx.stroke();
  } else if (options.shape === "cross") {
    ctx.beginPath();
    ctx.moveTo(-halfW * 0.55, -halfH * 0.55);
    ctx.lineTo(halfW * 0.55, halfH * 0.55);
    ctx.moveTo(halfW * 0.55, -halfH * 0.55);
    ctx.lineTo(-halfW * 0.55, halfH * 0.55);
    ctx.stroke();
  }

  if (options.text) {
    ctx.fillStyle = stroke;
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(options.text, 0, 0, options.width - 12);
  }
  ctx.restore();
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawDatabase(ctx: CanvasRenderingContext2D, halfW: number, halfH: number, fill: string): void {
  ctx.beginPath();
  ctx.ellipse(0, -halfH + 12, halfW, 12, 0, 0, Math.PI * 2);
  if (fill !== "transparent") ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-halfW, -halfH + 12);
  ctx.lineTo(-halfW, halfH - 12);
  ctx.ellipse(0, halfH - 12, halfW, 12, 0, Math.PI, 0, true);
  ctx.lineTo(halfW, -halfH + 12);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, halfW, 12, 0, 0, Math.PI);
  ctx.stroke();
}

function drawCloud(ctx: CanvasRenderingContext2D, halfW: number, halfH: number, fill: string): void {
  ctx.beginPath();
  ctx.moveTo(-halfW * 0.62, halfH * 0.18);
  ctx.bezierCurveTo(-halfW * 0.9, halfH * 0.16, -halfW * 0.88, -halfH * 0.36, -halfW * 0.45, -halfH * 0.25);
  ctx.bezierCurveTo(-halfW * 0.35, -halfH * 0.78, halfW * 0.25, -halfH * 0.78, halfW * 0.34, -halfH * 0.28);
  ctx.bezierCurveTo(halfW * 0.86, -halfH * 0.34, halfW * 0.94, halfH * 0.18, halfW * 0.56, halfH * 0.24);
  ctx.closePath();
  if (fill !== "transparent") ctx.fill();
  ctx.stroke();
}
