"use client";

import { useEffect, useRef, useState } from "react";
import {
  Terminal,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Wand2,
  Filter,
  Layers,
  Database,
  Info,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EngineeredFeature, PreprocessingStep } from "@/lib/types";

interface AiReasoningTerminalProps {
  tokens: string;
  isStreaming: boolean;
  statusMessage?: string;
  provider?: string;
  notice?: string | null;
  engineeredFeatures?: EngineeredFeature[];
  preprocessingSteps?: PreprocessingStep[];
}

export function AiReasoningTerminal({
  tokens,
  isStreaming,
  statusMessage = "Analyzing metadata...",
  provider = "ollama",
  notice = null,
  engineeredFeatures = [],
  preprocessingSteps = [],
}: AiReasoningTerminalProps) {
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"stream" | "features" | "cleaning">("stream");
  const [cleaningFilter, setCleaningFilter] = useState<string>("all");

  // Auto-scroll to bottom of reasoning stream
  useEffect(() => {
    if (isStreaming && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [tokens, isStreaming]);

  // Counts for cleaning filter pills
  const imputeCount = preprocessingSteps.filter((s) => s.step_type === "imputation").length;
  const scaleCount = preprocessingSteps.filter((s) => s.step_type === "scaling").length;
  const encodeCount = preprocessingSteps.filter((s) => s.step_type === "encoding").length;
  const dimRedCount = preprocessingSteps.filter(
    (s) => s.step_type === "dimensionality_reduction" || s.step_type === "drop"
  ).length;

  const filteredSteps = preprocessingSteps.filter((step) => {
    if (cleaningFilter === "all") return true;
    if (cleaningFilter === "imputation") return step.step_type === "imputation";
    if (cleaningFilter === "scaling") return step.step_type === "scaling";
    if (cleaningFilter === "encoding") return step.step_type === "encoding";
    if (cleaningFilter === "reduction")
      return step.step_type === "dimensionality_reduction" || step.step_type === "drop";
    return true;
  });

  const getStepBadgeColor = (stepType: string) => {
    switch (stepType) {
      case "imputation":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "scaling":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "encoding":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "dimensionality_reduction":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "drop":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  return (
    <Card className="border border-border bg-[#0d1117] text-gray-200 overflow-hidden shadow-lg">
      {/* Terminal Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-[#161b22] border-b border-border/80">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
          </div>
          <Terminal className="w-4 h-4 text-accent" />
          <span className="text-xs font-mono font-medium text-gray-300">
            AutoMLens AI Terminal
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-subtle/40 text-text-muted border border-border/40">
            {provider === "ollama" ? "Ollama: qwen2.5:3b" : provider.toUpperCase()}
          </span>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          {isStreaming ? (
            <div className="flex items-center gap-1.5 text-xs text-accent font-mono">
              <span className="w-2 h-2 rounded-full bg-accent animate-ping inline-block" />
              <span>Streaming Reasoning...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-success font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              <span>Reasoning Complete</span>
            </div>
          )}
        </div>
      </div>

      {/* Notice Banner (if fallback triggered) */}
      {notice && (
        <div className="flex items-center gap-2 px-4 py-2 bg-warning/10 border-b border-warning/20 text-warning text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border/60 bg-[#12161f] px-4 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("stream")}
          className={`py-2 px-3 border-b-2 font-mono transition-colors ${
            activeTab === "stream"
              ? "border-accent text-accent font-medium"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          Live AI Reasoning
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cleaning")}
          className={`py-2 px-3 border-b-2 font-mono transition-colors flex items-center gap-1.5 ${
            activeTab === "cleaning"
              ? "border-accent text-accent font-medium"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          <Database className="w-3 h-3" />
          <span>Data Cleaning Plan ({preprocessingSteps.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("features")}
          className={`py-2 px-3 border-b-2 font-mono transition-colors flex items-center gap-1.5 ${
            activeTab === "features"
              ? "border-accent text-accent font-medium"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          <Wand2 className="w-3 h-3" />
          <span>Features &amp; Reductions ({engineeredFeatures.length})</span>
        </button>
      </div>

      {/* Tab 1: Live Stream */}
      {activeTab === "stream" && (
        <div className="p-4 sm:p-5 font-mono text-xs leading-relaxed max-h-[420px] overflow-y-auto space-y-2 select-text">
          {tokens ? (
            <div className="whitespace-pre-wrap text-gray-200">
              {tokens}
              {isStreaming && (
                <span className="inline-block w-2 h-3.5 bg-accent ml-1 animate-pulse align-middle" />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-400 py-6 justify-center">
              <Cpu className="w-4 h-4 animate-spin text-accent" />
              <span>{statusMessage}</span>
            </div>
          )}
          <div ref={terminalEndRef} />
        </div>
      )}

      {/* Tab 2: Plain-English Data Cleaning Plan Cards */}
      {activeTab === "cleaning" && (
        <div className="p-4 max-h-[420px] overflow-y-auto space-y-3 font-sans text-xs">
          {/* Category Filter Bar */}
          <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-border/40 text-[11px] font-mono">
            <span className="text-gray-400 flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3" /> Filter:
            </span>
            <button
              type="button"
              onClick={() => setCleaningFilter("all")}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                cleaningFilter === "all"
                  ? "bg-accent text-white font-medium"
                  : "bg-surface-subtle/50 text-gray-400 hover:text-gray-200"
              }`}
            >
              All ({preprocessingSteps.length})
            </button>
            <button
              type="button"
              onClick={() => setCleaningFilter("imputation")}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                cleaningFilter === "imputation"
                  ? "bg-purple-600 text-white font-medium"
                  : "bg-surface-subtle/50 text-gray-400 hover:text-gray-200"
              }`}
            >
              Imputation ({imputeCount})
            </button>
            <button
              type="button"
              onClick={() => setCleaningFilter("scaling")}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                cleaningFilter === "scaling"
                  ? "bg-blue-600 text-white font-medium"
                  : "bg-surface-subtle/50 text-gray-400 hover:text-gray-200"
              }`}
            >
              Scaling ({scaleCount})
            </button>
            <button
              type="button"
              onClick={() => setCleaningFilter("encoding")}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                cleaningFilter === "encoding"
                  ? "bg-emerald-600 text-white font-medium"
                  : "bg-surface-subtle/50 text-gray-400 hover:text-gray-200"
              }`}
            >
              Encoding ({encodeCount})
            </button>
            {dimRedCount > 0 && (
              <button
                type="button"
                onClick={() => setCleaningFilter("reduction")}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  cleaningFilter === "reduction"
                    ? "bg-amber-600 text-white font-medium"
                    : "bg-surface-subtle/50 text-gray-400 hover:text-gray-200"
                }`}
              >
                Dimensionality / Drop ({dimRedCount})
              </button>
            )}
          </div>

          {filteredSteps.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No cleaning transformations match the selected filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {filteredSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-border/80 bg-[#161b22] space-y-2 hover:border-accent/40 transition-colors"
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-accent text-xs">
                        {step.column}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${getStepBadgeColor(
                          step.step_type
                        )}`}
                      >
                        {step.step_type.replace("_", " ")}
                      </span>
                    </div>

                    <Badge variant="neutral" className="text-[10px] font-mono text-gray-300">
                      Strategy: {step.strategy}
                    </Badge>
                  </div>

                  {/* Plain English Reason Box */}
                  <div className="p-2.5 rounded bg-[#0d1117] border border-border/50 space-y-1">
                    <div className="text-[10px] font-mono text-accent flex items-center gap-1 font-semibold">
                      <Info className="w-3 h-3 text-accent" /> Why this step is needed:
                    </div>
                    <p className="text-xs text-gray-200 leading-relaxed font-sans whitespace-normal">
                      {step.reason}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Engineered Features & Reductions */}
      {activeTab === "features" && (
        <div className="p-4 max-h-[420px] overflow-y-auto space-y-3 font-sans text-xs">
          {engineeredFeatures.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No custom domain extractions or PCA reduction required for this schema. Standard tabular preprocessing applies.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {engineeredFeatures.map((feat, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg border border-border/80 bg-[#161b22] space-y-2 hover:border-accent/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-accent text-xs flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-accent" />
                      {feat.name}
                    </span>
                    <Badge variant="accent" className="text-[10px] font-mono">
                      {feat.transformation_type.replace("_", " ")}
                    </Badge>
                  </div>

                  <div className="text-[11px] font-mono text-gray-400 bg-black/50 px-2.5 py-1.5 rounded border border-border/40">
                    Formula: {feat.formula_or_desc}
                  </div>

                  <div className="p-2 rounded bg-[#0d1117] border border-border/40">
                    <p className="text-xs text-gray-300 leading-relaxed font-sans">
                      {feat.rationale}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
