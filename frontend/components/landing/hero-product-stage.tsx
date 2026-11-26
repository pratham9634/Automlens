"use client";

import React, { useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import {
  Badge,
  Bar,
  Button,
  Connector,
  Count,
  Icon,
  Meter,
  Spinner,
  Stage,
  States,
  Stream,
  Text,
  Window,
  type Act,
} from "@/components/stageshow/kit";
import "@/components/stageshow/automlens-look.css";
import "./hero-product-stage.css";

interface HeroSceneState {
  targetLocked: boolean;
  phase: "idle" | "running" | "done";
  progress: number;
  champScore: number;
  rfScore: number;
  lrScore: number;
  baseScore: number;
  showShap: boolean;
  streamWords: number;
}

const STREAM_TEXT =
  "Month-to-month contract (+0.34) and high monthly charges (+0.21) explain 68% of churn risk.";
const STREAM_WORD_COUNT = STREAM_TEXT.split(" ").length;

const INITIAL_STATE: HeroSceneState = {
  targetLocked: false,
  phase: "idle",
  progress: 0.12,
  champScore: 0.0,
  rfScore: 0.0,
  lrScore: 0.0,
  baseScore: 0.38,
  showShap: false,
  streamWords: 0,
};

const POSTER_STATE: HeroSceneState = {
  targetLocked: true,
  phase: "done",
  progress: 1,
  champScore: 0.862,
  rfScore: 0.844,
  lrScore: 0.792,
  baseScore: 0.38,
  showShap: true,
  streamWords: STREAM_WORD_COUNT,
};

const REST_POINT = {
  wide: { x: 430, y: 148 },
  compact: { x: 256, y: 120 },
};

async function runHeroScript(a: Act<HeroSceneState>) {
  await a.wait(650);

  // Beat 1: Lock target column explicitly (ML Rule 2)
  await a.move("target-btn");
  await a.wait(220);
  await a.click();
  await a.set({ targetLocked: true });
  await a.wait(420);

  // Beat 2: Launch 5-fold CV tournament
  await a.move("train-btn");
  await a.wait(200);
  await a.click();
  await a.set({ phase: "running", progress: 0.48, lrScore: 0.792 });
  await a.wait(650);

  await a.set({ progress: 0.82, rfScore: 0.844 });
  await a.wait(650);

  await a.set({ phase: "done", progress: 1, champScore: 0.862 });
  await a.move("rest");
  await a.wait(480);

  // Beat 3: Reveal SHAP X-Ray satellite & stream ELI5 note
  await a.set({ showShap: true });
  await a.wait(320);
  for (let i = 3; i <= STREAM_WORD_COUNT; i += 3) {
    await a.set({ streamWords: Math.min(i, STREAM_WORD_COUNT) });
    await a.wait(110);
  }
  await a.set({ streamWords: STREAM_WORD_COUNT });

  // Beat 4: Hold payoff cleanly
  await a.wait(3000);

  // Clean seamless loop reset
  await a.set({ showShap: false, streamWords: 0 });
  await a.wait(280);
  await a.snap(INITIAL_STATE);
  await a.wait(220);
}

export function HeroProductStage() {
  const { resolvedTheme } = useTheme();
  const [replayKey, setReplayKey] = useState(0);

  return (
    <div className="w-full max-w-5xl mx-auto mt-10 sm:mt-12 text-left">
      {/* Host Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 px-1">
        <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-text-muted">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span>INTERACTIVE WORKBENCH PREVIEW // TITANIC &amp; CHURN BENCHMARK</span>
        </div>
        <button
          type="button"
          onClick={() => setReplayKey((k) => k + 1)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border-2 border-border bg-surface hover:bg-surface-subtle text-[11px] font-mono font-bold text-text-primary shadow-neo-sm hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
        >
          <RotateCcw className="w-3 h-3 text-accent" />
          <span>Replay Demo</span>
        </button>
      </div>

      {/* Stageshow Canvas */}
      <div className="am-hero-stage look-automlens">
        <Stage<HeroSceneState>
          key={replayKey}
          width={920}
          height={410}
          compact={{ below: 640, width: 358, height: 410 }}
          initial={INITIAL_STATE}
          poster={POSTER_STATE}
          script={runHeroScript}
          theme={resolvedTheme}
          cursor={{ at: REST_POINT, ripple: true }}
          play="loop"
        >
          {(s, rect, layout) => {
            const isCompact = layout === "compact";
            const champRect = rect("champ-row");
            const satRect = rect("shap-sat");

            const models = [
              {
                name: "HistGradientBoosting",
                score: s.champScore,
                meter: s.phase === "done" ? 0.86 : s.phase === "running" ? 0.54 : 0.14,
                champ: s.phase === "done",
                baseline: false,
              },
              {
                name: "Random Forest",
                score: s.rfScore,
                meter: s.phase === "idle" ? 0.12 : 0.84,
                champ: false,
                baseline: false,
              },
              {
                name: "Logistic Regression",
                score: s.lrScore,
                meter: s.phase === "idle" ? 0.1 : 0.79,
                champ: false,
                baseline: false,
              },
              {
                name: "DummyClassifier (Baseline)",
                score: s.baseScore,
                meter: 0.38,
                champ: false,
                baseline: true,
              },
            ];

            const visibleModels = isCompact ? models.slice(0, 3) : models;

            return (
              <>
                <Window
                  className="am-win"
                  title={isCompact ? "AutoMLens · customer_churn.csv" : "Model Tournament — Stratified 5-Fold CV"}
                  sidebarWidth={172}
                  sidebar={
                    isCompact ? undefined : (
                      <div className="am-side">
                        <div className="am-brand">
                          <span className="am-brand-dot">A</span>
                          <span>AutoMLens</span>
                        </div>
                        <div className="am-nav-item">
                          <span className="am-nav-num">1</span>
                          <span>Data &amp; Health</span>
                        </div>
                        <div className="am-nav-item" data-active={!s.targetLocked || s.phase === "idle" ? "" : undefined}>
                          <span className="am-nav-num">2</span>
                          <span>AI Strategy</span>
                        </div>
                        <div className="am-nav-item" data-active={s.phase !== "idle" ? "" : undefined}>
                          <span className="am-nav-num">3</span>
                          <span>Training &amp; CV</span>
                        </div>
                        <div className="am-nav-item">
                          <span className="am-nav-num">4</span>
                          <span>SHAP X-Ray</span>
                        </div>
                        <div className="am-nav-item">
                          <span className="am-nav-num">5</span>
                          <span>Audit &amp; Export</span>
                        </div>

                        <div className="am-side-foot">
                          <Bar w={68} h={5} tone={3} />
                          <Bar w={104} h={5} tone={2} />
                          <Bar w={84} h={5} tone={1} />
                        </div>
                      </div>
                    )
                  }
                  toolbar={
                    isCompact ? undefined : (
                      <Badge
                        tone={s.phase === "done" ? "success" : s.phase === "running" ? "accent" : "neutral"}
                        dot={s.phase === "running"}
                        icon={s.phase === "done" ? <Icon name="check" size={11} /> : undefined}
                      >
                        <States
                          value={s.phase}
                          states={{
                            idle: "Ready for CV",
                            running: "5-Fold Running",
                            done: "Zero Leakage Sealed",
                          }}
                        />
                      </Badge>
                    )
                  }
                  body={{ "data-crop": true }}
                >
                  <div className="am-main">
                    {/* Top Control Strip */}
                    <div className="am-topbar">
                      <div className="am-dataset-meta">
                        <div className="am-dataset-title">
                          <Text>customer_churn.csv</Text>
                          {!isCompact && (
                            <Badge tone="neutral">10,000 × 18</Badge>
                          )}
                        </div>
                        <span className="am-dataset-sub">
                          In-Fold Impute + Scale · Metric: Macro F1
                        </span>
                      </div>

                      <div className="am-controls">
                        <span
                          className="am-target-chip"
                          data-target="target-btn"
                          data-cursor="pointer"
                          data-locked={s.targetLocked || undefined}
                        >
                          <span>Target: Churn</span>
                          {s.targetLocked && <Icon name="check" size={12} />}
                        </span>

                        <Button
                          data-target="train-btn"
                          variant={s.phase === "done" ? "secondary" : "primary"}
                          size="medium"
                          icon={
                            s.phase === "running" ? (
                              <Spinner size={12} />
                            ) : s.phase === "done" ? (
                              <Icon name="check" size={12} />
                            ) : (
                              <Icon name="play" size={11} filled />
                            )
                          }
                        >
                          {s.phase === "running"
                            ? "Fitting Folds"
                            : s.phase === "done"
                            ? "Trained 5/5"
                            : "Run 5-Fold CV"}
                        </Button>
                      </div>
                    </div>

                    {/* Leaderboard Rows */}
                    <div className="am-board">
                      <div className="am-board-head">
                        <span>Rk</span>
                        <span>Candidate Estimator</span>
                        <span>CV Progress</span>
                        <span style={{ textAlign: "right" }}>Macro F1</span>
                      </div>

                      {visibleModels.map((m, idx) => (
                        <div
                          key={m.name}
                          className="am-row"
                          data-target={idx === 0 ? "champ-row" : undefined}
                          data-champ={m.champ || undefined}
                          data-baseline={m.baseline || undefined}
                        >
                          <span className="am-rank">
                            {m.baseline ? "BASE" : `#0${idx + 1}`}
                          </span>
                          <span className="am-model-name">
                            <Text>{m.name}</Text>
                            {m.champ && !isCompact && (
                              <Badge tone="success">Champion (+48.2% lift)</Badge>
                            )}
                          </span>
                          <Meter
                            value={m.meter}
                            tone={m.champ ? "success" : m.baseline ? "warning" : "accent"}
                          />
                          <span className="am-score">
                            <Count
                              value={m.score}
                              duration={520}
                              format={(n) => n.toFixed(3)}
                            />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Window>

                {/* Connector from Champion Row to Satellite Card (wide only) */}
                {!isCompact && champRect.width > 0 && satRect.width > 0 && (
                  <Connector
                    from={{ x: champRect.x + champRect.width - 120, y: champRect.y + champRect.height }}
                    to={{ x: satRect.x + 14, y: satRect.y + 18 }}
                    route="curve"
                    label="SHAP"
                    labelAt={0.45}
                    show={s.showShap}
                  />
                )}

                {/* Satellite Card: Local SHAP + ELI5 */}
                <div
                  className="am-sat"
                  data-target="shap-sat"
                  data-show={s.showShap ? "true" : "false"}
                >
                  <div className="am-sat-head">
                    <span className="am-sat-title">SHAP TreeExplainer · Row #492</span>
                    <Badge tone="warning">84% Churn Risk</Badge>
                  </div>

                  <div className="am-sat-bars">
                    <div className="am-sat-row">
                      <span>Contract: Month-to-month</span>
                      <span className="am-sat-track">
                        <span
                          className="am-sat-fill"
                          style={{
                            display: "block",
                            width: s.showShap ? "86%" : "0%",
                            background: "var(--ss-warning)",
                          }}
                        />
                      </span>
                      <span className="am-sat-delta" style={{ color: "var(--ss-warning-text)" }}>
                        +0.34
                      </span>
                    </div>

                    <div className="am-sat-row">
                      <span>Tenure: 36 months</span>
                      <span className="am-sat-track">
                        <span
                          className="am-sat-fill"
                          style={{
                            display: "block",
                            width: s.showShap ? "58%" : "0%",
                            background: "var(--ss-success)",
                          }}
                        />
                      </span>
                      <span className="am-sat-delta" style={{ color: "var(--ss-success-text)" }}>
                        −0.22
                      </span>
                    </div>
                  </div>

                  <div className="am-sat-note">
                    <Stream text={STREAM_TEXT} count={s.streamWords} />
                  </div>
                </div>

                {/* Invisible Rest Target */}
                <span
                  data-target="rest"
                  style={{
                    position: "absolute",
                    left: REST_POINT[layout].x,
                    top: REST_POINT[layout].y,
                    width: 1,
                    height: 1,
                  }}
                />
              </>
            );
          }}
        </Stage>
      </div>
    </div>
  );
}
