import { Hono } from "hono";
import { createDefaultDocument } from "@stickman/shared";

export const templateRoutes = new Hono();

const publicTemplates = [
  {
    id: "tpl-fighter-combo",
    name: "Fighter Combo",
    description: "Basic fighter combo sequence",
    public: true,
  },
  {
    id: "tpl-sword-fight",
    name: "Sword Fight",
    description: "Sword combat starter",
    public: true,
  },
];

templateRoutes.get("/", (c) => {
  return c.json({ templates: publicTemplates });
});

templateRoutes.get("/:id", (c) => {
  const tpl = publicTemplates.find((t) => t.id === c.req.param("id"));
  if (!tpl) return c.json({ error: "Not found" }, 404);
  const doc = createDefaultDocument();
  return c.json({ template: tpl, document: doc });
});
