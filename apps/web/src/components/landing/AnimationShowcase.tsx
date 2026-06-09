"use client";

import React, { useState, useEffect, useRef, MouseEvent } from "react";
import { IconRefresh, IconEye, IconEyeOff } from "@tabler/icons-react";

interface Point {
  x: number;
  y: number;
}

interface Pose {
  head: Point;
  neck: Point;
  pelvis: Point;
  lShoulder: Point;
  lElbow: Point;
  lHand: Point;
  rShoulder: Point;
  rElbow: Point;
  rHand: Point;
  lHip: Point;
  lKnee: Point;
  lFoot: Point;
  rHip: Point;
  rKnee: Point;
  rFoot: Point;
}

const defaultPoses: Pose[] = [
  // Pose 0: Idle/Stand
  {
    head: { x: 100, y: 35 },
    neck: { x: 100, y: 50 },
    pelvis: { x: 100, y: 100 },
    lShoulder: { x: 80, y: 55 },
    lElbow: { x: 70, y: 75 },
    lHand: { x: 65, y: 95 },
    rShoulder: { x: 120, y: 55 },
    rElbow: { x: 130, y: 75 },
    rHand: { x: 135, y: 95 },
    lHip: { x: 90, y: 105 },
    lKnee: { x: 85, y: 135 },
    lFoot: { x: 80, y: 165 },
    rHip: { x: 110, y: 105 },
    rKnee: { x: 115, y: 135 },
    rFoot: { x: 120, y: 165 },
  },
  // Pose 1: Squat/Prep
  {
    head: { x: 100, y: 60 },
    neck: { x: 100, y: 75 },
    pelvis: { x: 100, y: 115 },
    lShoulder: { x: 80, y: 80 },
    lElbow: { x: 65, y: 100 },
    lHand: { x: 55, y: 120 },
    rShoulder: { x: 120, y: 80 },
    rElbow: { x: 135, y: 100 },
    rHand: { x: 145, y: 120 },
    lHip: { x: 88, y: 118 },
    lKnee: { x: 70, y: 140 },
    lFoot: { x: 85, y: 165 },
    rHip: { x: 112, y: 118 },
    rKnee: { x: 130, y: 140 },
    rFoot: { x: 115, y: 165 },
  },
  // Pose 2: Jump/Ascend (Stretch)
  {
    head: { x: 100, y: 25 },
    neck: { x: 100, y: 40 },
    pelvis: { x: 100, y: 80 },
    lShoulder: { x: 80, y: 35 },
    lElbow: { x: 65, y: 15 },
    lHand: { x: 50, y: 0 },
    rShoulder: { x: 120, y: 35 },
    rElbow: { x: 135, y: 15 },
    rHand: { x: 150, y: 0 },
    lHip: { x: 90, y: 85 },
    lKnee: { x: 88, y: 115 },
    lFoot: { x: 85, y: 145 },
    rHip: { x: 110, y: 85 },
    rKnee: { x: 112, y: 115 },
    rFoot: { x: 115, y: 145 },
  },
  // Pose 3: Mid-Air Tuck / Flip
  {
    head: { x: 110, y: 65 },
    neck: { x: 100, y: 75 },
    pelvis: { x: 90, y: 90 },
    lShoulder: { x: 90, y: 70 },
    lElbow: { x: 75, y: 80 },
    lHand: { x: 70, y: 95 },
    rShoulder: { x: 110, y: 75 },
    rElbow: { x: 115, y: 90 },
    rHand: { x: 110, y: 105 },
    lHip: { x: 85, y: 95 },
    lKnee: { x: 95, y: 110 },
    lFoot: { x: 80, y: 115 },
    rHip: { x: 95, y: 85 },
    rKnee: { x: 105, y: 100 },
    rFoot: { x: 90, y: 105 },
  },
  // Pose 4: Landing Prep
  {
    head: { x: 100, y: 45 },
    neck: { x: 100, y: 60 },
    pelvis: { x: 100, y: 100 },
    lShoulder: { x: 80, y: 65 },
    lElbow: { x: 70, y: 85 },
    lHand: { x: 65, y: 105 },
    rShoulder: { x: 120, y: 65 },
    rElbow: { x: 130, y: 85 },
    rHand: { x: 135, y: 105 },
    lHip: { x: 90, y: 105 },
    lKnee: { x: 85, y: 135 },
    lFoot: { x: 88, y: 160 },
    rHip: { x: 110, y: 105 },
    rKnee: { x: 115, y: 135 },
    rFoot: { x: 112, y: 160 },
  },
];

const interpolatePoint = (p1: Point, p2: Point, t: number): Point => {
  return {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
  };
};

const interpolatePose = (p1: Pose, p2: Pose, t: number): Pose => {
  const result = {} as Pose;
  (Object.keys(p1) as Array<keyof Pose>).forEach((k) => {
    result[k] = interpolatePoint(p1[k], p2[k], t);
  });
  return result;
};

export default function AnimationShowcase() {
  const [poses, setPoses] = useState<Pose[]>(JSON.parse(JSON.stringify(defaultPoses)));
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playhead, setPlayhead] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(1);
  const [onionSkin, setOnionSkin] = useState<boolean>(true);
  const [selectedJoint, setSelectedJoint] = useState<string | null>(null);
  const [draggedKeyframeIndex, setDraggedKeyframeIndex] = useState<number>(0);

  const containerRef = useRef<SVGSVGElement | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Animation Loop
  useEffect(() => {
    let animationFrameId: number;

    const tick = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      if (isPlaying && !selectedJoint) {
        setPlayhead((prev) => {
          // speed multiplier config
          const increment = (elapsed / 16.67) * 0.02 * speed; 
          const nextVal = prev + increment;
          return nextVal >= poses.length ? 0 : nextVal;
        });
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, speed, selectedJoint, poses.length]);

  // Calculate current interpolated pose
  const currentFloor = Math.floor(playhead);
  const nextIndex = (currentFloor + 1) % poses.length;
  const fractionalPart = playhead - currentFloor;
  
  const currentPose = interpolatePose(
    (poses[currentFloor] || poses[0]) as Pose,
    (poses[nextIndex] || poses[0]) as Pose,
    fractionalPart
  );

  // Reset function
  const handleReset = () => {
    setPoses(JSON.parse(JSON.stringify(defaultPoses)));
    setSelectedJoint(null);
  };

  // Drag Handlers
  const handleMouseDown = (e: MouseEvent<SVGCircleElement>, jointName: string) => {
    e.preventDefault();
    setIsPlaying(false);
    setSelectedJoint(jointName);
    // Drag edits the closest keyframe index
    setDraggedKeyframeIndex(Math.round(playhead) % poses.length);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!selectedJoint || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 200;
    const y = ((e.clientY - rect.top) / rect.height) * 200;

    // Clamp coordinates to grid
    const clampedX = Math.max(10, Math.min(190, Math.round(x)));
    const clampedY = Math.max(10, Math.min(190, Math.round(y)));

    setPoses((prev) => {
      const updated = [...prev];
      const targetPose = { ...updated[draggedKeyframeIndex]! } as Pose;
      targetPose[selectedJoint as keyof Pose] = { x: clampedX, y: clampedY };
      updated[draggedKeyframeIndex] = targetPose;
      return updated;
    });
  };

  const handleMouseUp = () => {
    setSelectedJoint(null);
  };

  const renderStickman = (pose: Pose, isGhost: boolean = false, opacity: number = 1, keyName: string = "real") => {
    const strokeColor = isGhost ? "rgba(56, 189, 248, 0.15)" : "#ffffff";
    const limbColor = isGhost ? "rgba(56, 189, 248, 0.1)" : "#38bdf8";
    const headColor = isGhost ? "rgba(56, 189, 248, 0.15)" : "transparent";

    return (
      <g key={keyName} style={{ opacity }}>
        {/* Head */}
        <circle 
          cx={pose.head.x} 
          cy={pose.head.y} 
          r={9} 
          stroke={strokeColor} 
          strokeWidth={3} 
          fill={headColor} 
        />
        
        {/* Torso/Spine */}
        <line 
          x1={pose.neck.x} 
          y1={pose.neck.y} 
          x2={pose.pelvis.x} 
          y2={pose.pelvis.y} 
          stroke={strokeColor} 
          strokeWidth={4.5} 
          strokeLinecap="round" 
        />

        {/* Left Arm */}
        <line 
          x1={pose.neck.x} 
          y1={pose.neck.y} 
          x2={pose.lShoulder.x} 
          y2={pose.lShoulder.y} 
          stroke={strokeColor} 
          strokeWidth={3.5} 
          strokeLinecap="round" 
        />
        <line 
          x1={pose.lShoulder.x} 
          y1={pose.lShoulder.y} 
          x2={pose.lElbow.x} 
          y2={pose.lElbow.y} 
          stroke={strokeColor} 
          strokeWidth={3.5} 
          strokeLinecap="round" 
        />
        <line 
          x1={pose.lElbow.x} 
          y1={pose.lElbow.y} 
          x2={pose.lHand.x} 
          y2={pose.lHand.y} 
          stroke={limbColor} 
          strokeWidth={3} 
          strokeLinecap="round" 
        />

        {/* Right Arm */}
        <line 
          x1={pose.neck.x} 
          y1={pose.neck.y} 
          x2={pose.rShoulder.x} 
          y2={pose.rShoulder.y} 
          stroke={strokeColor} 
          strokeWidth={3.5} 
          strokeLinecap="round" 
        />
        <line 
          x1={pose.rShoulder.x} 
          y1={pose.rShoulder.y} 
          x2={pose.rElbow.x} 
          y2={pose.rElbow.y} 
          stroke={strokeColor} 
          strokeWidth={3.5} 
          strokeLinecap="round" 
        />
        <line 
          x1={pose.rElbow.x} 
          y1={pose.rElbow.y} 
          x2={pose.rHand.x} 
          y2={pose.rHand.y} 
          stroke={limbColor} 
          strokeWidth={3} 
          strokeLinecap="round" 
        />

        {/* Left Leg */}
        <line 
          x1={pose.pelvis.x} 
          y1={pose.pelvis.y} 
          x2={pose.lHip.x} 
          y2={pose.lHip.y} 
          stroke={strokeColor} 
          strokeWidth={4} 
          strokeLinecap="round" 
        />
        <line 
          x1={pose.lHip.x} 
          y1={pose.lHip.y} 
          x2={pose.lKnee.x} 
          y2={pose.lKnee.y} 
          stroke={strokeColor} 
          strokeWidth={3.5} 
          strokeLinecap="round" 
        />
        <line 
          x1={pose.lKnee.x} 
          y1={pose.lKnee.y} 
          x2={pose.lFoot.x} 
          y2={pose.lFoot.y} 
          stroke={limbColor} 
          strokeWidth={3} 
          strokeLinecap="round" 
        />

        {/* Right Leg */}
        <line 
          x1={pose.pelvis.x} 
          y1={pose.pelvis.y} 
          x2={pose.rHip.x} 
          y2={pose.rHip.y} 
          stroke={strokeColor} 
          strokeWidth={4} 
          strokeLinecap="round" 
        />
        <line 
          x1={pose.rHip.x} 
          y1={pose.rHip.y} 
          x2={pose.rKnee.x} 
          y2={pose.rKnee.y} 
          stroke={strokeColor} 
          strokeWidth={3.5} 
          strokeLinecap="round" 
        />
        <line 
          x1={pose.rKnee.x} 
          y1={pose.rKnee.y} 
          x2={pose.rFoot.x} 
          y2={pose.rFoot.y} 
          stroke={limbColor} 
          strokeWidth={3} 
          strokeLinecap="round" 
        />
      </g>
    );
  };

  return (
    <div className="w-full max-w-sm md:max-w-md max-h-[50vh] md:max-h-[55vh] rounded-xl border border-white/10 bg-[#09090b]/80 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col">
      {/* Editor Title Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-[#0e0e11] select-none">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
        </div>
        <div className="text-[9px] font-mono tracking-wider text-neutral-400">
          workspace/backflip_loop.json
        </div>
        <div className="flex items-center gap-1.5 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full">
          <span className="w-1 h-1 rounded-full bg-sky-400 animate-pulse" />
          <span className="text-[8px] font-black uppercase text-sky-400 tracking-widest">
            {isPlaying ? "Running" : "Static"}
          </span>
        </div>
      </div>

      {/* Editor Grid Area */}
      <div className="relative flex-1 min-h-0 bg-[#050507] flex items-center justify-center p-4 border-b border-white/5 overflow-hidden">
        {/* Subtle grid background */}
        <div 
          className="absolute inset-0 z-0 opacity-10" 
          style={{
            backgroundImage: `
              linear-gradient(to right, #ffffff 1px, transparent 1px),
              linear-gradient(to bottom, #ffffff 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}
        />
        
        {/* Center crosshair */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] z-0">
          <div className="w-full h-px bg-white" />
          <div className="h-full w-px bg-white absolute" />
        </div>

        {/* Live Vector SVG canvas */}
        <svg
          ref={containerRef}
          viewBox="0 0 200 200"
          className="w-full h-full max-h-[25vh] md:max-h-[30vh] z-10"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Floor grid line */}
          <line x1="10" y1="165" x2="190" y2="165" stroke="rgba(255,255,255,0.06)" strokeWidth={1} strokeDasharray="3 3" />

          {/* Onion Skinning (Ghost Frames) */}
          {onionSkin && isPlaying && poses.map((pose, idx) => {
            const dist = Math.abs(playhead - idx);
            if (dist > 0.2 && dist < 1.2) {
              return renderStickman(pose, true, 0.45 - dist * 0.3, `ghost-${idx}`);
            }
            return null;
          })}

          {/* Core Stickman */}
          {renderStickman(currentPose, false, 1, "real")}

          {/* Interactive Drag Handles when paused */}
          {!isPlaying && Object.entries(currentPose).map(([jointName, pt]) => (
            <circle
              key={jointName}
              cx={pt.x}
              cy={pt.y}
              r={selectedJoint === jointName ? 6 : 4}
              fill={selectedJoint === jointName ? "#f43f5e" : "#38bdf8"}
              stroke="#ffffff"
              strokeWidth={1.5}
              className="cursor-move transition-all duration-150 hover:scale-125 hover:fill-rose-400 z-20"
              onMouseDown={(e) => handleMouseDown(e, jointName)}
            />
          ))}
        </svg>

        {/* Overlay instructions when static */}
        {!isPlaying && (
          <div className="absolute bottom-3 left-3 bg-black/80 border border-white/5 backdrop-blur-md px-2 py-1 rounded-md pointer-events-none select-none text-[9px] text-neutral-400 font-semibold">
            🖱️ Drag nodes to pose
          </div>
        )}
      </div>

      {/* Editor Controls & Keyframe Timeline */}
      <div className="px-4 py-3 bg-[#09090b] flex flex-col gap-2.5">
        {/* Keyframe Timeline slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
            <span>Frames</span>
            <span className="font-mono text-sky-400">{playhead.toFixed(2)} / {poses.length - 1}.00</span>
          </div>
          <div className="relative w-full h-7 flex items-center bg-[#121217] rounded-lg border border-white/5 px-2">
            {/* Timeline Tick Marks */}
            <div className="absolute inset-0 flex justify-between px-3 items-center pointer-events-none">
              {poses.map((_, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <div className="w-0.5 h-1.5 bg-neutral-600 rounded-full" />
                  <span className="text-[7px] font-mono text-neutral-500 mt-0.5">F{idx}</span>
                </div>
              ))}
            </div>

            {/* Interactive playhead slider */}
            <input
              type="range"
              min={0}
              max={poses.length - 0.01}
              step={0.01}
              value={playhead}
              onChange={(e) => {
                setIsPlaying(false);
                setPlayhead(parseFloat(e.target.value));
              }}
              className="w-full opacity-35 hover:opacity-75 focus:opacity-100 transition-opacity z-10 cursor-pointer accent-sky-400 h-1"
            />
          </div>
        </div>

        {/* Toolbar Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500 hover:bg-sky-400 text-black shadow-md shadow-sky-500/10 transition-colors"
              title={isPlaying ? "Pause Animation" : "Play Animation"}
            >
              {isPlaying ? (
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <button
              onClick={handleReset}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 hover:bg-white/5 text-neutral-400 hover:text-white transition-colors"
              title="Reset Poses"
            >
              <IconRefresh className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setOnionSkin(!onionSkin)}
              className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${
                onionSkin 
                  ? "border-sky-500/30 bg-sky-500/10 text-sky-400" 
                  : "border-white/10 hover:bg-white/5 text-neutral-400"
              }`}
              title="Toggle Onion Skinning"
            >
              {onionSkin ? <IconEye className="h-3.5 w-3.5" /> : <IconEyeOff className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 bg-neutral-900 border border-white/5 p-0.5 rounded-lg">
            {([0.5, 1, 1.5] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded transition-all ${
                  speed === s 
                    ? "bg-white/10 text-white font-bold" 
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
