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
import { useELI5 } from "@/components/eli5/eli5-context";

export function Header() {
  const pathname = usePathname();
  const { isELI5, toggleELI5 } = useELI5();
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
    <header className="h-[60px] border-b-2 border-border bg-surface px-5 sm:px-6 flex items-center justify-between sticky top-0 z-40 transition-colors select-none shadow-neo-sm">
      {/* Dynamic Navigation Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-sans">
        <Link
          href="/"
          className="text-text-muted hover:text-text-primary transition-colors font-bold flex items-center gap-1"
        >
          <AutoMLensIcon size={20} />
          <span>AutoMLens</span>
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-text-muted" />

        {isProjectPage ? (
          <>
            <Link
              href="/"
              className="text-text-muted hover:text-text-primary transition-colors font-medium"
            >
              Projects
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
            <span className="font-mono text-accent font-bold truncate max-w-[180px] sm:max-w-[260px] bg-sky-100 dark:bg-sky-950/80 px-2.5 py-0.5 rounded-md border-2 border-border shadow-[1px_1px_0px_0px_var(--neo-shadow-color)]">
              {projectId ? `${projectId.slice(0, 8)}...` : "Workspace"}
            </span>
          </>
        ) : (
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-text-primary">
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
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border-2 border-border text-[11px] font-mono font-bold shadow-neo-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer ${
            hasGeminiKey
              ? "bg-cyan-200 dark:bg-cyan-950/80 text-cyan-950 dark:text-cyan-300"
              : "bg-surface-subtle text-text-muted hover:text-text-primary"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
          <span className="hidden lg:inline">Gemini AI:</span>
          <span>{hasGeminiKey ? "Active" : "Set Key"}</span>
        </button>

        {/* Backend & DB Status Pill */}
        <div
          title={isConnected ? "PostgreSQL database connected" : "Database connection unavailable"}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border-2 border-border bg-surface-subtle text-[11px] font-mono font-bold shadow-neo-sm"
        >
          <Database className="w-3 h-3 text-text-muted" />
          <span className="text-text-secondary hidden md:inline">PostgreSQL:</span>
          {loading ? (
            <RefreshCw className="w-3 h-3 text-secondary animate-spin" />
          ) : isConnected ? (
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-danger">
              <span className="w-1.5 h-1.5 rounded-full bg-danger inline-block" />
              Offline
            </span>
          )}
        </div>

        {/* ELI5 (Explain Like I'm 5) Toggle Pill */}
        <button
          type="button"
          onClick={toggleELI5}
          title="ELI5 Mode: Translates technical ML jargon into plain human language"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border-2 border-border text-[11px] font-mono font-bold shadow-neo-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer ${
            isELI5
              ? "bg-yellow-200 dark:bg-yellow-900/60 text-yellow-950 dark:text-yellow-300"
              : "bg-surface-subtle text-text-muted hover:text-text-primary"
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 ${isELI5 ? "text-amber-500" : "text-text-muted"}`} />
          <span className="hidden sm:inline">ELI5:</span>
          <span className="font-bold">{isELI5 ? "ON" : "OFF"}</span>
        </button>

        {/* 3-State Theme Toggle */}
        <ThemeToggle />

        {/* Clerk User & Sign-In Controls */}
        <div className="pl-1.5 border-l-2 border-border flex items-center">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs px-2.5"
              >
                Sign in
              </Button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
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

      <BYOKModal
        isOpen={isByokOpen}
        onClose={() => setIsByokOpen(false)}
        onKeyUpdated={checkGeminiKey}
      />
    </header>
  );
}
