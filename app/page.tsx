// app/page.tsx
import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, ShieldCheck, Layers, Activity } from "lucide-react"; // Modern vector icons

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-base-200 text-neutral flex flex-col justify-between overflow-hidden font-sans antialiased">
      
      {/* TOP HEADER / NAVIGATION */}
      <header className="navbar bg-base-100 border-b border-base-300 max-w-7xl w-full mx-auto px-6 h-20 flex items-center justify-between z-10 rounded-b-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center font-black text-primary-content text-lg shadow-sm">
            N
          </div>
          <span className="font-bold text-xl tracking-tight text-neutral">Nexus</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Link 
            href="/signin" 
            className="btn btn-ghost btn-sm rounded-xl font-bold text-neutral/70 hover:text-neutral"
          >
            Sign In
          </Link>
          <Link 
            href="/signup" 
            className="btn btn-primary btn-sm rounded-xl font-bold text-primary-content shadow-xs"
          >
            Create Workspace
          </Link>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="hero max-w-5xl w-full mx-auto px-6 text-center py-16 z-10 my-auto flex flex-col items-center gap-6">
        
        {/* Release Pill Badge */}
        <div className="badge badge-primary bg-primary/10 text-primary border-primary/20 font-bold gap-2 px-4 py-3 text-xs rounded-full">
          <Sparkles className="h-3.5 w-3.5 animate-pulse stroke-[2.5]" />
          The Next-Generation Project Engine
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-neutral max-w-3xl mx-auto leading-[1.15]">
          Centralize your projects. <br />
          <span className="text-primary">Eliminate the chaos.</span>
        </h1>

        {/* Description Pitch */}
        <p className="text-sm md:text-base text-neutral/60 max-w-2xl mx-auto font-semibold leading-relaxed">
          Nexus is a professional, multi-tenant project management infrastructure built for fast-moving teams. Streamline workflows, track performance metrics, and orchestrate assignments in one unified workspace.
        </p>

        {/* Call To Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 w-full sm:w-auto">
          <Link 
            href="/signup" 
            className="btn btn-primary btn-md rounded-xl font-bold px-8 text-primary-content shadow-md text-sm group w-full sm:w-auto"
          >
            Get Started Free 
            <ArrowRight className="h-4 w-4 stroke-[2.5] group-hover:translate-x-1 transition-transform" />
          </Link>
          
          <Link 
            href="/signin" 
            className="btn btn-ghost bg-base-100 hover:bg-base-300 border border-base-300 rounded-xl font-bold px-8 text-neutral shadow-xs text-sm w-full sm:w-auto"
          >
            Access Existing Workspace
          </Link>
        </div>

        {/* Feature Highlights Grid Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-12 border-t border-base-300 max-w-4xl w-full mx-auto mt-6">
          
          {/* Card 1 */}
          <div className="card bg-base-100 border border-base-300 p-5 rounded-2xl shadow-xs text-left gap-2">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="h-4 w-4 stroke-[2.5]" />
              <h3 className="font-black text-neutral text-sm uppercase tracking-wide">Enterprise Guard</h3>
            </div>
            <p className="text-xs text-neutral/50 font-medium leading-relaxed">
              Stateless JWT session authentication wrapping HTTP-only cookie parameters.
            </p>
          </div>

          {/* Card 2 */}
          <div className="card bg-base-100 border border-base-300 p-5 rounded-2xl shadow-xs text-left gap-2">
            <div className="flex items-center gap-2 text-primary">
              <Layers className="h-4 w-4 stroke-[2.5]" />
              <h3 className="font-black text-neutral text-sm uppercase tracking-wide">Multi-Tenant Spaces</h3>
            </div>
            <p className="text-xs text-neutral/50 font-medium leading-relaxed">
              Isolate workflows into dedicated organization environments for individual teams.
            </p>
          </div>

          {/* Card 3 */}
          <div className="card bg-base-100 border border-base-300 p-5 rounded-2xl shadow-xs text-left gap-2">
            <div className="flex items-center gap-2 text-primary">
              <Activity className="h-4 w-4 stroke-[2.5]" />
              <h3 className="font-black text-neutral text-sm uppercase tracking-wide">Metrics Analytics</h3>
            </div>
            <p className="text-xs text-neutral/50 font-medium leading-relaxed">
              Visualize sprint cycles, real-time activity metrics, and team resource allocation.
            </p>
          </div>

        </div>

      </main>

      {/* COMPACT FOOTER */}
      <footer className="footer footer-center h-16 border-t border-base-300 text-[11px] font-bold text-neutral/40 z-10 bg-base-100 px-6">
        <div>
          &copy; {new Date().getFullYear()} Nexus Platform Inc. Built with Next.js, Prisma, and PostgreSQL.
        </div>
      </footer>

    </div>
  );
}