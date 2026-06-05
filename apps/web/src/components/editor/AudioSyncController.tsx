"use client";

import { useEffect, useRef } from "react";
import { useEditorStore } from "@/stores/editor-store";

export function AudioSyncController() {
  const document = useEditorStore((s) => s.document);
  const playbackState = useEditorStore((s) => s.playbackState);
  const timelineTime = useEditorStore((s) => s.timelineTime);

  // Keep track of audio element instances mapped by track ID
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    if (!document) return;

    const tracks = document.audioTracks || [];

    // Create or update audio elements for current tracks
    const activeIds = new Set<string>();

    tracks.forEach((track) => {
      activeIds.add(track.id);

      let audio = audioElementsRef.current[track.id];
      if (!audio) {
        audio = new Audio(track.url);
        audio.loop = false;
        audioElementsRef.current[track.id] = audio;
      }

      // Update volume
      audio.volume = track.volume ?? 0.8;
    });

    // Cleanup deleted tracks
    Object.keys(audioElementsRef.current).forEach((id) => {
      if (!activeIds.has(id)) {
        const audio = audioElementsRef.current[id];
        if (audio) {
          audio.pause();
          audio.src = "";
        }
        delete audioElementsRef.current[id];
      }
    });

  }, [document?.audioTracks]);

  // Handle Play/Pause/Stop and Playhead Scrub sync
  useEffect(() => {
    if (!document) return;
    const tracks = document.audioTracks || [];

    tracks.forEach((track) => {
      const audio = audioElementsRef.current[track.id];
      if (!audio) return;

      const trackStart = track.startTime ?? 0;
      const trackEnd = trackStart + (track.duration ?? 10);
      const trimOffset = track.audioStartOffset ?? 0;

      // Check if playhead is within track boundaries
      const isWithinBounds = timelineTime >= trackStart && timelineTime <= trackEnd;

      if (playbackState === "playing" && isWithinBounds) {
        const targetTime = (timelineTime - trackStart) + trimOffset;
        
        // Sync time if drifting by more than 0.15s
        if (Math.abs(audio.currentTime - targetTime) > 0.15) {
          audio.currentTime = targetTime;
        }

        if (audio.paused) {
          audio.play().catch((err) => {
            console.warn("Failed to play audio. User interaction might be required.", err);
          });
        }
      } else {
        // Pause audio if playhead is paused/stopped or outside boundaries
        if (!audio.paused) {
          audio.pause();
        }

        // Reset to correct offset time when scrubbed
        const targetTime = Math.max(0, timelineTime - trackStart) + trimOffset;
        if (Math.abs(audio.currentTime - targetTime) > 0.15) {
          audio.currentTime = targetTime;
        }
      }
    });
  }, [playbackState, timelineTime, document?.audioTracks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(audioElementsRef.current).forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
      audioElementsRef.current = {};
    };
  }, []);

  return null;
}
