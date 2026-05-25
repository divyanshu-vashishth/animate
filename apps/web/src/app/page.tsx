"use client";

import Link from "next/link";
import { authClient } from "@stickman/auth/client";

export default function HomePage() {
  const { data: session, isPending } = authClient.useSession();

  return (
    <main className="relative h-screen w-screen min-h-screen overflow-hidden flex flex-col justify-between items-center bg-slate-50 dark:bg-neutral-950 text-neutral-900 dark:text-white font-sans select-none transition-colors duration-300">
      {/* Background spotlight visual layers */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.18)_0%,transparent_65%)] dark:bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.12)_0%,transparent_60%)] z-0 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.025)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px] opacity-100 dark:opacity-70 z-0 pointer-events-none" />
      
      {/* Top Header */}
      <header className="w-full px-8 py-6 z-20 flex items-center justify-between relative">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl font-bold tracking-widest text-neutral-900 dark:text-white bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-700 dark:from-white dark:via-white dark:to-neutral-400 bg-clip-text text-transparent transition-all duration-300">
            Stickman Studio
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
        </Link>
        
        <div>
          {isPending ? (
            <div className="h-8 w-8 flex items-center justify-center">
              <span className="h-4 w-4 border-2 border-sky-500 dark:border-sky-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : session?.user ? (
            <Link
              href="/dashboard"
              className="border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-neutral-50 dark:hover:bg-white/10 px-5 py-1.5 rounded-full text-xs font-bold text-neutral-800 dark:text-white transition-all duration-300 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-lg"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-neutral-50 dark:hover:bg-white/10 px-5 py-1.5 rounded-full text-xs font-bold text-neutral-800 dark:text-white transition-all duration-300 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-lg"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Center Hero/Showcase Area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 max-w-4xl text-center w-full px-4 relative z-10">
        {/* Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-[0.2em] bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-700 dark:from-white dark:via-white dark:to-neutral-500 bg-clip-text text-transparent font-sans uppercase pr-[-0.2em] leading-none select-none whitespace-nowrap">
          STICKMAN STUDIO
        </h1>

        {/* Showcased Autoplay Video Container */}
        <div className="relative w-full max-w-xl md:max-w-2xl aspect-video rounded-2xl overflow-hidden border border-neutral-200/80 dark:border-white/10 bg-white dark:bg-neutral-950/60 shadow-[0_20px_50px_-15px_rgba(56,189,248,0.15)] dark:shadow-[0_0_60px_-15px_rgba(56,189,248,0.25)] group transition-all duration-500 hover:scale-[1.01] hover:border-sky-400/40 dark:hover:border-sky-400/30 hover:shadow-[0_25px_60px_-10px_rgba(56,189,248,0.25)] dark:hover:shadow-[0_0_70px_-10px_rgba(56,189,248,0.35)]">
          {/* Neon backglow layer */}
          <div className="absolute -inset-1 bg-gradient-to-tr from-sky-400 to-indigo-400 rounded-2xl blur-lg opacity-10 dark:opacity-5 group-hover:opacity-20 dark:group-hover:opacity-15 transition-opacity duration-500 -z-10" />
          
          <video
            src="/landing/stickman_animation_1779616259633.webm"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-contain bg-neutral-900 dark:bg-neutral-950 rounded-2xl relative z-10"
          />

          {/* Vignette overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/5 dark:from-neutral-950/40 dark:via-transparent dark:to-neutral-950/20 pointer-events-none rounded-2xl z-20" />
          <div className="absolute inset-0 ring-1 ring-inset ring-black/5 dark:ring-white/10 group-hover:ring-black/10 dark:group-hover:ring-white/20 pointer-events-none rounded-2xl transition-all duration-300 z-20" />
        </div>

        {/* CTA Actions */}
        <div className="flex flex-col items-center gap-4 mt-2">
          {isPending ? (
            <div className="h-12 w-32 flex items-center justify-center">
              <span className="h-5 w-5 border-2 border-sky-500 dark:border-sky-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : session?.user ? (
            <Link
              href="/dashboard"
              className="bg-sky-500 dark:bg-sky-400 hover:bg-sky-600 dark:hover:bg-sky-300 text-white dark:text-neutral-950 font-extrabold tracking-widest text-xs px-8 py-3.5 rounded-full shadow-[0_8px_20px_-6px_rgba(14,165,233,0.3)] dark:shadow-[0_4px_20px_-4px_rgba(56,189,248,0.4)] hover:shadow-[0_8px_25px_-4px_rgba(14,165,233,0.5)] dark:hover:shadow-[0_4px_25px_-2px_rgba(56,189,248,0.6)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-200"
            >
              GO TO DASHBOARD
            </Link>
          ) : (
            <Link
              href="/sign-up"
              className="bg-sky-500 dark:bg-sky-400 hover:bg-sky-600 dark:hover:bg-sky-300 text-white dark:text-neutral-950 font-extrabold tracking-widest text-xs px-8 py-3.5 rounded-full shadow-[0_8px_20px_-6px_rgba(14,165,233,0.3)] dark:shadow-[0_4px_20px_-4px_rgba(56,189,248,0.4)] hover:shadow-[0_8px_25px_-4px_rgba(14,165,233,0.5)] dark:hover:shadow-[0_4px_25px_-2px_rgba(56,189,248,0.6)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-200"
            >
              GET STARTED
            </Link>
          )}

          {/* Minimal scroll indicator decoration */}
          <div className="flex flex-col items-center gap-1 opacity-40 dark:opacity-25 hover:opacity-60 dark:hover:opacity-40 transition-opacity duration-300 select-none mt-2">
            <span className="text-[8px] tracking-[0.4em] font-bold text-neutral-400 dark:text-neutral-400">SCROLL</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3 w-3 animate-bounce text-neutral-400 dark:text-neutral-400"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full px-8 py-6 z-20 flex items-center justify-between relative text-neutral-400 dark:text-neutral-500">
        <span className="text-[9px] tracking-[0.2em] font-bold">STICKMAN STUDIO</span>
        <span className="text-[9px] tracking-[0.2em] font-bold">
          © {new Date().getFullYear()} STICKMAN STUDIO. ALL RIGHTS RESERVED.
        </span>
      </footer>
    </main>
  );
}
