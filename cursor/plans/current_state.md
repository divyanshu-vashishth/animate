# Stickman Studio — Current Project State & Architecture

This document serves as the absolute source of truth for the codebase context, visual canvas editor architecture, implemented features, and roadmap guidelines.

---

## 🏗️ 1. Technical Stack & Workspace Structure
The project is organized as an extremely modern, type-safe **monorepo**:

```
.
├── apps/
│   ├── api/             # Hono Backend API Server (Port 3001)
│   └── web/             # Next.js Frontend Application (Port 3000)
└── packages/
    └── shared/          # Types, Schemas, & Sprite Asset Manifests
```

* **Frontend**: Next.js 14, Tailwind CSS, Zustand state management, and `@tabler/icons-react` icons.
* **Backend**: Hono server framework with full database connection structures.
* **Shared Library**: Core schemas in `packages/shared/src/types/document.ts` defining stage, layer, and entity types.

---

## 🎨 2. Visual Editor Engine Architecture
The editor is fully reactive and avoids heavy canvas game contexts to maintain total rendering stability:

* **Zustand State Model**: `apps/web/src/stores/editor-store.ts` controls project loading, active tool tabs (`leftPanelTab`), selected entities (`selectedEntityIds`), current playhead time (`timelineTime`), playback loop state (`playbackState`), and dirty status (triggers a debounced autosave).
* **Pure React Canvas**: `CanvasDropZone.tsx` draws absolute positioned DOM elements inside a `640x360` relative viewport:
  * **Ground Baseline**: A thick, high-contrast black grounding line (`bottom-[60px] h-[3px] bg-black opacity-80`) acts as the baseline anchor.
  * **Frame-Cycling Module**: Computes character frame cycling during active play sweeps:
    $$\text{FrameIndex} = \lfloor\text{time} \times \text{fps}\rfloor \pmod{\text{TotalFrames}}$$
    This swaps frames live on screen matching the running ticker.
* **Position Inspector**: `InspectorPanel.tsx` exposes active alignments, text sizing, color hex pickers, layer deletion, and timeline visibility start/end controls.

---

## 🚀 3. Features Implemented

### 🤖 A. Natural Language AI Motion Generator
* **AI Tab Button (`IconSparkles`)**: Integrated a sliding AI Copilot tab in the Left Sub-panel.
* **Natural Language Parsing**: Accepts prompts (e.g., `"Fighter runs and slashes left to right"`), detecting characters (`fighter`, `pistol`, `sword`) and poses (`run`, `slash`, `jump`, `shoot`) automatically.
* **Procedural Keyframe Injector**: Instantiates coordinates (starting on the left if "run" is detected) and merges layers directly into the Zustand document store, updating the screen instantly.

### 🎥 B. High-Definition Canvas-to-Video Exporter
* **MediaRecorder Capture Pipeline**: Triggers a synchronous rendering sweep from the Export panel.
* **HD Frame Compilation**: Pauses playback, rewinds time to `0.0s`, and steps sequentially in increments of `33ms` (30fps) through the project duration. At each tick, it paints backgrounds, baselines, rotated custom images, text tags, and correct transparent sprite modulo frames onto a `<canvas>` context buffer.
* **WebM Video Generation**: Feeds the capture stream into a local browser `MediaRecorder` instance and downloads a completed video file (`stickman_animation_*.webm`) with a high-contrast progress overlay showing rendering completion.

### 📐 C. Interactive Sizing Slider controls
* **Dynamic Sprite Sizing**: Upgraded the `SpriteEntityData` schema to support custom `width` properties.
* **Precision Slider Control**: Selected sprite layers display a custom **Size px** range slider (`40px` to `400px`) in the Inspector panel. Scaling changes propagate to the canvas instantly with complete aspect ratio correction.

### 📱 D. Fully Responsive Viewports & Collapsible Layouts
* **Dashboard Auto-Collapse**: A resize listener automatically collapses the dashboard Left Sidebar into a streamlined, elegant column of icon buttons whenever width drops below `768px`.
* **Editor Space Optimizer**: An editor observer automatically collapses the Right Inspector (`inspectorCollapsed = true`) and the Left Sub-panel (`leftPanelTab = null`) when screen width is smaller than `1024px`, leaving ample workspace for editing on smaller viewports.
* **Pill Contrast Resolution**: Upgraded card date tags to highly legible primary blue pills (`bg-primary/10 text-primary border-primary/20`) for premium contrast and legibility under both Light and Dark modes.
* **Overflow Protection**: Shortened primary action buttons (e.g. changing clipping texts to a clean `"Export Video"`) to prevent overlaps inside narrow containers.

---

## 📈 4. Verification & Health Check Commands
Ensure workspace integrity by running:

```powershell
# 1. Verify Shared Types Compile
cd packages/shared
npm run build

# 2. Verify Frontend Codebase Compilation
cd apps/web
npx tsc --noEmit
```

*Current Health Status: **Build successfully executes with Exit Code 0 and Zero errors.***
