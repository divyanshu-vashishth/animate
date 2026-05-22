"use client";

import { spriteManifest } from "@stickman/shared";
import { Button } from "@/components/ui/button";
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
      <div className="flex flex-col gap-4 p-2 text-xs">
        <section className="flex flex-col gap-2">
          <h4 className="font-semibold text-muted-foreground">Characters</h4>
          {Object.entries(manifest.characters).map(([character, clips]) => (
            <div key={character} className="flex flex-col gap-1">
              <p className="capitalize text-foreground">{character}</p>
              <div className="flex flex-wrap gap-1">
                {Object.keys(clips).map((action) => {
                  const clip = clipPath(character, action);
                  return (
                    <Button
                      key={clip}
                      draggable
                      size="xs"
                      variant="secondary"
                      onDragStart={(e) => onDragStart(e, clip)}
                      className="h-6 rounded-md px-2 text-[10px]"
                      title={clip}
                    >
                      {action}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-2">
          <h4 className="font-semibold text-muted-foreground">Backgrounds</h4>
          <div className="flex flex-wrap gap-1">
            {manifest.backgrounds.map((bg) => (
              <Button
                key={bg}
                draggable
                size="xs"
                variant="secondary"
                onDragStart={(e) =>
                  onDragStart(e, `extras/background/${bg}`)
                }
                className="h-6 rounded-md px-2 text-[10px]"
              >
                {bg.replace(".png", "")}
              </Button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h4 className="font-semibold text-muted-foreground">Props</h4>
          <div className="flex flex-wrap gap-1">
            {manifest.props.slice(0, 12).map((prop) => (
              <Button
                key={prop}
                draggable
                size="xs"
                variant="secondary"
                onDragStart={(e) => onDragStart(e, `extras/prop/${prop}`)}
                className="h-6 rounded-md px-2 text-[10px]"
              >
                {prop.replace(".png", "")}
              </Button>
            ))}
          </div>
        </section>

        {!activeLayerId && (
          <p className="text-xs text-muted-foreground">Select a layer first</p>
        )}
      </div>
    </EditorPanel>
  );
}
