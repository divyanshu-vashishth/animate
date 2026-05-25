import { Hono } from "hono";
import {
  SAMPLE_ANIMATION_SCRIPT,
  animationScriptSchema,
  compileAnimationScript,
} from "@stickman/ai";
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
  const body = await c.req.json<{ prompt: string; availableSprites?: any; customUploads?: any }>();
  if (!body.prompt || !body.prompt.trim()) {
    return c.json({ error: "Prompt is required" }, 400);
  }

  try {
    let assetsContext = "";
    if (body.availableSprites || body.customUploads) {
      assetsContext = `\nCRITICAL: The following assets are currently available and uploaded in the project workspace. You MUST design the animation storyboard to PRIMARILY use these assets where applicable:
- Available Character Sprites: ${JSON.stringify(body.availableSprites?.characters || [])}
- Available Props: ${JSON.stringify(body.availableSprites?.props || [])}
- Available Backgrounds: ${JSON.stringify(body.availableSprites?.backgrounds || [])}
- Custom Uploaded Media (Images): ${JSON.stringify(body.customUploads || [])}
If custom uploaded media assets are listed, incorporate them into the actions/storyboard using their exact names!
`;
    }

    const promptMessage = `You are a master storyboarder and animator assistant. The user wants to animate a scene described as: "${body.prompt}". Enhance this simple script into a detailed, time-coded animation plan (storyboard) for a 10-second 2D stickman animation. The screen width is 640px, height is 360px, ground baseline is at Y = 300px.${assetsContext}
Explain what characters or assets start at what times, what actions they do, and how they move (positions, flipping, rotations). Format it as a clear bullet-pointed outline with exact time frames (e.g. 0.0s - 10.0s) for each character. Keep it compact and professional.`;
    
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
  const body = await c.req.json<{ enhancedPrompt: string; availableSprites?: any; customUploads?: any }>();
  if (!body.enhancedPrompt || !body.enhancedPrompt.trim()) {
    return c.json({ error: "Enhanced prompt/storyboard is required" }, 400);
  }

  try {
    let assetsContext = "";
    if (body.availableSprites || body.customUploads) {
      assetsContext = `\nCRITICAL: The following assets are currently available in the project. You MUST map characters, props, backgrounds, and custom uploads in the generated JSON to use these exact filenames/names:
- Characters: ${JSON.stringify(body.availableSprites?.characters || [])}
- Props: ${JSON.stringify(body.availableSprites?.props || [])} (format: "extras/prop/<filename>")
- Backgrounds: ${JSON.stringify(body.availableSprites?.backgrounds || [])} (format: "extras/background/<filename>")
- Custom Uploaded Media: ${JSON.stringify(body.customUploads || [])}
Important for Custom Uploads: If the storyboard mentions a custom uploaded media asset, output its entity with:
1. "type": "image"
2. "name": matching the custom upload's name
3. "clip": null
4. "src": the exact "src" value (base64 string) of that custom upload from the list.
5. "width" and "height": matching the custom upload's width/height or suitable scale.
`;
    }

    const promptMessage = `You are an animation compiler. Translate the following storyboard plan into a structured JSON project document for a 2D animation:
"${body.enhancedPrompt}"

The workspace properties are:
- Canvas viewport: 640px wide, 360px high.
- Baseline ground floor is at Y = 300. Characters stand on this baseline (e.g. Y = 300, or Y = 200 if jumping).
- Maximum duration is 10.0 seconds.
${assetsContext}

Output format:
Return ONLY a valid JSON object matching the following structure. Do not include markdown code block syntax (like \`\`\`json). Do not include any pre- or post-text. The response must be strictly valid JSON.

JSON Structure:
{
  "layers": [
    { "id": "string (unique)", "name": "string (e.g. Background, Fighter Layer)", "order": number, "visible": true, "locked": false }
  ],
  "entities": [
    {
      "id": "string (unique)",
      "type": "sprite" or "text" or "image",
      "name": "string",
      "layerId": "string (from layers)",
      "clip": "string (e.g. 'fighter/run' for character pose, or 'extras/prop/building1.png' for props, or 'extras/background/background1.png')",
      "src": "string (only if type is image, base64 string provided in the uploads context)",
      "text": "string (only if type is text)",
      "transform": { "x": number (default X position), "y": number (default Y position, e.g. 300), "rotation": number (default 0), "scaleX": number (1 or -1 for horizontal flip), "scaleY": number (1 or -1) },
      "startTime": number (start time in seconds),
      "endTime": number (end time in seconds),
      "width": number (default width, e.g. 120 for characters, larger for background props),
      "height": number (default height, e.g. 120 for characters)
    }
  ],
  "timeline": {
    "duration": 10.0,
    "fps": 60,
    "tracks": [
      {
        "id": "string (unique)",
        "entityId": "string (matching entities.id)",
        "property": "transform.x" or "transform.y" or "transform.rotation" or "transform.scaleX" or "spriteAnimation.clip" or "text",
        "keyframes": [
          { "id": "string (unique)", "time": number (between 0.0 and 10.0), "value": number or string, "easing": "easeInOut" or "linear" or "none" }
        ]
      }
    ]
  }
}

Important Rules:
1. Every entity must have a unique ID, and its tracks must reference that same ID.
2. Character clip action transitions (like run to combo) must be defined as keyframes under property "spriteAnimation.clip" at correct timestamps, e.g., at time 0.0 value is "fighter/run", at time 2.0 value is "fighter/combo", at time 7.5 value is "fighter/death".
3. Coordinate changes (like movement across screen) must be keyframed under "transform.x" and "transform.y" at matching times.
4. Scale changes (like flipping) must be keyframed under "transform.scaleX" (e.g. value 1 for right, -1 for left).
5. All IDs must be valid random UUIDs or short unique string identifiers.
6. The JSON must be perfectly correct. Double-check all brackets.`;

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
