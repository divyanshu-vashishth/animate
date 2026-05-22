import { config } from "dotenv";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { projectRoutes } from "./routes/projects.js";
import { aiRoutes } from "./routes/ai.js";
import { renderRoutes } from "./routes/render.js";
import { templateRoutes } from "./routes/templates.js";
import { realtimeRoutes } from "./routes/realtime.js";
import { assetRoutes } from "./routes/assets.js";
import { sessionMiddleware } from "./middleware/session.js";

const sourceDir = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(sourceDir, "../../..", ".env") });

const app = new Hono();

app.use(
  "*",
  cors({
    origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    credentials: true,
  })
);

app.use("*", sessionMiddleware);

app.get("/health", (c) => c.json({ status: "ok", service: "stickman-api" }));

app.route("/projects", projectRoutes);
app.route("/assets", assetRoutes);
app.route("/ai", aiRoutes);
app.route("/render", renderRoutes);
app.route("/templates", templateRoutes);
app.route("/realtime", realtimeRoutes);

const port = parseInt(process.env.PORT ?? "4000", 10);
console.log(`Stickman API running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });
