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
} from "recharts";
import { GlobalExplanationResponse } from "@/lib/types";
import { BarChart3, Sparkles } from "lucide-react";

interface GlobalImportanceChartProps {
  data: GlobalExplanationResponse;
}

type MetricMode = "shap" | "native";

export function GlobalImportanceChart({ data }: GlobalImportanceChartProps) {
  const [metricMode, setMetricMode] = useState<MetricMode>("shap");

  // Take top 10 features for readable chart
  const topFeatures = data.features.slice(0, 10).map((f) => ({
    name: f.feature_name,
    original: f.original_feature,
    value:
      metricMode === "shap"
        ? Number(f.mean_abs_shap.toFixed(4))
        : Number((f.importance_score * 100).toFixed(2)),
    rank: f.rank,
  }));

  // Reverse so highest is at the top in vertical layout
  const chartData = [...topFeatures].reverse();

  return (
    <div className="space-y-6">
      {/* Header & Metric Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-surface-1 border border-hairline">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-medium text-ink">Global Feature Importance</h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-2 border border-hairline text-ink-muted">
              {data.sample_size_used} background samples
            </span>
          </div>
          <p className="text-xs text-ink-muted font-mono">{data.method_label}</p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 bg-surface-2 rounded-lg border border-hairline self-start sm:self-auto shadow-sm">
          <button
            type="button"
            onClick={() => setMetricMode("shap")}
            className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
              metricMode === "shap"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Mean |SHAP| Impact
          </button>
          <button
            type="button"
            onClick={() => setMetricMode("native")}
            className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
              metricMode === "native"
                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-semibold"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Native Importance (%)
          </button>
        </div>
      </div>

      {/* Recharts Horizontal Bar Chart */}
      <div className="p-6 rounded-xl bg-surface-1 border border-hairline space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-ink-muted border-b border-hairline pb-2">
          <span>Top 10 Most Influential Features</span>
          <span>
            Metric:{" "}
            <span className="text-ink">
              {metricMode === "shap" ? "Average |SHAP| Attribution" : data.feature_importance_method}
            </span>
          </span>
        </div>

        {topFeatures.length > 0 ? (
          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <XAxis
                  type="number"
                  stroke="#4b5563"
                  tick={{ fill: "#9ca3af", fontSize: 11, fontFamily: "monospace" }}
                  tickLine={{ stroke: "#374151" }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#4b5563"
                  tick={{ fill: "#e5e7eb", fontSize: 11, fontFamily: "monospace" }}
                  tickLine={false}
                  width={110}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-surface-2 border border-hairline p-3 rounded-lg shadow-xl text-xs font-mono space-y-1">
                          <div className="text-ink font-semibold flex items-center gap-1.5">
                            <span className="text-emerald-400">Rank #{item.rank}</span>: {item.name}
                          </div>
                          <div className="text-ink-muted text-[11px]">
                            Source column: <span className="text-ink">{item.original}</span>
                          </div>
                          <div className="text-emerald-400 font-mono text-sm pt-1">
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
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        metricMode === "shap"
                          ? `rgba(16, 185, 129, ${0.45 + (index / chartData.length) * 0.55})`
                          : `rgba(99, 102, 241, ${0.45 + (index / chartData.length) * 0.55})`
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-12 text-center text-xs font-mono text-ink-muted">
            No feature importance data available.
          </div>
        )}
      </div>

      {/* All Features Table */}
      <div className="rounded-xl bg-surface-1 border border-hairline overflow-hidden">
        <div className="p-4 border-b border-hairline flex items-center justify-between bg-surface-1/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-medium text-ink">Complete Feature Ranking</h4>
          </div>
          <span className="text-[10px] font-mono text-ink-muted">
            {data.features.length} features evaluated
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-hairline bg-surface-2 text-ink-muted text-[10px] uppercase">
                <th className="py-2.5 px-4 w-16">Rank</th>
                <th className="py-2.5 px-4">Feature Name</th>
                <th className="py-2.5 px-4">Original Column</th>
                <th className="py-2.5 px-4 text-right">Mean |SHAP|</th>
                <th className="py-2.5 px-4 text-right">Native Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {data.features.map((item) => (
                <tr key={item.feature_name} className="hover:bg-surface-2/20 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-semibold">
                    <span
                      className={`inline-block w-5 h-5 text-center leading-5 rounded text-[10px] ${
                        item.rank === 1
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold"
                          : item.rank <= 3
                          ? "bg-surface-2 text-ink border border-hairline"
                          : "text-ink-muted"
                      }`}
                    >
                      {item.rank}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-ink font-mono font-medium">
                    {item.feature_name}
                  </td>
                  <td className="py-2.5 px-4 text-ink-muted">{item.original_feature}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-emerald-400">
                    {item.mean_abs_shap.toFixed(4)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-ink-muted">
                    {(item.importance_score * 100).toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
