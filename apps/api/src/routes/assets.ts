import { Hono } from "hono";
import { getAuthUser } from "../middleware/session.js";

export const assetRoutes = new Hono();

assetRoutes.get("/", (c) => {
  if (!getAuthUser(c)) return c.json({ error: "Unauthorized" }, 401);
  return c.json({
    assets: [],
    note: "Upload to Supabase Storage in production. Use built-in sprite library in editor.",
  });
});

assetRoutes.post("/", async (c) => {
  if (!getAuthUser(c)) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json<{ name: string; type: string; url: string }>();
  if (!body.name || !body.url) {
    return c.json({ error: "name and url required" }, 400);
  }
  const asset = {
    id: crypto.randomUUID(),
    name: body.name,
    type: body.type ?? "image",
    url: body.url,
    createdAt: new Date().toISOString(),
  };
  return c.json({ asset });
});
