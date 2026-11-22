"use client";

import { useState, useEffect } from "react";
import {
  ColumnInfo,
  DatasetProfileResponse,
  GlobalExplanationResponse,
  ModelRun,
} from "@/lib/types";
import { apiClient } from "@/lib/api-client";
import { GlobalImportanceChart } from "./global-importance-chart";
import { LocalAttributionCard } from "./local-attribution-card";
import { WhatIfSimulator } from "./what-if-simulator";
import {
  BrainCircuit,
  Loader2,
  BarChart3,
  Search,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  HelpCircle,
  Lightbulb,
  Scale,
  Compass,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertRow } from "@/components/ui/alert-row";
import { EmptyState } from "@/components/ui/empty-state";

interface ExplanationViewProps {
  projectId: string;
  onNavigateToTraining?: () => void;
}

export function ExplanationView({
  projectId,
  onNavigateToTraining,
}: ExplanationViewProps) {
  const [initLoading, setInitLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [targetColumn, setTargetColumn] = useState<string>("");
  const [models, setModels] = useState<ModelRun[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("");

  const [previewRows, setPreviewRows] = useState<Record<string, any>[]>([]);
  const [profile, setProfile] = useState<DatasetProfileResponse | null>(null);

  const [activeTab, setActiveTab] = useState<"global" | "local" | "whatif">("global");
  const [globalData, setGlobalData] = useState<GlobalExplanationResponse | null>(null);
  const [explLoading, setExplLoading] = useState<boolean>(false);
  const [explError, setExplError] = useState<string | null>(null);

  // Plain-English Beginner Guide dropdown state
  const [showBeginnerGuide, setShowBeginnerGuide] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    setInitLoading(true);

    async function loadWorkspace() {
      try {
        const [dsData, targetData, runsData, profileData] = await Promise.all([
          apiClient.getDataset(projectId),
          apiClient.getConfirmedTarget(projectId),
          apiClient.listTrainingRuns(projectId),
          apiClient.getProfile(projectId).catch(() => null),
        ]);

        if (!mounted) return;
        setColumns(dsData.dataset.columns);
        setTargetColumn(targetData.target_column);
        setPreviewRows(dsData.preview_rows || []);
        setProfile(profileData);

        const completedRuns = runsData.filter((r) => r.status === "completed");
        if (completedRuns.length > 0) {
          const latestRun = completedRuns[0];
          setModels(latestRun.model_runs);

          const defaultModel =
            latestRun.best_model_id ||
            latestRun.model_runs[0]?.model_id ||
            "";
          setSelectedModelId(defaultModel);
        }
      } catch (err) {
        if (mounted) {
          setInitError(
            err instanceof Error ? err.message : "Failed to load explanation environment."
          );
        }
      } finally {
        if (mounted) setInitLoading(false);
      }
    }

    loadWorkspace();
    return () => {
      mounted = false;
    };
  }, [projectId]);

  useEffect(() => {
    let isMounted = true;
    if (!selectedModelId) return;

    async function fetchGlobal() {
      setExplLoading(true);
      setExplError(null);
      try {
        const res = await apiClient.getGlobalExplanation(projectId, selectedModelId);
        if (isMounted) {
          setGlobalData(res);
        }
      } catch (err) {
        if (isMounted) {
          setExplError(
            err instanceof Error ? err.message : "Failed to load global model explanations."
          );
        }
      } finally {
        if (isMounted) {
          setExplLoading(false);
        }
      }
    }

    fetchGlobal();
    return () => {
      isMounted = false;
    };
  }, [projectId, selectedModelId]);

  if (initLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3 text-xs font-mono text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin text-accent" />
        <span>Loading model interpretability environment...</span>
      </div>
    );
  }

  if (initError || models.length === 0) {
    return (
      <EmptyState
        icon={BrainCircuit}
        title="No Trained Models Available"
        description={
          initError ||
          "Please complete candidate model training before accessing SHAP feature attribution."
        }
        action={
          onNavigateToTraining && (
            <Button
              variant="primary"
              onClick={onNavigateToTraining}
              className="gap-2 font-mono text-xs"
            >
              <span>Go to Parallel Training</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Model Switcher */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-1.5 rounded-md bg-surface-muted text-accent border border-border-subtle">
                <BrainCircuit className="w-4 h-4" />
              </span>
              <h2 className="text-base font-semibold text-text-primary tracking-tight">
                Model Interpretability &amp; SHAP Attribution
              </h2>
              <Badge variant="accent" size="sm" className="font-marker font-bold text-xs -rotate-1">
                ★ Explains Model Behavior, Not Causation
              </Badge>
            </div>
            <p className="text-xs text-text-muted">
              Feature attribution and local observation decomposition for target:{" "}
              <strong className="text-text-primary font-mono">{targetColumn}</strong>
            </p>
          </div>

          {/* Model Selector Dropdown */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <label htmlFor="model-select" className="text-xs font-mono text-text-muted whitespace-nowrap">
              Estimator:
            </label>
            <div className="relative">
              <select
                id="model-select"
                aria-label="Estimator"
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="appearance-none pl-3.5 pr-8 py-1.5 rounded-md bg-surface-subtle border border-border hover:border-border-strong text-xs font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer transition-colors"
              >
                {models.map((m) => (
                  <option key={m.model_id} value={m.model_id} className="bg-surface text-text-primary">
                    {m.model_name} {m.is_baseline ? "(Baseline)" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </Card>

      {/* PLAIN ENGLISH BEGINNER GUIDE DROPDOWN BOX */}
      <Card className="border-2 border-accent/40 bg-accent/5 overflow-hidden transition-all duration-200">
        <button
          type="button"
          onClick={() => setShowBeginnerGuide(!showBeginnerGuide)}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left cursor-pointer hover:bg-accent/10 transition-colors"
          aria-expanded={showBeginnerGuide}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-accent/15 text-accent flex items-center justify-center shrink-0">
              <Lightbulb className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="text-sm font-bold text-text-primary flex items-center gap-2">
                <span>What is this section? (1-Minute Plain-English Guide)</span>
                <Badge variant="optimal" size="sm" className="text-[10px]">
                  For Non-Tech Users
                </Badge>
              </div>
              <p className="text-xs text-text-muted">
                Click to understand how this AI explains its thinking and how to read the charts.
              </p>
            </div>
          </div>
          <div className="text-accent flex items-center gap-1 text-xs font-mono shrink-0 ml-2">
            <span>{showBeginnerGuide ? "Collapse" : "Open Guide"}</span>
            {showBeginnerGuide ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {showBeginnerGuide && (
          <div className="p-4 sm:p-5 pt-0 border-t border-accent/20 space-y-4 text-xs leading-relaxed animate-in fade-in duration-200">
            {/* The Big Picture Analogy */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
              <div className="p-3.5 rounded-lg bg-surface border border-border space-y-1.5">
                <div className="font-semibold text-text-primary flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-accent" />
                  <span>The AI &quot;Truth Room&quot;</span>
                </div>
                <p className="text-text-secondary text-[11px] leading-relaxed">
                  Machine learning models can be accurate, but in real life or exams you cannot just trust a black box.
                  This section proves <strong>why</strong> the AI predicted what it did, making sure it isn&apos;t cheating or relying on silly shortcuts.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-surface border border-border space-y-1.5">
                <div className="font-semibold text-text-primary flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-accent" />
                  <span>1. Global View (Big Picture)</span>
                </div>
                <p className="text-text-secondary text-[11px] leading-relaxed">
                  Shows what the model cares about <strong>across the entire dataset</strong>.
                  For example: did it rely heavily on <em>Fare</em> and <em>Gender</em>, while ignoring <em>Ticket Number</em>?
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-surface border border-border space-y-1.5">
                <div className="font-semibold text-text-primary flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-accent" />
                  <span>2. Local View (Tug-of-War)</span>
                </div>
                <p className="text-text-secondary text-[11px] leading-relaxed">
                  Shows the exact story for <strong>one single person or row</strong>.
                  Starts at the dataset average, then features act like a tug-of-war: 
                  <span className="text-success font-semibold"> Green Boosts</span> pull the score UP, and 
                  <span className="text-danger font-semibold"> Red Drags</span> pull it DOWN.
                </p>
              </div>
            </div>

            {/* Practical Reading Tip */}
            <div className="p-3 rounded-lg bg-surface-subtle border border-border/80 font-mono text-[11px] text-text-secondary space-y-1">
              <div className="text-text-primary font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>How to read a SHAP number:</span>
              </div>
              <div>
                • <strong className="text-success">+0.25 (Positive):</strong> This feature made the AI more confident in a positive/higher outcome.
              </div>
              <div>
                • <strong className="text-danger">-0.15 (Negative):</strong> This feature dragged the score down toward zero.
              </div>
              <div>
                • <strong>Zero (0.00):</strong> This feature had zero influence on this specific prediction.
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Rule 10 Scientific Rigor Attribution Notice */}
      <AlertRow variant="warning" title="Correlation vs. Causation (Rule 10)">
        Feature attribution explains how the model formulated its prediction based on correlated statistical patterns in the training data. A high SHAP attribution score indicates predictive influence, but does <strong>not</strong> prove real-world cause and effect.
      </AlertRow>

      {/* Layman Executive Summary Card */}
      {globalData?.layman_summary && (
        <Card className="p-5 sm:p-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-accent font-mono">
            <Sparkles className="w-4 h-4" />
            <span>Executive Summary (Plain English)</span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            {globalData.layman_summary}
          </p>
        </Card>
      )}

      {/* View Switcher Sub-tabs */}
      <div className="flex items-center gap-1.5 border-b border-border pb-2 overflow-x-auto text-xs font-mono">
        <button
          type="button"
          onClick={() => setActiveTab("global")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-colors ${
            activeTab === "global"
              ? "bg-surface-muted text-text-primary font-semibold border border-border"
              : "text-text-muted hover:text-text-primary hover:bg-surface-subtle/50"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Global Feature Importance (SHAP)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("local")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-colors ${
            activeTab === "local"
              ? "bg-surface-muted text-text-primary font-semibold border border-border"
              : "text-text-muted hover:text-text-primary hover:bg-surface-subtle/50"
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Local Observation Decomposition</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("whatif")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-colors ${
            activeTab === "whatif"
              ? "bg-surface-muted text-text-primary font-semibold border border-border"
              : "text-text-muted hover:text-text-primary hover:bg-surface-subtle/50"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
          <span>What-If Recourse (DiCE)</span>
        </button>
      </div>

      {/* Content Rendering */}
      {explLoading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3 text-xs font-mono text-text-muted">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
          <span>Computing SHAP matrix on background sample folds...</span>
        </div>
      ) : explError ? (
        <AlertRow variant="danger" title="Failed to Load Explanations">
          {explError}
        </AlertRow>
      ) : activeTab === "global" && globalData ? (
        <GlobalImportanceChart data={globalData} />
      ) : activeTab === "local" ? (
        <LocalAttributionCard
          projectId={projectId}
          modelId={selectedModelId}
          columns={columns}
          targetColumn={targetColumn}
          previewRows={previewRows}
          profile={profile}
        />
      ) : (
        <WhatIfSimulator
          projectId={projectId}
          modelId={selectedModelId}
          modelName={models.find((m) => m.model_id === selectedModelId)?.model_name || selectedModelId}
          availableColumns={columns
            .filter((c) => c.name !== targetColumn)
            .map((c) => ({
              name: c.name,
              isNumeric:
                c.dtype === "numeric" ||
                c.dtype === "int64" ||
                c.dtype === "float64" ||
                c.dtype.includes("int") ||
                c.dtype.includes("float"),
            }))}
        />
      )}
    </div>
  );
}
