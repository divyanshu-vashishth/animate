import { Hono } from "hono";

/** Stub for Supabase Realtime collaboration (Phase 6) */
export const realtimeRoutes = new Hono();

realtimeRoutes.get("/presence/:projectId", (c) => {
  return c.json({
    projectId: c.req.param("projectId"),
    users: [],
    cursors: [],
    note: "Supabase Realtime integration pending",
  });
});

realtimeRoutes.post("/broadcast/:projectId", async (c) => {
  const body = await c.req.json<{ type: string; payload: unknown }>();
  return c.json({ ok: true, received: body, note: "Realtime broadcast stub" });
});
