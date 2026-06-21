import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, existsSync, promises as fsPromises } from "node:fs";
import { join } from "node:path";

import { cors } from "hono/cors";

const app = new Hono();
app.use("/*", cors());
const OUTPUT_DIR = join(process.cwd(), "output");

interface RenderAudioClip {
  id: string;
  dataUrl: string;
  startTime: number;
  duration: number;
  sourceOffset?: number;
  volume: number;
  pan?: number;
  fadeIn?: number;
  fadeOut?: number;
}

interface PreparedAudioClip extends Omit<RenderAudioClip, "dataUrl"> {
  path: string;
}

app.get("/health", (c) =>
  c.json({ status: "ok", service: "stickman-renderer", ffmpeg: checkFfmpeg() })
);

app.post("/render", async (c) => {
  const body = await c.req.json<{
    jobId: string;
    format: "mp4" | "gif" | "webm";
    frames: string[]; // Base64 data URLs
    fps?: number;
    audioClips?: RenderAudioClip[];
  }>();

  const jobId = body.jobId || crypto.randomUUID();
  const format = body.format || "mp4";
  const frames = body.frames || [];
  const fps = body.fps ?? 30;
  const audioClips = format === "gif" ? [] : (body.audioClips ?? []);

  if (frames.length === 0) {
    return c.json({ error: "No frames provided" }, 400);
  }
  if (!Number.isFinite(fps) || fps < 1 || fps > 60) return c.json({ error: "FPS must be between 1 and 60" }, 400);
  if (audioClips.length > 64) return c.json({ error: "A maximum of 64 audio clips is supported" }, 400);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const jobDir = join(OUTPUT_DIR, jobId);
  const framesDir = join(jobDir, "frames");
  mkdirSync(framesDir, { recursive: true });

  const outputPath = join(jobDir, `output.${format}`);
  const inputPattern = join(framesDir, "frame_%05d.jpg");
  const audioDir = join(jobDir, "audio");
  mkdirSync(audioDir, { recursive: true });

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
  let totalAudioBytes = 0;
  const preparedAudio = await Promise.all(audioClips.map(async (clip, index): Promise<PreparedAudioClip> => {
    const match = /^data:(audio\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(clip.dataUrl);
    if (!match) throw new Error(`Audio clip ${clip.id || index} is not a base64 audio data URL`);
    const mime = match[1]!;
    const extension = mime.includes("wav") ? "wav" : mime.includes("mpeg") ? "mp3" : mime.includes("ogg") ? "ogg" : "m4a";
    const buffer = Buffer.from(match[2]!, "base64");
    totalAudioBytes += buffer.byteLength;
    if (buffer.byteLength > 15 * 1024 * 1024) throw new Error(`Audio clip ${clip.id || index} exceeds 15 MB`);
    const path = join(audioDir, `clip_${String(index).padStart(3, "0")}.${extension}`);
    await fsPromises.writeFile(path, buffer);
    return {
      id: clip.id || `clip-${index}`,
      path,
      startTime: Math.max(0, Number(clip.startTime) || 0),
      duration: Math.max(0.05, Number(clip.duration) || 0.05),
      sourceOffset: Math.max(0, Number(clip.sourceOffset) || 0),
      volume: Math.max(0, Math.min(1, Number(clip.volume) || 0)),
      pan: Math.max(-1, Math.min(1, Number(clip.pan) || 0)),
      fadeIn: Math.max(0, Number(clip.fadeIn) || 0),
      fadeOut: Math.max(0, Number(clip.fadeOut) || 0),
    };
  }));
  if (totalAudioBytes > 60 * 1024 * 1024) return c.json({ error: "Combined audio exceeds 60 MB" }, 400);

  try {
    if (!checkFfmpeg()) {
      throw new Error("FFmpeg binary is not available on this server environment");
    }

    // 2. Encode with FFmpeg using senior-grade high-quality profiles
    await encodeWithFfmpeg(framesDir, inputPattern, outputPath, format, fps, jobDir, preparedAudio, frames.length / fps);

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
  jobDir: string,
  audioClips: PreparedAudioClip[],
  videoDuration: number
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
        const videoArgs =
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
              ];

        const audioInputs = audioClips.flatMap((clip) => ["-i", clip.path]);
        let audioArgs: string[] = [];
        if (audioClips.length > 0) {
          const filters = audioClips.map((clip, index) => {
            const fadeIn = Math.min(clip.fadeIn ?? 0, clip.duration / 2);
            const fadeOut = Math.min(clip.fadeOut ?? 0, clip.duration / 2);
            const fadeOutStart = Math.max(0, clip.duration - fadeOut);
            const left = Math.max(0, 1 - Math.max(0, clip.pan ?? 0));
            const right = Math.max(0, 1 + Math.min(0, clip.pan ?? 0));
            const parts = [
              `[${index + 1}:a]atrim=start=${clip.sourceOffset ?? 0}:duration=${clip.duration}`,
              "asetpts=PTS-STARTPTS",
              "aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo",
              `volume=${clip.volume}`,
              `pan=stereo|c0=${left.toFixed(3)}*c0|c1=${right.toFixed(3)}*c1`,
            ];
            if (fadeIn > 0) parts.push(`afade=t=in:st=0:d=${fadeIn}`);
            if (fadeOut > 0) parts.push(`afade=t=out:st=${fadeOutStart}:d=${fadeOut}`);
            parts.push(`adelay=${Math.round(clip.startTime * 1000)}:all=1[a${index}]`);
            return parts.join(",");
          });
          const labels = audioClips.map((_, index) => `[a${index}]`).join("");
          filters.push(`${labels}amix=inputs=${audioClips.length}:normalize=0:dropout_transition=0,alimiter=limit=0.89,loudnorm=I=-14:TP=-1:LRA=11[aout]`);
          audioArgs = [
            "-filter_complex", filters.join(";"),
            "-map", "0:v:0", "-map", "[aout]",
            "-c:a", format === "webm" ? "libopus" : "aac",
            "-b:a", format === "webm" ? "160k" : "192k",
            "-ar", "48000",
            "-t", videoDuration.toFixed(6),
          ];
        }
        const args = [...videoArgs.slice(0, 5), ...audioInputs, ...videoArgs.slice(5), ...audioArgs, outputPath];

        const proc = spawn("ffmpeg", args);
        let stderr = "";
        proc.stderr.on("data", (chunk) => { stderr += String(chunk); });
        proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`Video encode failed with code ${code}: ${stderr.slice(-2000)}`))));
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

