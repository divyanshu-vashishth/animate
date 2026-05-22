export interface ClipManifest {
  frames: string[];
  fps: number;
  folder: string;
}

export interface SpriteManifest {
  characters: Record<string, Record<string, ClipManifest>>;
  vfx: Record<string, ClipManifest>;
  backgrounds: string[];
  props: string[];
}

export function clipPath(character: string, action: string): string {
  return `${character}/${action}`;
}

export function parseClipPath(clip: string): { character: string; action: string } | null {
  const parts = clip.split("/");
  if (parts.length !== 2) return null;
  return { character: parts[0]!, action: parts[1]! };
}

export function spriteUrl(folder: string, filename: string): string {
  return `/sprites/${encodeURIComponent(folder)}/${encodeURIComponent(filename)}`;
}
