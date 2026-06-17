"use client";

import { useEffect, useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { authClient } from "@stickman/auth/client";
import { Toolbar } from "@/components/editor/Toolbar";
import { CanvasDropZone } from "@/components/editor/CanvasDropZone";
import { TimelinePanel } from "@/components/editor/TimelinePanel";
import { InspectorPanel } from "@/components/editor/InspectorPanel";
import { AssetsPanel } from "@/components/editor/AssetsPanel";
import { useEditorStore } from "@/stores/editor-store";
import { api } from "@/lib/api";
import { AUTOSAVE_DEBOUNCE_MS, RIG_BONE_IDS, spriteManifest } from "@stickman/shared";
import type { FaceState, MouthShape, RigBoneId, ShapeKind, VoiceTrackData } from "@stickman/shared";
import { drawRigToCanvas, drawShapeToCanvas } from "@/lib/draw-teaching";
import { AudioSyncController } from "@/components/editor/AudioSyncController";
import {
  IconVideo,
  IconTypography,
  IconPhoto,
  IconDownload,
  IconPlus,
  IconTrash,
  IconUpload,
  IconCheck,
  IconRefresh,
  IconSparkles,
  IconCloudUpload,
  IconLoader2,
  IconLock,
  IconMicrophone,
  IconMusic,
  IconPlayerPlay
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const CANVAS_PRESETS = [
  // Light / Pastel Shades
  { name: "White", value: "#FFFFFF" },
  { name: "Soft Gray", value: "#F3F4F6" },
  { name: "Warm Sand", value: "#FAF7F2" },
  { name: "Sky Blue", value: "#F0F9FF" },
  { name: "Mint Paper", value: "#ECFDF5" },
  { name: "Lavender", value: "#F5F3FF" },
  { name: "Blush Rose", value: "#FFF1F2" },
  { name: "Peach Fuzz", value: "#FFF7ED" },
  // Dark / Rich Shades
  { name: "Obsidian", value: "#0B0F19" },
  { name: "Dark Night", value: "#111827" },
  { name: "Deep Indigo", value: "#1E1B4B" },
  { name: "Forest Moss", value: "#064E3B" },
  { name: "Burgundy", value: "#4C0519" },
  { name: "Sunset Clay", value: "#451A03" },
];

const DEFAULT_VOICE_TEXT = "SAP is enterprise software that connects finance, sales, operations, and analytics in one business system.";

const clamp = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
};

const estimateVoiceDuration = (text: string, rate = 1) => {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount === 0) return 1.5;
  const wordsPerSecond = 2.45 * clamp(rate, 0.5, 2);
  return Math.max(1.5, Math.round((wordCount / wordsPerSecond) * 10) / 10);
};

const normalizeVoiceTracks = (tracks: unknown): VoiceTrackData[] | undefined => {
  if (!Array.isArray(tracks)) return undefined;

  const normalized: VoiceTrackData[] = [];

  tracks.forEach((track: any, index) => {
    const text = String(track?.text ?? "").trim();
    if (!text) return;
    const rate = clamp(Number(track.rate ?? 1), 0.5, 2);
    const rawStartTime = Number(track.startTime ?? 0);
    const rawDuration = Number(track.duration ?? estimateVoiceDuration(text, rate));
    const startTime = Number.isFinite(rawStartTime) ? Math.max(0, rawStartTime) : 0;
    const duration = Number.isFinite(rawDuration) ? Math.max(1, rawDuration) : estimateVoiceDuration(text, rate);

    normalized.push({
      id: typeof track.id === "string" && track.id ? track.id : crypto.randomUUID(),
      name: typeof track.name === "string" && track.name ? track.name : `Narration ${index + 1}`,
      text,
      voiceName: typeof track.voiceName === "string" ? track.voiceName : undefined,
      lang: typeof track.lang === "string" ? track.lang : undefined,
      rate,
      pitch: clamp(Number(track.pitch ?? 1), 0, 2),
      volume: clamp(Number(track.volume ?? 1), 0, 1),
      startTime,
      duration,
    });
  });

  return normalized;
};

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const setProject = useEditorStore((s) => s.setProject);
  const projectName = useEditorStore((s) => s.projectName);
  const document = useEditorStore((s) => s.document);
  const setDocument = useEditorStore((s) => s.setDocument);
  const isDirty = useEditorStore((s) => s.isDirty);
  const selectedEntityIds = useEditorStore((s) => s.selectedEntityIds);
  const setSelectedEntity = useEditorStore((s) => s.setSelectedEntity);
  const setSelectedVoiceTrack = useEditorStore((s) => s.setSelectedVoiceTrack);
  const timelineTime = useEditorStore((s) => s.timelineTime);
  const playbackState = useEditorStore((s) => s.playbackState);
  const { data: session, isPending } = authClient.useSession();

  const leftPanelTab = useEditorStore((s) => s.leftPanelTab);
  const setLeftPanelTab = useEditorStore((s) => s.setLeftPanelTab);
  const inspectorCollapsed = useEditorStore((s) => s.inspectorCollapsed);
  const setInspectorCollapsed = useEditorStore((s) => s.setInspectorCollapsed);

  // Load project document from Hono API
  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      router.replace("/sign-in");
      return;
    }
    void (async () => {
      try {
        const { projects } = await api.listProjects();
        const project = projects.find((x) => x.id === projectId);
        if (!project) throw new Error("Project not found");
        const { document: doc } = await api.getDocument(projectId);
        setProject(projectId, project.name, doc);
      } catch {
        router.replace("/dashboard");
      }
    })();
  }, [projectId, router, setProject, session, isPending]);

  const save = useCallback(async () => {
    if (!projectId || !document || !isDirty) return;
    useEditorStore.getState().setSaving(true);
    try {
      await api.saveDocument(projectId, document);
      useEditorStore.getState().setDirty(false);
    } finally {
      useEditorStore.getState().setSaving(false);
    }
  }, [projectId, document, isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => void save(), AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [isDirty, document, save]);

  // Auto-collapse panels on smaller viewports
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setInspectorCollapsed(true);
        setLeftPanelTab(null);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setInspectorCollapsed, setLeftPanelTab]);

  // Local tab-specific sub-states
  const [textVal, setTextVal] = useState("hi");
  const [textSubTab, setTextSubTab] = useState<"add" | "list">("add");
  const [mediaSubTab, setMediaSubTab] = useState<"upload" | "characters">("characters");
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportStatusText, setExportStatusText] = useState("Encoding vector sequences...");
  const [exportFormat, setExportFormat] = useState<"mp4" | "gif" | "webm">("mp4");
  const [aiPrompt, setAiPrompt] = useState("explain what SAP is with a stickman teacher and simple business boxes");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [customAssets, setCustomAssets] = useState<any[]>([]);
  const [loadingCustomAssets, setLoadingCustomAssets] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [voiceText, setVoiceText] = useState(DEFAULT_VOICE_TEXT);
  const [voiceRate, setVoiceRate] = useState(1);
  const [voicePitch, setVoicePitch] = useState(1);

  const loadCustomAssets = useCallback(async () => {
    setLoadingCustomAssets(true);
    try {
      const { assets } = await api.listAssets();
      setCustomAssets(assets || []);
    } catch (err) {
      console.error("Failed to load custom assets in editor:", err);
    } finally {
      setLoadingCustomAssets(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      void loadCustomAssets();
    }
  }, [session, loadCustomAssets]);

  const handleCustomAssetClick = (asset: any) => {
    if (!document) return;
    const newImage = {
      id: crypto.randomUUID(),
      type: "image" as const,
      name: asset.name.replace(/\.[^/.]+$/, ""),
      layerId: document.layers[0]?.id || "default-layer",
      src: asset.url,
      transform: { x: 320, y: 180, rotation: 0, scaleX: 1, scaleY: 1 },
      width: 140,
      height: 140,
      startTime: 0,
      endTime: document.timeline?.duration ?? 5,
    };

    const updated = [...document.entities, newImage];
    setDocument({
      ...document,
      entities: updated,
    });
    setSelectedEntity(newImage.id);
    toast.success(`Added ${newImage.name} to canvas`);
  };

  const onCustomDragStart = (e: React.DragEvent, asset: any) => {
    e.dataTransfer.setData("application/stickman-clip", asset.url);
    e.dataTransfer.setData("text/plain", asset.url);
    e.dataTransfer.effectAllowed = "copy";
  };


  if (isPending || !document) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-xs text-muted-foreground font-semibold">Loading animator studio...</p>
      </main>
    );
  }

  const handleTabClick = (tab: string) => {
    if (leftPanelTab === tab) {
      setLeftPanelTab(null); // Toggle Collapse
    } else {
      setLeftPanelTab(tab);
    }
  };

  // Add custom Text entity
  const handleAddText = () => {
    if (!textVal.trim()) {
      toast.error("Please enter some text first");
      return;
    }
    const newTextEntity = {
      id: crypto.randomUUID(),
      type: "text" as const,
      name: `Text (${textVal.slice(0, 10)})`,
      layerId: document.layers[0]?.id || "default-layer",
      text: textVal,
      transform: { x: 320, y: 150, rotation: 0, scaleX: 1, scaleY: 1 },
      fontSize: 28,
      color: "#000000",
      startTime: 0,
      endTime: document.timeline?.duration ?? 5,
    };
    const updated = [...document.entities, newTextEntity];
    setDocument({
      ...document,
      entities: updated,
    });
    setSelectedEntity(newTextEntity.id);
    toast.success(`Added text "${textVal}" to canvas`);
    setTextVal("");
  };

  // Handle local file uploads (uploads to Supabase Storage and inserts onto canvas)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG/JPG/SVG/GIF)");
      return;
    }

    // Limit check: 3MB limit
    const totalUploadSize = customAssets.reduce((sum, a) => sum + (Number(a.metadata?.size) || 0), 0);
    if (totalUploadSize + file.size > 3 * 1024 * 1024) {
      setShowUpgradeModal(true);
      toast.error("Upload limit exceeded! Free accounts are limited to 3MB of total assets storage.");
      return;
    }

    setUploadingAsset(true);
    const toastId = toast.loading("Uploading asset to Cloud Storage...");

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Url = reader.result as string;

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

      let fileUrl = base64Url;

      if (supabaseUrl && supabaseKey) {
        try {
          const fileExt = file.name.split(".").pop() || "png";
          const fileName = `${crypto.randomUUID()}.${fileExt}`;
          const filePath = `${fileName}`;

          // Upload binary directly to Supabase Storage REST API
          const storageRes = await fetch(`${supabaseUrl}/storage/v1/object/assets/${filePath}`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${supabaseKey}`,
              "apikey": supabaseKey,
            },
            body: file,
          });

          if (storageRes.ok) {
            fileUrl = `${supabaseUrl}/storage/v1/object/public/assets/${filePath}`;
          } else {
            console.error("Supabase Storage REST upload failed, status:", storageRes.status);
          }
        } catch (err) {
          console.error("Failed to upload to Supabase Storage, falling back to base64:", err);
        }
      }

      try {
        const { asset } = await api.uploadAsset(file.name, file.type, fileUrl, { size: file.size });
        setCustomAssets((prev) => [asset, ...prev]);

        // Automatically add to canvas
        const newImage = {
          id: crypto.randomUUID(),
          type: "image" as const,
          name: asset.name.replace(/\.[^/.]+$/, ""),
          layerId: document.layers[0]?.id || "default-layer",
          src: asset.url,
          transform: { x: 320, y: 180, rotation: 0, scaleX: 1, scaleY: 1 },
          width: 140,
          height: 140,
          startTime: 0,
          endTime: document.timeline?.duration ?? 5,
        };

        const updated = [...document.entities, newImage];
        setDocument({
          ...document,
          entities: updated,
        });
        setSelectedEntity(newImage.id);

        toast.dismiss(toastId);
        toast.success(`Successfully uploaded "${asset.name}" and added to canvas!`);
      } catch (err) {
        toast.dismiss(toastId);
        toast.error("Failed to save asset to database");
      } finally {
        setUploadingAsset(false);
      }
    };

    reader.onerror = () => {
      toast.dismiss(toastId);
      toast.error("Error reading file");
      setUploadingAsset(false);
    };

    reader.readAsDataURL(file);
  };

  // Quick click-to-add character poses
  const handleAddSprite = (clip: string) => {
    let newEntity: any = null;

    if (clip.startsWith("extras/prop/")) {
      const filename = clip.split("/").pop()!;
      const cleanName = filename.replace(".png", "");
      newEntity = {
        id: crypto.randomUUID(),
        type: "sprite" as const,
        name: cleanName,
        layerId: document.layers[0]?.id || "default-layer",
        clip,
        transform: { x: 320, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
        width: 120,
        height: 120,
        startTime: 0,
        endTime: document.timeline?.duration ?? 5,
      };
    } else if (clip.startsWith("extras/background/")) {
      const filename = clip.split("/").pop()!;
      const cleanName = filename.replace(".png", "");
      newEntity = {
        id: crypto.randomUUID(),
        type: "sprite" as const,
        name: cleanName,
        layerId: document.layers[0]?.id || "default-layer",
        clip,
        transform: { x: 320, y: 360, rotation: 0, scaleX: 1, scaleY: 1 },
        width: 640,
        height: 360,
        startTime: 0,
        endTime: document.timeline?.duration ?? 5,
      };
    } else {
      const parsed = clip.split("/");
      if (parsed.length === 2) {
        const [character, action] = parsed;
        newEntity = {
          id: crypto.randomUUID(),
          type: "sprite" as const,
          name: `${character} (${action})`,
          layerId: document.layers[0]?.id || "default-layer",
          clip,
          transform: { x: 320, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
          width: 120,
          height: 120,
          startTime: 0,
          endTime: document.timeline?.duration ?? 5,
        };
      }
    }

    if (newEntity) {
      const updated = [...document.entities, newEntity];
      setDocument({
        ...document,
        entities: updated,
      });
      setSelectedEntity(newEntity.id);
      toast.success(`Added ${newEntity.name} to canvas`);
    }
  };

  const handleAddAudioTrack = (name: string, url: string) => {
    if (!document) return;
    const newTrack = {
      id: crypto.randomUUID(),
      name,
      url,
      volume: 0.8,
      startTime: 0,
      duration: document.timeline?.duration ?? 10,
    };
    const updatedAudio = [...(document.audioTracks || []), newTrack];
    setDocument({
      ...document,
      audioTracks: updatedAudio,
    });
    toast.success(`Added soundtrack "${name}" to timeline`);
  };

  const handlePreviewVoice = (text = voiceText, rate = voiceRate, pitch = voicePitch, volume = 1) => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("Add narration text first");
      return;
    }
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("This browser does not support voice preview");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(trimmed);
    utterance.rate = clamp(rate, 0.5, 2);
    utterance.pitch = clamp(pitch, 0, 2);
    utterance.volume = clamp(volume, 0, 1);
    window.speechSynthesis.speak(utterance);
  };

  const handleAddVoiceTrack = () => {
    if (!document) return;
    const text = voiceText.trim();
    if (!text) {
      toast.error("Add narration text first");
      return;
    }

    const currentDuration = document.timeline?.duration ?? 10;
    const startTime = Math.max(0, Math.min(timelineTime, currentDuration));
    const duration = estimateVoiceDuration(text, voiceRate);
    const newTrack: VoiceTrackData = {
      id: crypto.randomUUID(),
      name: `Narration ${((document.voiceTracks || []).length + 1).toString()}`,
      text,
      rate: clamp(voiceRate, 0.5, 2),
      pitch: clamp(voicePitch, 0, 2),
      volume: 1,
      startTime,
      duration,
    };

    setDocument({
      ...document,
      timeline: document.timeline
        ? { ...document.timeline, duration: Math.max(currentDuration, startTime + duration) }
        : { duration: Math.max(10, startTime + duration), fps: 60, tracks: [] },
      voiceTracks: [...(document.voiceTracks || []), newTrack],
    });
    setSelectedVoiceTrack(newTrack.id);
    toast.success(`Added voiceover "${newTrack.name}" to timeline`);
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      toast.error("Please upload an audio file (MP3/WAV/M4A)");
      return;
    }

    // Limit check: 3MB limit
    const totalUploadSize = customAssets.reduce((sum, a) => sum + (Number(a.metadata?.size) || 0), 0);
    if (totalUploadSize + file.size > 3 * 1024 * 1024) {
      setShowUpgradeModal(true);
      toast.error("Upload limit exceeded! Free accounts are limited to 3MB of total assets storage.");
      return;
    }

    setUploadingAsset(true);
    const toastId = toast.loading("Uploading audio to Cloud Storage...");

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Url = reader.result as string;

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

      let fileUrl = base64Url;

      if (supabaseUrl && supabaseKey) {
        try {
          const fileExt = file.name.split(".").pop() || "mp3";
          const fileName = `${crypto.randomUUID()}.${fileExt}`;
          const filePath = `${fileName}`;

          const storageRes = await fetch(`${supabaseUrl}/storage/v1/object/assets/${filePath}`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${supabaseKey}`,
              "apikey": supabaseKey,
            },
            body: file,
          });

          if (storageRes.ok) {
            fileUrl = `${supabaseUrl}/storage/v1/object/public/assets/${filePath}`;
          }
        } catch (err) {
          console.error("Failed to upload audio, falling back to base64:", err);
        }
      }

      try {
        const { asset } = await api.uploadAsset(file.name, file.type, fileUrl, { size: file.size });
        setCustomAssets((prev) => [asset, ...prev]);

        // Add to project document audio tracks
        handleAddAudioTrack(asset.name.replace(/\.[^/.]+$/, ""), asset.url);

        toast.dismiss(toastId);
      } catch (err) {
        toast.dismiss(toastId);
        toast.error("Failed to save audio asset to database");
      } finally {
        setUploadingAsset(false);
      }
    };

    reader.onerror = () => {
      toast.dismiss(toastId);
      toast.error("Error reading file");
      setUploadingAsset(false);
    };

    reader.readAsDataURL(file);
  };

  // AI storyboard and layers generator
  const handleEnhanceScript = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please enter a scene prompt first");
      return;
    }
    setIsEnhancing(true);
    toast.info("AI is enhancing your script with time frames and motions...");
    try {
      const availableSprites = {
        characters: ["fighter", "pistol", "sword"],
        props: spriteManifest.props,
        backgrounds: spriteManifest.backgrounds,
        rigActions: [
          "idle_presenter",
          "talk_neutral",
          "talk_one_hand",
          "talk_two_hands",
          "point_left",
          "point_right",
          "point_up",
          "point_down",
          "present_board",
          "write_board",
          "erase_board",
          "draw_box",
          "underline",
          "connect_boxes",
          "drag_box",
          "compare_two_options",
          "count_one",
          "count_two",
          "count_three",
          "ask_question",
          "think",
          "warning",
          "highlight_key_point",
          "nod",
          "conclusion",
        ],
      };
      const customUploads = document.entities
          .filter((e: any) => e.type === "image")
          .map((e: any) => ({ name: e.name, type: e.type, width: e.width, height: e.height }));

      const docWidth = document.stage.width || 640;
      const docHeight = document.stage.height || 360;

      const res = await api.enhanceScript(aiPrompt, availableSprites, customUploads, docWidth, docHeight);
      setEnhancedPrompt(res.enhanced);
      toast.success("Script enhanced! You can now compile the layers.");
    } catch (err: any) {
      toast.error(err.message || "Failed to enhance script");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerateLayers = async () => {
    if (!enhancedPrompt.trim()) {
      toast.error("Please enhance the script or input a storyboard first");
      return;
    }
    setAiGenerating(true);
    toast.info("Compiling advanced JSON timelines & keyframes...");
    try {
      const availableSprites = {
        characters: ["fighter", "pistol", "sword"],
        props: spriteManifest.props,
        backgrounds: spriteManifest.backgrounds,
        rigActions: [
          "idle_presenter",
          "talk_neutral",
          "talk_one_hand",
          "talk_two_hands",
          "point_left",
          "point_right",
          "point_up",
          "point_down",
          "present_board",
          "write_board",
          "erase_board",
          "draw_box",
          "underline",
          "connect_boxes",
          "drag_box",
          "compare_two_options",
          "count_one",
          "count_two",
          "count_three",
          "ask_question",
          "think",
          "warning",
          "highlight_key_point",
          "nod",
          "conclusion",
        ],
      };
      const customUploads = document.entities
          .filter((e: any) => e.type === "image")
          .map((e: any) => ({ name: e.name, type: e.type, width: e.width, height: e.height }));

      const docWidth = document.stage.width || 640;
      const docHeight = document.stage.height || 360;

      const docData = await api.generateAiLayers(enhancedPrompt, availableSprites, customUploads, docWidth, docHeight);
      if (docData && docData.layers && docData.entities) {
        const imageSrcByName = new Map(
          document.entities
            .filter((e: any) => e.type === "image" && e.src)
            .map((e: any) => [e.name, e.src] as const)
        );
        const entities = docData.entities.map((entity: any) => {
          if (entity.type !== "image" || entity.src) return entity;
          const src = imageSrcByName.get(entity.name);
          return src ? { ...entity, src } : entity;
        });
        const voiceTracks = normalizeVoiceTracks(docData.voiceTracks);
        const voiceTrackEnd = voiceTracks?.reduce(
          (maxEnd, track) => Math.max(maxEnd, track.startTime + track.duration),
          0
        ) ?? 0;
        const timeline = docData.timeline || document.timeline;
        setDocument({
          ...document,
          layers: docData.layers,
          entities,
          timeline: timeline ? { ...timeline, duration: Math.max(timeline.duration ?? 10, voiceTrackEnd) } : timeline,
          voiceTracks: voiceTracks ?? document.voiceTracks
        });
        toast.success("Generated complex AI layers and movement keyframes successfully!");
      } else {
        throw new Error("Invalid layer response structure");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate AI layers");
    } finally {
      setAiGenerating(false);
    }
  };

  // Helper to resolve dynamic keyframe properties for the scene exporter
  const evaluateProperty = (document: any, entityId: string, property: string, time: number, defaultValue: any) => {
    if (!document || !document.timeline || !document.timeline.tracks) {
      return defaultValue;
    }
    const track = document.timeline.tracks.find(
      (t: any) => t.entityId === entityId && t.property === property
    );
    if (!track || !track.keyframes || track.keyframes.length === 0) {
      return defaultValue;
    }

    const keyframes = [...track.keyframes].sort((a, b) => a.time - b.time);

    if (time <= keyframes[0].time) {
      return keyframes[0].value;
    }
    if (time >= keyframes[keyframes.length - 1].time) {
      return keyframes[keyframes.length - 1].value;
    }

    for (let i = 0; i < keyframes.length - 1; i++) {
      const kfA = keyframes[i];
      const kfB = keyframes[i + 1];
      if (time >= kfA.time && time <= kfB.time) {
        if (typeof kfA.value === "number" && typeof kfB.value === "number") {
          const ratio = (time - kfA.time) / (kfB.time - kfA.time);
          return kfA.value + (kfB.value - kfA.value) * ratio;
        }
        return kfA.value;
      }
    }
    return defaultValue;
  };

  // Synchronous Offscreen Canvas Scene Painter
  const drawSceneToCanvas = async (canvas: HTMLCanvasElement, time: number) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const docWidth = document.stage.width || 640;
    const docHeight = document.stage.height || 360;

    ctx.save();
    // Scale standard stage coordinates to the actual buffer canvas dimensions (e.g. 1280x720)
    const scaleCanvasX = canvas.width / docWidth;
    const scaleCanvasY = canvas.height / docHeight;
    ctx.scale(scaleCanvasX, scaleCanvasY);

    // 1. Draw stage background
    ctx.fillStyle = document.stage.backgroundColor || "#FFFFFF";
    ctx.fillRect(0, 0, docWidth, docHeight);

    // 2. Draw ground baseline
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, docHeight - 60, docWidth, 3);

    // 3. Filter visible entities
    const visible = document.entities.filter((entity: any) => {
      const start = entity.startTime ?? 0;
      const end = entity.endTime ?? 5;
      return time >= start && time <= end;
    });

    // 4. Render layers sequentially
    for (const ent of visible) {
      const entity = ent as any;
      // Evaluate animated properties from timeline tracks
      const x = evaluateProperty(document, entity.id, "transform.x", time, entity.transform.x);
      const y = evaluateProperty(document, entity.id, "transform.y", time, entity.transform.y);
      const rotation = evaluateProperty(document, entity.id, "transform.rotation", time, entity.transform.rotation ?? 0);
      const scaleX = evaluateProperty(document, entity.id, "transform.scaleX", time, entity.transform.scaleX ?? 1);
      const scaleY = evaluateProperty(document, entity.id, "transform.scaleY", time, entity.transform.scaleY ?? 1);
      const width = evaluateProperty(document, entity.id, "width", time, entity.width ?? 120);
      const height = evaluateProperty(document, entity.id, "height", time, entity.height ?? 120);

      // A. Text render
      if (entity.type === "text") {
        const text = evaluateProperty(document, entity.id, "text", time, entity.text || "");
        const fontSize = evaluateProperty(document, entity.id, "fontSize", time, entity.fontSize ?? 28);
        const color = evaluateProperty(document, entity.id, "color", time, entity.color || "#000000");

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(scaleX, scaleY);
        ctx.fillStyle = color;
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillText(text, 0, 0);
        ctx.restore();
      }

      // B. Sprite render (Transparent actions / Props)
      if (entity.type === "sprite") {
        const clip = evaluateProperty(document, entity.id, "spriteAnimation.clip", time, entity.clip || "");
        let frameSrc = "";

        if (clip.startsWith("extras/prop/")) {
          const propName = clip.split("/").pop()!;
          frameSrc = `/sprites/Extras/${propName}`; // FIXED: Extras folder mapping
        } else if (clip.startsWith("extras/background/")) {
          const bgName = clip.split("/").pop()!;
          frameSrc = `/sprites/Extras/${bgName}`; // FIXED: Extras folder mapping
        } else {
          const parsed = clip.split("/");
          if (parsed.length === 2) {
            const [character, action] = parsed;
            const charData = (spriteManifest as any).characters[character as string];
            const clipData = charData ? charData[action as string] : null;
            if (clipData) {
              const fps = clipData.fps || 10;
              const frameIndex = Math.floor(time * fps) % clipData.frames.length;
              const frameName = clipData.frames[frameIndex] || clipData.frames[0];
              frameSrc = `/sprites/${clipData.folder}/${frameName}`;
            }
          }
        }

        if (frameSrc) {
          const img = new Image();
          img.src = frameSrc;
          // Synchronous load block
          await new Promise((res) => {
            if (img.complete) res(true);
            else img.onload = () => res(true);
          });

          ctx.save();
          ctx.translate(x, y);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.scale(scaleX, scaleY);

          // Draw with base translate offset (centered horizontally, anchored at bottom)
          ctx.drawImage(img, -width / 2, -height, width, height);
          ctx.restore();
        }
      }

      if (entity.type === "rig") {
        const pose = String(evaluateProperty(document, entity.id, "rig.pose", time, entity.pose || "idle_presenter"));
        const face = String(evaluateProperty(document, entity.id, "rig.face", time, entity.face || "smile")) as FaceState;
        const mouth = String(evaluateProperty(document, entity.id, "rig.mouth", time, entity.mouth || "closed")) as MouthShape;
        const boneRotations: Partial<Record<RigBoneId, number>> = {};
        for (const boneId of RIG_BONE_IDS) {
          const fallback = entity.boneRotations?.[boneId] ?? 0;
          const value = evaluateProperty(document, entity.id, `rig.bones.${boneId}`, time, fallback);
          if (typeof value === "number") boneRotations[boneId] = value;
        }

        drawRigToCanvas(ctx, {
          x,
          y,
          rotation,
          scaleX,
          scaleY,
          width: width || 150,
          height: height || 190,
          pose,
          face,
          mouth,
          boneRotations,
        });
      }

      if (entity.type === "shape") {
        const fillColor = evaluateProperty(document, entity.id, "shape.fillColor", time, entity.fillColor);
        const strokeColor = evaluateProperty(document, entity.id, "shape.strokeColor", time, entity.strokeColor);
        const opacity = evaluateProperty(document, entity.id, "opacity", time, entity.opacity);
        drawShapeToCanvas(ctx, {
          x,
          y,
          rotation,
          scaleX,
          scaleY,
          width,
          height,
          shape: entity.shape as ShapeKind,
          fillColor: typeof fillColor === "string" ? fillColor : entity.fillColor,
          strokeColor: typeof strokeColor === "string" ? strokeColor : entity.strokeColor,
          strokeWidth: entity.strokeWidth,
          opacity: typeof opacity === "number" ? opacity : entity.opacity,
          text: entity.text,
        });
      }

      // C. Base64 Uploaded images render
      if (entity.type === "image" && entity.src) {
        const height = evaluateProperty(document, entity.id, "height", time, entity.height ?? 120);
        const img = new Image();
        img.src = entity.src;
        await new Promise((res) => {
          if (img.complete) res(true);
          else img.onload = () => res(true);
        });

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(scaleX, scaleY);
        ctx.drawImage(img, -width / 2, -height, width, height);
        ctx.restore();
      }
    }
    ctx.restore();
  };

  // Visually Lossless Offline Canvas JPEG Capture & FFmpeg server-side encoder
  const triggerExport = async () => {
    if (!document) return;

    if ((document.voiceTracks || []).length > 0 || (document.audioTracks || []).length > 0) {
      toast.info("Audio and voiceover tracks play in editor preview. Current export includes visuals only until renderer audio muxing is added.");
    }

    // Create offscreen buffer canvas
    const canvas = window.document.createElement("canvas");
    const docWidth = document.stage.width || 640;
    const docHeight = document.stage.height || 360;
    let targetWidth = 1280;
    let targetHeight = 720;

    if (docWidth === docHeight) {
      targetWidth = 720;
      targetHeight = 720;
    } else if (docWidth < docHeight) {
      // Portrait
      targetWidth = 720;
      const computedHeight = Math.round(720 * (docHeight / docWidth));
      targetHeight = computedHeight % 2 === 0 ? computedHeight : computedHeight + 1;
    } else {
      // Landscape
      targetHeight = 720;
      const computedWidth = Math.round(720 * (docWidth / docHeight));
      targetWidth = computedWidth % 2 === 0 ? computedWidth : computedWidth + 1;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Pause player playback during capture sweep
    const originalTime = timelineTime;
    const originalPlayback = playbackState;
    useEditorStore.getState().setPlaybackState("stopped");
    useEditorStore.getState().setTimelineTime(0);

    setExportProgress(0);
    setExportStatusText("Capturing vector canvas frames...");

    const duration = document.timeline?.duration ?? 10;
    const fps = 30;
    const totalFrames = Math.ceil(duration * fps);
    const capturedFrames: string[] = [];

    // Capture sweep at exactly 30 FPS
    for (let currentFrame = 0; currentFrame <= totalFrames; currentFrame++) {
      const t = (currentFrame / totalFrames) * duration;
      useEditorStore.getState().setTimelineTime(t);

      // Render visuals dynamically to offscreen canvas
      await drawSceneToCanvas(canvas, t);

      // Get high-quality visually lossless JPEG Data URL (0.95 quality - 90% size reduction)
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      capturedFrames.push(dataUrl);

      // Adjust compiler progress bar percentage
      const pct = Math.round((currentFrame / totalFrames) * 100);
      setExportProgress(pct);
    }

    // Restore user playhead coordinates
    useEditorStore.getState().setTimelineTime(originalTime);
    useEditorStore.getState().setPlaybackState(originalPlayback);

    setExportStatusText(`Compiling high-fidelity ${exportFormat.toUpperCase()} on server via FFmpeg...`);

    try {
      const blob = await api.renderDirect(projectId, exportFormat, capturedFrames, fps);
      const url = URL.createObjectURL(blob);

      const downloadAnchor = window.document.createElement("a");
      downloadAnchor.href = url;
      downloadAnchor.download = `${projectName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_animation_${Date.now()}.${exportFormat}`;
      window.document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);

      toast.success(`Stickman animation exported as ${exportFormat.toUpperCase()} successfully!`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Export failed: ${err.message || "Renderer microservice failure."}`);
    } finally {
      setExportProgress(null);
    }
  };

  const entities = document.entities || [];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground relative">
      <AudioSyncController />

      {/* EXPORT OVERLAY SCREEN */}
      {exportProgress !== null && (
        <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md z-50 flex flex-col items-center justify-center select-none">
          <div className="bg-card/75 border border-border/40 p-8 rounded-2xl shadow-2xl max-w-sm w-full flex flex-col items-center text-center">
            <div className="animate-spin text-primary mb-4 animate-duration-1000">
              <IconRefresh className="h-8 w-8 animate-spin" />
            </div>
            <h3 className="font-extrabold text-foreground mb-1">Rendering Video Track</h3>
            <p className="text-xs text-muted-foreground mb-5 min-h-[32px]">{exportStatusText}</p>
            <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-primary transition-all duration-150"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <span className="text-[10px] font-black tracking-widest text-primary tabular-nums">
              {exportProgress}% COMPLETE
            </span>
          </div>
        </div>
      )}

      <Toolbar />

      <div className="flex min-h-0 flex-1 relative">

        {/* 1. SLIM LEFT SIDEBAR (Width: w-16) */}
        <div className="flex w-16 shrink-0 flex-col items-center border-r border-border/50 bg-card/60 backdrop-blur-md py-4 gap-4.5 z-10 select-none">
          {/* Setup tab */}
          <button
            onClick={() => handleTabClick("video")}
            className={`flex h-11.5 w-11.5 flex-col items-center justify-center rounded-xl transition-all duration-200 ${leftPanelTab === "video"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.03]"
                : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
              }`}
            title="Setup Background"
          >
            <IconVideo className="h-5 w-5" />
            <span className="text-[8px] font-bold mt-1">Setup</span>
          </button>

          {/* Text tab */}
          <button
            onClick={() => handleTabClick("text")}
            className={`flex h-11.5 w-11.5 flex-col items-center justify-center rounded-xl transition-all duration-200 ${leftPanelTab === "text"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.03]"
                : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
              }`}
            title="Add Texts"
          >
            <IconTypography className="h-5 w-5" />
            <span className="text-[8px] font-bold mt-1">Text</span>
          </button>

          {/* Media tab */}
          <button
            onClick={() => handleTabClick("image")}
            className={`flex h-11.5 w-11.5 flex-col items-center justify-center rounded-xl transition-all duration-200 ${leftPanelTab === "image"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.03]"
                : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
              }`}
            title="Media Library"
          >
            <IconPhoto className="h-5 w-5" />
            <span className="text-[8px] font-bold mt-1">Media</span>
          </button>

          {/* Audio tab */}
          <button
            onClick={() => handleTabClick("audio")}
            className={`flex h-11.5 w-11.5 flex-col items-center justify-center rounded-xl transition-all duration-200 ${leftPanelTab === "audio"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.03]"
                : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
              }`}
            title="Audio Tracks"
          >
            <IconMusic className="h-5 w-5" />
            <span className="text-[8px] font-bold mt-1">Audio</span>
          </button>

          {/* AI Copilot tab */}
          <button
            onClick={() => handleTabClick("ai")}
            className={`flex h-11.5 w-11.5 flex-col items-center justify-center rounded-xl transition-all duration-200 ${leftPanelTab === "ai"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.03]"
                : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
              }`}
            title="AI Generator"
          >
            <IconSparkles className="h-5 w-5" />
            <span className="text-[8px] font-bold mt-1">AI Gen</span>
          </button>

          {/* Export tab */}
          <button
            onClick={() => handleTabClick("export")}
            className={`flex h-11.5 w-11.5 flex-col items-center justify-center rounded-xl transition-all duration-200 ${leftPanelTab === "export"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.03]"
                : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
              }`}
            title="Export Animation"
          >
            <IconDownload className="h-5 w-5" />
            <span className="text-[8px] font-bold mt-1">Export</span>
          </button>
        </div>

        {/* 2. SLIDING LEFT SUB-PANEL */}
        <div
          className={`shrink-0 border-r border-border/50 bg-card/45 backdrop-blur-lg transition-all duration-300 ease-in-out overflow-hidden z-10 ${leftPanelTab ? "w-64" : "w-0 border-r-0"
            }`}
        >
          <div className="h-full w-64 flex flex-col select-none">

            {/* TAB 1: CANVAS SETUP */}
            {leftPanelTab === "video" && (
              <div className="flex flex-col h-full">
                <div className="h-11 border-b border-border/30 px-4 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Canvas Setup
                </div>
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 text-xs font-semibold">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 mb-2">
                      Canvas Presets
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {CANVAS_PRESETS.map((preset) => {
                        const isActive = document.stage.backgroundColor?.toLowerCase() === preset.value.toLowerCase();
                        return (
                          <button
                            key={preset.value}
                            onClick={() => setDocument({ ...document, stage: { ...document.stage, backgroundColor: preset.value } })}
                            className={`flex items-center gap-2 p-2 border rounded-lg text-left transition-all duration-200 hover:scale-[1.02] shadow-sm bg-card hover:bg-accent/40 ${
                              isActive 
                                ? "border-primary ring-1 ring-primary" 
                                : "border-border/60"
                            }`}
                          >
                            <span 
                              className="h-3.5 w-3.5 rounded-full border border-neutral-300 dark:border-neutral-700 shrink-0 shadow-inner"
                              style={{ backgroundColor: preset.value }}
                            />
                            <span className="truncate text-[11px] font-bold text-foreground">
                              {preset.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-border/20 pt-4">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 mb-2">
                      Stage Layout (Aspect Ratio)
                    </h4>
                    <div className="flex flex-col gap-2">
                      {[
                        { id: "16:9" as const, name: "Landscape (16:9)", size: "640×360", shape: "w-5 h-3 border border-current rounded-sm" },
                        { id: "9:16" as const, name: "Vertical (9:16)", size: "360×640", shape: "w-3 h-5 border border-current rounded-sm" },
                        { id: "1:1" as const, name: "Square (1:1)", size: "500×500", shape: "w-4 h-4 border border-current rounded-sm" },
                        { id: "4:3" as const, name: "Standard (4:3)", size: "480×360", shape: "w-4.5 h-3.5 border border-current rounded-sm" },
                      ].map((preset) => {
                        const currentWidth = document.stage.width || 640;
                        const currentHeight = document.stage.height || 360;
                        let isSelected = false;
                        if (preset.id === "16:9" && currentWidth === 640 && currentHeight === 360) isSelected = true;
                        else if (preset.id === "9:16" && currentWidth === 360 && currentHeight === 640) isSelected = true;
                        else if (preset.id === "1:1" && currentWidth === 500 && currentHeight === 500) isSelected = true;
                        else if (preset.id === "4:3" && currentWidth === 480 && currentHeight === 360) isSelected = true;

                        return (
                          <button
                            key={preset.id}
                            onClick={() => {
                              let w = 640;
                              let h = 360;
                              if (preset.id === "9:16") {
                                w = 360;
                                h = 640;
                              } else if (preset.id === "1:1") {
                                w = 500;
                                h = 500;
                              } else if (preset.id === "4:3") {
                                w = 480;
                                h = 360;
                              }
                              setDocument({
                                ...document,
                                stage: {
                                  ...document.stage,
                                  width: w,
                                  height: h,
                                }
                              });
                              toast.success(`Switched stage layout to ${preset.name}`);
                            }}
                            className={`flex items-center justify-between p-2.5 border rounded-lg text-left transition-all duration-200 bg-card hover:bg-accent/40 ${
                              isSelected 
                                ? "border-primary ring-1 ring-primary text-primary" 
                                : "border-border/60 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="flex w-6 justify-center text-foreground shrink-0">
                                <div className={preset.shape} />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[11px] font-bold text-foreground leading-none">{preset.name}</span>
                                <span className="text-[8px] font-semibold text-muted-foreground mt-0.5">{preset.size}</span>
                              </div>
                            </div>
                            {isSelected && (
                              <span className="text-[8px] font-black uppercase tracking-wider text-primary">Active</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: TYPOGRAPHY LAYERS */}
            {leftPanelTab === "text" && (
              <div className="flex flex-col h-full">
                <div className="h-11 border-b border-border/30 px-2 flex items-center justify-center gap-1 bg-muted/10">
                  <button
                    onClick={() => setTextSubTab("add")}
                    className={`flex-1 text-[10px] py-1 text-center font-bold rounded ${textSubTab === "add" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
                  >
                    Add Text
                  </button>
                  <button
                    onClick={() => setTextSubTab("list")}
                    className={`flex-1 text-[10px] py-1 text-center font-bold rounded ${textSubTab === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
                  >
                    Your Texts
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 text-xs font-semibold">
                  {textSubTab === "add" ? (
                    <div className="flex flex-col gap-3">
                      <Label htmlFor="text-val-input" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 select-none">
                        Enter Text value
                      </Label>
                      <textarea
                        id="text-val-input"
                        value={textVal}
                        onChange={(e) => setTextVal(e.target.value)}
                        placeholder="Enter text..."
                        className="w-full h-20 bg-card border border-border/50 rounded-lg p-2 font-semibold outline-none focus:border-primary text-xs"
                      />
                      <Button
                        onClick={handleAddText}
                        className="w-full h-8.5 font-extrabold gap-1.5 shadow-md shadow-primary/10"
                      >
                        <IconPlus className="h-4 w-4" /> Add Text Layer
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 mb-2 select-none">
                        Active Text Elements
                      </h4>
                      {entities.filter((e) => e.type === "text").map((item) => {
                        const isSelected = selectedEntityIds.includes(item.id);
                        return (
                          <div
                            key={item.id}
                            onClick={() => setSelectedEntity(item.id)}
                            className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer ${isSelected
                                ? "border-primary/40 bg-primary/5 text-primary"
                                : "border-border/30 hover:bg-accent/40"
                              }`}
                          >
                            <span className="truncate flex-1 capitalize pr-2">{item.text || "Untitled"}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const updated = document.entities.filter((ent) => ent.id !== item.id);
                                setDocument({ ...document, entities: updated });
                                setSelectedEntity(null);
                                toast.success("Removed text layer");
                              }}
                              className="text-muted-foreground hover:text-destructive p-1 rounded"
                            >
                              <IconTrash className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                      {entities.filter((e) => e.type === "text").length === 0 && (
                        <p className="text-[10px] text-muted-foreground/60 italic text-center select-none p-4">
                          No text elements currently in canvas
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: MEDIA LIBRARY */}
            {leftPanelTab === "image" && (
              <div className="flex flex-col h-full">
                <div className="h-11 shrink-0 border-b border-border/30 px-2 flex items-center justify-center gap-1 bg-muted/10">
                  <button
                    onClick={() => setMediaSubTab("characters")}
                    className={`flex-1 text-[10px] py-1 text-center font-bold rounded transition-all duration-150 ${mediaSubTab === "characters" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
                  >
                    Asset Explorer
                  </button>
                  <button
                    onClick={() => setMediaSubTab("upload")}
                    className={`flex-1 text-[10px] py-1 text-center font-bold rounded transition-all duration-150 ${mediaSubTab === "upload" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
                  >
                    Custom Uploads
                  </button>
                </div>

                <div className="flex-1 min-h-0 flex flex-col">
                  {mediaSubTab === "upload" ? (
                    <div className="flex-1 overflow-y-auto p-4 text-xs font-semibold flex flex-col gap-4 min-h-0">
                      {/* Storage Quota Usage Banner */}
                      {(() => {
                        const totalUploadSize = customAssets.reduce((sum, a) => sum + (Number(a.metadata?.size) || 0), 0);
                        const totalUploadSizeMB = (totalUploadSize / (1024 * 1024)).toFixed(2);
                        const sizePercentage = Math.min(Math.round((totalUploadSize / (3 * 1024 * 1024)) * 100), 100);
                        const isOverLimit = totalUploadSize > 3 * 1024 * 1024;
                        return (
                          <div className="bg-card/40 border border-border/30 rounded-xl p-3 flex flex-col gap-2 relative overflow-hidden backdrop-blur-md">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground font-bold">Storage Usage</span>
                              <span className="text-[9px] text-primary font-black uppercase bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 flex items-center gap-1">
                                Free Plan
                              </span>
                            </div>
                            <div className="flex items-end justify-between font-black tracking-wide text-foreground text-[11px]">
                              <span>{totalUploadSizeMB} MB <span className="text-muted-foreground/60 font-medium">/ 3.00 MB</span></span>
                              <span>{sizePercentage}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${isOverLimit ? 'bg-destructive' : 'bg-primary'}`}
                                style={{ width: `${sizePercentage}%` }}
                              />
                            </div>
                            <button
                              onClick={() => setShowUpgradeModal(true)}
                              className="w-full mt-1 bg-gradient-to-tr from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg py-1.5 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 active:scale-[0.98] transition-all shadow-md shadow-violet-600/10"
                            >
                              <IconLock className="h-3 w-3" /> Upgrade to Premium
                            </button>
                          </div>
                        );
                      })()}

                      {/* Upload Box */}
                      <div className="flex flex-col gap-2">
                        <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 select-none">
                          Upload Custom Photos
                        </Label>
                        <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border/40 rounded-xl cursor-pointer bg-card/20 hover:bg-accent/30 hover:border-primary/40 transition-all text-center px-4 gap-1.5 relative group">
                          {uploadingAsset ? (
                            <div className="flex flex-col items-center gap-2">
                              <IconLoader2 className="h-5 w-5 animate-spin text-primary" />
                              <span className="text-[9px] font-bold text-muted-foreground">Uploading file...</span>
                            </div>
                          ) : (
                            <>
                              <IconUpload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                              <span className="text-[9px] font-bold text-muted-foreground group-hover:text-foreground transition-colors">Upload Photo</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className="hidden"
                                disabled={uploadingAsset}
                              />
                            </>
                          )}
                        </label>
                        <p className="text-[8.5px] text-muted-foreground/65 leading-relaxed p-0.5 select-none">
                          💡 You can upload absolute transparent PNG/JPG files here to overlay onto the canvas directly.
                        </p>
                      </div>

                      {/* Gallery Grid */}
                      <div className="flex flex-col gap-2.5 min-h-0 flex-1">
                        <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 select-none">
                          Your Gallery
                        </Label>
                        {loadingCustomAssets ? (
                          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-[10px]">
                            <IconLoader2 className="h-4 w-4 animate-spin text-primary" />
                            <span>Loading files...</span>
                          </div>
                        ) : customAssets.length === 0 ? (
                          <div className="text-[10px] text-muted-foreground/60 text-center py-8 border border-dashed border-border/30 rounded-xl bg-card/10 select-none">
                            No uploaded assets. Upload a photo above to populate your gallery!
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 overflow-y-auto pr-1 pb-4">
                            {customAssets.map((asset) => (
                              <div
                                key={asset.id}
                                draggable
                                onDragStart={(e) => onCustomDragStart(e, asset)}
                                onClick={() => handleCustomAssetClick(asset)}
                                className="group relative aspect-square rounded-lg border border-border/40 bg-neutral-900/60 overflow-hidden cursor-pointer hover:border-primary/50 transition-all select-none hover:shadow-md hover:shadow-primary/5 active:scale-95"
                                title="Click to add or drag onto canvas"
                              >
                                {asset.url && (
                                  <img
                                    src={asset.url}
                                    alt={asset.name}
                                    className="h-full w-full object-contain p-1.5 transition-transform duration-200 group-hover:scale-110"
                                  />
                                )}
                                <div className="absolute inset-0 bg-neutral-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-1.5">
                                  <span className="truncate text-[8px] font-black text-white leading-none mb-1">
                                    {asset.name.replace(/\.[^/.]+$/, "")}
                                  </span>
                                  <span className="text-[7px] text-primary font-black uppercase tracking-widest leading-none flex items-center gap-0.5">
                                    <IconPlus className="h-2 w-2" /> Add
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <AssetsPanel className="flex-1 min-h-0" />
                  )}
                </div>
              </div>
            )}

            {/* TAB: AUDIO TRACKS */}
            {leftPanelTab === "audio" && (
              <div className="flex flex-col h-full">
                <div className="h-11 border-b border-border/30 px-4 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Audio & Soundtracks
                </div>
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs font-semibold">
                  {/* Browser Voiceover */}
                  <div className="flex flex-col gap-3 rounded-xl border border-border/30 bg-muted/15 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="voiceover-text" className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-muted-foreground/70 select-none">
                        <IconMicrophone className="h-3.5 w-3.5 text-primary" />
                        Voiceover Narration
                      </Label>
                      <span className="rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-primary">
                        Preview
                      </span>
                    </div>
                    <textarea
                      id="voiceover-text"
                      value={voiceText}
                      onChange={(e) => setVoiceText(e.target.value)}
                      placeholder="Type what the stickman should say..."
                      className="h-24 w-full resize-none rounded-lg border border-border/50 bg-card p-2 text-[11px] font-semibold leading-relaxed outline-none focus:border-primary"
                    />
                    <div className="grid grid-cols-[4rem_minmax(0,1fr)_2.5rem] items-center gap-2 text-[10px] font-bold text-muted-foreground">
                      <span>Speed</span>
                      <input
                        type="range"
                        min={0.5}
                        max={2}
                        step={0.05}
                        value={voiceRate}
                        onChange={(e) => setVoiceRate(Number(e.target.value))}
                        className="h-1.5 accent-primary rounded bg-neutral-900 cursor-pointer"
                      />
                      <span className="text-right font-black text-foreground">{voiceRate.toFixed(2)}x</span>

                      <span>Pitch</span>
                      <input
                        type="range"
                        min={0}
                        max={2}
                        step={0.05}
                        value={voicePitch}
                        onChange={(e) => setVoicePitch(Number(e.target.value))}
                        className="h-1.5 accent-primary rounded bg-neutral-900 cursor-pointer"
                      />
                      <span className="text-right font-black text-foreground">{voicePitch.toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreviewVoice()}
                        className="h-8 text-[10px] font-bold gap-1"
                      >
                        <IconPlayerPlay className="h-3.5 w-3.5" />
                        Preview Voice
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddVoiceTrack}
                        className="h-8 text-[10px] font-black gap-1"
                      >
                        <IconPlus className="h-3.5 w-3.5" />
                        Add Voiceover
                      </Button>
                    </div>
                    <p className="text-[9px] leading-relaxed text-muted-foreground/75 select-none">
                      Browser voice plays during editor preview. Export audio muxing still needs renderer support.
                    </p>
                  </div>
                  
                  {/* Upload Audio File */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 select-none">
                      Upload Sound / Song
                    </Label>
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border/40 rounded-xl cursor-pointer bg-card/20 hover:bg-accent/30 hover:border-primary/40 transition-all text-center px-4 gap-1.5 relative group">
                      {uploadingAsset ? (
                        <div className="flex flex-col items-center gap-2">
                          <IconLoader2 className="h-5 w-5 animate-spin text-primary" />
                          <span className="text-[9px] font-bold text-muted-foreground">Uploading audio...</span>
                        </div>
                      ) : (
                        <>
                          <IconUpload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          <span className="text-[9px] font-bold text-muted-foreground group-hover:text-foreground transition-colors">Upload Audio</span>
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={handleAudioUpload}
                            className="hidden"
                            disabled={uploadingAsset}
                          />
                        </>
                      )}
                    </label>
                  </div>

                  {/* Standard / Available Songs */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 select-none">
                      Library Soundtracks
                    </Label>
                    <div className="flex flex-col gap-1.5">
                      <div 
                        onClick={() => handleAddAudioTrack("Cornfield Chase - Hans Zimmer", "/songs/Cornfield Chase - Hans Zimmer.m4a")}
                        className="group flex items-center justify-between cursor-pointer rounded-lg border border-border/30 bg-neutral-900/40 p-2.5 hover:border-primary/40 hover:bg-accent/30 transition-all duration-150"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <IconMusic className="h-4 w-4 text-primary shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="truncate text-[10.5px] font-bold text-foreground">Cornfield Chase</span>
                            <span className="text-[8.5px] text-muted-foreground font-medium">Hans Zimmer</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 select-none">
                          <span className="text-[8px] font-bold uppercase tracking-wider text-primary">Add</span>
                          <IconPlus className="h-3 w-3 text-primary" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* User Uploaded Sounds */}
                  <div className="flex flex-col gap-2 flex-1 min-h-0">
                    <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 select-none">
                      Your Uploaded Audio
                    </Label>
                    {loadingCustomAssets ? (
                      <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground text-[10px]">
                        <IconLoader2 className="h-4 w-4 animate-spin text-primary" />
                        <span>Loading files...</span>
                      </div>
                    ) : customAssets.filter(a => a.type?.startsWith("audio/")).length === 0 ? (
                      <div className="text-[10px] text-muted-foreground/60 text-center py-6 border border-dashed border-border/30 rounded-xl bg-card/10 select-none">
                        No audio uploads. Upload songs above!
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5 overflow-y-auto max-h-48 pr-1">
                        {customAssets.filter(a => a.type?.startsWith("audio/")).map((asset) => (
                          <div
                            key={asset.id}
                            onClick={() => handleAddAudioTrack(asset.name.replace(/\.[^/.]+$/, ""), asset.url)}
                            className="group flex items-center justify-between cursor-pointer rounded-lg border border-border/30 bg-neutral-900/40 p-2 hover:border-primary/40 hover:bg-accent/30 transition-all duration-150"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <IconMusic className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="truncate text-[10px] font-bold text-foreground">
                                {asset.name.replace(/\.[^/.]+$/, "")}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 select-none">
                              <span className="text-[8px] font-bold uppercase tracking-wider text-primary">Add</span>
                              <IconPlus className="h-3 w-3 text-primary" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: AI ANIMATION GENERATOR */}
            {leftPanelTab === "ai" && (
              <div className="flex flex-col h-full">
                <div className="h-11 border-b border-border/30 px-4 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  AI Animation Studio
                </div>
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs font-semibold">

                  {/* STEP 1: SCRIPT ENHANCER */}
                  <div className="flex flex-col gap-3 bg-muted/10 p-3.5 rounded-xl border border-border/20">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                        1
                      </span>
                      <Label htmlFor="ai-prompt-input" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground select-none">
                        Describe Animation Idea
                      </Label>
                    </div>
                    <textarea
                      id="ai-prompt-input"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g. explain what SAP is with a presenter, definition box, module boxes, and arrows..."
                      className="w-full h-20 bg-card border border-border/50 rounded-lg p-2 font-semibold outline-none focus:border-primary text-xs resize-none"
                    />

                    <Button
                      onClick={handleEnhanceScript}
                      disabled={isEnhancing}
                      className="w-full h-8 text-[11px] font-extrabold gap-1.5 shadow-md"
                    >
                      {isEnhancing ? (
                        <>
                          <IconRefresh className="h-3.5 w-3.5 animate-spin" />
                          Enhancing Script...
                        </>
                      ) : (
                        <>
                          <IconSparkles className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
                          Enhance Script with AI
                        </>
                      )}
                    </Button>
                  </div>

                  {/* STEP 2: STORYBOARD & LAYER COMPILES */}
                  <div className="flex flex-col gap-3 bg-muted/10 p-3.5 rounded-xl border border-border/20">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                        2
                      </span>
                      <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground select-none">
                        Review Storyboard & Timeline
                      </Label>
                    </div>

                    <textarea
                      value={enhancedPrompt}
                      onChange={(e) => setEnhancedPrompt(e.target.value)}
                      placeholder="Click Step 1 above to generate an enhanced storyboard timeline here, or write your own time-coded bullet points..."
                      className="w-full h-40 bg-card border border-border/50 rounded-lg p-2 font-semibold outline-none focus:border-primary text-xs resize-none text-[11px] leading-relaxed"
                    />

                    <Button
                      onClick={handleGenerateLayers}
                      disabled={aiGenerating || !enhancedPrompt.trim()}
                      variant={enhancedPrompt.trim() ? "default" : "secondary"}
                      className="w-full h-8 text-[11px] font-extrabold gap-1.5 shadow-md"
                    >
                      {aiGenerating ? (
                        <>
                          <IconRefresh className="h-3.5 w-3.5 animate-spin" />
                          Compiling Layers...
                        </>
                      ) : (
                        <>
                          <IconSparkles className="h-3.5 w-3.5 text-sky-400 fill-sky-400" />
                          Generate AI Layers
                        </>
                      )}
                    </Button>
                  </div>

                  <p className="text-[9px] text-muted-foreground/75 leading-relaxed bg-muted/25 p-2.5 rounded border border-border/10 select-none">
                    Tip: Step 1 turns a short teaching prompt into a timed storyboard. Step 2 builds presenter rigs, labels, boxes, arrows, mouth motion, and optional narration.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: EXPORT OPTIONS */}
            {leftPanelTab === "export" && (
              <div className="flex flex-col h-full">
                <div className="h-11 border-b border-border/30 px-4 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Export Studio
                </div>
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 text-xs font-semibold">
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] text-muted-foreground leading-relaxed select-none mb-2">
                      Compile your layers, vector coordinates, texts, and animations into a premium high-definition video track.
                    </p>

                    <div className="flex flex-col gap-2.5 bg-muted/40 dark:bg-neutral-900/40 p-3.5 rounded-xl border border-border/60 mb-2">
                      <span className="text-[10px] uppercase font-black text-muted-foreground tracking-wider mb-1">
                        Select Export Format
                      </span>
                      <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/70 dark:bg-neutral-950/50 rounded-lg border border-border/40">
                        {(["mp4", "webm", "gif"] as const).map((fmt) => (
                          <button
                            key={fmt}
                            onClick={() => setExportFormat(fmt)}
                            className={`py-1.5 rounded font-black text-[10px] tracking-wide uppercase transition-all ${exportFormat === fmt
                                ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                                : "text-muted-foreground hover:bg-background/80 dark:hover:bg-neutral-900 hover:text-foreground"
                              }`}
                          >
                            {fmt}
                          </button>
                        ))}
                      </div>
                      <p className="text-[9px] text-muted-foreground/80 leading-relaxed mt-1 select-none min-h-[30px]">
                        {exportFormat === "mp4" && "MP4 (H.264): Visually lossless vector stream. Broadcast-ready, universally supported."}
                        {exportFormat === "webm" && "WebM (VP9): High compression, perfect for seamless modern web playback."}
                        {exportFormat === "gif" && "GIF: Palette-optimized 256-color sequence. Ideal for animations, stickers, and instant sharing."}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 bg-muted/40 dark:bg-neutral-900/40 p-3.5 rounded-xl border border-border/60 mb-4 text-[10px]">
                      <span className="text-[10px] uppercase font-black text-muted-foreground tracking-wider mb-1">
                        Export Settings
                      </span>
                      <div className="flex justify-between py-1.5 border-b border-border/30 text-muted-foreground">
                        <span>Resolution</span>
                        <span className="font-extrabold text-foreground">1280 × 720 (HD)</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border/30 text-muted-foreground">
                        <span>Frame Rate</span>
                        <span className="font-extrabold text-foreground">30 FPS (Constant)</span>
                      </div>
                      <div className="flex justify-between py-1.5 text-muted-foreground">
                        <span>Processing</span>
                        <span className="font-extrabold text-foreground">FFmpeg Worker</span>
                      </div>
                    </div>

                    <Button
                      onClick={triggerExport}
                      className="w-full h-9 font-black gap-1.5 shadow-lg shadow-primary/20"
                    >
                      <IconCheck className="h-4 w-4 shrink-0" />
                      Compile & Download
                    </Button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* 3. CENTER PANEL (Canvas + Timeline) */}
        <div className="flex min-w-0 flex-1 flex-col relative">
          <div className="flex min-h-0 flex-1 relative bg-neutral-900/40">
            <CanvasDropZone />
          </div>
          <div className="border-t border-border/60 bg-card z-10">
            <TimelinePanel />
          </div>
        </div>

        {/* 4. COLLAPSIBLE RIGHT SIDEBAR (Inspector) */}
        <div
          className={`shrink-0 border-l border-border/60 bg-card flex flex-col relative transition-all duration-300 ease-in-out overflow-hidden z-10 ${inspectorCollapsed ? "w-0 border-l-0" : "w-72"
            }`}
        >
          {/* Floating pull-tab handle on the left edge of Inspector */}
          <button
            onClick={() => setInspectorCollapsed(!inspectorCollapsed)}
            className="absolute top-1/2 left-0 -translate-y-1/2 flex items-center justify-center h-12 w-4.5 bg-card border border-border border-r-0 rounded-l-md hover:bg-accent/40 text-muted-foreground hover:text-primary z-20 transition-colors"
            style={{ transform: 'translateX(-100%) translateY(-50%)' }}
            title={inspectorCollapsed ? "Expand Inspector Panel" : "Collapse Inspector Panel"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-3 w-3 transform transition-transform duration-300 ${inspectorCollapsed ? "" : "rotate-180"}`}
            >
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
          </button>

          <div className="h-full w-72">
            <InspectorPanel className="h-full w-full border-none shadow-none rounded-none max-h-none overflow-y-auto bg-transparent" />
          </div>
        </div>

      </div>

      {/* PREMIUM UPGRADE NOTICE DIALOG */}
      {showUpgradeModal && (
        <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 p-8 rounded-2xl shadow-2xl max-w-md w-full flex flex-col relative overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Ambient Background Glow */}
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-3 mb-5">
              <span className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <IconSparkles className="h-6 w-6 text-amber-400 fill-amber-400" />
              </span>
              <div>
                <h3 className="font-extrabold text-foreground text-lg">Upgrade to Premium</h3>
                <p className="text-[10px] text-primary font-black uppercase tracking-wider">Unlock Professional Studio Features</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
              You've hit the <span className="font-extrabold text-foreground">3.0 MB free storage limit</span>. Upgrade your plan to get unlimited cloud assets storage, high-speed 1080p FFmpeg exports, and advanced AI script compilation!
            </p>

            {/* Premium Features List */}
            <div className="flex flex-col gap-3 mb-6 bg-muted/20 border border-border/40 p-4 rounded-xl">
              <div className="flex items-start gap-2.5 text-xs text-foreground font-semibold">
                <span className="text-primary font-black text-sm">✓</span>
                <div>
                  <div className="font-black text-[11px]">Unlimited Cloud Asset Storage</div>
                  <div className="text-[10px] text-muted-foreground font-medium">Upload files of any size without limitations.</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-foreground font-semibold">
                <span className="text-primary font-black text-sm">✓</span>
                <div>
                  <div className="font-black text-[11px]">HD 1080p Render Pipeline</div>
                  <div className="text-[10px] text-muted-foreground font-medium">Fast 60fps renders using dedicated server clusters.</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-foreground font-semibold">
                <span className="text-primary font-black text-sm">✓</span>
                <div>
                  <div className="font-black text-[11px]">Advanced AI Storyboards</div>
                  <div className="text-[10px] text-muted-foreground font-medium">Generate full-length scenes with multiple complex keyframe tracks.</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <Button
                variant="secondary"
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 h-9.5 text-xs font-black uppercase tracking-wider border border-border/40"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowUpgradeModal(false);
                  toast.success("Upgrade process simulated successfully!");
                }}
                className="flex-1 h-9.5 text-xs font-black uppercase tracking-wider bg-gradient-to-tr from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-600/20"
              >
                Upgrade Plan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
