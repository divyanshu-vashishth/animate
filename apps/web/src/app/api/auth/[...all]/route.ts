import { getAuth } from "@stickman/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const dynamic = "force-dynamic";

let handlers: ReturnType<typeof toNextJsHandler> | undefined;

function getHandlers() {
  if (!handlers) {
    handlers = toNextJsHandler(getAuth());
  }
  return handlers;
}

export function GET(request: Request) {
  return getHandlers().GET(request);
}

export function POST(request: Request) {
  return getHandlers().POST(request);
}
