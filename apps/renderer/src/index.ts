import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const app = new Hono();
const OUTPUT_DIR = join(process.cwd(), "output");

app.get("/health", (c) =>
  c.json({ status: "ok", service: "stickman-renderer", ffmpeg: checkFfmpeg() })
);

app.post("/render", async (c) => {
  const body = await c.req.json<{
    jobId: string;
    format: "mp4" | "gif" | "webm";
    width?: number;
    height?: number;
    fps?: number;
    frameCount?: number;
  }>();

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const framesDir = join(OUTPUT_DIR, body.jobId, "frames");
  mkdirSync(framesDir, { recursive: true });

  const frameCount = body.frameCount ?? 30;
  const fps = body.fps ?? 30;

  for (let i = 0; i < frameCount; i++) {
    const placeholder = join(framesDir, `frame_${String(i).padStart(5, "0")}.png`);
    writeFileSync(
      placeholder,
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64"
      )
    );
  }

  const outputPath = join(OUTPUT_DIR, `${body.jobId}.${body.format}`);

  if (checkFfmpeg()) {
    await encodeWithFfmpeg(framesDir, outputPath, body.format, fps);
  }

  return c.json({
    jobId: body.jobId,
    status: "completed",
    outputPath,
    format: body.format,
  });
});

function checkFfmpeg(): boolean {
  try {
    const r = spawn("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function encodeWithFfmpeg(
  framesDir: string,
  outputPath: string,
  format: string,
  fps: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const inputPattern = join(framesDir, "frame_%05d.png");
    const args =
      format === "gif"
        ? ["-y", "-framerate", String(fps), "-i", inputPattern, "-vf", "scale=1920:-1", outputPath]
        : [
            "-y",
            "-framerate",
            String(fps),
            "-i",
            inputPattern,
            "-c:v",
            format === "webm" ? "libvpx-vp9" : "libx264",
            "-pix_fmt",
            "yuv420p",
            outputPath,
          ];

    const proc = spawn("ffmpeg", args);
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`))));
    proc.on("error", reject);
  });
}

const port = parseInt(process.env.RENDERER_PORT ?? "4001", 10);
console.log(`Stickman Renderer on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
