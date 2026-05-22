import type { ProjectDocument } from "@stickman/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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

  createRenderJob: (projectId: string, format: "mp4" | "gif" | "webm") =>
    fetchApi<{ job: { id: string; status: string } }>("/render/jobs", {
      method: "POST",
      body: JSON.stringify({ projectId, format }),
    }),

  getRenderJob: (jobId: string) =>
    fetchApi<{ job: { id: string; status: string; outputUrl?: string } }>(
      `/render/jobs/${jobId}`
    ),
};
