"use client";

import Link from "next/link";
import { authClient } from "@stickman/auth/client";
import AnimationShowcase from "@/components/landing/AnimationShowcase";

export default function HomePage() {
  const { data: session, isPending } = authClient.useSession();

  return (
    <main className="relative h-screen max-h-screen w-full flex flex-col justify-between bg-neutral-950 text-white font-sans select-none overflow-hidden">
      {/* Sleek Minimal Background Grid & Gradient */}
      <div className="absolute inset-0 bg-[#060608] z-0" />
      
      {/* Radial Glow effects */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]" 
        style={{
          backgroundImage: `radial-gradient(circle, #ffffff 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(56,189,248,0.12),rgba(255,255,255,0))] z-0 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-sky-500/10 rounded-full blur-[100px] z-0 pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] z-0 pointer-events-none animate-pulse duration-[12000ms]" />

      {/* Top Header Navbar */}
      <header className="w-full px-6 md:px-16 py-4 z-20 flex items-center justify-between relative bg-gradient-to-b from-black/20 to-transparent">
        {/* Left Side: Logo with favicon 3x size (w-12 h-12) */}
        <Link href="/" className="flex items-center gap-3.5 group">
          <img 
            src="/logo.svg" 
            alt="Stickman Studio Logo" 
            className="w-12 h-12 rounded-xl object-contain transition-all duration-300 group-hover:scale-105 group-hover:rotate-3 shadow-md shadow-sky-500/10"
          />
          <span className="text-lg md:text-xl font-black tracking-widest text-white transition-all duration-300 group-hover:text-sky-300">
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

      {/* Main Content Area - Responsive 2-Column Hero */}
      <div className="flex-1 min-h-0 w-full max-w-7xl mx-auto px-6 md:px-16 py-4 md:py-6 flex flex-col lg:flex-row items-center justify-between gap-8 z-20 relative select-none">
        
        {/* Left Column: Title, Subheading & CTAs */}
        <div className="flex flex-col gap-6 max-w-xl lg:max-w-[48%] w-full animate-fade-in">
          {/* Main Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7.5xl font-extralight tracking-tight text-white leading-[1.12] text-left">
            Be the next <br />
            <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-100 to-sky-300">
              animator.
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-sm md:text-lg text-white/70 font-medium leading-relaxed max-w-lg">
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
                  className="bg-white text-black hover:bg-neutral-200 px-8 py-3.5 rounded-full text-sm font-black tracking-wider transition-all duration-200 hover:scale-105 shadow-xl shadow-sky-500/10"
                >
                  Start for free
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Live Interactive Keyframe Animation Canvas Mockup */}
        <div className="w-full lg:w-[48%] flex items-center justify-center animate-fade-in animation-delay-200 min-h-0">
          <AnimationShowcase />
        </div>
      </div>

      {/* Premium minimal Footer */}
      <footer className="w-full px-6 md:px-16 py-4 z-20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500 border-t border-white/5 bg-black/10 backdrop-blur-md">
        <span>© {new Date().getFullYear()} Stickman Studio. Built for creators.</span>
        <div className="flex items-center gap-6">
          <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
        </div>
      </footer>
    </main>
  );
}
