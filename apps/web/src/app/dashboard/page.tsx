"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@stickman/auth/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";

interface Project {
  id: string;
  name: string;
  updatedAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      router.replace("/sign-in");
      return;
    }
    void api
      .listProjects()
      .then(({ projects: list }) => setProjects(list))
      .catch(() => router.replace("/sign-in"))
      .finally(() => setLoading(false));
  }, [session, isPending, router]);

  const createProject = async () => {
    const { project } = await api.createProject(`Animation ${projects.length + 1}`);
    router.push(`/editor/${project.id}`);
  };

  const signOut = async () => {
    await authClient.signOut();
    router.replace("/sign-in");
    router.refresh();
  };

  if (isPending || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground">{session?.user.email}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={createProject}>New project</Button>
          <Button variant="outline" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {projects.length === 0 && (
          <p className="text-muted-foreground">No projects yet. Create your first animation.</p>
        )}
        {projects.map((p) => (
          <Link key={p.id} href={`/editor/${p.id}`}>
            <Card className="transition-colors hover:border-primary/50">
              <CardHeader>
                <CardTitle>{p.name}</CardTitle>
                <CardDescription>
                  Updated {new Date(p.updatedAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
