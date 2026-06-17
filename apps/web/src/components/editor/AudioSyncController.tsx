"use client";

import { useEffect, useRef } from "react";
import { useEditorStore } from "@/stores/editor-store";
import type { VoiceTrackData } from "@stickman/shared";

function clampSpeechValue(value: number | undefined, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function pickSpeechVoice(track: VoiceTrackData) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  if (track.voiceName) {
    const namedVoice = voices.find((voice) => voice.name === track.voiceName);
    if (namedVoice) return namedVoice;
  }

  if (track.lang) {
    const language = track.lang.toLowerCase();
    const languageVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith(language));
    if (languageVoice) return languageVoice;
  }

  return voices[0] ?? null;
}

export function AudioSyncController() {
  const document = useEditorStore((s) => s.document);
  const playbackState = useEditorStore((s) => s.playbackState);
  const timelineTime = useEditorStore((s) => s.timelineTime);

  // Keep track of audio element instances mapped by track ID
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});
  const activeVoiceIdRef = useRef<string | null>(null);
  const spokenVoiceIdsRef = useRef<Set<string>>(new Set());
  const previousTimelineTimeRef = useRef(0);

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

  // Handle timeline-synced narration tracks with the browser speech engine.
  useEffect(() => {
    if (!document || typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const synth = window.speechSynthesis;
    const tracks = [...(document.voiceTracks || [])]
      .filter((track) => track.text.trim().length > 0)
      .sort((a, b) => (a.startTime ?? 0) - (b.startTime ?? 0));

    const resetReplayState = playbackState === "stopped" || timelineTime < previousTimelineTimeRef.current - 0.2;
    if (resetReplayState) {
      synth.cancel();
      activeVoiceIdRef.current = null;
      spokenVoiceIdsRef.current.clear();
    }

    previousTimelineTimeRef.current = timelineTime;

    tracks.forEach((track) => {
      if (timelineTime < (track.startTime ?? 0)) {
        spokenVoiceIdsRef.current.delete(track.id);
      }
    });

    if (playbackState !== "playing") {
      if (activeVoiceIdRef.current) {
        spokenVoiceIdsRef.current.delete(activeVoiceIdRef.current);
        activeVoiceIdRef.current = null;
      }
      synth.cancel();
      return;
    }

    const activeTrack = tracks.find((track) => {
      const trackStart = track.startTime ?? 0;
      const trackEnd = trackStart + (track.duration ?? 5);
      return timelineTime >= trackStart && timelineTime <= trackEnd;
    });

    if (!activeTrack) {
      if (activeVoiceIdRef.current) {
        activeVoiceIdRef.current = null;
        synth.cancel();
      }
      return;
    }

    if (activeVoiceIdRef.current === activeTrack.id || spokenVoiceIdsRef.current.has(activeTrack.id)) {
      return;
    }

    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(activeTrack.text);
    const voice = pickSpeechVoice(activeTrack);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = activeTrack.lang || voice.lang;
    } else if (activeTrack.lang) {
      utterance.lang = activeTrack.lang;
    }

    utterance.rate = clampSpeechValue(activeTrack.rate, 0.5, 2, 1);
    utterance.pitch = clampSpeechValue(activeTrack.pitch, 0, 2, 1);
    utterance.volume = clampSpeechValue(activeTrack.volume, 0, 1, 1);
    utterance.onend = () => {
      if (activeVoiceIdRef.current === activeTrack.id) {
        activeVoiceIdRef.current = null;
      }
    };
    utterance.onerror = () => {
      if (activeVoiceIdRef.current === activeTrack.id) {
        activeVoiceIdRef.current = null;
      }
    };

    activeVoiceIdRef.current = activeTrack.id;
    spokenVoiceIdsRef.current.add(activeTrack.id);
    synth.speak(utterance);
  }, [playbackState, timelineTime, document?.voiceTracks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(audioElementsRef.current).forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
      audioElementsRef.current = {};
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return null;
}
