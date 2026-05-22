import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="max-w-lg text-center">
        <h1 className="text-4xl font-bold tracking-tight">Stickman Studio</h1>
        <p className="mt-4 text-muted-foreground">
          AI-powered 2D stickman animation editor. Create fights, choreograph moves, and export
          videos.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/sign-up">Get started</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    </main>
  );
}
