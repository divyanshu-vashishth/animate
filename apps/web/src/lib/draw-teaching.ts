import {
  RIG_VIEWBOX,
  COMBAT_FOOT_LENGTH,
  COMBAT_HAND_RADIUS,
  COMBAT_HEAD_RADIUS_SCALE,
  createCombatLimbPrimitive,
  getRigPose,
  isCombatRig,
  resolveRigGeometry,
  type FaceState,
  type MouthShape,
  type RigBoneId,
  type ShapeKind,
  type EffectEntityData,
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
  rigId?: string;
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
  if (isCombatRig(options.rigId, pose.id)) {
    drawCombatBody(ctx, geometry, strokeColor);
    ctx.restore();
    return;
  }
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

function drawCombatBody(ctx: CanvasRenderingContext2D, geometry: ReturnType<typeof resolveRigGeometry>, color: string): void {
  const segments = new Map(geometry.segments.map((segment) => [segment.boneId, segment]));
  const drawOrder: RigBoneId[] = ["thighL", "calfL", "upperArmL", "forearmL", "torso", "thighR", "calfR", "upperArmR", "forearmR"];
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  for (const boneId of drawOrder) {
    const segment = segments.get(boneId);
    if (!segment) continue;
    const limb = createCombatLimbPrimitive(segment);
    const [a, b, c, d] = limb.polygon;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(segment.start.x, segment.start.y, limb.startRadius, 0, Math.PI * 2);
    ctx.arc(segment.end.x, segment.end.y, limb.endRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const boneId of ["forearmL", "forearmR"] as RigBoneId[]) {
    const hand = segments.get(boneId)?.end;
    if (!hand) continue;
    ctx.beginPath();
    ctx.arc(hand.x, hand.y, COMBAT_HAND_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineWidth = 8;
  for (const boneId of ["calfL", "calfR"] as RigBoneId[]) {
    const foot = segments.get(boneId)?.end;
    if (!foot) continue;
    ctx.beginPath();
    ctx.moveTo(foot.x - 2, foot.y);
    ctx.lineTo(foot.x + COMBAT_FOOT_LENGTH, foot.y);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(geometry.headCenter.x, geometry.headCenter.y, geometry.headRadius * COMBAT_HEAD_RADIUS_SCALE, 0, Math.PI * 2);
  ctx.fill();
}

export function drawEffectToCanvas(ctx: CanvasRenderingContext2D, entity: EffectEntityData, time: number): void {
  const span = Math.max(0.001, entity.endTime - entity.startTime);
  const progress = Math.max(0, Math.min(1, (time - entity.startTime) / span));
  const opacity = (entity.opacity ?? 1) * Math.sin(Math.PI * Math.min(1, progress + 0.05));
  const color = entity.color ?? "#FFFFFF";
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  if (entity.effect === "screenFlash") {
    ctx.fillRect(0, 0, 640, 360);
  } else if (entity.effect === "speedTrail") {
    ctx.translate(entity.transform.x - entity.width / 2, entity.transform.y - entity.height / 2);
    for (let index = 0; index < 5; index++) {
      const y = 12 + index * 12;
      ctx.globalAlpha = opacity * (0.92 - index * 0.12);
      ctx.lineWidth = 8 - index;
      ctx.beginPath();
      ctx.moveTo(6 + index * 5, y);
      ctx.lineTo(entity.width - 5 - index * 9, y - 3);
      ctx.stroke();
    }
  } else if (entity.effect === "afterimage") {
    drawRigToCanvas(ctx, { x: entity.transform.x, y: entity.transform.y, rotation: entity.transform.rotation,
      scaleX: entity.transform.scaleX, scaleY: entity.transform.scaleY, width: entity.width, height: entity.height,
      pose: "combat_crouch", rigId: "combat-vector-v2", strokeColor: color });
  } else if (entity.effect === "dust") {
    ctx.translate(entity.transform.x, entity.transform.y);
    for (const [x, y, rx, ry, alpha] of [[-15, -3, 14, 5, 0.55], [2, -7, 12, 6, 0.42], [18, -3, 9, 4, 0.32]] as const) {
      ctx.globalAlpha = opacity * alpha;
      ctx.beginPath();
      ctx.ellipse(x, y, rx * (0.8 + progress * 0.4), ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.translate(entity.transform.x, entity.transform.y);
    ctx.lineWidth = 5;
    for (let angle = 0; angle < 360; angle += 30) {
      ctx.save();
      ctx.rotate((angle * Math.PI) / 180);
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(28 + progress * 16, 0);
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 8 + progress * 14, 0, Math.PI * 2);
    ctx.fill();
  }
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
