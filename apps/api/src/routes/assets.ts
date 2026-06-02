import { Hono } from "hono";
import { getAuthUser } from "../middleware/session.js";
import { getDb, assets } from "@stickman/database";
import { eq } from "drizzle-orm";

export const assetRoutes = new Hono();

assetRoutes.get("/", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  
  const db = getDb();
  const list = await db
    .select()
    .from(assets)
    .where(eq(assets.userId, user.id));
    
  return c.json({
    assets: list.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      url: a.url,
      metadata: a.metadata,
      createdAt: a.createdAt?.toISOString(),
    })),
  });
});

assetRoutes.post("/", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json<{ name: string; type: string; url: string; metadata?: any }>();
  if (!body.name || !body.url) {
    return c.json({ error: "name and url required" }, 400);
  }
  
  const db = getDb();
  const [newAsset] = await db
    .insert(assets)
    .values({
      userId: user.id,
      name: body.name,
      type: body.type ?? "image",
      url: body.url,
      metadata: body.metadata,
    })
    .returning();

  if (!newAsset) {
    return c.json({ error: "Failed to save asset" }, 500);
  }

  return c.json({ 
    asset: {
      id: newAsset.id,
      name: newAsset.name,
      type: newAsset.type,
      url: newAsset.url,
      metadata: newAsset.metadata,
      createdAt: newAsset.createdAt?.toISOString(),
    } 
  });
});
