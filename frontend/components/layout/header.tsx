"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, RefreshCw, ChevronRight, Sparkles, Menu } from "lucide-react";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { apiClient } from "@/lib/api-client";
import { SystemHealth } from "@/lib/types";
import { ThemeToggle } from "./theme-toggle";
import { AutoMLensIcon } from "@/components/ui/logo";
import {
  BYOKModal,
  GEMINI_KEY_STORAGE_NAME,
  GEMINI_MODEL_STORAGE_NAME,
  DEFAULT_GEMINI_MODEL,
  GEMINI_MODELS,
} from "@/components/modals/byok-modal";
import { Button } from "@/components/ui/button";
import { useELI5 } from "@/components/eli5/eli5-context";

interface HeaderProps {
  onOpenMobileMenu?: () => void;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
  const pathname = usePathname();
  const { isELI5, toggleELI5 } = useELI5();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [isByokOpen, setIsByokOpen] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [activeModel, setActiveModel] = useState<string>(DEFAULT_GEMINI_MODEL);

  const checkGeminiKey = () => {
    if (typeof window !== "undefined") {
      const key = localStorage.getItem(GEMINI_KEY_STORAGE_NAME);
      setHasGeminiKey(Boolean(key && key.trim()));
      const model = localStorage.getItem(GEMINI_MODEL_STORAGE_NAME) || DEFAULT_GEMINI_MODEL;
      setActiveModel(model);
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
    <header className="h-[60px] border-b-2 border-border bg-surface px-3 sm:px-5 lg:px-6 flex items-center justify-between sticky top-0 z-40 transition-colors select-none shadow-neo-sm">
      {/* Left: Mobile Menu Toggle & Dynamic Navigation Breadcrumbs */}
      <div className="flex items-center min-w-0 mr-2">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-1.5 rounded-md border-2 border-border text-text-primary hover:bg-surface-hover shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all mr-2 cursor-pointer shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <nav aria-label="Breadcrumb" className="flex items-center gap-1 sm:gap-1.5 text-xs font-sans min-w-0">
          <Link
            href="/dashboard"
            className="text-text-muted hover:text-text-primary transition-colors font-bold flex items-center gap-1 shrink-0"
          >
            <AutoMLensIcon size={20} />
            <span className="hidden xs:inline">AutoMLens</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0" />

          {isProjectPage ? (
            <>
              <Link
                href="/dashboard"
                className="text-text-muted hover:text-text-primary transition-colors font-medium hidden sm:inline shrink-0"
              >
                Projects
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-text-muted hidden sm:inline shrink-0" />
              <span className="font-mono text-accent font-bold truncate max-w-[110px] sm:max-w-[200px] md:max-w-[260px] bg-sky-100 dark:bg-sky-950/80 px-2 py-0.5 rounded-md border-2 border-border shadow-[1px_1px_0px_0px_var(--neo-shadow-color)]">
                {projectId ? `${projectId.slice(0, 8)}...` : "Workspace"}
              </span>
            </>
          ) : (
            <span className="font-marker text-xs sm:text-sm font-bold text-text-primary px-0.5 truncate">
              ★ Workspace
            </span>
          )}
        </nav>
      </div>

      {/* Right: System Status Bar & Action Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* BYOK Gemini Key Button */}
        {(() => {
          const modelMeta =
            GEMINI_MODELS.find((m) => m.id === activeModel) || GEMINI_MODELS[0];
          return (
            <button
              type="button"
              onClick={() => setIsByokOpen(true)}
              title={
                hasGeminiKey
                  ? `Active Model: ${modelMeta.name} (${modelMeta.tierLabel}). Click to switch model or update key.`
                  : `Configure Google Gemini API Key and Model (Default: ${DEFAULT_GEMINI_MODEL})`
              }
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md border-2 border-border text-[11px] font-mono font-bold shadow-neo-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer ${
                hasGeminiKey
                  ? "bg-cyan-200 dark:bg-cyan-950/80 text-cyan-950 dark:text-cyan-300"
                  : "bg-surface-subtle text-text-muted hover:text-text-primary"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
              <span className="hidden md:inline">
                {hasGeminiKey ? modelMeta.name : "Gemini AI"}:
              </span>
              <span className={hasGeminiKey ? "font-marker text-xs font-bold text-accent" : ""}>
                {hasGeminiKey ? (modelMeta.tier === "free" ? "Free" : "Pro") : "Key"}
              </span>
            </button>
          );
        })()}

        {/* Animated Database Connection Status Indicator */}
        <div
          title={
            loading
              ? "Checking PostgreSQL database connectivity..."
              : isConnected
              ? "PostgreSQL database connected and healthy"
              : "PostgreSQL database offline or connection unreachable"
          }
          className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-md border-2 border-border text-[11px] font-mono font-bold shadow-neo-sm transition-all duration-300 ${
            isConnected
              ? "bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
              : loading
              ? "bg-surface-subtle text-text-muted"
              : "bg-rose-50/80 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300"
          }`}
        >
          <Database
            className={`w-3.5 h-3.5 shrink-0 ${
              isConnected ? "text-emerald-600 dark:text-emerald-400" : "text-text-muted"
            }`}
          />
          <span className="text-text-secondary hidden lg:inline">Database:</span>
          {loading ? (
            <span className="flex items-center gap-1 text-text-muted">
              <RefreshCw className="w-3 h-3 text-secondary animate-spin" />
              <span className="hidden sm:inline">Checking</span>
            </span>
          ) : isConnected ? (
            <span className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 duration-1000" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="hidden sm:inline">Connected</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 duration-1000" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
              <span className="hidden sm:inline">Offline</span>
            </span>
          )}
        </div>

        {/* ELI5 (Explain Like I'm 5) Toggle Pill */}
        <button
          type="button"
          onClick={toggleELI5}
          title="ELI5 Mode: Translates technical ML jargon into plain human language"
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md border-2 border-border text-[11px] font-mono font-bold shadow-neo-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer ${
            isELI5
              ? "bg-yellow-200 dark:bg-yellow-900/60 text-yellow-950 dark:text-yellow-300"
              : "bg-surface-subtle text-text-muted hover:text-text-primary"
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 shrink-0 ${isELI5 ? "text-amber-500" : "text-text-muted"}`} />
          <span className="hidden sm:inline">ELI5:</span>
          <span className={isELI5 ? "font-marker text-xs font-bold text-amber-800 dark:text-amber-200" : "font-bold"}>
            {isELI5 ? "ON" : "OFF"}
          </span>
        </button>

        {/* 3-State Theme Toggle */}
        <ThemeToggle />

        {/* Clerk User & Sign-In Controls */}
        <div className="pl-1 sm:pl-1.5 border-l-2 border-border flex items-center">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs px-2 sm:px-2.5"
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
