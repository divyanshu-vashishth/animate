import { Hono } from "hono";
import {
  SAMPLE_ANIMATION_SCRIPT,
  animationScriptSchema,
  compileAnimationScript,
} from "@stickman/ai";
import { getAuthUser } from "../middleware/session.js";

export const aiRoutes = new Hono();

aiRoutes.post("/generate", async (c) => {
  if (!getAuthUser(c)) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json<{ prompt: string; entityId?: string }>();

  const script = animationScriptSchema.safeParse(
    promptToScript(body.prompt) ?? SAMPLE_ANIMATION_SCRIPT
  );
  if (!script.success) {
    return c.json({ error: "Invalid animation script", details: script.error }, 400);
  }

  const entityId = body.entityId ?? crypto.randomUUID();
  const compiled = compileAnimationScript(script.data, entityId);

  return c.json({
    script: script.data,
    commands: compiled.commands,
    timeline: compiled.timeline,
    entityId,
  });
});

function promptToScript(prompt: string): unknown | null {
  const lower = prompt.toLowerCase();
  if (lower.includes("combo") || lower.includes("fight") || lower.includes("kick")) {
    return {
      character: "fighter",
      actions: [
        { type: "playClip", clip: "idle", duration: 0.3 },
        { type: "move", x: 500, duration: 0.8 },
        { type: "playClip", clip: "run", duration: 0.5 },
        { type: "playClip", clip: "combo", duration: 1.8 },
      ],
    };
  }
  if (lower.includes("sword")) {
    return {
      character: "sword",
      actions: [
        { type: "playClip", clip: "idle", duration: 0.5 },
        { type: "playClip", clip: "combo", duration: 2 },
      ],
    };
  }
  if (lower.includes("pistol") || lower.includes("shoot")) {
    return {
      character: "pistol",
      actions: [
        { type: "playClip", clip: "idle", duration: 0.4 },
        { type: "playClip", clip: "shot", duration: 0.6 },
      ],
    };
  }
  return null;
}
