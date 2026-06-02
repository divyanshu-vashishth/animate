"use client";

import { useState, useEffect } from "react";
import { spriteManifest } from "@stickman/shared";
import { clipPath } from "@stickman/shared";
import { useEditorStore } from "@/stores/editor-store";
import { api } from "@/lib/api";
import { 
  IconChevronDown, 
  IconChevronRight, 
  IconPhoto, 
  IconBox, 
  IconTerminal2, 
  IconCpu, 
  IconSword, 
  IconUser,
  IconPlus,
  IconCloudUpload,
  IconLoader2
} from "@tabler/icons-react";

export function AssetsPanel({ className }: { className?: string }) {
  const activeLayerId = useEditorStore((s) => s.activeLayerId);
  const document = useEditorStore((s) => s.document);
  const setDocument = useEditorStore((s) => s.setDocument);
  const setSelectedEntity = useEditorStore((s) => s.setSelectedEntity);
  
  const manifest = spriteManifest as import("@stickman/shared").SpriteManifest;

  // Local state to manage expanded folders/groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    fighter: true,
    pistol: true,
    sword: false,
    backgrounds: false,
    props: false,
    uploads: true,
  });

  const [customAssets, setCustomAssets] = useState<any[]>([]);
  const [loadingCustomAssets, setLoadingCustomAssets] = useState(false);

  useEffect(() => {
    setLoadingCustomAssets(true);
    api.listAssets()
      .then(({ assets }) => {
        setCustomAssets(assets || []);
      })
      .catch((err) => {
        console.error("Failed to load custom assets in editor:", err);
      })
      .finally(() => {
        setLoadingCustomAssets(false);
      });
  }, []);

  const handleCustomAssetClick = (asset: any) => {
    if (!document) return;
    const newEntity = {
      id: crypto.randomUUID(),
      type: "image" as const,
      name: asset.name,
      layerId: activeLayerId || document.layers[0]?.id || "default-layer",
      src: asset.url,
      transform: { x: 320, y: 180, rotation: 0, scaleX: 1, scaleY: 1 },
      startTime: 0,
      endTime: document.timeline?.duration ?? 5,
      width: 120,
      height: 120,
    };

    const updatedEntities = [...document.entities, newEntity];
    setDocument({
      ...document,
      entities: updatedEntities,
    });
    setSelectedEntity(newEntity.id);
    import("sonner").then(({ toast }) => {
      toast.success(`Added ${newEntity.name} to canvas`);
    });
  };

  const onCustomDragStart = (e: React.DragEvent, asset: any) => {
    e.dataTransfer.setData("application/stickman-clip", asset.url);
    e.dataTransfer.setData("text/plain", asset.url);
    e.dataTransfer.effectAllowed = "copy";
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  const onDragStart = (e: React.DragEvent, clip: string) => {
    e.dataTransfer.setData("application/stickman-clip", clip);
    e.dataTransfer.setData("text/plain", clip);
    e.dataTransfer.effectAllowed = "copy";
  };

  // Central item click handler
  const handleItemClick = (clip: string) => {
    if (!document) return;
    let newEntity: any = null;

    if (clip.startsWith("extras/prop/")) {
      const filename = clip.split("/").pop()!;
      const cleanName = filename.replace(".png", "");
      newEntity = {
        id: crypto.randomUUID(),
        type: "sprite",
        name: cleanName,
        layerId: activeLayerId || document.layers[0]?.id || "default-layer",
        clip,
        transform: { x: 320, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
        startTime: 0,
        endTime: document.timeline?.duration ?? 5,
        width: 120,
        height: 120,
      };
    } else if (clip.startsWith("extras/background/")) {
      const filename = clip.split("/").pop()!;
      const cleanName = filename.replace(".png", "");
      newEntity = {
        id: crypto.randomUUID(),
        type: "sprite",
        name: cleanName,
        layerId: activeLayerId || document.layers[0]?.id || "default-layer",
        clip,
        transform: { x: 320, y: 360, rotation: 0, scaleX: 1, scaleY: 1 },
        startTime: 0,
        endTime: document.timeline?.duration ?? 5,
        width: 640,
        height: 360,
      };
    } else {
      const parsed = clip.split("/");
      if (parsed.length === 2) {
        const [character, action] = parsed;
        newEntity = {
          id: crypto.randomUUID(),
          type: "sprite",
          name: `${character} (${action})`,
          layerId: activeLayerId || document.layers[0]?.id || "default-layer",
          clip,
          transform: { x: 320, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
          startTime: 0,
          endTime: document.timeline?.duration ?? 5,
          width: 120,
          height: 120,
        };
      }
    }

    if (newEntity) {
      const updatedEntities = [...document.entities, newEntity];
      setDocument({
        ...document,
        entities: updatedEntities,
      });
      setSelectedEntity(newEntity.id);
      import("sonner").then(({ toast }) => {
        toast.success(`Added ${newEntity.name} to canvas`);
      });
    }
  };

  // Helper to match custom premium icons to characters
  const getCharacterIcon = (charName: string) => {
    switch (charName.toLowerCase()) {
      case "fighter":
        return <IconTerminal2 className="h-4 w-4 text-sky-400 shrink-0" />;
      case "pistol":
        return <IconCpu className="h-4 w-4 text-violet-400 shrink-0" />;
      case "sword":
        return <IconSword className="h-4 w-4 text-indigo-400 shrink-0" />;
      default:
        return <IconUser className="h-4 w-4 text-primary shrink-0" />;
    }
  };

  return (
    <div className={`flex flex-col h-full bg-transparent select-none ${className}`}>
      {/* Title */}
      <div className="flex h-10 shrink-0 items-center border-b border-border/20 px-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 bg-muted/10">
        Asset Library Explorer
      </div>

      <div className="flex-1 overflow-y-auto p-3 text-xs flex flex-col gap-4">
        
        {/* SECTION 1: PLATFORM CHARACTERS */}
        <div className="flex flex-col gap-1.5">
          <h4 className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/40 px-1 select-none">
            Characters & Poses
          </h4>
          
          <div className="flex flex-col gap-0.5">
            {Object.entries(manifest.characters).map(([character, clips]) => {
              const isExpanded = expandedGroups[character];
              return (
                <div key={character} className="flex flex-col">
                  {/* Collapsible Header */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(character)}
                    className="flex items-center justify-between gap-2.5 rounded px-2 py-1 text-left font-bold text-foreground/90 hover:bg-accent/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {getCharacterIcon(character)}
                      <span className="capitalize truncate text-[11px] font-semibold">{character}</span>
                    </div>
                    {isExpanded ? (
                      <IconChevronDown className="h-3 w-3 text-muted-foreground/60" />
                    ) : (
                      <IconChevronRight className="h-3 w-3 text-muted-foreground/60" />
                    )}
                  </button>

                  {/* Collapsible Children Actions with Indentation Lines */}
                  {isExpanded && (
                    <div className="border-l border-border/30 ml-4 pl-2.5 py-0.5 flex flex-col gap-0.5">
                      {Object.keys(clips).map((action) => {
                        const clip = clipPath(character, action);
                        return (
                          <div
                            key={clip}
                            draggable
                            onDragStart={(e) => onDragStart(e, clip)}
                            onClick={() => handleItemClick(clip)}
                            className="group flex items-center justify-between cursor-pointer rounded px-2 py-1 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all duration-150"
                            title={`Click to add or drag onto canvas`}
                          >
                            <span className="truncate capitalize text-[10px] font-medium">{action}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 select-none">
                              <span className="text-[8px] font-bold uppercase tracking-wider text-primary/70">
                                Add
                              </span>
                              <IconPlus className="h-2.5 w-2.5 text-primary/70" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: MEDIA ELEMENTS */}
        <div className="flex flex-col gap-1.5">
          <h4 className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/40 px-1 select-none">
            Environment & Elements
          </h4>

          <div className="flex flex-col gap-0.5">
            {/* Backgrounds Group */}
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => toggleGroup("backgrounds")}
                className="flex items-center justify-between gap-2.5 rounded px-2 py-1 text-left font-bold text-foreground/90 hover:bg-accent/40 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <IconPhoto className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="truncate text-[11px] font-semibold">Backgrounds</span>
                </div>
                {expandedGroups.backgrounds ? (
                  <IconChevronDown className="h-3 w-3 text-muted-foreground/60" />
                ) : (
                  <IconChevronRight className="h-3 w-3 text-muted-foreground/60" />
                )}
              </button>

              {expandedGroups.backgrounds && (
                <div className="border-l border-border/30 ml-4 pl-2.5 py-0.5 flex flex-col gap-0.5">
                  {manifest.backgrounds.map((bg) => (
                    <div
                      key={bg}
                      draggable
                      onDragStart={(e) => onDragStart(e, `extras/background/${bg}`)}
                      onClick={() => handleItemClick(`extras/background/${bg}`)}
                      className="group flex items-center justify-between cursor-pointer rounded px-2 py-1 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-400 transition-all duration-150"
                      title="Click to add or drag onto canvas"
                    >
                      <span className="truncate capitalize text-[10px] font-medium">
                        {bg.replace(".png", "")}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 select-none">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-400/80">
                          Add
                        </span>
                        <IconPlus className="h-2.5 w-2.5 text-emerald-400/80" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Props Group */}
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => toggleGroup("props")}
                className="flex items-center justify-between gap-2.5 rounded px-2 py-1 text-left font-bold text-foreground/90 hover:bg-accent/40 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <IconBox className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="truncate text-[11px] font-semibold">Props & Weapons</span>
                </div>
                {expandedGroups.props ? (
                  <IconChevronDown className="h-3 w-3 text-muted-foreground/60" />
                ) : (
                  <IconChevronRight className="h-3 w-3 text-muted-foreground/60" />
                )}
              </button>

              {expandedGroups.props && (
                <div className="border-l border-border/30 ml-4 pl-2.5 py-0.5 flex flex-col gap-0.5">
                  {manifest.props.map((prop) => (
                    <div
                      key={prop}
                      draggable
                      onDragStart={(e) => onDragStart(e, `extras/prop/${prop}`)}
                      onClick={() => handleItemClick(`extras/prop/${prop}`)}
                      className="group flex items-center justify-between cursor-pointer rounded px-2 py-1 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-400 transition-all duration-150"
                      title="Click to add or drag onto canvas"
                    >
                      <span className="truncate capitalize text-[10px] font-medium">
                        {prop.replace(".png", "")}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 select-none">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-amber-400/80">
                          Add
                        </span>
                        <IconPlus className="h-2.5 w-2.5 text-amber-400/80" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* My Uploads Group */}
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => toggleGroup("uploads")}
                className="flex items-center justify-between gap-2.5 rounded px-2 py-1 text-left font-bold text-foreground/90 hover:bg-accent/40 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <IconCloudUpload className="h-4 w-4 text-violet-400 shrink-0" />
                  <span className="truncate text-[11px] font-semibold">My Uploads</span>
                </div>
                {expandedGroups.uploads ? (
                  <IconChevronDown className="h-3 w-3 text-muted-foreground/60" />
                ) : (
                  <IconChevronRight className="h-3 w-3 text-muted-foreground/60" />
                )}
              </button>

              {expandedGroups.uploads && (
                <div className="border-l border-border/30 ml-4 pl-2.5 py-0.5 flex flex-col gap-1">
                  {loadingCustomAssets ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 text-muted-foreground text-[10px]">
                      <IconLoader2 className="h-3 w-3 animate-spin text-primary" />
                      <span>Loading uploads...</span>
                    </div>
                  ) : customAssets.length === 0 ? (
                    <div className="text-[10px] text-muted-foreground/60 px-2 py-1">
                      No custom assets found. Upload images on the dashboard to see them here!
                    </div>
                  ) : (
                    customAssets.map((asset) => (
                      <div
                        key={asset.id}
                        draggable
                        onDragStart={(e) => onCustomDragStart(e, asset)}
                        onClick={() => handleCustomAssetClick(asset)}
                        className="group flex items-center justify-between cursor-pointer rounded px-2 py-1 text-muted-foreground hover:bg-violet-500/10 hover:text-violet-400 transition-all duration-150"
                        title="Click to add or drag onto canvas"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {asset.url && (
                            <img
                              src={asset.url}
                              alt={asset.name}
                              className="h-4 w-4 rounded object-cover border border-border/20 bg-neutral-950 shrink-0"
                            />
                          )}
                          <span className="truncate text-[10px] font-medium">
                            {asset.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 select-none">
                          <span className="text-[8px] font-bold uppercase tracking-wider text-violet-400/80">
                            Add
                          </span>
                          <IconPlus className="h-2.5 w-2.5 text-violet-400/80" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
