"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";
import { GlobalExplanationResponse } from "@/lib/types";
import { BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

interface GlobalImportanceChartProps {
  data: GlobalExplanationResponse;
}

type MetricMode = "shap" | "native";

export function GlobalImportanceChart({ data }: GlobalImportanceChartProps) {
  const [metricMode, setMetricMode] = useState<MetricMode>("shap");

  const topFeatures = data.features.slice(0, 10).map((f) => ({
    name: f.feature_name,
    original: f.original_feature,
    value:
      metricMode === "shap"
        ? Number(f.mean_abs_shap.toFixed(4))
        : Number((f.importance_score * 100).toFixed(2)),
    shapValue: Number(f.mean_abs_shap.toFixed(4)),
    nativeValue: Number((f.importance_score * 100).toFixed(2)),
    rank: f.rank,
  }));

  const chartData = [...topFeatures].reverse();

  return (
    <div className="space-y-6">
      {/* Header & Metric Switcher */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-md bg-surface-muted text-accent border border-border-subtle">
                <BarChart3 className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-semibold text-text-primary">
                Global Feature Attribution (Rule 9)
              </h3>
              <Badge variant="accent" size="sm" className="font-mono tabular-nums">
                {data.sample_size_used} background samples
              </Badge>
            </div>
            <p className="text-xs text-text-muted font-mono">{data.method_label}</p>
          </div>

          {/* Metric Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-surface-subtle rounded-md border border-border self-start sm:self-auto text-xs font-mono">
            <button
              type="button"
              onClick={() => setMetricMode("shap")}
              className={`px-3 py-1 rounded transition-colors ${
                metricMode === "shap"
                  ? "bg-accent/10 text-accent font-semibold border border-accent/30"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Mean |SHAP| Impact
            </button>
            <button
              type="button"
              onClick={() => setMetricMode("native")}
              className={`px-3 py-1 rounded transition-colors ${
                metricMode === "native"
                  ? "bg-surface-muted text-text-primary font-semibold border border-border"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Native Importance (%)
            </button>
          </div>
        </div>
      </Card>

      {/* Recharts Horizontal Bar Chart */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between text-xs font-mono text-text-muted border-b border-border pb-3">
          <span>Top 10 Influential Features</span>
          <span>
            Metric:{" "}
            <strong className="text-text-primary">
              {metricMode === "shap" ? "Mean |SHAP| Value" : data.feature_importance_method}
            </strong>
          </span>
        </div>

        {topFeatures.length > 0 ? (
          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 8, right: 30, left: 100, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.6} />
                <XAxis
                  type="number"
                  stroke="var(--border)"
                  className="text-text-muted"
                  tick={{ fontSize: 11, fontFamily: "monospace" }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="var(--border)"
                  className="text-text-secondary"
                  tick={{ fontSize: 11, fontFamily: "monospace" }}
                  tickLine={false}
                  width={110}
                />
                <Tooltip
                  cursor={{ fill: "rgba(125, 125, 125, 0.08)" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-surface border border-border p-3 rounded-md shadow-xl text-xs font-mono space-y-1.5">
                          <div className="text-text-primary font-semibold flex items-center gap-1.5">
                            <span className="text-accent">Rank #{item.rank}</span>: {item.name}
                          </div>
                          <div className="text-text-muted text-[11px]">
                            Source: <span className="text-text-primary">{item.original}</span>
                          </div>
                          <div className="text-accent font-mono text-sm pt-0.5 tabular-nums">
                            {metricMode === "shap"
                              ? `Mean |SHAP|: ${item.value}`
                              : `Weight: ${item.value}%`}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {chartData.map((item, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={metricMode === "shap" ? (item.rank === 1 ? "#06B6D4" : "#0EA5E9") : (item.rank === 1 ? "#818CF8" : "#6366F1")}
                      opacity={0.85 + (index / chartData.length) * 0.15}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-12 text-center text-xs font-mono text-text-muted">
            No features available for attribution.
          </div>
        )}
      </Card>

      {/* Feature Attribution Table */}
      <Card className="p-5 sm:p-6 space-y-3">
        <div className="border-b border-border pb-3">
          <h4 className="text-xs font-mono uppercase tracking-wider text-text-primary font-semibold">
            Feature Attribution Rankings
          </h4>
        </div>

        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center font-mono">Rank</TableHead>
                <TableHead className="font-mono">Engine Feature</TableHead>
                <TableHead className="font-mono">Source Column</TableHead>
                <TableHead className="text-right font-mono">Mean |SHAP|</TableHead>
                <TableHead className="text-right font-mono">Native Importance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topFeatures.map((f) => (
                <TableRow key={f.name}>
                  <TableCell className="text-center font-mono text-xs tabular-nums text-text-muted">
                    #{f.rank}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-medium text-text-primary">
                    {f.name}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-text-secondary">
                    {f.original}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold text-accent tabular-nums">
                    {f.shapValue.toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-text-muted tabular-nums">
                    {f.nativeValue.toFixed(2)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
