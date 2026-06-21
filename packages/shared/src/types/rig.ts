import type { EasingType } from "./timeline.js";

export const RIG_BONE_IDS = [
  "torso",
  "head",
  "upperArmL",
  "forearmL",
  "upperArmR",
  "forearmR",
  "thighL",
  "calfL",
  "thighR",
  "calfR",
] as const;

export type RigBoneId = (typeof RIG_BONE_IDS)[number];

export const FACE_STATES = [
  "neutral",
  "smile",
  "thinking",
  "confused",
  "warning",
  "happy",
] as const;

export type FaceState = (typeof FACE_STATES)[number];

export const MOUTH_SHAPES = [
  "closed",
  "smallOpen",
  "wideOpen",
  "oShape",
  "smile",
  "flat",
] as const;

export type MouthShape = (typeof MOUTH_SHAPES)[number];

export interface RigBoneDef {
  id: RigBoneId;
  parentId: RigBoneId | null;
  anchor: number;
  length: number;
  baseAngle: number;
  strokeWidth: number;
}

export interface RigPose {
  id: string;
  name: string;
  category: "teaching" | "combat" | "compat";
  bones: Partial<Record<RigBoneId, number>>;
  face?: FaceState;
  mouth?: MouthShape;
}

export interface RigActionKeyframe {
  pose: string;
  at: number;
  easing: EasingType;
  face?: FaceState;
  mouth?: MouthShape;
}

export interface RigAction {
  id: string;
  name: string;
  duration: number;
  loop?: boolean;
  keyframes: RigActionKeyframe[];
}

export interface RigPoint {
  x: number;
  y: number;
}

export interface RigSegment {
  boneId: RigBoneId;
  start: RigPoint;
  end: RigPoint;
  strokeWidth: number;
}

export interface RigGeometry {
  segments: RigSegment[];
  joints: Record<RigBoneId, RigPoint>;
  headCenter: RigPoint;
  headRadius: number;
}

export const RIG_VIEWBOX = {
  x: -74,
  y: -136,
  width: 148,
  height: 196,
} as const;

export const DEFAULT_RIG_BONES: RigBoneDef[] = [
  { id: "torso", parentId: null, anchor: 0, length: 62, baseAngle: -Math.PI / 2, strokeWidth: 5 },
  { id: "head", parentId: "torso", anchor: 1, length: 20, baseAngle: -Math.PI / 2, strokeWidth: 3 },
  { id: "upperArmL", parentId: "torso", anchor: 0.86, length: 34, baseAngle: 2.2, strokeWidth: 4 },
  { id: "forearmL", parentId: "upperArmL", anchor: 1, length: 30, baseAngle: 1.72, strokeWidth: 4 },
  { id: "upperArmR", parentId: "torso", anchor: 0.86, length: 34, baseAngle: 0.94, strokeWidth: 4 },
  { id: "forearmR", parentId: "upperArmR", anchor: 1, length: 30, baseAngle: 1.42, strokeWidth: 4 },
  { id: "thighL", parentId: "torso", anchor: 0, length: 38, baseAngle: 1.9, strokeWidth: 5 },
  { id: "calfL", parentId: "thighL", anchor: 1, length: 36, baseAngle: 1.62, strokeWidth: 5 },
  { id: "thighR", parentId: "torso", anchor: 0, length: 38, baseAngle: 1.24, strokeWidth: 5 },
  { id: "calfR", parentId: "thighR", anchor: 1, length: 36, baseAngle: 1.52, strokeWidth: 5 },
];

export const RIG_BONE_BY_ID = DEFAULT_RIG_BONES.reduce(
  (acc, bone) => ({ ...acc, [bone.id]: bone }),
  {} as Record<RigBoneId, RigBoneDef>
);

const pose = (
  id: string,
  name: string,
  bones: Partial<Record<RigBoneId, number>>,
  face: FaceState = "neutral",
  mouth: MouthShape = "closed",
  category: RigPose["category"] = "teaching"
): RigPose => ({ id, name, category, bones, face, mouth });

export const TEACHING_RIG_POSES: Record<string, RigPose> = {
  idle_presenter: pose("idle_presenter", "Idle Presenter", {}, "smile"),
  talk_neutral: pose("talk_neutral", "Talk Neutral", {
    head: 0.06,
    upperArmR: -0.18,
    forearmR: -0.32,
    upperArmL: 0.12,
    forearmL: 0.22,
  }, "smile", "smallOpen"),
  talk_one_hand: pose("talk_one_hand", "Talk One Hand", {
    head: -0.04,
    upperArmR: -0.72,
    forearmR: -0.52,
    upperArmL: 0.08,
  }, "smile", "wideOpen"),
  talk_two_hands: pose("talk_two_hands", "Talk Two Hands", {
    upperArmL: 0.45,
    forearmL: 0.6,
    upperArmR: -0.45,
    forearmR: -0.62,
  }, "happy", "smallOpen"),
  point_left: pose("point_left", "Point Left", {
    head: -0.08,
    upperArmL: 0.96,
    forearmL: 1.28,
    upperArmR: -0.1,
  }, "neutral"),
  point_right: pose("point_right", "Point Right", {
    head: 0.08,
    upperArmR: -0.98,
    forearmR: -1.38,
    upperArmL: 0.1,
  }, "neutral"),
  point_up: pose("point_up", "Point Up", {
    head: 0.08,
    upperArmR: -2.35,
    forearmR: -2.92,
    upperArmL: 0.22,
  }, "happy"),
  point_down: pose("point_down", "Point Down", {
    head: 0.05,
    upperArmR: 0.28,
    forearmR: 0.38,
    upperArmL: 0.08,
  }, "neutral"),
  present_board: pose("present_board", "Present Board", {
    torso: -0.05,
    head: 0.12,
    upperArmR: -0.88,
    forearmR: -1.2,
    upperArmL: 0.38,
    forearmL: 0.48,
  }, "smile"),
  write_board: pose("write_board", "Write Board", {
    torso: -0.08,
    head: 0.14,
    upperArmR: -1.2,
    forearmR: -0.95,
    upperArmL: 0.22,
  }, "thinking"),
  erase_board: pose("erase_board", "Erase Board", {
    torso: -0.06,
    upperArmR: -1.02,
    forearmR: -0.72,
    upperArmL: 0.12,
  }, "neutral"),
  draw_box: pose("draw_box", "Draw Box", {
    upperArmR: -0.9,
    forearmR: -0.58,
    upperArmL: 0.36,
    forearmL: 0.42,
  }, "thinking"),
  underline: pose("underline", "Underline", {
    upperArmR: -0.48,
    forearmR: -0.82,
    upperArmL: 0.18,
  }, "neutral"),
  connect_boxes: pose("connect_boxes", "Connect Boxes", {
    head: 0.1,
    upperArmR: -0.82,
    forearmR: -1.02,
    upperArmL: 0.72,
    forearmL: 0.88,
  }, "smile"),
  drag_box: pose("drag_box", "Drag Box", {
    torso: 0.08,
    upperArmR: -0.36,
    forearmR: -0.46,
    upperArmL: 0.3,
    forearmL: 0.42,
  }, "neutral"),
  compare_two_options: pose("compare_two_options", "Compare Two Options", {
    upperArmL: 0.9,
    forearmL: 1.18,
    upperArmR: -0.9,
    forearmR: -1.2,
  }, "happy"),
  count_one: pose("count_one", "Count One", {
    upperArmR: -1.42,
    forearmR: -1.88,
    upperArmL: 0.14,
  }, "smile"),
  count_two: pose("count_two", "Count Two", {
    upperArmR: -1.2,
    forearmR: -1.58,
    upperArmL: 0.42,
    forearmL: 0.62,
  }, "smile"),
  count_three: pose("count_three", "Count Three", {
    upperArmR: -0.96,
    forearmR: -1.26,
    upperArmL: 0.76,
    forearmL: 1.08,
  }, "happy"),
  ask_question: pose("ask_question", "Ask Question", {
    head: -0.22,
    upperArmL: 0.72,
    forearmL: 0.86,
    upperArmR: -0.24,
  }, "confused", "oShape"),
  think: pose("think", "Think", {
    head: -0.1,
    upperArmR: -1.72,
    forearmR: -2.18,
    upperArmL: 0.02,
  }, "thinking", "flat"),
  warning: pose("warning", "Warning", {
    head: 0.04,
    upperArmR: -2.08,
    forearmR: -2.34,
    upperArmL: 0.28,
  }, "warning", "smallOpen"),
  highlight_key_point: pose("highlight_key_point", "Highlight Key Point", {
    head: 0.06,
    upperArmR: -2.2,
    forearmR: -2.68,
    upperArmL: 0.36,
  }, "happy"),
  nod: pose("nod", "Nod", {
    head: 0.22,
    upperArmR: -0.12,
    forearmR: -0.18,
  }, "smile"),
  conclusion: pose("conclusion", "Conclusion", {
    torso: 0.03,
    upperArmL: 0.62,
    forearmL: 0.82,
    upperArmR: -0.62,
    forearmR: -0.82,
  }, "happy", "smile"),
  idle: pose("idle", "Legacy Idle", {}, "neutral", "closed", "compat"),
  run: pose("run", "Legacy Run", {
    thighL: -0.34,
    calfL: 0.42,
    thighR: 0.34,
    calfR: -0.42,
    upperArmL: -0.34,
    upperArmR: 0.34,
  }, "neutral", "closed", "compat"),
  kick: pose("kick", "Legacy Kick", {
    thighR: -1.15,
    calfR: -0.58,
    upperArmL: 0.52,
  }, "neutral", "closed", "compat"),
  combat_guard: pose("combat_guard", "Combat Guard", {
    torso: 0.1, upperArmL: -0.2, forearmL: -2.82, upperArmR: -0.16, forearmR: -2.12,
    thighL: 0.1, calfL: -0.18, thighR: 0.08, calfR: 0.14,
  }, "warning", "closed", "combat"),
  combat_crouch: pose("combat_crouch", "Combat Crouch", {
    torso: 0.36, upperArmL: -0.28, forearmL: -2.72, upperArmR: -0.28, forearmR: -2.2,
    thighL: -0.48, calfL: 0.48, thighR: 0.5, calfR: -0.5,
  }, "warning", "closed", "combat"),
  combat_jab_windup: pose("combat_jab_windup", "Jab Windup", {
    torso: -0.08, upperArmL: -0.16, forearmL: -2.72, upperArmR: 0.12, forearmR: -2.48,
    thighL: 0.06, calfL: -0.14, thighR: 0.12, calfR: 0.1,
  }, "warning", "closed", "combat"),
  combat_jab_contact: pose("combat_jab_contact", "Jab Contact", {
    torso: 0.2, upperArmL: -0.28, forearmL: -2.72, upperArmR: -1.04, forearmR: -1.42,
    thighL: 0.08, calfL: -0.18, thighR: 0.02, calfR: 0.12,
  }, "warning", "closed", "combat"),
  combat_jab_retract: pose("combat_jab_retract", "Jab Retract", {
    torso: 0.16, upperArmL: -0.24, forearmL: -2.76, upperArmR: -0.46, forearmR: -1.92,
    thighL: 0.08, calfL: -0.18, thighR: 0.04, calfR: 0.12,
  }, "warning", "closed", "combat"),
  combat_heavy_windup: pose("combat_heavy_windup", "Heavy Windup", {
    torso: -0.38, upperArmL: -0.1, forearmL: -2.58, upperArmR: 0.86, forearmR: 0.72,
    thighL: 0.2, calfL: -0.2, thighR: -0.04, calfR: 0.2,
  }, "warning", "closed", "combat"),
  combat_heavy_contact: pose("combat_heavy_contact", "Heavy Contact", {
    torso: 0.34, upperArmL: -0.32, forearmL: -2.72, upperArmR: -1.18, forearmR: -1.5,
    thighL: 0.04, calfL: -0.16, thighR: -0.04, calfR: 0.16,
  }, "warning", "closed", "combat"),
  combat_heavy_follow: pose("combat_heavy_follow", "Heavy Follow Through", {
    torso: 0.5, upperArmL: -0.38, forearmL: -2.64, upperArmR: -1.42, forearmR: -1.68,
    thighL: 0.02, calfL: -0.1, thighR: -0.18, calfR: 0.2,
  }, "warning", "closed", "combat"),
  combat_kick_chamber: pose("combat_kick_chamber", "Kick Chamber", {
    torso: -0.18, upperArmL: -0.26, forearmL: -2.72, upperArmR: -0.16, forearmR: -2.14,
    thighL: 0.1, calfL: -0.16, thighR: -2.52, calfR: 0.58,
  }, "warning", "closed", "combat"),
  combat_kick_contact: pose("combat_kick_contact", "Kick Contact", {
    torso: -0.3, upperArmL: -0.38, forearmL: -2.62, upperArmR: 0.26, forearmR: -2.36,
    thighL: 0.16, calfL: -0.2, thighR: -2.2, calfR: -1.61,
  }, "warning", "closed", "combat"),
  combat_kick_follow: pose("combat_kick_follow", "Kick Follow Through", {
    torso: -0.22, upperArmL: -0.32, forearmL: -2.64, upperArmR: 0.18, forearmR: -2.28,
    thighL: 0.14, calfL: -0.18, thighR: -1.74, calfR: -1.18,
  }, "warning", "closed", "combat"),
  combat_sweep_windup: pose("combat_sweep_windup", "Sweep Windup", {
    torso: 0.54, upperArmL: -0.5, forearmL: -2.42, upperArmR: 0.3, forearmR: -2.2,
    thighL: -0.42, calfL: 0.42, thighR: 0.38, calfR: -0.42,
  }, "warning", "closed", "combat"),
  combat_sweep_contact: pose("combat_sweep_contact", "Sweep Contact", {
    torso: 0.62, upperArmL: -0.62, forearmL: -2.3, upperArmR: 0.38, forearmR: -2.08,
    thighL: -0.36, calfL: 0.4, thighR: -0.8, calfR: -1.43,
  }, "warning", "closed", "combat"),
  combat_sweep_follow: pose("combat_sweep_follow", "Sweep Follow Through", {
    torso: 0.48, upperArmL: -0.54, forearmL: -2.38, upperArmR: 0.3, forearmR: -2.14,
    thighL: -0.3, calfL: 0.34, thighR: -0.28, calfR: -0.96,
  }, "warning", "closed", "combat"),
  combat_block: pose("combat_block", "Combat Block", {
    torso: -0.12, upperArmL: -0.78, forearmL: -2.5, upperArmR: -0.72, forearmR: -2.42,
    thighL: 0.12, calfL: -0.14, thighR: 0.12, calfR: 0.12,
  }, "warning", "closed", "combat"),
  combat_dodge: pose("combat_dodge", "Combat Dodge", {
    torso: -0.62, head: -0.18, upperArmL: -0.1, forearmL: -2.72, upperArmR: 0.02, forearmR: -2.26,
    thighL: -0.16, calfL: 0.22, thighR: 0.34, calfR: -0.28,
  }, "warning", "closed", "combat"),
  combat_grapple_windup: pose("combat_grapple_windup", "Grapple Entry", {
    torso: 0.42, upperArmL: -0.72, forearmL: -2.08, upperArmR: -0.56, forearmR: -1.92,
    thighL: -0.18, calfL: 0.22, thighR: 0.28, calfR: -0.24,
  }, "warning", "closed", "combat"),
  combat_grapple_contact: pose("combat_grapple_contact", "Grapple Contact", {
    torso: 0.5, upperArmL: -0.98, forearmL: -1.64, upperArmR: -0.88, forearmR: -1.58,
    thighL: -0.2, calfL: 0.24, thighR: 0.32, calfR: -0.26,
  }, "warning", "closed", "combat"),
  combat_throw_follow: pose("combat_throw_follow", "Throw Follow Through", {
    torso: -0.28, upperArmL: -2.52, forearmL: -2.92, upperArmR: -2.18, forearmR: -2.7,
    thighL: 0.18, calfL: -0.16, thighR: -0.08, calfR: 0.2,
  }, "warning", "closed", "combat"),
  combat_launch_windup: pose("combat_launch_windup", "Launch Windup", {
    torso: 0.54, upperArmL: -0.18, forearmL: -2.68, upperArmR: 0.58, forearmR: 0.24,
    thighL: -0.26, calfL: 0.28, thighR: 0.32, calfR: -0.28,
  }, "warning", "closed", "combat"),
  combat_launch_contact: pose("combat_launch_contact", "Launch Contact", {
    torso: 0.18, upperArmL: -0.32, forearmL: -2.64, upperArmR: -0.59, forearmR: -2.38,
    thighL: 0.08, calfL: -0.14, thighR: -0.02, calfR: 0.16,
  }, "warning", "closed", "combat"),
  combat_launch_follow: pose("combat_launch_follow", "Launch Follow Through", {
    torso: -0.12, upperArmL: -0.38, forearmL: -2.6, upperArmR: -1.72, forearmR: -2.86,
    thighL: 0.12, calfL: -0.16, thighR: -0.08, calfR: 0.2,
  }, "warning", "closed", "combat"),
  combat_punch: pose("combat_punch", "Combat Punch", {
    torso: 0.2, upperArmR: -1.04, forearmR: -1.42, upperArmL: -0.28, forearmL: -2.72,
    thighL: 0.08, calfL: -0.18, thighR: 0.02, calfR: 0.12,
  }, "warning", "closed", "combat"),
  combat_kick: pose("combat_kick", "Combat Kick", {
    torso: -0.3, upperArmL: -0.38, forearmL: -2.62, upperArmR: 0.26, forearmR: -2.36,
    thighR: -2.2, calfR: -1.61, thighL: 0.16, calfL: -0.2,
  }, "warning", "closed", "combat"),
  combat_hit: pose("combat_hit", "Combat Hit", {
    torso: -0.52, head: -0.28, upperArmL: 0.32, forearmL: -1.9, upperArmR: -0.74,
    forearmR: -2.12, thighL: -0.18, calfL: 0.22, thighR: 0.28, calfR: -0.22,
  }, "warning", "smallOpen", "combat"),
  combat_fall: pose("combat_fall", "Combat Fall", {
    torso: 1.3, head: 0.2, upperArmL: -0.9, forearmL: -1.6, upperArmR: 0.82,
    forearmR: -0.3, thighL: -0.86, calfL: 0.52, thighR: 0.74, calfR: -0.48,
  }, "warning", "smallOpen", "combat"),
  combat_victory: pose("combat_victory", "Combat Victory", {
    torso: -0.08, upperArmL: -2.5, forearmL: -2.78, upperArmR: 2.48, forearmR: 2.76,
  }, "happy", "closed", "combat"),
};

const action = (
  id: string,
  name: string,
  poses: string[],
  duration = 1.2,
  loop = false
): RigAction => ({
  id,
  name,
  duration,
  loop,
  keyframes: poses.map((poseId, index) => ({
    pose: poseId,
    at: poses.length === 1 ? 0 : (duration / (poses.length - 1)) * index,
    easing: "easeInOut",
  })),
});

export const TEACHING_RIG_ACTIONS: Record<string, RigAction> = {
  idle_presenter: action("idle_presenter", "Idle Presenter", ["idle_presenter"], 1, true),
  talk_neutral: action("talk_neutral", "Talk Neutral", ["idle_presenter", "talk_neutral", "idle_presenter"], 1.1, true),
  talk_one_hand: action("talk_one_hand", "Talk One Hand", ["idle_presenter", "talk_one_hand", "talk_neutral", "idle_presenter"], 1.3, true),
  talk_two_hands: action("talk_two_hands", "Talk Two Hands", ["idle_presenter", "talk_two_hands", "talk_neutral", "idle_presenter"], 1.4, true),
  point_left: action("point_left", "Point Left", ["idle_presenter", "point_left", "point_left", "idle_presenter"], 1.2),
  point_right: action("point_right", "Point Right", ["idle_presenter", "point_right", "point_right", "idle_presenter"], 1.2),
  point_up: action("point_up", "Point Up", ["idle_presenter", "point_up", "point_up", "idle_presenter"], 1.2),
  point_down: action("point_down", "Point Down", ["idle_presenter", "point_down", "point_down", "idle_presenter"], 1.2),
  present_board: action("present_board", "Present Board", ["idle_presenter", "present_board", "talk_one_hand", "idle_presenter"], 1.5),
  write_board: action("write_board", "Write Board", ["present_board", "write_board", "write_board", "present_board"], 1.6),
  erase_board: action("erase_board", "Erase Board", ["present_board", "erase_board", "erase_board", "present_board"], 1.5),
  draw_box: action("draw_box", "Draw Box", ["present_board", "draw_box", "draw_box", "present_board"], 1.4),
  underline: action("underline", "Underline", ["present_board", "underline", "underline", "present_board"], 1.2),
  connect_boxes: action("connect_boxes", "Connect Boxes", ["present_board", "connect_boxes", "connect_boxes", "present_board"], 1.4),
  drag_box: action("drag_box", "Drag Box", ["idle_presenter", "drag_box", "drag_box", "idle_presenter"], 1.2),
  compare_two_options: action("compare_two_options", "Compare Two Options", ["idle_presenter", "compare_two_options", "talk_two_hands", "idle_presenter"], 1.5),
  count_one: action("count_one", "Count One", ["idle_presenter", "count_one", "idle_presenter"], 1),
  count_two: action("count_two", "Count Two", ["count_one", "count_two", "idle_presenter"], 1),
  count_three: action("count_three", "Count Three", ["count_two", "count_three", "idle_presenter"], 1),
  ask_question: action("ask_question", "Ask Question", ["idle_presenter", "ask_question", "talk_neutral", "idle_presenter"], 1.3),
  think: action("think", "Think", ["idle_presenter", "think", "think", "idle_presenter"], 1.4),
  warning: action("warning", "Warning", ["idle_presenter", "warning", "warning", "idle_presenter"], 1.2),
  highlight_key_point: action("highlight_key_point", "Highlight Key Point", ["idle_presenter", "highlight_key_point", "point_up", "idle_presenter"], 1.3),
  nod: action("nod", "Nod", ["idle_presenter", "nod", "idle_presenter"], 0.8),
  conclusion: action("conclusion", "Conclusion", ["talk_neutral", "conclusion", "conclusion", "idle_presenter"], 1.5),
};

export function getRigPose(poseId: string | undefined): RigPose {
  return TEACHING_RIG_POSES[poseId ?? "idle_presenter"] ?? TEACHING_RIG_POSES.idle_presenter!;
}

export function resolveRigBoneRotations(
  poseId: string | undefined,
  overrides: Partial<Record<RigBoneId, number>> = {}
): Partial<Record<RigBoneId, number>> {
  const selectedPose = getRigPose(poseId);
  return { ...selectedPose.bones, ...overrides };
}

export function resolveRigGeometry(
  poseId: string | undefined = "idle_presenter",
  overrides: Partial<Record<RigBoneId, number>> = {}
): RigGeometry {
  const rotations = resolveRigBoneRotations(poseId, overrides);
  const segmentsById = new Map<RigBoneId, RigSegment>();
  const joints = {} as Record<RigBoneId, RigPoint>;
  const segments: RigSegment[] = [];

  for (const bone of DEFAULT_RIG_BONES) {
    const parent = bone.parentId ? segmentsById.get(bone.parentId) : undefined;
    const start = parent
      ? {
          x: parent.start.x + (parent.end.x - parent.start.x) * bone.anchor,
          y: parent.start.y + (parent.end.y - parent.start.y) * bone.anchor,
        }
      : { x: 0, y: 0 };
    const angle = bone.baseAngle + (rotations[bone.id] ?? 0);
    const end = {
      x: start.x + Math.cos(angle) * bone.length,
      y: start.y + Math.sin(angle) * bone.length,
    };
    const segment: RigSegment = {
      boneId: bone.id,
      start,
      end,
      strokeWidth: bone.strokeWidth,
    };
    segmentsById.set(bone.id, segment);
    joints[bone.id] = end;
    segments.push(segment);
  }

  return {
    segments,
    joints,
    headCenter: joints.head ?? { x: 0, y: -84 },
    headRadius: 15,
  };
}

export function normalizeAngle(angle: number): number {
  let next = angle;
  while (next > Math.PI) next -= Math.PI * 2;
  while (next < -Math.PI) next += Math.PI * 2;
  return next;
}

export function mirrorRigBoneRotations(
  rotations: Partial<Record<RigBoneId, number>> = {}
): Partial<Record<RigBoneId, number>> {
  const swap = (left: RigBoneId, right: RigBoneId, output: Partial<Record<RigBoneId, number>>) => {
    output[left] = -(rotations[right] ?? 0);
    output[right] = -(rotations[left] ?? 0);
  };
  const mirrored: Partial<Record<RigBoneId, number>> = {
    torso: -(rotations.torso ?? 0),
    head: -(rotations.head ?? 0),
  };
  swap("upperArmL", "upperArmR", mirrored);
  swap("forearmL", "forearmR", mirrored);
  swap("thighL", "thighR", mirrored);
  swap("calfL", "calfR", mirrored);
  return mirrored;
}
