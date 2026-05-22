import { Container, Graphics } from "pixi.js";

export interface BoneDef {
  id: string;
  parentId: string | null;
  length: number;
  angle: number;
  pivotX: number;
  pivotY: number;
}

export interface PoseDef {
  id: string;
  bones: Record<string, number>;
}

export const DEFAULT_BONES: BoneDef[] = [
  { id: "torso", parentId: null, length: 50, angle: -Math.PI / 2, pivotX: 0, pivotY: 0 },
  { id: "head", parentId: "torso", length: 22, angle: -Math.PI / 2, pivotX: 0, pivotY: 0 },
  { id: "upperArmL", parentId: "torso", length: 28, angle: Math.PI * 0.75, pivotX: 0, pivotY: 0 },
  { id: "forearmL", parentId: "upperArmL", length: 24, angle: 0.3, pivotX: 0, pivotY: 0 },
  { id: "upperArmR", parentId: "torso", length: 28, angle: -Math.PI * 0.75, pivotX: 0, pivotY: 0 },
  { id: "forearmR", parentId: "upperArmR", length: 24, angle: -0.3, pivotX: 0, pivotY: 0 },
  { id: "thighL", parentId: "torso", length: 32, angle: Math.PI * 0.55, pivotX: 0, pivotY: 0 },
  { id: "calfL", parentId: "thighL", length: 30, angle: 0.2, pivotX: 0, pivotY: 0 },
  { id: "thighR", parentId: "torso", length: 32, angle: -Math.PI * 0.55, pivotX: 0, pivotY: 0 },
  { id: "calfR", parentId: "thighR", length: 30, angle: -0.2, pivotX: 0, pivotY: 0 },
];

export const DEFAULT_POSES: PoseDef[] = [
  { id: "idle", bones: {} },
  {
    id: "run",
    bones: {
      thighL: 0.4,
      thighR: -0.4,
      calfL: 0.6,
      calfR: -0.6,
      upperArmL: 0.5,
      upperArmR: -0.5,
    },
  },
  {
    id: "kick",
    bones: {
      thighR: 1.2,
      calfR: 0.3,
      upperArmL: -0.8,
    },
  },
];

export class StickmanRigRenderer {
  private boneContainers = new Map<string, Container>();
  private boneGraphics = new Map<string, Graphics>();

  build(container: Container, boneRotations: Record<string, number>): void {
    container.removeChildren();
    this.boneContainers.clear();
    this.boneGraphics.clear();

    const boneMap = new Map(DEFAULT_BONES.map((b) => [b.id, b]));

    const buildBone = (boneId: string, parentContainer: Container): Container => {
      const def = boneMap.get(boneId)!;
      const boneContainer = new Container();
      const g = new Graphics();
      g.moveTo(0, 0);
      g.lineTo(0, def.length);
      g.stroke({ width: 4, color: 0xffffff });
      if (boneId === "head") {
        g.circle(0, -8, 12);
        g.stroke({ width: 3, color: 0xffffff });
      }
      boneContainer.addChild(g);
      const extraAngle = boneRotations[boneId] ?? 0;
      boneContainer.rotation = def.angle + extraAngle;

      this.boneContainers.set(boneId, boneContainer);
      this.boneGraphics.set(boneId, g);
      parentContainer.addChild(boneContainer);

      for (const child of DEFAULT_BONES) {
        if (child.parentId === boneId) {
          const childContainer = buildBone(child.id, boneContainer);
          childContainer.y = def.length;
        }
      }
      return boneContainer;
    };

    const root = DEFAULT_BONES.find((b) => b.parentId === null);
    if (root) buildBone(root.id, container);
  }

  applyPose(container: Container, poseId: string, overrides: Record<string, number> = {}): void {
    const pose = DEFAULT_POSES.find((p) => p.id === poseId) ?? DEFAULT_POSES[0]!;
    const rotations = { ...pose!.bones, ...overrides };
    this.build(container, rotations);
  }
}
