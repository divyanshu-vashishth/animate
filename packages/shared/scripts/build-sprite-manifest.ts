import { readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPRITES_ROOT = join(__dirname, "../../../assets/sprites");
const OUT_PATH = join(__dirname, "../src/sprite-manifest.json");

const CHARACTERS = ["fighter", "pistol", "sword"] as const;
const DEFAULT_FPS: Record<string, number> = {
  idle: 8,
  run: 16,
  walk: 12,
  jump: 12,
  dash: 20,
  combo: 24,
  death: 10,
  hit: 12,
  climb: 10,
  slide: 12,
  shot: 16,
  air_attack: 16,
  wallslide: 12,
};

type ClipManifest = { frames: string[]; fps: number; folder: string };
type CharacterManifest = Record<string, ClipManifest>;
type SpriteManifest = {
  characters: Record<string, CharacterManifest>;
  vfx: Record<string, ClipManifest>;
  backgrounds: string[];
  props: string[];
};

const manifest: SpriteManifest = {
  characters: {},
  vfx: {},
  backgrounds: [],
  props: [],
};

function normalizeAction(action: string): string {
  return action.toLowerCase().replace(/\s+/g, "_");
}

function parseCharacterFrame(filename: string): { char: string; action: string; frame: number } | null {
  const standard = filename.match(/^(fighter|pistol|sword)_(.+)_(\d+)\.png$/i);
  if (standard) {
    return {
      char: standard[1]!.toLowerCase(),
      action: normalizeAction(standard[2]!),
      frame: parseInt(standard[3]!, 10),
    };
  }
  const wallslide = filename.match(/^(fighter|pistol|sword)_?(wallslide)(\d+)\.png$/i);
  if (wallslide) {
    return {
      char: wallslide[1]!.toLowerCase(),
      action: "wallslide",
      frame: parseInt(wallslide[3]!, 10),
    };
  }
  return null;
}

for (const char of CHARACTERS) {
  const folderName =
    char === "fighter" ? "Fighter sprites" : char === "pistol" ? "Pistol sprites" : "Sword sprites";
  const folderPath = join(SPRITES_ROOT, folderName);
  manifest.characters[char] = {};

  try {
    const files = readdirSync(folderPath).filter((f) => f.endsWith(".png"));
    const clips: Record<string, { frames: Array<{ name: string; frame: number }>; folder: string }> = {};

    for (const file of files) {
      const parsed = parseCharacterFrame(file);
      if (!parsed || parsed.char !== char) continue;
      if (!clips[parsed.action]) {
        clips[parsed.action] = { frames: [], folder: folderName };
      }
      clips[parsed.action]!.frames.push({ name: file, frame: parsed.frame });
    }

    for (const [action, data] of Object.entries(clips)) {
      data.frames.sort((a, b) => a.frame - b.frame);
      manifest.characters[char]![action] = {
        frames: data.frames.map((f) => f.name),
        fps: DEFAULT_FPS[action] ?? 12,
        folder: data.folder,
      };
    }
  } catch {
    console.warn(`Missing folder: ${folderPath}`);
  }
}

const hitFolder = join(SPRITES_ROOT, "hit effect");
try {
  const hitFiles = readdirSync(hitFolder)
    .filter((f) => f.endsWith(".png"))
    .sort();
  if (hitFiles.length > 0) {
    manifest.vfx["hit_effect"] = {
      frames: hitFiles,
      fps: 16,
      folder: "hit effect",
    };
  }
} catch {
  /* optional */
}

const extrasPath = join(SPRITES_ROOT, "Extras");
try {
  const extras = readdirSync(extrasPath).filter((f) => f.endsWith(".png"));
  for (const file of extras) {
    if (file.startsWith("background")) {
      manifest.backgrounds.push(file);
    } else {
      manifest.props.push(file);
    }
  }
} catch {
  /* optional */
}

writeFileSync(OUT_PATH, JSON.stringify(manifest, null, 2));
console.log(`Wrote manifest to ${OUT_PATH}`);
console.log(
  `Characters: ${Object.keys(manifest.characters).map((c) => `${c}(${Object.keys(manifest.characters[c]!).length} clips)`).join(", ")}`
);
