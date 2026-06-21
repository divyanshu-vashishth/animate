import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { getDb, projects, renderJobs } from "@stickman/database";
import { getAuthUser } from "../middleware/session.js";

const RENDERER_URL = (process.env.RENDERER_URL ?? "http://localhost:4001").replace(/\/+$/, "");

export const renderRoutes = new Hono();

renderRoutes.get("/config", (c) => {
  return c.json({ rendererUrl: RENDERER_URL });
});

// Direct pipeline: captures frames client-side, compiles via renderer container, returns binary video directly
renderRoutes.post("/jobs/direct", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json<{
    projectId: string;
    format: "mp4" | "gif" | "webm";
    frames: string[];
    fps?: number;
    audioClips?: Array<{
      id: string;
      dataUrl: string;
      startTime: number;
      duration: number;
      sourceOffset?: number;
      volume: number;
      pan?: number;
      fadeIn?: number;
      fadeOut?: number;
    }>;
  }>();

  const db = getDb();
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, body.projectId), eq(projects.userId, user.id)));

  if (!project) return c.json({ error: "Project not found" }, 404);

  const jobId = crypto.randomUUID();

  try {
    const response = await fetch(`${RENDERER_URL}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId,
        format: body.format,
        frames: body.frames,
        fps: body.fps,
        audioClips: body.audioClips,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Renderer error:", errText);
      return c.json({ error: "Render microservice failed" }, 500);
    }

    const videoBuffer = await response.arrayBuffer();

    // Log the completed job in the database for history/analytics
    await db.insert(renderJobs).values({
      id: jobId,
      projectId: body.projectId,
      userId: user.id,
      format: body.format,
      status: "completed",
      completedAt: new Date(),
    });

    const contentTypes = {
      mp4: "video/mp4",
      webm: "video/webm",
      gif: "image/gif",
    };

    return c.body(videoBuffer, 200, {
      "Content-Type": contentTypes[body.format] || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${project.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_animation.${body.format}"`,
    });
  } catch (error: any) {
    console.error("Direct render failed:", error);
    await db.insert(renderJobs).values({
      id: jobId,
      projectId: body.projectId,
      userId: user.id,
      format: body.format,
      status: "failed",
      error: error.message || "Unknown error",
    });
    return c.json({ error: error.message || "Rendering failed" }, 500);
  }
});

renderRoutes.post("/jobs", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json<{ projectId: string; format: "mp4" | "gif" | "webm" }>();
  const db = getDb();
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, body.projectId), eq(projects.userId, user.id)));
  if (!project) return c.json({ error: "Project not found" }, 404);
  const [job] = await db
    .insert(renderJobs)
    .values({
      projectId: body.projectId,
      userId: user.id,
      format: body.format,
      status: "pending",
    })
    .returning();
  return c.json({ job: { id: job!.id, status: job!.status } });
});

renderRoutes.get("/jobs/:id", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const db = getDb();
  const [job] = await db
    .select()
    .from(renderJobs)
    .where(and(eq(renderJobs.id, c.req.param("id")), eq(renderJobs.userId, user.id)));
  if (!job) return c.json({ error: "Not found" }, 404);
  return c.json({
    job: {
      id: job.id,
      status: job.status,
      outputUrl: job.outputUrl,
      format: job.format,
    },
  });
});

