"use client";

import { useState } from "react";
import { RefreshCw, Sparkles, Calendar } from "lucide-react";
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
        err instanceof Error ? err.message : "Failed to re-calculate statistical profile."
      );
    } finally {
      setRefreshing(false);
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

        <Button
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          isLoading={refreshing}
          className="self-start sm:self-auto gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Re-run Profiling</span>
        </Button>
      </Card>

      {error && (
        <AlertRow variant="danger">{error}</AlertRow>
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
