import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import type { ProjectDocument } from "@stickman/shared";
import { createDefaultDocument } from "@stickman/shared";
import { getDb, projects, projectDocuments } from "@stickman/database";
import { getAuthUser } from "../middleware/session.js";

export const projectRoutes = new Hono();

projectRoutes.get("/", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const db = getDb();
  const list = await db
    .select({
      id: projects.id,
      name: projects.name,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.userId, user.id));
  return c.json({
    projects: list.map((p) => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt?.toISOString(),
      updatedAt: p.updatedAt?.toISOString(),
    })),
  });
});

projectRoutes.post("/", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json<{ name?: string }>();
  const db = getDb();
  const [project] = await db
    .insert(projects)
    .values({
      userId: user.id,
      name: body.name ?? "Untitled Animation",
    })
    .returning();
  if (!project) return c.json({ error: "Failed to create project" }, 500);
  await db.insert(projectDocuments).values({
    projectId: project.id,
    data: createDefaultDocument(),
  });
  return c.json({ project: { id: project.id, name: project.name } });
});

projectRoutes.get("/:id", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const projectId = c.req.param("id");
  const db = getDb();
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));
  if (!project) return c.json({ error: "Not found" }, 404);
  return c.json({
    project: {
      id: project.id,
      name: project.name,
      createdAt: project.createdAt?.toISOString(),
      updatedAt: project.updatedAt?.toISOString(),
    },
  });
});

projectRoutes.get("/:id/document", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const projectId = c.req.param("id");
  const db = getDb();
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));
  if (!project) return c.json({ error: "Not found" }, 404);
  const [doc] = await db
    .select()
    .from(projectDocuments)
    .where(eq(projectDocuments.projectId, projectId));
  return c.json({ document: doc?.data ?? createDefaultDocument() });
});

projectRoutes.put("/:id/document", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const projectId = c.req.param("id");
  const db = getDb();
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));
  if (!project) return c.json({ error: "Not found" }, 404);
  const body = await c.req.json<{ document: ProjectDocument }>();
  await db
    .update(projectDocuments)
    .set({ data: body.document, updatedAt: new Date() })
    .where(eq(projectDocuments.projectId, projectId));
  await db
    .update(projects)
    .set({ updatedAt: new Date() })
    .where(eq(projects.id, projectId));
  return c.json({ ok: true });
});

projectRoutes.delete("/:id", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const projectId = c.req.param("id");
  const db = getDb();
  
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));
  if (!project) return c.json({ error: "Not found" }, 404);

  await db
    .delete(projectDocuments)
    .where(eq(projectDocuments.projectId, projectId));

  await db
    .delete(projects)
    .where(eq(projects.id, projectId));

  return c.json({ ok: true });
});
