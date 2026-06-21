export * from "./schema.js";
export * from "./compile.js";
export * from "./combat.js";

export const SAMPLE_ANIMATION_SCRIPT = {
  character: "fighter",
  actions: [
    { type: "playClip" as const, clip: "idle", duration: 0.5 },
    { type: "wait" as const, duration: 1.5 },
  ],
};
