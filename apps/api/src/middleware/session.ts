import type { Context, Next } from "hono";
import { getAuth } from "@stickman/auth";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
};

export async function sessionMiddleware(c: Context, next: Next) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    c.set("user", session?.user ?? null);
  } catch {
    c.set("user", null);
  }
  await next();
}

export function getAuthUser(c: Context): AuthUser | null {
  return c.get("user") as AuthUser | null;
}
