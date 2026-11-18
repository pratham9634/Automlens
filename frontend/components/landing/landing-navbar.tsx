"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { AutoMLensIcon } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function LandingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full px-4 sm:px-8 py-3.5 transition-all duration-300 ${
        isScrolled
          ? "bg-canvas/85 backdrop-blur-md border-b-2 border-border shadow-neo-sm"
          : "bg-transparent border-b border-transparent shadow-none"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group cursor-pointer" title="AutoMLens">
          <div className="transition-transform group-hover:scale-105 shrink-0">
            <AutoMLensIcon size={34} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-display text-base tracking-tight text-text-primary uppercase font-bold">
                AutoM<span className="text-accent">Lens</span>
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border border-border bg-yellow-200 dark:bg-yellow-900/60 text-slate-950 dark:text-yellow-300 shadow-[1px_1px_0px_0px_var(--neo-shadow-color)]">
                v1.0
              </span>
            </div>
            <span className="text-[9px] font-mono uppercase tracking-wider text-text-muted font-bold">
              Human-Assisted AutoML
            </span>
          </div>
        </Link>

        {/* Navigation Anchors */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-mono font-bold text-text-secondary">
          <a href="#sketchbook" className="hover:text-text-primary transition-colors cursor-pointer">
            {"//"} Sketchbook
          </a>
          <a href="#example" className="hover:text-text-primary transition-colors cursor-pointer">
            {"//"} Live Demo
          </a>
          <a href="#features" className="hover:text-text-primary transition-colors cursor-pointer">
            {"//"} Features
          </a>
          <a href="#pipeline" className="hover:text-text-primary transition-colors cursor-pointer">
            {"//"} Pipeline
          </a>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {/* Signed Out CTA */}
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-mono font-bold h-8.5 px-3"
              >
                Sign In
              </Button>
            </SignInButton>

            <Link href="/sign-in">
              <Button
                size="sm"
                className="text-xs font-mono font-bold h-8.5 px-3.5 bg-accent text-white"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </Show>

          {/* Signed In CTA */}
          <Show when="signed-in">
            <Link href="/dashboard">
              <Button
                size="sm"
                className="text-xs font-mono font-bold h-8.5 px-3.5 bg-accent text-white"
              >
                <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" />
                <span>Go to Dashboard</span>
              </Button>
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8 rounded-md border-2 border-border shadow-neo-sm",
                },
              }}
            />
          </Show>
        </div>
      </div>
    </header>
  );
}
