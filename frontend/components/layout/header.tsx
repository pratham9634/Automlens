"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, RefreshCw, ChevronRight, Activity, Terminal, Sparkles, Key } from "lucide-react";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { apiClient } from "@/lib/api-client";
import { SystemHealth } from "@/lib/types";
import { ThemeToggle } from "./theme-toggle";
import { AutoMLensIcon } from "@/components/ui/logo";
import { BYOKModal, GEMINI_KEY_STORAGE_NAME } from "@/components/modals/byok-modal";
import { Button } from "@/components/ui/button";

export function Header() {
  const pathname = usePathname();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [isByokOpen, setIsByokOpen] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);

  const checkGeminiKey = () => {
    if (typeof window !== "undefined") {
      const key = localStorage.getItem(GEMINI_KEY_STORAGE_NAME);
      setHasGeminiKey(Boolean(key && key.trim()));
    }
  };

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getHealth();
      setHealth(data);
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    checkGeminiKey();
    window.addEventListener("automlens_byok_updated", checkGeminiKey);
    const interval = setInterval(fetchHealth, 15000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("automlens_byok_updated", checkGeminiKey);
    };
  }, []);

  const isConnected = health?.status === "ok" && health?.database.status === "connected";
  const isProjectPage = pathname.startsWith("/projects/") && pathname !== "/projects";
  const projectId = isProjectPage ? pathname.split("/")[2] : null;

  return (
    <header className="h-[60px] border-b border-border/80 bg-surface/90 backdrop-blur-md px-5 sm:px-6 flex items-center justify-between sticky top-0 z-40 transition-colors select-none">
      {/* Dynamic Navigation Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-sans">
        <Link
          href="/"
          className="text-text-muted hover:text-text-primary transition-colors font-medium flex items-center gap-1"
        >
          <AutoMLensIcon size={18} />
          <span>AutoMLens</span>
        </Link>
        <ChevronRight className="w-3 h-3 text-text-subtle" />

        {isProjectPage ? (
          <>
            <Link
              href="/"
              className="text-text-muted hover:text-text-primary transition-colors font-medium"
            >
              Projects
            </Link>
            <ChevronRight className="w-3 h-3 text-text-subtle" />
            <span className="font-mono text-cyan-400 font-semibold truncate max-w-[180px] sm:max-w-[260px] bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              {projectId ? `${projectId.slice(0, 8)}...` : "Workspace"}
            </span>
          </>
        ) : (
          <span className="font-mono text-xs uppercase tracking-wider text-text-primary">
            Workspace Canvas
          </span>
        )}
      </nav>

      {/* System Status Bar & Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* BYOK Gemini Key Button */}
        <button
          type="button"
          onClick={() => setIsByokOpen(true)}
          title="Configure your free Google Gemini API Key"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-pill border text-[11px] font-mono transition-all ${
            hasGeminiKey
              ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
              : "bg-surface-subtle border-border/80 text-text-muted hover:text-text-primary hover:border-text-secondary"
          }`}
        >
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span className="hidden lg:inline">Gemini AI:</span>
          <span>{hasGeminiKey ? "Active" : "Set Key"}</span>
        </button>

        {/* Backend & DB Status Pill */}
        <div
          title={isConnected ? "PostgreSQL database connected" : "Database connection unavailable"}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill border border-border/80 bg-surface-subtle text-[11px] font-mono shadow-sm"
        >
          <Database className="w-3 h-3 text-text-muted" />
          <span className="text-text-secondary hidden md:inline">PostgreSQL:</span>
          {loading ? (
            <RefreshCw className="w-3 h-3 text-secondary animate-spin" />
          ) : isConnected ? (
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-danger">
              <span className="w-1.5 h-1.5 rounded-full bg-danger inline-block shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
              Offline
            </span>
          )}
        </div>

        {/* 3-State Theme Toggle */}
        <ThemeToggle />

        {/* Clerk User & Sign-In Controls */}
        <div className="pl-1 border-l border-border/80 flex items-center">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5 border-border hover:bg-surface-subtle font-medium text-text-primary"
              >
                Sign in
              </Button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-7 h-7 ring-1 ring-cyan-500/30",
                },
              }}
            />
          </Show>
        </div>
      </div>

      <BYOKModal
        isOpen={isByokOpen}
        onClose={() => setIsByokOpen(false)}
        onKeyUpdated={checkGeminiKey}
      />
    </header>
  );
}
