import type { ProjectDocument } from "@stickman/shared";
import { createDefaultDocument } from "@stickman/shared";

export interface DevUser {
  id: string;
  email: string;
  name: string;
}

export interface DevProject {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

const users = new Map<string, DevUser>();
const sessions = new Map<string, string>();
const projects = new Map<string, DevProject>();
const documents = new Map<string, ProjectDocument>();
const renderJobs = new Map<
  string,
  {
    id: string;
    projectId: string;
    userId: string;
    status: string;
    format: string;
    outputUrl?: string;
    error?: string;
  }
>();

type DevRenderJob = NonNullable<ReturnType<typeof renderJobs.get>>;

export const devStore = {
  createUser(email: string, name: string): DevUser {
    const user: DevUser = {
      id: crypto.randomUUID(),
      email,
      name,
    };
    users.set(user.id, user);
    return user;
  },

  getUserByEmail(email: string): DevUser | undefined {
    return [...users.values()].find((u) => u.email === email);
  },

  createSession(userId: string): string {
    const token = crypto.randomUUID();
    sessions.set(token, userId);
    return token;
  },

  getUserBySession(token: string | undefined): DevUser | null {
    if (!token) return null;
    const userId = sessions.get(token);
    if (!userId) return null;
    return users.get(userId) ?? null;
  },

  listProjects(userId: string): DevProject[] {
    return [...projects.values()].filter((p) => p.userId === userId);
  },

  createProject(userId: string, name: string): DevProject {
    const project: DevProject = {
      id: crypto.randomUUID(),
      userId,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    projects.set(project.id, project);
    documents.set(project.id, createDefaultDocument());
    return project;
  },

  getProject(id: string, userId: string): DevProject | null {
    const p = projects.get(id);
    if (!p || p.userId !== userId) return null;
    return p;
  },

  getDocument(projectId: string): ProjectDocument | null {
    return documents.get(projectId) ?? null;
  },

  saveDocument(projectId: string, doc: ProjectDocument): void {
    documents.set(projectId, doc);
    const p = projects.get(projectId);
    if (p) p.updatedAt = new Date().toISOString();
  },

  createRenderJob(projectId: string, userId: string, format: string) {
    const job: DevRenderJob = {
      id: crypto.randomUUID(),
      projectId,
      userId,
      status: "pending",
      format,
    };
    renderJobs.set(job.id, job);
    setTimeout(() => {
      job.status = "completed";
      job.outputUrl = `/exports/${job.id}.${format}`;
    }, 2000);
    return job;
  },

  getRenderJob(id: string) {
    return renderJobs.get(id);
  },
};
