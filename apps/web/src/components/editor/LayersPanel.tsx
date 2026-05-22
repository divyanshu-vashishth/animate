"use client";

import type { LayerData } from "@stickman/shared";
import { Button } from "@/components/ui/button";
import { EditorPanel } from "./editor-panel";
import { commandBus } from "@/lib/command-bus";
import { useEditorStore } from "@/stores/editor-store";

/** Stable empty reference — avoids Zustand infinite loop when document is null */
const EMPTY_LAYERS: LayerData[] = [];

export function LayersPanel() {
  const layers = useEditorStore((s) => s.document?.layers ?? EMPTY_LAYERS);
  const activeLayerId = useEditorStore((s) => s.activeLayerId);
  const setActiveLayerId = useEditorStore((s) => s.setActiveLayerId);
  const document = useEditorStore((s) => s.document);

  const updateLayer = (layerId: string, patch: Partial<{ visible: boolean; locked: boolean }>) => {
    if (!document) return;
    const updated = {
      ...document,
      layers: document.layers.map((l) =>
        l.id === layerId ? { ...l, ...patch } : l
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
    <EditorPanel title="Layers" className="w-48 shrink-0 border-r">
      <div className="flex flex-col gap-1 p-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => commandBus.dispatch({ type: "AddLayer", name: "New Layer" })}
        >
          + Layer
        </Button>
        {[...layers].reverse().map((layer) => (
          <div
            key={layer.id}
            className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs ${
              activeLayerId === layer.id ? "bg-violet-600/30" : "hover:bg-white/5"
            }`}
            onClick={() => setActiveLayerId(layer.id)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateLayer(layer.id, { visible: !layer.visible });
              }}
              className="w-4"
            >
              {layer.visible ? "👁" : "—"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateLayer(layer.id, { locked: !layer.locked });
              }}
              className="w-4"
            >
              {layer.locked ? "🔒" : "○"}
            </button>
            <span className="flex-1 truncate">{layer.name}</span>
          </div>
        ))}
      </div>
    </EditorPanel>
  );
}
