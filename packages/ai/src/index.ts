export * from "./schema.js";
export * from "./compile.js";

export const SAMPLE_ANIMATION_SCRIPT = {
  character: "fighter",
  actions: [
    { type: "playClip" as const, clip: "idle", duration: 0.5 },
    { type: "move" as const, x: 600, duration: 1 },
    { type: "playClip" as const, clip: "run", duration: 0.8 },
    { type: "playClip" as const, clip: "combo", duration: 1.5 },
  ],
};
