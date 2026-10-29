"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal, Cpu, Sparkles, CheckCircle2, AlertCircle, Wand2, ArrowRight } from "lucide-react";
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

  // Auto-scroll to bottom of reasoning stream
  useEffect(() => {
    if (isStreaming && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [tokens, isStreaming]);

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
          onClick={() => setActiveTab("features")}
          className={`py-2 px-3 border-b-2 font-mono transition-colors flex items-center gap-1.5 ${
            activeTab === "features"
              ? "border-accent text-accent font-medium"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          <Wand2 className="w-3 h-3" />
          <span>Extracted Features ({engineeredFeatures.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cleaning")}
          className={`py-2 px-3 border-b-2 font-mono transition-colors ${
            activeTab === "cleaning"
              ? "border-accent text-accent font-medium"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          Data Cleaning Plan ({preprocessingSteps.length})
        </button>
      </div>

      {/* Tab 1: Live Stream */}
      {activeTab === "stream" && (
        <div className="p-4 sm:p-5 font-mono text-xs leading-relaxed max-h-[380px] overflow-y-auto space-y-2 select-text">
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

      {/* Tab 2: Engineered Features */}
      {activeTab === "features" && (
        <div className="p-4 max-h-[380px] overflow-y-auto space-y-3 font-sans text-xs">
          {engineeredFeatures.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              No custom domain extractions required for this schema. Standard tabular preprocessing applies.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {engineeredFeatures.map((feat, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded border border-border/80 bg-[#161b22] space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-accent text-xs">
                      {feat.name}
                    </span>
                    <Badge variant="accent" className="text-[10px] font-mono">
                      {feat.transformation_type}
                    </Badge>
                  </div>
                  <div className="text-[11px] font-mono text-gray-400 bg-black/40 px-2 py-1 rounded">
                    Formula: {feat.formula_or_desc}
                  </div>
                  <p className="text-[11px] text-gray-300 leading-relaxed">
                    {feat.rationale}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Cleaning Plan */}
      {activeTab === "cleaning" && (
        <div className="p-4 max-h-[380px] overflow-y-auto space-y-2 font-mono text-xs">
          {preprocessingSteps.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              No preprocessing steps formulated yet.
            </div>
          ) : (
            <div className="space-y-1.5">
              {preprocessingSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded bg-[#161b22] border border-border/40 text-[11px]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-accent font-semibold">{step.column}</span>
                    <ArrowRight className="w-3 h-3 text-gray-500" />
                    <span className="text-gray-300">{step.step_type} ({step.strategy})</span>
                  </div>
                  <span className="text-gray-400 text-[10px] truncate max-w-[280px]">
                    {step.reason}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

