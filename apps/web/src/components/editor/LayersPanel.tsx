"use client";

import {
  IconCircle,
  IconEye,
  IconEyeOff,
  IconLock,
  IconLockOpen,
  IconPlus,
} from "@tabler/icons-react";
import type { LayerData } from "@stickman/shared";
import { Button } from "@/components/ui/button";
import { EditorPanel } from "./editor-panel";
import { commandBus } from "@/lib/command-bus";
import { useEditorStore } from "@/stores/editor-store";

const EMPTY_LAYERS: LayerData[] = [];

export function LayersPanel() {
  const layers = useEditorStore((s) => s.document?.layers ?? EMPTY_LAYERS);
  const activeLayerId = useEditorStore((s) => s.activeLayerId);
  const setActiveLayerId = useEditorStore((s) => s.setActiveLayerId);
  const document = useEditorStore((s) => s.document);

  const updateLayer = (
    layerId: string,
    patch: Partial<{ visible: boolean; locked: boolean }>
  ) => {
    if (!document) return;
    const updated = {
      ...document,
      layers: document.layers.map((layer) =>
        layer.id === layerId ? { ...layer, ...patch } : layer
      ),
    };
    useEditorStore.getState().setDocument(updated);
    if (patch.visible !== undefined) {
      commandBus.dispatch({ type: "SetLayerVisibility", layerId, visible: patch.visible });
    }
    if (patch.locked !== undefined) {
      commandBus.dispatch({ type: "SetLayerLocked", layerId, locked: patch.locked });
    }
  };

  return (
    <EditorPanel title="Layers" className="w-56 shrink-0 border-r">
      <div className="flex flex-col gap-1 p-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => commandBus.dispatch({ type: "AddLayer", name: "New Layer" })}
        >
          <IconPlus data-icon="inline-start" />
          Layer
        </Button>
        {[...layers].reverse().map((layer) => (
          <div
            key={layer.id}
            role="button"
            tabIndex={0}
            className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
              activeLayerId === layer.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"
            }`}
            onClick={() => setActiveLayerId(layer.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") setActiveLayerId(layer.id);
            }}
          >
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                updateLayer(layer.id, { visible: !layer.visible });
              }}
              aria-label={layer.visible ? "Hide layer" : "Show layer"}
            >
              {layer.visible ? <IconEye /> : <IconEyeOff />}
            </Button>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                updateLayer(layer.id, { locked: !layer.locked });
              }}
              aria-label={layer.locked ? "Unlock layer" : "Lock layer"}
            >
              {layer.locked ? <IconLock /> : <IconLockOpen />}
            </Button>
            <IconCircle data-icon="inline-start" className="text-muted-foreground" />
            <span className="flex-1 truncate">{layer.name}</span>
          </div>
        ))}
      </div>
    </EditorPanel>
  );
}
