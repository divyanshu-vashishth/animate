import type { ProjectDocument } from "@stickman/shared";

const API_URL = typeof window === "undefined"
  ? (process.env.API_URL ?? "http://localhost:4000")
  : "/api-backend";

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "API error");
  }
  return res.json() as Promise<T>;
}

export const api = {
  listProjects: () =>
    fetchApi<{
      projects: Array<{ id: string; name: string; createdAt: string; updatedAt: string }>;
    }>("/projects"),

  createProject: (name: string) =>
    fetchApi<{ project: { id: string; name: string } }>("/projects", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  getDocument: (projectId: string) =>
    fetchApi<{ document: ProjectDocument }>(`/projects/${projectId}/document`),

  saveDocument: (projectId: string, document: ProjectDocument) =>
    fetchApi<{ ok: boolean }>(`/projects/${projectId}/document`, {
      method: "PUT",
      body: JSON.stringify({ document }),
    }),

  generateAnimation: (prompt: string, entityId?: string) =>
    fetchApi<{
      script: unknown;
      commands: unknown[];
      timeline: ProjectDocument["timeline"];
      entityId: string;
    }>("/ai/generate", {
      method: "POST",
      body: JSON.stringify({ prompt, entityId }),
    }),

  enhanceScript: (prompt: string, availableSprites?: any, customUploads?: any) =>
    fetchApi<{ enhanced: string }>("/ai/enhance", {
      method: "POST",
      body: JSON.stringify({ prompt, availableSprites, customUploads }),
    }),

  generateAiLayers: (enhancedPrompt: string, availableSprites?: any, customUploads?: any) =>
    fetchApi<{
      layers: any[];
      entities: any[];
      timeline: any;
    }>("/ai/generate-layers", {
      method: "POST",
      body: JSON.stringify({ enhancedPrompt, availableSprites, customUploads }),
    }),

  createRenderJob: (projectId: string, format: "mp4" | "gif" | "webm") =>
    fetchApi<{ job: { id: string; status: string } }>("/render/jobs", {
      method: "POST",
      body: JSON.stringify({ projectId, format }),
    }),

  getRenderJob: (jobId: string) =>
    fetchApi<{ job: { id: string; status: string; outputUrl?: string } }>(
      `/render/jobs/${jobId}`
    ),

  renderDirect: async (projectId: string, format: "mp4" | "gif" | "webm", frames: string[], fps?: number): Promise<Blob> => {
    // 1. Retrieve the container's public URL from Hono
    const configRes = await fetch(`${API_URL}/render/config`);
    if (!configRes.ok) {
      throw new Error("Failed to retrieve render server configuration.");
    }
    const { rendererUrl } = await configRes.json() as { rendererUrl: string };

    // 2. Upload frames directly to the Render.com container (bypassing Vercel gateway completely!)
    const jobId = typeof crypto.randomUUID === "function" 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2);
      
    const cleanRendererUrl = rendererUrl.replace(/\/+$/, "");
    const res = await fetch(`${cleanRendererUrl}/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobId, format, frames, fps }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error?: string }).error ?? "Render server error");
    }
    return res.blob();
  },

  listAssets: () =>
    fetchApi<{
      assets: Array<{ id: string; name: string; type: string; url: string; metadata?: any; createdAt: string }>;
    }>("/assets"),

  uploadAsset: (name: string, type: string, url: string, metadata?: any) =>
    fetchApi<{ asset: { id: string; name: string; type: string; url: string; metadata?: any; createdAt: string } }>("/assets", {
      method: "POST",
      body: JSON.stringify({ name, type, url, metadata }),
    }),

  deleteProject: (projectId: string) =>
    fetchApi<{ ok: boolean }>(`/projects/${projectId}`, {
      method: "DELETE",
    }),

  deleteAsset: (assetId: string) =>
    fetchApi<{ ok: boolean }>(`/assets/${assetId}`, {
      method: "DELETE",
    }),
};
