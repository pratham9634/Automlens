"use client";

import { useState } from "react";
import {
  RefreshCw,
  Sparkles,
  Calendar,
  Download,
  Copy,
  Check,
  FileCode,
  Database,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { DatasetProfileResponse } from "@/lib/types";
import { apiClient } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertRow } from "@/components/ui/alert-row";
import { QualityScoreGauge } from "./quality-score-gauge";
import { QualityWarningsList } from "./quality-warnings-list";
import { FeatureDistributionViewer } from "./feature-distribution-viewer";
import { CorrelationHeatmap } from "./correlation-heatmap";
import { SectionExplainerGuide } from "@/components/ui/section-explainer-guide";

interface StatisticalProfileViewProps {
  projectId: string;
  initialProfile: DatasetProfileResponse;
  onProfileUpdated: (updated: DatasetProfileResponse) => void;
}

export function StatisticalProfileView({
  projectId,
  initialProfile,
  onProfileUpdated,
}: StatisticalProfileViewProps) {
  const [profile, setProfile] = useState<DatasetProfileResponse>(initialProfile);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedMd, setCopiedMd] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const fresh = await apiClient.generateProfile(projectId);
      setProfile(fresh);
      onProfileUpdated(fresh);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to re-calculate statistical profile."
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleDownloadJson = () => {
    const jsonBlob = new Blob([JSON.stringify(profile, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(jsonBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `automlens_profile_${projectId.slice(0, 8)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = async () => {
    const lines = [
      `# AutoMLens Dataset Profile Summary`,
      `- **Project ID:** ${profile.project_id}`,
      `- **Data Quality Score:** ${profile.quality_score.toFixed(1)} / 100`,
      `- **Total Samples:** ${profile.total_rows.toLocaleString()}`,
      `- **Total Features:** ${profile.total_columns}`,
      `- **Numeric Columns (${profile.numeric_columns.length}):** ${profile.numeric_columns.map((c) => c.name).join(", ")}`,
      `- **Categorical Columns (${profile.categorical_columns.length}):** ${profile.categorical_columns.map((c) => c.name).join(", ")}`,
      `- **Duplicate Rows:** ${profile.duplicate_rows_count} (${profile.duplicate_rows_percentage.toFixed(1)}%)`,
      `- **Quality Warnings (${profile.warnings.length}):** ${profile.warnings.map((w) => `[${w.code}] ${w.message}`).join("; ")}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="space-y-6">
      {/* Profiling Controls Header */}
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="card-title text-text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              Automated Statistical Profile
            </h3>
            <Badge variant="success" size="sm">
              Deterministic &amp; Reproducible
            </Badge>
          </div>
          <p className="text-xs text-text-muted flex items-center gap-1.5 font-mono tabular-nums">
            <Calendar className="w-3 h-3 text-text-subtle" />
            Computed {formatDate(profile.created_at)}
          </p>
        </div>

        {/* Action Controls: Refresh, Export JSON, Copy Markdown */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            type="button"
            onClick={handleDownloadJson}
            title="Download immutable profile.json artifact"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button border border-border bg-surface-subtle hover:bg-surface-hover text-xs font-mono text-text-primary transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-text-muted" />
            <span>Export JSON</span>
          </button>

          <button
            type="button"
            onClick={handleCopyMarkdown}
            title="Copy formatted markdown report to clipboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button border border-border bg-surface-subtle hover:bg-surface-hover text-xs font-mono text-text-primary transition-colors cursor-pointer"
          >
            {copiedMd ? (
              <Check className="w-3.5 h-3.5 text-success" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-text-muted" />
            )}
            <span>{copiedMd ? "Copied Markdown" : "Copy Summary"}</span>
          </button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            isLoading={refreshing}
            className="gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-run Profiling</span>
          </Button>
        </div>
      </Card>

      {/* PLAIN-ENGLISH DATA HEALTH GUIDE DROPDOWN BOX */}
      <SectionExplainerGuide
        title="What is Data Health & Profiling? (1-Minute Plain-English Guide)"
        subtitle="Click to understand why data cleaning and quality auditing is the most important step in machine learning."
        badgeText="For Non-Tech Users"
        cards={[
          {
            icon: Database,
            title: "Garbage In, Garbage Out",
            description:
              "Even the most advanced AI will fail or make embarrassing mistakes if trained on dirty, duplicated, or corrupted data. This section audits your raw file before anything else happens.",
          },
          {
            icon: ShieldCheck,
            title: "Data Quality Score (0 to 100)",
            description:
              "A deterministic health rating based on missing values, duplicate rows, constant columns, and extreme outliers. Scores above 80 indicate high readiness for training.",
          },
          {
            icon: AlertTriangle,
            title: "No Secret Data Deletions (Rule 6)",
            description:
              "Unlike careless tools, AutoMLens never automatically drops rows or outliers behind your back. It flags them transparently and handles them inside cross-validation folds.",
          },
        ]}
        tipsTitle="How to read your data health report:"
        tips={[
          {
            label: "Quality Score > 80",
            text: "Your dataset is clean and ready for target column selection and modeling.",
          },
          {
            label: "Missing Values",
            text: "Missing numbers are automatically imputed with medians and categories with modes during CV folds.",
          },
          {
            label: "Duplicate Rows",
            text: "Exact row duplicates are highlighted so you can verify if they represent natural recurring events or accidental copy-pastes.",
          },
          {
            label: "High Correlations",
            text: "Features that duplicate each other's signal are flagged in the correlation matrix below.",
          },
        ]}
      />

      {/* Quick Section Anchor Jumper */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
        <span className="text-[11px] text-text-muted flex items-center gap-1 shrink-0">
          <FileCode className="w-3 h-3 text-accent" /> Jump to:
        </span>
        <a
          href="#section-health"
          className="px-2.5 py-1 rounded-button bg-surface border border-border text-text-muted hover:text-text-primary hover:border-accent transition-colors shrink-0"
        >
          📊 Health &amp; Executive Brief
        </a>
        <a
          href="#section-warnings"
          className="px-2.5 py-1 rounded-button bg-surface border border-border text-text-muted hover:text-text-primary hover:border-accent transition-colors shrink-0"
        >
          ⚠️ Advisories ({profile.warnings.length})
        </a>
        <a
          href="#section-distributions"
          className="px-2.5 py-1 rounded-button bg-surface border border-border text-text-muted hover:text-text-primary hover:border-accent transition-colors shrink-0"
        >
          📈 Distributions &amp; Box Plots ({profile.numeric_columns.length + profile.categorical_columns.length})
        </a>
        <a
          href="#section-correlations"
          className="px-2.5 py-1 rounded-button bg-surface border border-border text-text-muted hover:text-text-primary hover:border-accent transition-colors shrink-0"
        >
          🔗 Linear Dependencies &amp; Heatmap
        </a>
      </div>

      {error && (
        <AlertRow variant="danger">{error}</AlertRow>
      )}

      {/* 1. Health Score, Dial and Executive Briefing */}
      <div id="section-health" className="scroll-mt-4">
        <QualityScoreGauge profile={profile} />
      </div>

      {/* 2. Advisories & Warnings with Preprocessing Action Plans */}
      <div id="section-warnings" className="scroll-mt-4">
        <QualityWarningsList warnings={profile.warnings} />
      </div>

      {/* 3. Distribution Viewer with SVG Box & Whisker Plots */}
      <div id="section-distributions" className="scroll-mt-4">
        <FeatureDistributionViewer
          numericColumns={profile.numeric_columns}
          categoricalColumns={profile.categorical_columns}
        />
      </div>

      {/* 4. Pearson Correlation Matrix & Top-Ranked Dependencies */}
      <div id="section-correlations" className="scroll-mt-4">
        <CorrelationHeatmap matrix={profile.correlation_matrix} />
      </div>
    </div>
  );
}
