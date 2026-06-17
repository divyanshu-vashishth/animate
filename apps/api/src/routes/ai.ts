import { Hono } from "hono";
import {
  SAMPLE_ANIMATION_SCRIPT,
  animationScriptSchema,
  compileAnimationScript,
} from "@stickman/ai";
import { TEACHING_RIG_ACTIONS, TEACHING_SHAPE_PRESETS } from "@stickman/shared";
import { getAuthUser } from "../middleware/session.js";

export const aiRoutes = new Hono();

// Helper to clean Gemini JSON markdown
function cleanGeminiJsonResponse(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

// REST call helper to Gemini API
async function callGemini(prompt: string, jsonMode = false): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not defined");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: jsonMode ? {
        responseMimeType: "application/json",
      } : undefined,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API returned error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as any;
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    throw new Error("Invalid response from Gemini API");
  }

  return content;
}

aiRoutes.post("/generate", async (c) => {
  if (!getAuthUser(c)) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json<{ prompt: string; entityId?: string }>();

  const script = animationScriptSchema.safeParse(
    promptToScript(body.prompt) ?? SAMPLE_ANIMATION_SCRIPT
  );
  if (!script.success) {
    return c.json({ error: "Invalid animation script", details: script.error }, 400);
  }

  const entityId = body.entityId ?? crypto.randomUUID();
  const compiled = compileAnimationScript(script.data, entityId);

  return c.json({
    script: script.data,
    commands: compiled.commands,
    timeline: compiled.timeline,
    entityId,
  });
});

// Step 1: Enhance prompt using Gemini
aiRoutes.post("/enhance", async (c) => {
  if (!getAuthUser(c)) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json<{
    prompt: string;
    availableSprites?: any;
    customUploads?: any;
    width?: number;
    height?: number;
  }>();
  if (!body.prompt || !body.prompt.trim()) {
    return c.json({ error: "Prompt is required" }, 400);
  }

  const width = body.width ?? 640;
  const height = body.height ?? 360;
  const baseline = height - 60;

  try {
    let assetsContext = "";
    if (body.availableSprites || body.customUploads) {
      assetsContext = `\nCRITICAL: The following assets are currently available and uploaded in the project workspace. You MUST design the animation storyboard to PRIMARILY use these assets where applicable:
- Available Character Sprites: ${JSON.stringify(body.availableSprites?.characters || [])}
- Available Props: ${JSON.stringify(body.availableSprites?.props || [])}
- Available Backgrounds: ${JSON.stringify(body.availableSprites?.backgrounds || [])}
- Available Teaching Rig Actions: ${JSON.stringify(body.availableSprites?.rigActions || Object.keys(TEACHING_RIG_ACTIONS))}
- Available Teaching Shapes: ${JSON.stringify(TEACHING_SHAPE_PRESETS.map((preset) => preset.kind))}
- Custom Uploaded Media (Images): ${JSON.stringify(body.customUploads || [])}
If custom uploaded media assets are listed, incorporate them into the actions/storyboard using their exact names!
`;
    }

    const promptMessage = `You are a master storyboarder and animator assistant. The user wants to animate a scene described as: "${body.prompt}". Enhance this simple script into a detailed, time-coded animation plan (storyboard) for a 10-second 2D stickman animation. The screen width is ${width}px, height is ${height}px, ground baseline is at Y = ${baseline}px.${assetsContext}

STYLE & MOVEMENT INSTRUCTIONS:
- The animation must look like a clean teaching explainer, not combat choreography.
- Use one main editable presenter rig with teaching actions such as: ${Object.keys(TEACHING_RIG_ACTIONS).join(", ")}.
- Use diagram shapes for teaching visuals: ${TEACHING_SHAPE_PRESETS.map((preset) => preset.kind).join(", ")}.
- Prefer board-style layouts: title text, definition box, module boxes, arrows, highlights, examples, and final summary.
- For talking moments, alternate rig mouth states (closed, smallOpen, wideOpen, oShape, smile, flat), small nods, and subtle hand gestures.
- Include concise narration text for the presenter that matches the on-screen teaching flow.
- Use existing fighter/sword/pistol combat sprites only if the user explicitly asks for fighting or action scenes. Otherwise do not mention combo, hit, death, pistol/shot, weapons, attacks, dodges, or opponents.
- Format the output as a clear bullet-pointed outline with exact time ranges (e.g. 0.0s - 10.0s), presenter pose/action, narration, on-screen text, diagram shapes, and arrows. Keep it compact and professional.`;

    const enhanced = await callGemini(promptMessage);
    return c.json({ enhanced });
  } catch (error: any) {
    console.error("Enhance failed:", error);
    return c.json({ error: error.message || "Failed to enhance script" }, 500);
  }
});

// Step 2: Generate complex animation layers and keyframes
aiRoutes.post("/generate-layers", async (c) => {
  if (!getAuthUser(c)) return c.json({ error: "Unauthorized" }, 401);

  let body: {
    enhancedPrompt: string;
    availableSprites?: any;
    customUploads?: any;
    width?: number;
    height?: number;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request body" }, 400);
  }

  if (!body.enhancedPrompt || !body.enhancedPrompt.trim()) {
    return c.json({ error: "Enhanced prompt/storyboard is required" }, 400);
  }

  const width = body.width ?? 640;
  const height = body.height ?? 360;
  const baseline = height - 60;

  try {
    let assetsContext = "";
    if (body.availableSprites || body.customUploads) {
      assetsContext = `\nCRITICAL: The following assets are currently available in the project. You MUST map characters, props, backgrounds, and custom uploads in the generated JSON to use these exact filenames/names:
- Characters: ${JSON.stringify(body.availableSprites?.characters || [])}
- Props: ${JSON.stringify(body.availableSprites?.props || [])} (format: "extras/prop/<filename>")
- Backgrounds: ${JSON.stringify(body.availableSprites?.backgrounds || [])} (format: "extras/background/<filename>")
- Teaching Rig Actions: ${JSON.stringify(body.availableSprites?.rigActions || Object.keys(TEACHING_RIG_ACTIONS))}
- Teaching Shapes: ${JSON.stringify(TEACHING_SHAPE_PRESETS.map((preset) => preset.kind))}
- Custom Uploaded Media: ${JSON.stringify(body.customUploads || [])}
Important for Custom Uploads: If the storyboard mentions a custom uploaded media asset, output its entity with:
1. "type": "image"
2. "name": matching the custom upload's name (must match the list exactly)
3. "clip": null
4. Omit the "src" field (the client restores image data by name).
5. "width" and "height": matching the custom upload's width/height or suitable scale.
`;
    }

    const promptMessage = `You are an animation compiler. Translate the following storyboard plan into a structured JSON project document for a 2D animation:
"${body.enhancedPrompt}"

const workspaceProperties = {
  "width": ${width},
  "height": ${height},
  "baselineY": ${baseline}
};

The workspace properties are:
- Canvas viewport: ${width}px wide, ${height}px high.
- Baseline ground floor is at Y = ${baseline}. Characters stand on this baseline (e.g. Y = ${baseline}, or Y = ${baseline - 120} if jumping or in mid-air).
- Maximum duration is 10.0 seconds.
${assetsContext}

Output format:
Return ONLY a valid JSON object matching the structure below. Do not include markdown code block syntax (like \`\`\`json). Do not include any pre- or post-text. The response must be strictly valid JSON.

JSON Structure:
{
  "layers": [
    { "id": "string (unique)", "name": "string (e.g. Background, Characters)", "order": number, "visible": true, "locked": false }
  ],
  "entities": [
    {
      "id": "string (unique)",
      "type": "rig" or "shape" or "text" or "image" or "sprite",
      "name": "string",
      "layerId": "string (from layers)",
      "clip": "string only for sprite entities (format: '<character_name>/<action>' or prop 'extras/prop/<filename>' or background 'extras/background/<filename>')",
      "rigId": "teaching-stickman (only for rig entities)",
      "pose": "string teaching pose/action id only for rig entities, e.g. 'idle_presenter', 'talk_neutral', 'point_right', 'present_board', 'conclusion'",
      "face": "neutral" or "smile" or "thinking" or "confused" or "warning" or "happy",
      "mouth": "closed" or "smallOpen" or "wideOpen" or "oShape" or "smile" or "flat",
      "shape": "box" or "rounded_box" or "circle" or "arrow" or "line" or "database" or "cloud" or "highlight" or "underline" or "check" or "cross",
      "src": "omit for image entities (client restores by name)",
      "text": "string (only if type is text)",
      "transform": { "x": number (default X position), "y": number (default Y position, e.g. ${baseline}), "rotation": number (default 0), "scaleX": number (1 or -1 for horizontal flip), "scaleY": number (1 or -1) },
      "startTime": number (start time in seconds),
      "endTime": number (end time in seconds),
      "width": number (default width, e.g. 120 for characters, larger for background props),
      "height": number (default height, e.g. 120 for characters)
    }
  ],
  "voiceTracks": [
    {
      "id": "string (unique UUID)",
      "name": "Narration",
      "text": "concise presenter narration matching the storyboard",
      "startTime": number,
      "duration": number,
      "rate": number (0.5 to 2.0, default 1),
      "pitch": number (0 to 2, default 1),
      "volume": number (0 to 1, default 1),
      "lang": "optional BCP-47 language code such as en-US"
    }
  ],
  "timeline": {
    "duration": 10.0,
    "fps": 60,
    "tracks": [
      {
        "id": "string (unique)",
        "entityId": "string (matching entities.id)",
        "property": "transform.x" or "transform.y" or "transform.rotation" or "transform.scaleX" or "rig.pose" or "rig.face" or "rig.mouth" or "text" or "width" or "height" or "shape.fillColor" or "shape.strokeColor" or "opacity" or "spriteAnimation.clip",
        "keyframes": [
          { "id": "string (unique)", "time": number (between 0.0 and 10.0), "value": number or string, "easing": "easeInOut" or "linear" or "none" }
        ]
      }
    ]
  }
}

CHOREOGRAPHY & MOTION RULES:
1. Create at least one "rig" presenter entity standing on baseline Y = ${baseline}. Use width around 150 and height around 190.
2. Use "rig.pose" keyframes for presenter actions such as talk_neutral, point_right, present_board, write_board, highlight_key_point, and conclusion.
3. Use "rig.mouth" keyframes during speech. Alternate closed/smallOpen/wideOpen/oShape every 0.2-0.5 seconds for simple talking animation.
4. Use "shape" entities for teaching diagrams. Use rounded_box for modules, box for definitions, arrow/line for flows, highlight/underline for emphasis, database/cloud when useful.
5. Use text entities for title, definition, labels, bullet summaries, and callouts.
6. Add one voiceTracks entry for the presenter narration unless the storyboard explicitly says silent/no voice. Keep narration natural and short enough to fit the 10-second scene.
7. Do not use combo, hit, death, pistol/shot, weapons, attacks, opponents, or fight choreography unless the source storyboard explicitly asks for combat.
8. Every entity must have a unique ID, and its tracks must reference that same ID. All IDs must be valid random UUIDs.`;

    const rawJson = await callGemini(promptMessage, true);
    const cleanedJson = cleanGeminiJsonResponse(rawJson);
    const parsed = JSON.parse(cleanedJson);
    return c.json(parsed);
  } catch (error: any) {
    console.error("Generate layers failed:", error);
    return c.json({ error: error.message || "Failed to generate AI layers" }, 500);
  }
});

function promptToScript(prompt: string): unknown | null {
  const lower = prompt.toLowerCase();
  if (lower.includes("teach") || lower.includes("explain") || lower.includes("what is") || lower.includes("sap")) {
    return {
      character: "fighter",
      actions: [
        { type: "playClip", clip: "idle", duration: 0.5 },
        { type: "wait", duration: 2 },
      ],
    };
  }
  if (lower.includes("combo") || lower.includes("fight") || lower.includes("kick")) {
    return {
      character: "fighter",
      actions: [
        { type: "playClip", clip: "idle", duration: 0.3 },
        { type: "move", x: 500, duration: 0.8 },
        { type: "playClip", clip: "run", duration: 0.5 },
        { type: "playClip", clip: "combo", duration: 1.8 },
      ],
    };
  }
  if (lower.includes("sword")) {
    return {
      character: "sword",
      actions: [
        { type: "playClip", clip: "idle", duration: 0.5 },
        { type: "playClip", clip: "combo", duration: 2 },
      ],
    };
  }
  if (lower.includes("pistol") || lower.includes("shoot")) {
    return {
      character: "pistol",
      actions: [
        { type: "playClip", clip: "idle", duration: 0.4 },
        { type: "playClip", clip: "shot", duration: 0.6 },
      ],
    };
  }
  return null;
}
