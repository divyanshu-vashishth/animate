import { z } from "zod";

export const animationActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("move"),
    x: z.number(),
    y: z.number().optional(),
    duration: z.number().positive(),
  }),
  z.object({
    type: z.literal("playClip"),
    clip: z.string(),
    duration: z.number().positive(),
    loop: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("wait"),
    duration: z.number().positive(),
  }),
  z.object({
    type: z.literal("flip"),
    scaleX: z.number(),
  }),
  z.object({
    type: z.literal("addEntity"),
    character: z.string(),
    clip: z.string(),
    x: z.number(),
    y: z.number(),
  }),
]);

export const animationScriptSchema = z.object({
  character: z.string(),
  actions: z.array(animationActionSchema),
});

export type AnimationScript = z.infer<typeof animationScriptSchema>;
export type AnimationAction = z.infer<typeof animationActionSchema>;
