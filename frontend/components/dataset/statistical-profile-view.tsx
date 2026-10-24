"use client";

import { useState } from "react";
import { RefreshCw, Sparkles, Loader2, Calendar } from "lucide-react";
import { DatasetProfileResponse } from "@/lib/types";
import { apiClient } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { QualityScoreGauge } from "./quality-score-gauge";
import { QualityWarningsList } from "./quality-warnings-list";
import { FeatureDistributionViewer } from "./feature-distribution-viewer";
import { CorrelationHeatmap } from "./correlation-heatmap";

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

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const fresh = await apiClient.generateProfile(projectId);
      setProfile(fresh);
      onProfileUpdated(fresh);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to re-calculate profile."
      );
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profiling Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-hairline bg-surface-1">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-hover" />
              Automated Statistical Profile
            </h3>
            <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-telemetry-emerald/10 text-telemetry-emerald border border-telemetry-emerald/30">
              Deterministic & Reproducible
            </span>
          </div>
          <p className="text-xs text-ink-muted flex items-center gap-2">
            <Calendar className="w-3 h-3 text-ink-subtle" />
            Computed {formatDate(profile.created_at)}
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-hairline bg-surface-2 hover:bg-surface-3 text-xs font-mono text-ink transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          {refreshing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-hover" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          <span>{refreshing ? "Re-computing..." : "Re-run Profiling"}</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg border border-telemetry-rose/30 bg-telemetry-rose/10 text-xs font-mono text-telemetry-rose">
          {error}
        </div>
      )}

      {/* 1. Health Score and Metrics */}
      <QualityScoreGauge profile={profile} />

      {/* 2. Advisories & Warnings */}
      <QualityWarningsList warnings={profile.warnings} />

      {/* 3. Distribution Viewer */}
      <FeatureDistributionViewer
        numericColumns={profile.numeric_columns}
        categoricalColumns={profile.categorical_columns}
      />

      {/* 4. Pearson Correlation Matrix */}
      <CorrelationHeatmap matrix={profile.correlation_matrix} />
    </div>
  );
}
