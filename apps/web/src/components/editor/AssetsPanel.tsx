"use client";

import { useState } from "react";
import { spriteManifest } from "@stickman/shared";
import { clipPath } from "@stickman/shared";
import { useEditorStore } from "@/stores/editor-store";
import { 
  IconChevronDown, 
  IconChevronRight, 
  IconPhoto, 
  IconBox, 
  IconTerminal2, 
  IconCpu, 
  IconSword, 
  IconFolder,
  IconUser
} from "@tabler/icons-react";

export function AssetsPanel({ className }: { className?: string }) {
  const activeLayerId = useEditorStore((s) => s.activeLayerId);
  const manifest = spriteManifest as import("@stickman/shared").SpriteManifest;

  // Local state to manage expanded folders/groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    fighter: true,
    pistol: true,
    sword: false,
    backgrounds: false,
    props: false,
  });

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
    <div className={`flex flex-col h-full bg-card/10 select-none ${className}`}>
      {/* Title */}
      <div className="flex h-10 items-center border-b px-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground/80">
        Asset Library
      </div>

      <div className="flex-1 overflow-y-auto p-3 text-xs flex flex-col gap-5">
        
        {/* SECTION 1: PLATFORM CHARACTERS */}
        <div className="flex flex-col gap-2">
          <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 px-1">
            Platform
          </h4>
          
          <div className="flex flex-col gap-1">
            {Object.entries(manifest.characters).map(([character, clips]) => {
              const isExpanded = expandedGroups[character];
              return (
                <div key={character} className="flex flex-col">
                  {/* Collapsible Header */}
                  <button
                    onClick={() => toggleGroup(character)}
                    className="flex items-center justify-between gap-2.5 rounded-md px-2 py-1.5 text-left font-bold text-foreground/90 hover:bg-accent/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {getCharacterIcon(character)}
                      <span className="capitalize truncate text-xs font-semibold">{character}</span>
                    </div>
                    {isExpanded ? (
                      <IconChevronDown className="h-3.5 w-3.5 text-muted-foreground/75" />
                    ) : (
                      <IconChevronRight className="h-3.5 w-3.5 text-muted-foreground/75" />
                    )}
                  </button>

                  {/* Collapsible Children Actions with Indentation Lines */}
                  {isExpanded && (
                    <div className="border-l border-border/50 ml-4.5 pl-3 py-1 flex flex-col gap-1">
                      {Object.keys(clips).map((action) => {
                        const clip = clipPath(character, action);
                        return (
                          <div
                            key={clip}
                            draggable
                            onDragStart={(e) => onDragStart(e, clip)}
                            className="group flex items-center justify-between cursor-grab active:cursor-grabbing rounded px-2.5 py-1 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all duration-150"
                            title={`Drag ${action} onto canvas`}
                          >
                            <span className="truncate capitalize text-[11px] font-medium">{action}</span>
                            <span className="text-[8px] opacity-0 group-hover:opacity-100 font-bold uppercase tracking-wider text-primary/70 select-none">
                              Drag
                            </span>
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
        <div className="flex flex-col gap-2">
          <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 px-1">
            Media Elements
          </h4>

          <div className="flex flex-col gap-1">
            {/* Backgrounds Group */}
            <div className="flex flex-col">
              <button
                onClick={() => toggleGroup("backgrounds")}
                className="flex items-center justify-between gap-2.5 rounded-md px-2 py-1.5 text-left font-bold text-foreground/90 hover:bg-accent/40 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <IconPhoto className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="truncate text-xs font-semibold">Backgrounds</span>
                </div>
                {expandedGroups.backgrounds ? (
                  <IconChevronDown className="h-3.5 w-3.5 text-muted-foreground/75" />
                ) : (
                  <IconChevronRight className="h-3.5 w-3.5 text-muted-foreground/75" />
                )}
              </button>

              {expandedGroups.backgrounds && (
                <div className="border-l border-border/50 ml-4.5 pl-3 py-1 flex flex-col gap-1">
                  {manifest.backgrounds.map((bg) => (
                    <div
                      key={bg}
                      draggable
                      onDragStart={(e) => onDragStart(e, `extras/background/${bg}`)}
                      className="group flex items-center justify-between cursor-grab active:cursor-grabbing rounded px-2.5 py-1 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all duration-150"
                      title="Drag background onto canvas"
                    >
                      <span className="truncate capitalize text-[11px] font-medium">
                        {bg.replace(".png", "")}
                      </span>
                      <span className="text-[8px] opacity-0 group-hover:opacity-100 font-bold uppercase tracking-wider text-primary/70 select-none">
                        Drag
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Props Group */}
            <div className="flex flex-col">
              <button
                onClick={() => toggleGroup("props")}
                className="flex items-center justify-between gap-2.5 rounded-md px-2 py-1.5 text-left font-bold text-foreground/90 hover:bg-accent/40 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <IconBox className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="truncate text-xs font-semibold">Props & Weapons</span>
                </div>
                {expandedGroups.props ? (
                  <IconChevronDown className="h-3.5 w-3.5 text-muted-foreground/75" />
                ) : (
                  <IconChevronRight className="h-3.5 w-3.5 text-muted-foreground/75" />
                )}
              </button>

              {expandedGroups.props && (
                <div className="border-l border-border/50 ml-4.5 pl-3 py-1 flex flex-col gap-1">
                  {manifest.props.slice(0, 12).map((prop) => (
                    <div
                      key={prop}
                      draggable
                      onDragStart={(e) => onDragStart(e, `extras/prop/${prop}`)}
                      className="group flex items-center justify-between cursor-grab active:cursor-grabbing rounded px-2.5 py-1 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all duration-150"
                      title="Drag prop onto canvas"
                    >
                      <span className="truncate capitalize text-[11px] font-medium">
                        {prop.replace(".png", "")}
                      </span>
                      <span className="text-[8px] opacity-0 group-hover:opacity-100 font-bold uppercase tracking-wider text-primary/70 select-none">
                        Drag
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {!activeLayerId && (
          <p className="text-[10px] text-muted-foreground/70 italic text-center select-none mt-2">
            Tip: Active a layer first to add elements
          </p>
        )}
      </div>
    </div>
  );
}
