import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, existsSync, promises as fsPromises } from "node:fs";
import { join } from "node:path";

import { cors } from "hono/cors";

const app = new Hono();
app.use("/*", cors());
const OUTPUT_DIR = join(process.cwd(), "output");

app.get("/health", (c) =>
  c.json({ status: "ok", service: "stickman-renderer", ffmpeg: checkFfmpeg() })
);

app.post("/render", async (c) => {
  const body = await c.req.json<{
    jobId: string;
    format: "mp4" | "gif" | "webm";
    frames: string[]; // Base64 data URLs
    fps?: number;
  }>();

  const jobId = body.jobId || crypto.randomUUID();
  const format = body.format || "mp4";
  const frames = body.frames || [];
  const fps = body.fps ?? 30;

  if (frames.length === 0) {
    return c.json({ error: "No frames provided" }, 400);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const jobDir = join(OUTPUT_DIR, jobId);
  const framesDir = join(jobDir, "frames");
  mkdirSync(framesDir, { recursive: true });

  const outputPath = join(jobDir, `output.${format}`);
  const inputPattern = join(framesDir, "frame_%05d.jpg");

  // 1. Write frames concurrently (async-parallel)
  await Promise.all(
    frames.map((frame, index) => {
      const fileName = `frame_${String(index).padStart(5, "0")}.jpg`;
      const filePath = join(framesDir, fileName);
      const base64Data = frame.includes(";base64,") ? frame.split(";base64,")[1]! : frame;
      const buffer = Buffer.from(base64Data, "base64");
      return fsPromises.writeFile(filePath, buffer);
    })
  );

  try {
    if (!checkFfmpeg()) {
      throw new Error("FFmpeg binary is not available on this server environment");
    }

    // 2. Encode with FFmpeg using senior-grade high-quality profiles
    await encodeWithFfmpeg(framesDir, inputPattern, outputPath, format, fps, jobDir);

    // 3. Read output file
    const outputBuffer = await fsPromises.readFile(outputPath);

    // 4. Clean up frames and output directories concurrently (async-parallel)
    void fsPromises.rm(jobDir, { recursive: true, force: true }).catch((err) => {
      console.error("Failed to clean up job directory:", err);
    });

    const contentTypes = {
      mp4: "video/mp4",
      webm: "video/webm",
      gif: "image/gif",
    };

    return c.body(outputBuffer, 200, {
      "Content-Type": contentTypes[format] || "application/octet-stream",
      "Content-Disposition": `attachment; filename="stickman_animation.${format}"`,
    });
  } catch (err: any) {
    // Attempt cleanup on failure
    void fsPromises.rm(jobDir, { recursive: true, force: true }).catch(() => {});
    return c.json({ error: err.message || "Rendering failed" }, 500);
  }
});

function checkFfmpeg(): boolean {
  try {
    const result = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return result.status === 0;
  } catch {
    return false;
  }
}

function encodeWithFfmpeg(
  framesDir: string,
  inputPattern: string,
  outputPath: string,
  format: string,
  fps: number,
  jobDir: string
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      if (format === "gif") {
        // High-quality two-pass palettized GIF compilation to avoid color distortion
        const palettePath = join(jobDir, "palette.png");
        
        // Pass 1: Generate optimal palette
        const paletteProc = spawn("ffmpeg", [
          "-y",
          "-framerate",
          String(fps),
          "-i",
          inputPattern,
          "-vf",
          "palettegen",
          palettePath,
        ]);
        
        await new Promise<void>((res, rej) => {
          paletteProc.on("close", (code) => (code === 0 ? res() : rej(new Error(`Palette generation failed with code ${code}`))));
          paletteProc.on("error", rej);
        });

        // Pass 2: Compile palettized GIF
        const gifProc = spawn("ffmpeg", [
          "-y",
          "-framerate",
          String(fps),
          "-i",
          inputPattern,
          "-i",
          palettePath,
          "-filter_complex",
          "paletteuse",
          outputPath,
        ]);

        gifProc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`GIF encode failed with code ${code}`))));
        gifProc.on("error", reject);
      } else {
        // Broadcast-quality MP4/WebM profile parameters
        const args =
          format === "webm"
            ? [
                "-y",
                "-framerate",
                String(fps),
                "-i",
                inputPattern,
                "-c:v",
                "libvpx-vp9",
                "-b:v",
                "2M",
                "-crf",
                "20",
                outputPath,
              ]
            : [
                "-y",
                "-framerate",
                String(fps),
                "-i",
                inputPattern,
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-crf",
                "18",
                "-preset",
                "fast",
                outputPath,
              ];

        const proc = spawn("ffmpeg", args);
        proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`Video encode failed with code ${code}`))));
        proc.on("error", reject);
      }
    } catch (error) {
      reject(error);
    }
  });
}

const port = parseInt(process.env.RENDERER_PORT ?? "4001", 10);
console.log(`Stickman Renderer on http://localhost:${port}`);
serve({ fetch: app.fetch, port });

