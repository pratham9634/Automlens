"use client";

import { useEffect, useState } from "react";
import {
  Award,
  CheckCircle2,
  Printer,
  ShieldCheck,
  GraduationCap,
  BarChart3,
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
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

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
          // Profile optional
        }

        try {
          const tgt = await apiClient.getConfirmedTarget(projectId);
          setTargetInfo(tgt);
        } catch {
          // Target optional
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
      <div className="py-20 text-center rounded-xl border border-border bg-surface">
        <Loader2 className="w-5 h-5 animate-spin text-accent mx-auto mb-3" />
        <p className="text-xs font-mono text-text-muted">
          Compiling academic viva defense summary...
        </p>
      </div>
    );
  }

  const bestModel = latestRun?.model_runs.find(
    (m) => m.model_id === latestRun.best_model_id
  );
  const baselineModel = latestRun?.model_runs.find((m) => m.is_baseline);

  return (
    <div className="space-y-6">
      {/* Top Action Bar (hidden when printed) */}
      <Card className="no-print p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-md bg-surface-muted text-accent border border-border-subtle">
            <GraduationCap className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Viva Defense Executive Summary
            </h3>
            <p className="text-xs text-text-muted">
              Structured academic evaluation document formatted for the final-year examination panel.
            </p>
          </div>
        </div>

        <Button
          onClick={handlePrint}
          variant="primary"
          size="sm"
          className="gap-2 font-mono text-xs self-start sm:self-auto"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print / Save as PDF</span>
        </Button>
      </Card>

      {/* Main Academic Document Card */}
      <Card className="print-card p-6 sm:p-8 space-y-8 text-text-primary">
        {/* Document Header */}
        <div className="border-b border-border pb-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-accent uppercase tracking-wider mb-1">
                <ShieldCheck className="w-4 h-4 text-success" />
                <span>B.Tech Final-Year Minor Project • Technical Defense</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary print-text-dark">
                AutoMLens: Human-Assisted AutoML Platform for Tabular Data
              </h1>
              <p className="text-xs text-text-muted print-text-muted mt-1">
                A Transparent, Fold-Safe Automated Machine Learning System with Explainable AI &amp; Audit Governance
              </p>
            </div>

            <div className="sm:text-right font-mono text-xs text-text-muted print-text-muted space-y-0.5 shrink-0">
              <div className="font-semibold text-text-primary print-text-dark">
                Candidate: Pratham Petwal
              </div>
              <div>Dept. of Computer Science &amp; Engineering</div>
              <div>Shivalik College of Engineering, Dehradun</div>
              <div className="text-[11px] text-text-muted">Affiliated with UTU, Dehradun</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 font-mono text-xs">
            <div className="p-2.5 rounded-md bg-surface-subtle border border-border print-card">
              <span className="text-[10px] text-text-muted uppercase block">Workspace</span>
              <span className="font-semibold text-text-primary print-text-dark truncate block">
                {projectName}
              </span>
            </div>
            <div className="p-2.5 rounded-md bg-surface-subtle border border-border print-card">
              <span className="text-[10px] text-text-muted uppercase block">Validation Protocol</span>
              <span className="font-semibold text-success block">
                5-Fold Cross-Validation
              </span>
            </div>
            <div className="p-2.5 rounded-md bg-surface-subtle border border-border print-card">
              <span className="text-[10px] text-text-muted uppercase block">Leakage Prevention</span>
              <span className="font-semibold text-accent block">
                Fold-Safe Isolation (Rule 1)
              </span>
            </div>
            <div className="p-2.5 rounded-md bg-surface-subtle border border-border print-card">
              <span className="text-[10px] text-text-muted uppercase block">Baseline Defense</span>
              <span className="font-semibold text-warning block">
                Rule 4 Baseline Verified
              </span>
            </div>
          </div>
        </div>

        {/* Section 1: Synopsis Objective Alignment Matrix */}
        <div className="space-y-3">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-text-primary print-text-dark flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
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
                desc: "CPU ProcessPoolExecutor training Logistic Regression, Random Forest, and Decision Tree estimators.",
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
                title: "10. Deterministic Audit Trail & Exports",
                desc: "4-field audit ledger (action, reason, evidence, result) and 6-artifact reproducibility bundle.",
              },
            ].map((obj, i) => (
              <div
                key={i}
                className="p-3 rounded-md bg-surface-subtle/50 border border-border print-card space-y-1"
              >
                <div className="font-semibold text-text-primary print-text-dark flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  <span>{obj.title}</span>
                </div>
                <p className="text-[11px] text-text-muted print-text-muted leading-relaxed">
                  {obj.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Experimental Results & Model Defense */}
        <div className="space-y-3">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-text-primary print-text-dark flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5 text-accent" />
            <span>2. Empirical Performance &amp; Baseline Defense (Rule 4)</span>
          </h2>

          <div className="rounded-md border border-border overflow-hidden print-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-xs">Model Algorithm</TableHead>
                  <TableHead className="font-mono text-xs text-center">Category</TableHead>
                  <TableHead className="font-mono text-xs text-right">Primary Metric Score</TableHead>
                  <TableHead className="font-mono text-xs text-right">5-Fold Std Dev (±)</TableHead>
                  <TableHead className="font-mono text-xs text-right">Train Time (s)</TableHead>
                  <TableHead className="font-mono text-xs text-right">Baseline Beaten?</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestRun?.model_runs.map((model) => {
                  const isBest = model.model_id === latestRun.best_model_id;
                  const isWinner =
                    !model.is_baseline &&
                    model.primary_metric_score !== null &&
                    baselineModel?.primary_metric_score !== null &&
                    (model.primary_metric_score ?? 0) > (baselineModel?.primary_metric_score ?? 0);

                  return (
                    <TableRow
                      key={model.model_id}
                      className={isBest ? "bg-accent/5 font-semibold" : ""}
                    >
                      <TableCell className="font-mono text-xs text-text-primary print-text-dark">
                        <div className="flex items-center gap-1.5">
                          {isBest && <Award className="w-3.5 h-3.5 text-warning shrink-0" />}
                          <span>{model.model_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {model.is_baseline ? (
                          <Badge variant="warning" size="sm">
                            Dummy Baseline
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            Candidate
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-text-primary print-text-dark tabular-nums">
                        {model.primary_metric_score !== null && model.primary_metric_score !== undefined
                          ? model.primary_metric_score.toFixed(4)
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-text-muted print-text-dark tabular-nums">
                        {model.primary_metric_std !== null && model.primary_metric_std !== undefined
                          ? `±${model.primary_metric_std.toFixed(4)}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-text-muted print-text-dark tabular-nums">
                        {model.train_time_seconds !== null && model.train_time_seconds !== undefined
                          ? `${model.train_time_seconds.toFixed(2)}s`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {model.is_baseline ? (
                          <span className="text-text-muted">Control</span>
                        ) : isWinner ? (
                          <span className="text-success font-bold">
                            YES (+{(
                              ((model.primary_metric_score ?? 0) - (baselineModel?.primary_metric_score ?? 0)) * 100
                            ).toFixed(1)}%)
                          </span>
                        ) : (
                          <span className="text-danger">NO</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Section 3: Academic Integrity & Non-Causality Disclosure */}
        <div className="p-4 rounded-md border border-border bg-surface-subtle/50 print-card space-y-1.5 text-xs">
          <h3 className="font-semibold text-text-primary print-text-dark flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-accent" />
            <span>Academic Rigor &amp; Reproducibility Disclosure</span>
          </h3>
          <p className="text-text-muted print-text-muted leading-relaxed">
            In accordance with the 10 AutoMLens ML Correctness Rules: All data transformations (missing value imputation, one-hot encoding, and continuous scaling) were isolated strictly inside cross-validation splits to guarantee mathematical independence of test folds. Model explainability attributions derived via SHAP TreeExplainer/LinearExplainer represent mathematical feature sensitivity for the trained parameters and do not assert empirical causal relationships in the physical data-generating process.
          </p>
        </div>

        {/* Examiner Signature Block */}
        <div className="pt-6 border-t border-border grid grid-cols-2 sm:grid-cols-3 gap-6 text-center text-xs font-mono">
          <div className="space-y-8">
            <div className="border-b border-border pb-6" />
            <span className="text-text-muted print-text-muted block">Project Guide / Supervisor</span>
          </div>
          <div className="space-y-8">
            <div className="border-b border-border pb-6" />
            <span className="text-text-muted print-text-muted block">Internal Examiner</span>
          </div>
          <div className="space-y-8">
            <div className="border-b border-border pb-6" />
            <span className="text-text-muted print-text-muted block">External Examiner</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
