import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { once } from "node:events";

const waitForHealth = async (url) => {
  for (let attempt = 0; attempt < 40; attempt++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Renderer did not start");
};

test("muxes scheduled audio into a 24 FPS MP4", { timeout: 30000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), "stickman-render-test-"));
  const imagePath = join(dir, "frame.jpg");
  const audioPath = join(dir, "tone.wav");
  const outputPath = join(dir, "output.mp4");
  assert.equal(spawnSync("ffmpeg", ["-y", "-f", "lavfi", "-i", "color=c=white:s=16x16", "-frames:v", "1", imagePath], { stdio: "ignore" }).status, 0);
  assert.equal(spawnSync("ffmpeg", ["-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=0.5", audioPath], { stdio: "ignore" }).status, 0);
  const frame = `data:image/jpeg;base64,${(await readFile(imagePath)).toString("base64")}`;
  const audio = `data:audio/wav;base64,${(await readFile(audioPath)).toString("base64")}`;
  const port = "4599";
  const rendererEntry = fileURLToPath(new URL("./dist/index.js", import.meta.url));
  const server = spawn(process.execPath, [rendererEntry], { cwd: dir, env: { ...process.env, RENDERER_PORT: port }, stdio: "ignore" });
  try {
    await waitForHealth(`http://127.0.0.1:${port}/health`);
    const response = await fetch(`http://127.0.0.1:${port}/render`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: `test-${Date.now()}`, format: "mp4", fps: 24, frames: Array.from({ length: 24 }, () => frame),
        audioClips: [{ id: "tone", dataUrl: audio, startTime: 0.2, duration: 0.5, volume: 0.8 }] }),
    });
    const body = Buffer.from(await response.arrayBuffer());
    assert.equal(response.status, 200, body.toString());
    await writeFile(outputPath, body);
    const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,codec_type,avg_frame_rate", "-of", "json", outputPath], { encoding: "utf8" });
    assert.equal(probe.status, 0, probe.stderr);
    const streams = JSON.parse(probe.stdout).streams;
    assert.ok(streams.some((stream) => stream.codec_type === "video" && stream.codec_name === "h264" && stream.avg_frame_rate === "24/1"));
    assert.ok(streams.some((stream) => stream.codec_type === "audio" && stream.codec_name === "aac"));
  } finally {
    if (server.exitCode === null) {
      server.kill();
      await Promise.race([
        once(server, "exit"),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
    }
    await rm(dir, { recursive: true, force: true });
  }
});
