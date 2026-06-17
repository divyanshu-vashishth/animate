import { Container, Graphics } from "pixi.js";
import {
  DEFAULT_RIG_BONES,
  TEACHING_RIG_POSES,
  getRigPose,
  resolveRigGeometry,
  type FaceState,
  type MouthShape,
  type RigBoneDef,
  type RigPose,
} from "@stickman/shared";

export type BoneDef = RigBoneDef;
export type PoseDef = RigPose;

export const DEFAULT_BONES = DEFAULT_RIG_BONES;
export const DEFAULT_POSES = Object.values(TEACHING_RIG_POSES);

export class StickmanRigRenderer {
  build(container: Container, boneRotations: Record<string, number>): void {
    this.drawRig(container, "idle_presenter", boneRotations);
  }

  applyPose(
    container: Container,
    poseId: string,
    overrides: Record<string, number> = {},
    face?: FaceState,
    mouth?: MouthShape
  ): void {
    this.drawRig(container, poseId, overrides, face, mouth);
  }

  private drawRig(
    container: Container,
    poseId: string,
    overrides: Record<string, number>,
    face?: FaceState,
    mouth?: MouthShape
  ): void {
    container.removeChildren();
    const pose = getRigPose(poseId);
    const geometry = resolveRigGeometry(pose.id, overrides);
    const graphics = new Graphics();
    const color = 0xffffff;

    for (const segment of geometry.segments) {
      if (segment.boneId === "head") continue;
      graphics.moveTo(segment.start.x, segment.start.y);
      graphics.lineTo(segment.end.x, segment.end.y);
      graphics.stroke({ width: segment.strokeWidth, color });
    }

    graphics.circle(geometry.headCenter.x, geometry.headCenter.y, geometry.headRadius);
    graphics.stroke({ width: 4, color });

    this.drawFace(graphics, geometry.headCenter.x, geometry.headCenter.y, face ?? pose.face ?? "neutral", mouth ?? pose.mouth ?? "closed");
    container.addChild(graphics);
  }

  private drawFace(
    graphics: Graphics,
    cx: number,
    cy: number,
    face: FaceState,
    mouth: MouthShape
  ): void {
    const eyeY = cy - 3;
    const mouthY = cy + 6;
    graphics.circle(cx - 5, eyeY, 1.5);
    graphics.circle(cx + 5, eyeY, 1.5);
    graphics.stroke({ width: 2, color: 0xffffff });

    if (face === "confused" || face === "thinking") {
      graphics.moveTo(cx - 8, cy - 9);
      graphics.lineTo(cx - 2, cy - 11);
      graphics.moveTo(cx + 2, cy - 11);
      graphics.lineTo(cx + 8, cy - 9);
      graphics.stroke({ width: 2, color: 0xffffff });
    } else if (face === "warning") {
      graphics.moveTo(cx - 8, cy - 10);
      graphics.lineTo(cx - 2, cy - 8);
      graphics.moveTo(cx + 2, cy - 8);
      graphics.lineTo(cx + 8, cy - 10);
      graphics.stroke({ width: 2, color: 0xffffff });
    }

    if (mouth === "oShape") {
      graphics.circle(cx, mouthY, 3);
      graphics.stroke({ width: 2, color: 0xffffff });
    } else if (mouth === "smallOpen" || mouth === "wideOpen") {
      graphics.ellipse(cx, mouthY, mouth === "wideOpen" ? 6 : 4, mouth === "wideOpen" ? 4 : 2);
      graphics.stroke({ width: 2, color: 0xffffff });
    } else if (mouth === "smile" || face === "smile" || face === "happy") {
      graphics.moveTo(cx - 6, mouthY - 1);
      graphics.quadraticCurveTo(cx, mouthY + 5, cx + 6, mouthY - 1);
      graphics.stroke({ width: 2, color: 0xffffff });
    } else {
      graphics.moveTo(cx - 5, mouthY);
      graphics.lineTo(cx + 5, mouthY);
      graphics.stroke({ width: 2, color: 0xffffff });
    }
  }
}
