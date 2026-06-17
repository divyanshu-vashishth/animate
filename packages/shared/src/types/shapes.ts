export const SHAPE_KINDS = [
  "box",
  "rounded_box",
  "circle",
  "arrow",
  "line",
  "database",
  "cloud",
  "highlight",
  "underline",
  "check",
  "cross",
] as const;

export type ShapeKind = (typeof SHAPE_KINDS)[number];

export interface TeachingShapePreset {
  kind: ShapeKind;
  name: string;
  width: number;
  height: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
}

export const TEACHING_SHAPE_PRESETS: TeachingShapePreset[] = [
  { kind: "box", name: "Text Box", width: 180, height: 70, fillColor: "#FFFFFF", strokeColor: "#111827", strokeWidth: 2 },
  { kind: "rounded_box", name: "Module Box", width: 150, height: 58, fillColor: "#F8FAFC", strokeColor: "#2563EB", strokeWidth: 2 },
  { kind: "circle", name: "Circle Callout", width: 90, height: 90, fillColor: "transparent", strokeColor: "#F59E0B", strokeWidth: 4 },
  { kind: "arrow", name: "Arrow", width: 150, height: 40, fillColor: "transparent", strokeColor: "#111827", strokeWidth: 3 },
  { kind: "line", name: "Connector Line", width: 140, height: 24, fillColor: "transparent", strokeColor: "#475569", strokeWidth: 2 },
  { kind: "database", name: "Database", width: 86, height: 96, fillColor: "#E0F2FE", strokeColor: "#0284C7", strokeWidth: 2 },
  { kind: "cloud", name: "Cloud", width: 126, height: 78, fillColor: "#EEF2FF", strokeColor: "#4F46E5", strokeWidth: 2 },
  { kind: "highlight", name: "Highlight", width: 170, height: 36, fillColor: "#FEF08A", strokeColor: "#EAB308", strokeWidth: 1 },
  { kind: "underline", name: "Underline", width: 180, height: 18, fillColor: "transparent", strokeColor: "#DC2626", strokeWidth: 4 },
  { kind: "check", name: "Check", width: 48, height: 48, fillColor: "transparent", strokeColor: "#16A34A", strokeWidth: 5 },
  { kind: "cross", name: "Cross", width: 48, height: 48, fillColor: "transparent", strokeColor: "#DC2626", strokeWidth: 5 },
];

export function getTeachingShapePreset(kind: ShapeKind): TeachingShapePreset {
  return TEACHING_SHAPE_PRESETS.find((preset) => preset.kind === kind) ?? TEACHING_SHAPE_PRESETS[0]!;
}
