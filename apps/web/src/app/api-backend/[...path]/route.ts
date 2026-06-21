import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_ORIGIN = (process.env.API_URL ?? "http://127.0.0.1:4000").replace(
  /\/$/,
  ""
);

async function proxyRequest(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const pathname = path.join("/");
  const target = `${API_ORIGIN}/${pathname}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
  headers.delete("host");

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? req.body : undefined,
      // @ts-expect-error duplex required when streaming request body to upstream
      duplex: hasBody ? "half" : undefined,
      cache: "no-store",
    });
  } catch (error) {
    console.error(`API proxy could not reach ${API_ORIGIN}`, error);
    return NextResponse.json(
      {
        error: "API service unavailable",
        detail: `Could not connect to ${API_ORIGIN}. Start the API service and retry.`,
      },
      { status: 503 }
    );
  }

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const OPTIONS = proxyRequest;
