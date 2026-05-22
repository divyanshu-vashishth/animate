import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { getDb, projects, renderJobs } from "@stickman/database";
import { getAuthUser } from "../middleware/session.js";

export const renderRoutes = new Hono();

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
