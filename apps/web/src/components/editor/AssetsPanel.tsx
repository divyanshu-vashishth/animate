"use client";

import { spriteManifest } from "@stickman/shared";
import { EditorPanel } from "./editor-panel";
import { clipPath } from "@stickman/shared";
import { useEditorStore } from "@/stores/editor-store";

export function AssetsPanel() {
  const activeLayerId = useEditorStore((s) => s.activeLayerId);
  const manifest = spriteManifest as import("@stickman/shared").SpriteManifest;

  const onDragStart = (e: React.DragEvent, clip: string) => {
    e.dataTransfer.setData("application/stickman-clip", clip);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <EditorPanel title="Assets" className="h-full w-56 shrink-0">
      <div className="p-2 text-xs">
        <section className="mb-4">
          <h4 className="mb-2 font-semibold text-white/70">Characters</h4>
          {Object.entries(manifest.characters).map(([character, clips]) => (
            <div key={character} className="mb-3">
              <p className="mb-1 capitalize text-violet-300">{character}</p>
              <div className="flex flex-wrap gap-1">
                {Object.keys(clips).map((action) => {
                  const clip = clipPath(character, action);
                  return (
                    <button
                      key={clip}
                      draggable
                      onDragStart={(e) => onDragStart(e, clip)}
                      className="rounded bg-white/5 px-2 py-1 text-[10px] hover:bg-violet-600/30"
                      title={clip}
                    >
                      {action}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        <section className="mb-4">
          <h4 className="mb-2 font-semibold text-white/70">Backgrounds</h4>
          <div className="flex flex-wrap gap-1">
            {manifest.backgrounds.map((bg) => (
              <button
                key={bg}
                draggable
                onDragStart={(e) =>
                  onDragStart(e, `extras/background/${bg}`)
                }
                className="rounded bg-white/5 px-2 py-1 text-[10px] hover:bg-white/10"
              >
                {bg.replace(".png", "")}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h4 className="mb-2 font-semibold text-white/70">Props</h4>
          <div className="flex flex-wrap gap-1">
            {manifest.props.slice(0, 12).map((prop) => (
              <button
                key={prop}
                draggable
                onDragStart={(e) => onDragStart(e, `extras/prop/${prop}`)}
                className="rounded bg-white/5 px-2 py-1 text-[10px] hover:bg-white/10"
              >
                {prop.replace(".png", "")}
              </button>
            ))}
          </div>
        </section>

        {!activeLayerId && (
          <p className="mt-4 text-amber-400">Select a layer first</p>
        )}
      </div>
    </EditorPanel>
  );
}
