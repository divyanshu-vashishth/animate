"use client";

import React, { useEffect, useRef } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { 
  IconPlayerPlay, 
  IconPlayerPause, 
  IconPlayerStop, 
  IconMovie,
  IconTypography,
  IconPhoto,
  IconVideo
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

export function TimelinePanel() {
  const document = useEditorStore((s) => s.document);
  const setDocument = useEditorStore((s) => s.setDocument);
  const timelineTime = useEditorStore((s) => s.timelineTime);
  const setTimelineTime = useEditorStore((s) => s.setTimelineTime);
  const playbackState = useEditorStore((s) => s.playbackState);
  const setPlaybackState = useEditorStore((s) => s.setPlaybackState);
  const selectedEntityIds = useEditorStore((s) => s.selectedEntityIds);
  const setSelectedEntity = useEditorStore((s) => s.setSelectedEntity);

  const duration = document?.timeline?.duration ?? 5;

  // 60FPS Continuous Playhead animation loop ticker
  useEffect(() => {
    if (playbackState !== "playing") return;

    let lastTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      const currentTime = useEditorStore.getState().timelineTime;
      let nextTime = currentTime + delta;
      
      if (nextTime >= duration) {
        nextTime = 0;
      }
      
      useEditorStore.getState().setTimelineTime(nextTime);
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [playbackState, duration]);

  const handlePlayToggle = () => {
    if (playbackState === "playing") {
      setPlaybackState("paused");
    } else {
      setPlaybackState("playing");
    }
  };

  const handleStop = () => {
    setPlaybackState("stopped");
    setTimelineTime(0);
  };

  const handleScrubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = parseFloat(e.target.value);
    setTimelineTime(nextVal);
  };

  // Helper to resolve entity type icon
  const getEntityIcon = (type: string) => {
    switch (type) {
      case "text":
        return <IconTypography className="h-3.5 w-3.5 text-sky-400 shrink-0" />;
      case "image":
        return <IconPhoto className="h-3.5 w-3.5 text-emerald-400 shrink-0" />;
      default:
        return <IconMovie className="h-3.5 w-3.5 text-indigo-400 shrink-0" />;
    }
  };

  const entities = document?.entities || [];

  return (
    <div className="flex h-56 flex-col bg-card/60 backdrop-blur-md select-none border-t border-border/50">
      {/* 1. TIMELINE CONTROLLERS BAR */}
      <div className="flex h-11 items-center justify-between border-b border-border/40 px-4 bg-muted/20">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handlePlayToggle}
            className={`h-7 w-7 rounded-md ${playbackState === "playing" ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
            title={playbackState === "playing" ? "Pause" : "Play"}
          >
            {playbackState === "playing" ? (
              <IconPlayerPause className="h-4 w-4" />
            ) : (
              <IconPlayerPlay className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleStop}
            className="h-7 w-7 text-muted-foreground rounded-md hover:bg-accent/40"
            title="Stop"
          >
            <IconPlayerStop className="h-4 w-4" />
          </Button>

          <div className="h-4 w-px bg-border/40" />

          {/* Time indicator */}
          <div className="text-[11px] font-black tracking-widest tabular-nums text-foreground/80">
            {timelineTime.toFixed(2)}s <span className="text-muted-foreground">/ {duration.toFixed(2)}s</span>
          </div>
        </div>

        {/* Dynamic Scrub Slider */}
        <div className="flex flex-1 mx-8 max-w-xl items-center gap-2">
          <input
            type="range"
            min={0}
            max={duration}
            step={0.01}
            value={timelineTime}
            onChange={handleScrubChange}
            className="h-1.5 flex-1 accent-primary rounded bg-neutral-900/60 cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-accent/40 px-2 py-0.5 rounded border border-border/10">
            Timeline Editor
          </span>
        </div>
      </div>

      {/* 2. TRACKS GRID AND TICK MARKS RULER */}
      <div className="flex flex-1 min-h-0 overflow-y-auto">
        
        {/* Track Headers Sidebar Column */}
        <div className="w-52 shrink-0 border-r border-border/40 flex flex-col bg-card/25">
          {/* Header spacer aligned with ruler */}
          <div className="h-7 border-b border-border/40 px-3 flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 bg-muted/10">
            <span>Layers & Tracks</span>
            <span>Type</span>
          </div>

          <div className="flex-1 flex flex-col divide-y divide-border/20 overflow-y-auto">
            {entities.map((ent: any) => {
              const isSelected = selectedEntityIds.includes(ent.id);
              return (
                <div
                  key={ent.id}
                  onClick={() => setSelectedEntity(ent.id)}
                  className={`h-9 flex items-center gap-2.5 px-3 cursor-pointer text-xs font-semibold transition-all duration-150 ${
                    isSelected 
                      ? "bg-primary/10 border-l-2 border-primary text-primary" 
                      : "hover:bg-accent/30 text-foreground/80"
                  }`}
                >
                  {getEntityIcon(ent.type)}
                  <span className="truncate flex-1 select-none leading-none capitalize">
                    {ent.name || ent.text || ent.clip || "Untitled Clip"}
                  </span>
                </div>
              );
            })}

            {entities.length === 0 && (
              <div className="flex-1 flex items-center justify-center p-4 text-[10px] text-muted-foreground/60 italic text-center select-none">
                No active tracks. Drag sprites or add text!
              </div>
            )}
          </div>
        </div>

        {/* Timeline Tracks Visualizer */}
        <div className="flex-1 flex flex-col relative bg-neutral-950/5 overflow-x-hidden min-w-0">
          
          {/* Ruler tick marks spacer */}
          <div className="h-7 border-b border-border/40 flex relative bg-muted/15">
            {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
              <div 
                key={i} 
                className="absolute top-0 bottom-0 border-l border-border/30 text-[9px] font-black text-muted-foreground/70 pl-1 flex items-center select-none"
                style={{ left: `${(i / duration) * 100}%` }}
              >
                {i.toFixed(1)}s
              </div>
            ))}

            {/* Playhead vertical line cursor */}
            <div 
              className="absolute top-0 bottom-0 w-px bg-primary z-20 pointer-events-none transition-all duration-75"
              style={{ left: `${(timelineTime / duration) * 100}%` }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-primary -translate-x-1/2 absolute -top-0.5" />
            </div>
          </div>

          {/* Entity Visual Tracks list */}
          <div className="flex-1 flex flex-col divide-y divide-border/20 relative">
            
            {/* Playhead sweep line aligned with tracks */}
            <div 
              className="absolute top-0 bottom-0 w-px bg-primary/40 z-20 pointer-events-none transition-all duration-75"
              style={{ left: `${(timelineTime / duration) * 100}%` }}
            />

            {entities.map((ent: any) => {
              const isSelected = selectedEntityIds.includes(ent.id);
              const start = ent.startTime ?? 0;
              const end = ent.endTime ?? duration;
              const leftPercent = (start / duration) * 100;
              const widthPercent = ((end - start) / duration) * 100;

              return (
                <div
                  key={ent.id}
                  onClick={() => setSelectedEntity(ent.id)}
                  className={`h-9 relative flex items-center px-4 cursor-pointer transition-colors ${
                    isSelected ? "bg-primary/5" : "hover:bg-accent/10"
                  }`}
                >
                  {/* Rounded blue clip presence bar */}
                  <div
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                    }}
                    className={`absolute h-5 rounded-md border shadow-sm transition-all flex items-center px-2 select-none z-10 ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary/20 shadow-primary/20"
                        : "bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 border-sky-400/20"
                    }`}
                  >
                    <span className="text-[9px] font-black truncate leading-none capitalize">
                      {ent.name || ent.text || ent.clip || "Clip"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
