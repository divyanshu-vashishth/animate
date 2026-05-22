import type { EditorCommand, TimelineData } from "@stickman/shared";
import { createDefaultTimeline } from "@stickman/shared";
import { getOrCreateTrack } from "@stickman/timeline";
import type { AnimationScript } from "./schema.js";

export interface CompileResult {
  commands: EditorCommand[];
  timeline: TimelineData;
}

export function compileAnimationScript(
  script: AnimationScript,
  entityId: string,
  startX = 400,
  startY = 600
): CompileResult {
  const commands: EditorCommand[] = [];
  const timeline = createDefaultTimeline(10);
  let time = 0;
  let x = startX;
  let y = startY;

  const moveTrack = getOrCreateTrack(timeline, entityId, "transform.x");
  const yTrack = getOrCreateTrack(timeline, entityId, "transform.y");
  const clipTrack = getOrCreateTrack(timeline, entityId, "spriteAnimation.clip");

  moveTrack.keyframes.push({
    id: crypto.randomUUID(),
    time: 0,
    value: x,
    easing: "linear",
  });
  yTrack.keyframes.push({
    id: crypto.randomUUID(),
    time: 0,
    value: y,
    easing: "linear",
  });

  for (const action of script.actions) {
    switch (action.type) {
      case "move": {
        x = action.x;
        if (action.y !== undefined) y = action.y;
        moveTrack.keyframes.push({
          id: crypto.randomUUID(),
          time,
          value: x,
          easing: "easeInOut",
        });
        if (action.y !== undefined) {
          yTrack.keyframes.push({
            id: crypto.randomUUID(),
            time,
            value: y,
            easing: "easeInOut",
          });
        }
        moveTrack.keyframes.push({
          id: crypto.randomUUID(),
          time: time + action.duration,
          value: x,
          easing: "easeInOut",
        });
        time += action.duration;
        break;
      }
      case "playClip": {
        clipTrack.keyframes.push({
          id: crypto.randomUUID(),
          time,
          value: `${script.character}/${action.clip}`,
          easing: "none",
        });
        commands.push({
          type: "PlayClip",
          entityId,
          clip: `${script.character}/${action.clip}`,
        });
        time += action.duration;
        break;
      }
      case "wait": {
        time += action.duration;
        break;
      }
      case "flip": {
        commands.push({
          type: "SetEntityTransform",
          entityId,
          transform: { scaleX: action.scaleX },
        });
        break;
      }
      case "addEntity": {
        commands.push({
          type: "AddEntity",
          clip: `${action.character}/${action.clip}`,
          layerId: "",
          x: action.x,
          y: action.y,
        });
        break;
      }
    }
  }

  timeline.duration = Math.max(timeline.duration, time + 1);

  return { commands, timeline };
}

import { animationScriptSchema } from "./schema.js";

export function parseAnimationScript(json: unknown): AnimationScript {
  return animationScriptSchema.parse(json);
}
