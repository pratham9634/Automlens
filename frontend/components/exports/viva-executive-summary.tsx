"use client";

import { useEffect, useState } from "react";
import {
  Award,
  CheckCircle2,
  Printer,
  ShieldCheck,
  FileText,
  Building2,
  GraduationCap,
  Calendar,
  Database,
  Cpu,
  BarChart3,
  Sparkles,
  Lock,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import {
  ConfirmedTargetResponse,
  DatasetPreviewResponse,
  DatasetProfileResponse,
  Project,
  TrainingRun,
} from "@/lib/types";

interface VivaExecutiveSummaryProps {
  projectId: string;
  projectName: string;
}

export function VivaExecutiveSummary({
  projectId,
  projectName,
}: VivaExecutiveSummaryProps) {
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [datasetPreview, setDatasetPreview] = useState<DatasetPreviewResponse | null>(null);
  const [profile, setProfile] = useState<DatasetProfileResponse | null>(null);
  const [targetInfo, setTargetInfo] = useState<ConfirmedTargetResponse | null>(null);
  const [latestRun, setLatestRun] = useState<TrainingRun | null>(null);

  useEffect(() => {
    async function loadSummaryData() {
      setLoading(true);
      try {
        const [proj, ds, runs] = await Promise.allSettled([
          apiClient.getProject(projectId),
          apiClient.getDataset(projectId),
          apiClient.listTrainingRuns(projectId),
        ]);

        if (proj.status === "fulfilled") setProject(proj.value);
        if (ds.status === "fulfilled") setDatasetPreview(ds.value);
        if (runs.status === "fulfilled" && runs.value.length > 0) {
          const completed = runs.value.filter((r) => r.status === "completed");
          if (completed.length > 0) setLatestRun(completed[0]);
        }

        try {
          const prof = await apiClient.getProfile(projectId);
          setProfile(prof);
        } catch {
          // Profile may not have been run yet
        }

        try {
          const tgt = await apiClient.getConfirmedTarget(projectId);
          setTargetInfo(tgt);
        } catch {
          // Target may not be confirmed yet
        }
      } finally {
        setLoading(false);
      }
    }

    loadSummaryData();
  }, [projectId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-12 text-center rounded-xl border border-hairline bg-surface-1">
        <Loader2 className="w-6 h-6 animate-spin text-brand-hover mx-auto mb-3" />
        <p className="text-xs font-mono text-ink-muted">
          Compiling academic viva defense summary...
        </p>
      </div>
    );
  }

  const bestModel = latestRun?.model_runs.find(
    (m) => m.model_id === latestRun.best_model_id
  );
  const baselineModel = latestRun?.model_runs.find((m) => m.is_baseline);

  const beatsBaseline =
    bestModel && baselineModel && bestModel.primary_metric_score !== null && baselineModel.primary_metric_score !== null
      ? (bestModel.primary_metric_score ?? 0) > (baselineModel.primary_metric_score ?? 0)
      : true;

  return (
    <div className="space-y-6">
      {/* Top Action Bar (hidden when printed) */}
      <div className="no-print p-4 rounded-xl border border-hairline bg-surface-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-brand-hover" />
          <div>
            <h3 className="text-sm font-semibold text-ink">
              Viva Defense Executive Summary
            </h3>
            <p className="text-xs text-ink-muted">
              Structured academic evaluation document formatted for the final-year examination panel.
            </p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-lavender hover:bg-brand-hover text-ink text-xs font-mono font-medium transition-colors shadow-sm"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Save as PDF</span>
        </button>
      </div>

      {/* Main Academic Document Card */}
      <div className="print-card p-8 rounded-xl border border-hairline bg-surface-1 shadow-md space-y-8 text-ink">
        {/* Document Header */}
        <div className="border-b border-hairline/80 pb-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-brand-hover uppercase tracking-wider mb-1">
                <ShieldCheck className="w-4 h-4 text-telemetry-emerald" />
                <span>B.Tech Final-Year Minor Project • Technical Defense</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-ink print-text-dark">
                AutoMLens: Human-Assisted AutoML Platform for Tabular Data
              </h1>
              <p className="text-xs text-ink-muted print-text-muted mt-1">
                A Transparent, Zero-Data-Leakage Automated Machine Learning System with Explainable AI &amp; Audit Governance
              </p>
            </div>

            <div className="sm:text-right font-mono text-xs text-ink-muted print-text-muted space-y-0.5 shrink-0">
              <div className="font-semibold text-ink print-text-dark">
                Candidate: Pratham Petwal
              </div>
              <div>Dept. of Computer Science &amp; Engineering</div>
              <div>Shivalik College of Engineering, Dehradun</div>
              <div className="text-[11px] text-ink-subtle">Affiliated with UTU, Dehradun</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 font-mono text-xs">
            <div className="p-2.5 rounded-lg bg-surface-2 border border-hairline print-card">
              <span className="text-[10px] text-ink-subtle uppercase block">Workspace</span>
              <span className="font-semibold text-ink print-text-dark truncate block">
                {projectName}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-surface-2 border border-hairline print-card">
              <span className="text-[10px] text-ink-subtle uppercase block">Validation Protocol</span>
              <span className="font-semibold text-telemetry-emerald block">
                5-Fold Cross-Validation
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-surface-2 border border-hairline print-card">
              <span className="text-[10px] text-ink-subtle uppercase block">Leakage Prevention</span>
              <span className="font-semibold text-telemetry-cyan block">
                Strict Pipeline Isolation
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-surface-2 border border-hairline print-card">
              <span className="text-[10px] text-ink-subtle uppercase block">Baseline Defense</span>
              <span className="font-semibold text-brand-hover block">
                Mandatory Rule 4 Baseline
              </span>
            </div>
          </div>
        </div>

        {/* Section 1: Synopsis Objective Alignment Matrix */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink print-text-dark flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-telemetry-emerald" />
            <span>1. Alignment with Approved College Synopsis Objectives</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {[
              {
                title: "1. Automated Data Ingestion",
                desc: "CSV/Excel parsing with schema inference, duplicate detection, and SHA-256 fingerprinting.",
              },
              {
                title: "2. Statistical Data Profiling",
                desc: "Univariate metrics, IQR outlier boundaries, skewness, and pairwise Pearson correlations.",
              },
              {
                title: "3. Target & Task Inference",
                desc: "Heuristic classification/regression detection with non-negotiable human confirmation.",
              },
              {
                title: "4. Zero-Leakage Preprocessing",
                desc: "Imputation, one-hot encoding, and standard scaling executed strictly inside cross-validation folds.",
              },
              {
                title: "5. Multi-Model Parallel Training",
                desc: "CPU ProcessPoolExecutor training Logistic Regression, Random Forest, Gradient Boosting & XGBoost.",
              },
              {
                title: "6. Mandatory Dummy Baseline (Rule 4)",
                desc: "Empirical verification that candidate models outperform statistical majority/mean baselines.",
              },
              {
                title: "7. Model Leaderboard & Selection",
                desc: "Mean and fold-by-fold standard deviation metrics for rigorous statistical comparison.",
              },
              {
                title: "8. Live Inference & What-If Simulation",
                desc: "Single prediction, batch CSV processing, and interactive slider sensitivity analysis.",
              },
              {
                title: "9. Explainability & SHAP Attributions",
                desc: "TreeExplainer/LinearExplainer feature attributions with non-causal academic disclaimers.",
              },
              {
                title: "10. Immutable Audit Trail & Exports",
                desc: "4-field audit ledger (action, reason, evidence, result) and 6-artifact reproducibility bundle.",
              },
            ].map((obj, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-surface-2/40 border border-hairline/60 print-card space-y-1"
              >
                <div className="font-semibold text-ink print-text-dark flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-telemetry-emerald" />
                  <span>{obj.title}</span>
                </div>
                <p className="text-[11px] text-ink-muted print-text-muted leading-relaxed">
                  {obj.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Experimental Results & Model Defense */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink print-text-dark flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand-hover" />
            <span>2. Empirical Performance &amp; Baseline Defense (Rule 4)</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono border border-hairline print-card">
              <thead className="bg-surface-2 border-b border-hairline text-ink-muted print-card">
                <tr>
                  <th className="py-2 px-3 text-left">Model Algorithm</th>
                  <th className="py-2 px-3 text-center">Model Category</th>
                  <th className="py-2 px-3 text-center">Primary Metric Score</th>
                  <th className="py-2 px-3 text-center">5-Fold Std Dev (±)</th>
                  <th className="py-2 px-3 text-center">Train Time (s)</th>
                  <th className="py-2 px-3 text-right">Baseline Beaten?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {latestRun?.model_runs.map((model) => {
                  const isBest = model.model_id === latestRun.best_model_id;
                  return (
                    <tr
                      key={model.model_id}
                      className={
                        isBest
                          ? "bg-brand-lavender/5 font-semibold text-ink print-text-dark"
                          : "text-ink-muted print-text-dark"
                      }
                    >
                      <td className="py-2 px-3 text-left flex items-center gap-1.5">
                        {isBest && <Award className="w-3.5 h-3.5 text-telemetry-amber" />}
                        <span>{model.model_name}</span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {model.is_baseline ? (
                          <span className="text-telemetry-amber">Dummy Baseline</span>
                        ) : (
                          <span className="text-brand-hover">Candidate Model</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-ink print-text-dark">
                        {model.primary_metric_score !== null && model.primary_metric_score !== undefined
                          ? model.primary_metric_score.toFixed(4)
                          : "N/A"}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {model.primary_metric_std !== null && model.primary_metric_std !== undefined
                          ? `±${model.primary_metric_std.toFixed(4)}`
                          : "—"}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {model.train_time_seconds !== null && model.train_time_seconds !== undefined
                          ? `${model.train_time_seconds.toFixed(2)}s`
                          : "—"}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {model.is_baseline ? (
                          <span className="text-ink-subtle">Baseline</span>
                        ) : model.primary_metric_score !== null &&
                          baselineModel?.primary_metric_score !== null &&
                          (model.primary_metric_score ?? 0) > (baselineModel?.primary_metric_score ?? 0) ? (
                          <span className="text-telemetry-emerald font-bold">YES (+{(
                            ((model.primary_metric_score ?? 0) - (baselineModel?.primary_metric_score ?? 0)) * 100
                          ).toFixed(1)}%)</span>
                        ) : (
                          <span className="text-telemetry-rose">NO</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Academic Integrity & Non-Causality Disclosure */}
        <div className="p-4 rounded-xl border border-hairline bg-surface-2/60 print-card space-y-2 text-xs">
          <h3 className="font-semibold text-ink print-text-dark flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-telemetry-cyan" />
            <span>Academic Rigor &amp; Reproducibility Disclosure</span>
          </h3>
          <p className="text-ink-muted print-text-muted leading-relaxed">
            In accordance with the 10 AutoMLens ML Correctness Rules: All data transformations (missing value imputation, one-hot encoding, and continuous scaling) were isolated strictly inside cross-validation splits to guarantee mathematical independence of test folds. Model explainability attributions derived via SHAP TreeExplainer/LinearExplainer represent mathematical feature sensitivity for the trained parameters and do not assert empirical causal relationships in the physical data-generating process.
          </p>
        </div>

        {/* Examiner Signature Block */}
        <div className="pt-6 border-t border-hairline/80 grid grid-cols-2 sm:grid-cols-3 gap-6 text-center text-xs font-mono">
          <div className="space-y-8">
            <div className="border-b border-hairline/80 pb-6" />
            <span className="text-ink-subtle print-text-muted block">Project Guide / Supervisor</span>
          </div>
          <div className="space-y-8">
            <div className="border-b border-hairline/80 pb-6" />
            <span className="text-ink-subtle print-text-muted block">Internal Examiner</span>
          </div>
          <div className="space-y-8">
            <div className="border-b border-hairline/80 pb-6" />
            <span className="text-ink-subtle print-text-muted block">External Examiner</span>
          </div>
        </div>
      </div>
    </div>
  );
}
