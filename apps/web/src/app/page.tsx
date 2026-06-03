"use client";

import Link from "next/link";
import { authClient } from "@stickman/auth/client";

export default function HomePage() {
  const { data: session, isPending } = authClient.useSession();

  return (
    <main className="relative h-screen w-screen overflow-hidden flex flex-col bg-black text-white font-sans select-none">
      {/* Background Full-Screen Video */}
      <video
        src="/landing/stickman_animation_1779616259633.webm"
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-80"
      />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/40 z-10 pointer-events-none" />

      {/* Global Glow effect */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[120px] z-10 pointer-events-none" />

      {/* Top Header Navbar */}
      <header className="w-full px-8 md:px-16 py-6 z-20 flex items-center justify-between relative bg-gradient-to-b from-black/60 to-transparent">
        {/* Left Side: Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl font-black tracking-widest text-white transition-all duration-300">
            STICKMAN STUDIO
          </span>
        </Link>

        {/* Right Side: Auth buttons */}
        <div className="flex items-center gap-6">
          {isPending ? (
            <div className="h-8 w-8 flex items-center justify-center">
              <span className="h-4 w-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : session?.user ? (
            <Link
              href="/dashboard"
              className="bg-white text-black hover:bg-neutral-200 px-6 py-2.5 rounded-full text-xs font-black tracking-wider transition-all duration-200"
            >
              DASHBOARD
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="text-sm font-semibold hover:text-white transition-colors text-white/80"
              >
                Log in
              </Link>
              <Link
                href="/sign-up"
                className="bg-white text-black hover:bg-neutral-200 px-6 py-2.5 rounded-full text-xs font-black tracking-wider transition-all duration-200"
              >
                Start for free
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center items-start px-8 md:px-24 max-w-4xl w-full z-20 pb-20 relative select-none">
        <div className="flex flex-col gap-6 max-w-2xl">
          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-extralight tracking-tight text-white leading-[1.1] text-left">
            Be the next <br />
            <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-100 to-sky-300">
              animator.
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-base md:text-lg text-white/70 font-medium leading-relaxed max-w-lg">
            Animate with AI. The web's best keyframe and skeletal animation platform.
          </p>

          {/* CTA Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 mt-4">
            {isPending ? (
              <div className="h-12 w-32 flex items-center justify-center">
                <span className="h-5 w-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : session?.user ? (
              <>
                <Link
                  href="/dashboard"
                  className="bg-white text-black hover:bg-neutral-200 px-8 py-3.5 rounded-full text-sm font-black tracking-wider transition-all duration-200 hover:scale-105 shadow-xl"
                >
                  Go to Dashboard
                </Link>
                <Link
                  href="/dashboard"
                  className="border border-white/30 hover:border-white hover:bg-white/10 text-white px-8 py-3.5 rounded-full text-sm font-black tracking-wider transition-all duration-200 hover:scale-105 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                  New Project
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/sign-up"
                  className="bg-white text-black hover:bg-neutral-200 px-8 py-3.5 rounded-full text-sm font-black tracking-wider transition-all duration-200 hover:scale-105 shadow-xl"
                >
                  Start for free
                </Link>
                <Link
                  href="#"
                  className="border border-white/30 hover:border-white hover:bg-white/10 text-white px-8 py-3.5 rounded-full text-sm font-black tracking-wider transition-all duration-200 hover:scale-105 flex items-center gap-2.5"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Why we build Stickman Studio
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
