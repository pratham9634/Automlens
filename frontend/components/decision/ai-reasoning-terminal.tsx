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
  Activity,
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
        return "bg-indigo-500/15 text-indigo-300 border-indigo-500/30";
      case "scaling":
        return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
      case "encoding":
        return "bg-sky-500/15 text-sky-300 border-sky-500/30";
      case "dimensionality_reduction":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      case "drop":
        return "bg-rose-500/15 text-rose-300 border-rose-500/30";
      default:
        return "bg-slate-500/15 text-slate-300 border-slate-500/30";
    }
  };

  return (
    <Card className="border border-border/90 bg-[#090D16] text-gray-200 overflow-hidden shadow-lg rounded-card">
      {/* Terminal Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-[#0F172A] border-b border-border/80">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500/80 inline-block" />
          </div>
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono uppercase tracking-wider font-semibold text-gray-200">
            AutoMLens Telemetry Terminal
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
            {provider === "ollama" ? "Ollama: qwen2.5:3b" : provider.toUpperCase()}
          </span>
        </div>

        {/* Status indicator with Cyan Luminescence */}
        <div className="flex items-center gap-2">
          {isStreaming ? (
            <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              </span>
              <span>Streaming Reasoning...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Reasoning Formulated</span>
            </div>
          )}
        </div>
      </div>

      {/* Notice Banner (if fallback triggered) */}
      {notice && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/25 text-amber-400 text-xs font-mono">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
          <span>{notice}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border/60 bg-[#0F172A]/70 px-4 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("stream")}
          className={`py-2 px-3 border-b-2 font-mono uppercase tracking-wider text-[11px] transition-colors ${
            activeTab === "stream"
              ? "border-cyan-400 text-cyan-400 font-semibold"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          Live AI Reasoning
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cleaning")}
          className={`py-2 px-3 border-b-2 font-mono uppercase tracking-wider text-[11px] transition-colors flex items-center gap-1.5 ${
            activeTab === "cleaning"
              ? "border-cyan-400 text-cyan-400 font-semibold"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          <Database className="w-3 h-3 text-cyan-400" />
          <span>Cleaning Strategy ({preprocessingSteps.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("features")}
          className={`py-2 px-3 border-b-2 font-mono uppercase tracking-wider text-[11px] transition-colors flex items-center gap-1.5 ${
            activeTab === "features"
              ? "border-cyan-400 text-cyan-400 font-semibold"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          <Wand2 className="w-3 h-3 text-cyan-400" />
          <span>Features &amp; Reductions ({engineeredFeatures.length})</span>
        </button>
      </div>

      {/* Tab 1: Live Stream */}
      {activeTab === "stream" && (
        <div className="p-4 sm:p-5 font-mono text-xs leading-relaxed max-h-[420px] overflow-y-auto space-y-2 select-text bg-[#090D16]">
          {tokens ? (
            <div className="whitespace-pre-wrap text-gray-200">
              {tokens}
              {isStreaming && (
                <span className="inline-block w-2 h-3.5 bg-cyan-400 ml-1 animate-pulse align-middle shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-400 py-8 justify-center">
              <Cpu className="w-4 h-4 animate-spin text-cyan-400" />
              <span>{statusMessage}</span>
            </div>
          )}
          <div ref={terminalEndRef} />
        </div>
      )}

      {/* Tab 2: Plain-English Data Cleaning Plan Cards */}
      {activeTab === "cleaning" && (
        <div className="p-4 max-h-[420px] overflow-y-auto space-y-3 font-sans text-xs bg-[#090D16]">
          {/* Category Filter Bar */}
          <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-border/40 text-[11px] font-mono">
            <span className="text-gray-400 flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3 text-cyan-400" /> Filter:
            </span>
            <button
              type="button"
              onClick={() => setCleaningFilter("all")}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                cleaningFilter === "all"
                  ? "bg-cyan-500 text-white font-medium shadow-[0_0_8px_rgba(6,182,212,0.4)]"
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
                  ? "bg-indigo-600 text-white font-medium shadow-[0_0_8px_rgba(99,102,241,0.4)]"
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
                  ? "bg-sky-600 text-white font-medium shadow-[0_0_8px_rgba(14,165,233,0.4)]"
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
                  ? "bg-emerald-600 text-white font-medium shadow-[0_0_8px_rgba(16,185,129,0.4)]"
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
                    ? "bg-amber-600 text-white font-medium shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                    : "bg-surface-subtle/50 text-gray-400 hover:text-gray-200"
                }`}
              >
                Dimensionality / Drop ({dimRedCount})
              </button>
            )}
          </div>

          {filteredSteps.length === 0 ? (
            <div className="text-center py-8 text-gray-400 font-mono">
              No cleaning transformations match the selected filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {filteredSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-card border border-border/80 bg-[#0F172A] space-y-2 hover:border-cyan-500/40 transition-colors shadow-sm"
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-cyan-400 text-xs">
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
                  <div className="p-2.5 rounded-button bg-[#090D16] border border-border/50 space-y-1">
                    <div className="text-[10px] font-mono text-cyan-400 flex items-center gap-1 font-semibold">
                      <Info className="w-3 h-3 text-cyan-400" /> Why this step is needed:
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
        <div className="p-4 max-h-[420px] overflow-y-auto space-y-3 font-sans text-xs bg-[#090D16]">
          {engineeredFeatures.length === 0 ? (
            <div className="text-center py-8 text-gray-400 font-mono">
              No custom domain extractions or PCA reduction required for this schema. Standard tabular preprocessing applies.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {engineeredFeatures.map((feat, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-card border border-border/80 bg-[#0F172A] space-y-2 hover:border-cyan-500/40 transition-colors shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-cyan-400 text-xs flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      {feat.name}
                    </span>
                    <Badge variant="streaming" className="text-[10px]">
                      {feat.transformation_type.replace("_", " ")}
                    </Badge>
                  </div>

                  <div className="text-[11px] font-mono text-gray-300 bg-black/60 px-2.5 py-1.5 rounded-button border border-border/50">
                    Formula: {feat.formula_or_desc}
                  </div>

                  <div className="p-2 rounded-button bg-[#090D16] border border-border/40">
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
