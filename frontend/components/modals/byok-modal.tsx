"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  Key,
  CheckCircle2,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Zap,
  Check,
  Cpu,
  Sliders,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const GEMINI_KEY_STORAGE_NAME = "automlens_gemini_key";
export const GEMINI_MODEL_STORAGE_NAME = "automlens_gemini_model";
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

export interface GeminiModelOption {
  id: string;
  name: string;
  tier: "free" | "paid";
  tierLabel: string;
  badge: string;
  description: string;
  contextWindow: string;
  rateLimit: string;
  recommended?: boolean;
}

export const GEMINI_MODELS: GeminiModelOption[] = [
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash-Lite",
    tier: "free",
    tierLabel: "Free Tier",
    badge: "Free • Recommended",
    description: "Lightweight, instant token streaming with high availability and zero 503 capacity spikes.",
    contextWindow: "1M tokens",
    rateLimit: "30 RPM Free",
    recommended: true,
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash-Lite",
    tier: "free",
    tierLabel: "Free Tier",
    badge: "Free • Ultra-Fast",
    description: "Economical, fast inference with high server availability for tabular strategy streaming.",
    contextWindow: "1M tokens",
    rateLimit: "30 RPM Free",
  },
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    tier: "free",
    tierLabel: "Free Tier",
    badge: "Free • Advanced Reasoning",
    description: "Advanced reasoning and coding. May experience temporary 503 high-demand spikes under peak load.",
    contextWindow: "1M tokens",
    rateLimit: "15 RPM Free",
  },
  {
    id: "gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    tier: "free",
    tierLabel: "Free Tier",
    badge: "Free • General-Purpose",
    description: "Versatile general-purpose AI model balancing deep reasoning and low latency.",
    contextWindow: "1M tokens",
    rateLimit: "15 RPM Free",
  },
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    tier: "free",
    tierLabel: "Free Tier",
    badge: "Free • Fast",
    description: "Optimized for fast responses and fluid token streaming.",
    contextWindow: "1M tokens",
    rateLimit: "15 RPM Free",
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    tier: "free",
    tierLabel: "Free Tier",
    badge: "Free • Workhorse",
    description: "High-throughput general-purpose tasks and tabular data profiling.",
    contextWindow: "1M tokens",
    rateLimit: "15 RPM Free",
  },
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash-Lite",
    tier: "free",
    tierLabel: "Free Tier",
    badge: "Free • High-Volume",
    description: "Lightweight, high-volume requests with rapid inference speeds.",
    contextWindow: "1M tokens",
    rateLimit: "30 RPM Free",
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash-Lite",
    tier: "free",
    tierLabel: "Free Tier",
    badge: "Free • Economical",
    description: "Fast and economical inference for lightweight tabular summarization.",
    contextWindow: "1M tokens",
    rateLimit: "30 RPM Free",
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    tier: "free",
    tierLabel: "Free Tier",
    badge: "Free • Adaptive",
    description: "General-purpose tasks with adaptive reasoning ('thinking budget') and high reliability.",
    contextWindow: "1M tokens",
    rateLimit: "15 RPM Free",
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash-Lite",
    tier: "free",
    tierLabel: "Free Tier",
    badge: "Free • Lightweight",
    description: "Lightweight tasks with minimal latency footprint.",
    contextWindow: "1M tokens",
    rateLimit: "30 RPM Free",
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    tier: "free",
    tierLabel: "Free Tier",
    badge: "Free • Proven Stable",
    description: "Standard production-grade workhorse across Google AI Studio.",
    contextWindow: "1M tokens",
    rateLimit: "15 RPM Free",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    tier: "paid",
    tierLabel: "Paid / Frontier",
    badge: "Paid • Complex Reasoning",
    description: "Complex reasoning, coding, and multi-hop mathematical synthesis with 2M token context.",
    contextWindow: "2M tokens",
    rateLimit: "Pay-as-you-go",
  },
];

interface BYOKModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyUpdated?: () => void;
}

export function BYOKModal({ isOpen, onClose, onKeyUpdated }: BYOKModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_GEMINI_MODEL);
  const [customModelInput, setCustomModelInput] = useState<string>("");
  const [filterTier, setFilterTier] = useState<"all" | "free" | "paid">("all");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const existingKey = localStorage.getItem(GEMINI_KEY_STORAGE_NAME);
      const existingModel = localStorage.getItem(GEMINI_MODEL_STORAGE_NAME);

      if (existingKey) {
        setSavedKey(existingKey);
        setApiKey(existingKey);
      } else {
        setSavedKey(null);
        setApiKey("");
      }

      if (existingModel && existingModel.trim()) {
        const trimmed = existingModel.trim();
        setSelectedModel(trimmed);
        if (!GEMINI_MODELS.some((m) => m.id === trimmed)) {
          setCustomModelInput(trimmed);
        } else {
          setCustomModelInput("");
        }
      } else {
        setSelectedModel(DEFAULT_GEMINI_MODEL);
        setCustomModelInput("");
      }
    }
  }, [isOpen]);

  const handleCustomModelChange = (val: string) => {
    setCustomModelInput(val);
    if (val.trim()) {
      setSelectedModel(val.trim());
    } else {
      setSelectedModel(DEFAULT_GEMINI_MODEL);
    }
  };

  const handleSelectPresetModel = (modelId: string) => {
    setSelectedModel(modelId);
    setCustomModelInput("");
  };

  const handleSave = () => {
    if (typeof window !== "undefined") {
      if (apiKey.trim()) {
        localStorage.setItem(GEMINI_KEY_STORAGE_NAME, apiKey.trim());
        setSavedKey(apiKey.trim());
      }
      const modelToSave = (customModelInput.trim() || selectedModel).trim();
      localStorage.setItem(GEMINI_MODEL_STORAGE_NAME, modelToSave);
      setIsSaved(true);
      window.dispatchEvent(new Event("automlens_byok_updated"));
      if (onKeyUpdated) onKeyUpdated();
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 700);
    }
  };

  const handleClear = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(GEMINI_KEY_STORAGE_NAME);
      localStorage.setItem(GEMINI_MODEL_STORAGE_NAME, DEFAULT_GEMINI_MODEL);
      setApiKey("");
      setSavedKey(null);
      setSelectedModel(DEFAULT_GEMINI_MODEL);
      setCustomModelInput("");
      window.dispatchEvent(new Event("automlens_byok_updated"));
      if (onKeyUpdated) onKeyUpdated();
    }
  };

  const visibleModels = GEMINI_MODELS.filter((m) => {
    if (filterTier === "all") return true;
    return m.tier === filterTier;
  });

  const isCustomModel = !GEMINI_MODELS.some((m) => m.id === selectedModel);
  const activeModelMeta: GeminiModelOption = isCustomModel
    ? {
        id: selectedModel,
        name: selectedModel,
        tier: "free",
        tierLabel: "Custom Manual",
        badge: "Custom Override",
        description: `Manual model identifier configured: "${selectedModel}"`,
        contextWindow: "Dynamic",
        rateLimit: "API Tier Limit",
      }
    : (GEMINI_MODELS.find((m) => m.id === selectedModel) || GEMINI_MODELS[0]);

  const freeCount = GEMINI_MODELS.filter((m) => m.tier === "free").length;
  const paidCount = GEMINI_MODELS.filter((m) => m.tier === "paid").length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col bg-surface border-2 border-border p-5 sm:p-6 shadow-neo rounded-xl overflow-hidden">
        <DialogHeader className="space-y-1.5 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border-2 border-border flex items-center justify-center text-cyan-500 shadow-[1px_1px_0px_0px_var(--neo-shadow-color)] shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <DialogTitle className="text-sm sm:text-base font-semibold text-text-primary">
                Google Gemini API &amp; Model Selection
              </DialogTitle>
            </div>
            <Badge
              variant={activeModelMeta.tier === "free" ? "success" : "warning"}
              size="sm"
              className="self-start sm:self-auto"
            >
              {activeModelMeta.tierLabel}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-text-muted leading-relaxed">
            AutoMLens utilizes Google Gemini to deliver real-time data quality analysis, pipeline
            formulations, and model audit explanations. The free model is enabled by default.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
          {/* API Key Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-secondary flex items-center justify-between">
              <span>Google Gemini API Key</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-mono font-semibold"
              >
                Get free key at Google AI Studio <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <div className="relative">
              <Input
                type="password"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono text-xs pr-8 bg-surface-subtle border-2 border-border focus:border-cyan-500"
              />
              <Key className="w-3.5 h-3.5 text-text-subtle absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[11px] text-text-muted">
              Keys starting with <code className="font-mono text-[10px] text-cyan-600 dark:text-cyan-400 font-bold">AIzaSy...</code> are validated by Google AI Studio.
            </p>
          </div>

          {/* Manual Model Override Option */}
          <div className="p-3 bg-surface-subtle rounded-lg border-2 border-border space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-500" />
                <span>Custom Model Manual Override</span>
              </label>
              {isCustomModel && (
                <Badge variant="success" size="sm" className="font-mono text-[10px]">
                  Manual Active
                </Badge>
              )}
            </div>
            <div className="relative">
              <Input
                type="text"
                placeholder="Type model ID (e.g. gemini-3.8-flash, gemini-3.7-flash, gemini-3.5-flash-lite)..."
                value={customModelInput}
                onChange={(e) => handleCustomModelChange(e.target.value)}
                className="font-mono text-xs bg-surface border-2 border-border focus:border-cyan-500 pr-8"
              />
              {customModelInput && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomModelInput("");
                    setSelectedModel(DEFAULT_GEMINI_MODEL);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-subtle hover:text-text-primary font-bold px-1"
                  title="Reset to default model"
                >
                  ✕
                </button>
              )}
            </div>
            <p className="text-[11px] text-text-muted">
              You can manually enter any model ID available in your Google AI Studio account.
            </p>
          </div>

          {/* Model Selection Header & Filter Tabs */}
          <div className="space-y-2 pt-2 border-t-2 border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="text-xs font-bold text-text-primary">
                  Or Choose from Verified Models
                </span>
                <span className="font-marker text-[11px] text-amber-500 -rotate-1">
                  ★ Default: {DEFAULT_GEMINI_MODEL}
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-surface-subtle p-0.5 rounded-md border border-border text-[10px] font-mono self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setFilterTier("all")}
                  className={`px-2 py-0.5 rounded ${
                    filterTier === "all"
                      ? "bg-accent text-white font-bold"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  All ({GEMINI_MODELS.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTier("free")}
                  className={`px-2 py-0.5 rounded ${
                    filterTier === "free"
                      ? "bg-emerald-600 text-white font-bold"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  Free ({freeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTier("paid")}
                  className={`px-2 py-0.5 rounded ${
                    filterTier === "paid"
                      ? "bg-amber-600 text-white font-bold"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  Paid / Pro ({paidCount})
                </button>
              </div>
            </div>

            {/* Model Cards Grid */}
            <div className="space-y-2">
              {visibleModels.map((model) => {
                const isSelected = selectedModel === model.id && !customModelInput.trim();
                const isFree = model.tier === "free";

                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => handleSelectPresetModel(model.id)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all flex flex-col gap-1.5 relative select-none cursor-pointer ${
                      isSelected
                        ? "border-accent bg-accent/5 dark:bg-accent/10 shadow-[2px_2px_0px_0px_var(--neo-shadow-color)]"
                        : "border-border bg-surface hover:bg-surface-subtle"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? "border-accent bg-accent text-white"
                              : "border-border bg-surface"
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span className="text-xs font-bold font-mono text-text-primary">
                          {model.name}
                        </span>
                        {model.recommended && (
                          <span className="font-marker text-[10px] text-amber-500 font-bold">
                            (Default)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                            isFree
                              ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                              : "bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                          }`}
                        >
                          {model.badge}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-text-muted pl-6">
                      {model.description}
                    </p>

                    <div className="flex items-center gap-3 pl-6 text-[10px] font-mono text-text-subtle">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-accent" />
                        {model.rateLimit}
                      </span>
                      <span>•</span>
                      <span>{model.contextWindow}</span>
                      <span>•</span>
                      <span className="capitalize">{model.tierLabel}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Privacy Guarantee Note */}
          <div className="p-3 bg-surface-subtle rounded-lg border-2 border-border text-[11px] space-y-1 text-text-muted shadow-neo-sm">
            <div className="flex items-center gap-1.5 text-text-primary font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
              <span>Zero-Storage Client Privacy</span>
            </div>
            <p>
              Your key and chosen model are stored strictly in your browser&apos;s local storage
              and sent via secure request headers (<code className="font-mono text-[10px]">X-Gemini-API-Key</code> and <code className="font-mono text-[10px]">X-Gemini-Model</code>).
              Keys are never saved to the database.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t-2 border-border flex-shrink-0 mt-3 gap-2.5">
          {savedKey ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleClear}
              className="text-xs text-danger hover:text-danger hover:bg-danger/10 gap-1.5 h-8 px-2.5 font-bold w-full sm:w-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove Key
            </Button>
          ) : (
            <div className="hidden sm:block" />
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="text-xs h-8 px-3 flex-1 sm:flex-initial"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
              className="text-xs h-8 px-3 gap-1.5 flex-1 sm:flex-initial"
            >
              {isSaved ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Save &amp; Activate</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
