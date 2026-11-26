"use client";

import React, { useState } from "react";
import { Sparkles, Flame, BrainCircuit, RotateCcw } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import {
  Badge,
  Collapse,
  Count,
  Icon,
  Meter,
  Segmented,
  Stage,
  States,
  Stream,
  Swap,
  Text,
  Window,
  type Act,
} from "@/components/stageshow/kit";
import "@/components/stageshow/automlens-look.css";
import "./interactive-lab-stage.css";

type LensId = "scanner" | "speedway" | "xray";

/* ---------------- Lens 1: AI Data Scanner ---------------- */

type ScannerState = {
  fixed: boolean;
  showAudit: boolean;
  words: number;
};

const SCANNER_NOTE =
  "Target 'Survived' shows 38.4% positive class balance. Missing Age imputed via 5-fold local median (28.0 yrs) with zero validation leakage.";
const SCANNER_WORDS = SCANNER_NOTE.split(" ").length;

async function scannerScript(a: Act<ScannerState>) {
  await a.wait(600);
  await a.move("nan-cell");
  await a.wait(260);
  await a.click();
  await a.set({ fixed: true, showAudit: true });
  await a.move("rest");
  await a.wait(320);

  for (let i = 4; i <= SCANNER_WORDS; i += 4) {
    await a.set({ words: Math.min(i, SCANNER_WORDS) });
    await a.wait(110);
  }
  await a.set({ words: SCANNER_WORDS });
  await a.wait(2800);
  await a.snap({ fixed: false, showAudit: false, words: 0 });
  await a.wait(240);
}

/* ---------------- Lens 2: Kinetic Race Arena ---------------- */

type SpeedwayState = {
  done: boolean;
  lgbm: number;
  rf: number;
  base: number;
};

async function speedwayScript(a: Act<SpeedwayState>) {
  await a.wait(500);
  await a.move("run-race");
  await a.wait(220);
  await a.click();
  await a.set({ done: true, lgbm: 84.2, rf: 83.5, base: 61.6 });
  await a.move("rest");
  await a.wait(3000);
  await a.snap({ done: false, lgbm: 0, rf: 0, base: 61.6 });
  await a.wait(260);
}

/* ---------------- Lens 3: SHAP X-Ray Vectors ---------------- */

type XrayState = {
  mode: 0 | 1;
  barsOpen: boolean;
};

async function xrayScript(a: Act<XrayState>) {
  await a.wait(500);
  await a.set({ barsOpen: true });
  await a.wait(1400);
  await a.move("xray-math");
  await a.wait(240);
  await a.click();
  await a.set({ mode: 1 });
  await a.move("rest");
  await a.wait(2200);
  await a.move("xray-eli5");
  await a.wait(240);
  await a.click();
  await a.set({ mode: 0 });
  await a.move("rest");
  await a.wait(2000);
}

export function InteractiveExampleSection() {
  const { resolvedTheme } = useTheme();
  const [activeLens, setActiveLens] = useState<LensId>("scanner");
  const [replayKey, setReplayKey] = useState(0);

  const lenses = [
    {
      id: "scanner" as const,
      icon: Sparkles,
      label: "Lens 01: AI Data Scanner",
      tag: "Live Inspection",
    },
    {
      id: "speedway" as const,
      icon: Flame,
      label: "Lens 02: Kinetic Race Arena",
      tag: "5-Model Duel",
    },
    {
      id: "xray" as const,
      icon: BrainCircuit,
      label: "Lens 03: SHAP X-Ray Vectors",
      tag: "Plain-English Why",
    },
  ];

  return (
    <section
      id="example"
      className="py-20 sm:py-28 border-b-2 border-border bg-[#F4F6F9]/70 dark:bg-[#0C0E14] relative overflow-hidden transition-colors"
    >
      <div className="relative max-w-7xl mx-auto px-4 sm:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 border-border bg-surface shadow-neo-sm text-xs font-mono font-bold text-accent mb-3">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>CHAPTER 03 // THE OPTICAL LAB BENCH</span>
          </div>

          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-text-primary mb-3">
            Inspect Any Spreadsheet Through the{" "}
            <span className="font-marker font-bold text-4xl sm:text-6xl text-accent -rotate-1 inline-block px-1">
              AutoMLens
            </span>
          </h2>

          <p className="text-sm sm:text-base text-text-secondary font-sans max-w-2xl mx-auto">
            Switch between three interactive optical inspection lenses below to watch data cleaning, 5-fold cross-validation, and SHAP explainability unfold step by step.
          </p>
        </div>

        {/* Optical Lens Selector Dial + Replay */}
        <div className="max-w-4xl mx-auto mb-6 flex flex-col gap-3">
          <div className="p-1.5 sm:p-2 rounded-2xl border-2 border-border bg-surface shadow-neo flex flex-col sm:flex-row items-stretch justify-between gap-2">
            {lenses.map((lens) => {
              const isSelected = activeLens === lens.id;
              const IconComp = lens.icon;
              return (
                <button
                  key={lens.id}
                  type="button"
                  onClick={() => setActiveLens(lens.id)}
                  className={`relative flex-1 px-4 py-3 rounded-xl border-2 transition-all cursor-pointer text-left flex items-center justify-between group ${
                    isSelected
                      ? "border-accent bg-accent/10 shadow-neo-sm"
                      : "border-transparent hover:border-border hover:bg-canvas opacity-85 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg border-2 border-border ${
                        isSelected
                          ? "bg-accent text-white"
                          : "bg-surface-subtle text-text-secondary group-hover:text-text-primary"
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-display text-xs sm:text-sm font-bold text-text-primary block">
                        {lens.label}
                      </span>
                      <span className="text-[10px] font-mono text-text-muted">
                        {lens.tag}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between px-1 text-[11px] font-mono text-text-muted">
            <span>BENCHMARK ILLUSTRATION // TITANIC SURVIVAL (891 ROWS)</span>
            <button
              type="button"
              onClick={() => setReplayKey((k) => k + 1)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border-2 border-border bg-surface hover:bg-surface-subtle font-bold text-text-primary shadow-neo-sm cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-accent" />
              <span>Replay Lens</span>
            </button>
          </div>
        </div>

        {/* Stageshow Interactive Bench */}
        <div className="max-w-5xl mx-auto am-lab-stage look-automlens">
          {activeLens === "scanner" && (
            <Stage<ScannerState>
              key={`scanner-${replayKey}`}
              width={920}
              height={390}
              compact={{ below: 640, width: 358, height: 390 }}
              initial={{ fixed: false, showAudit: false, words: 0 }}
              poster={{ fixed: true, showAudit: true, words: SCANNER_WORDS }}
              script={scannerScript}
              theme={resolvedTheme}
              cursor={{
                at: { wide: { x: 740, y: 120 }, compact: { x: 290, y: 110 } },
                ripple: true,
              }}
              play="loop"
            >
              {(s, _rect, layout) => {
                const isCompact = layout === "compact";
                return (
                  <>
                    <Window
                      className="am-lab-win"
                      title="titanic_survival_q1.xlsx — Health Scanner"
                      toolbar={
                        <Badge tone={s.fixed ? "success" : "warning"}>
                          <States
                            value={s.fixed ? "clean" : "scan"}
                            states={{
                              scan: "1 Missing Value",
                              clean: "Fold-Safe Ready",
                            }}
                          />
                        </Badge>
                      }
                      body={{ "data-crop": true }}
                    >
                      <div className="am-lab-body">
                        <table className="am-lab-table">
                          <thead>
                            <tr>
                              <th>Passenger</th>
                              {!isCompact && <th>Gender</th>}
                              <th>Age</th>
                              {!isCompact && <th>Class</th>}
                              <th>Target</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>Owen Harris</td>
                              {!isCompact && <td>male</td>}
                              <td>22.0 yrs</td>
                              {!isCompact && <td>3rd Class</td>}
                              <td style={{ color: "var(--ss-danger-text)", fontWeight: 700 }}>
                                0 (Perished)
                              </td>
                            </tr>
                            <tr>
                              <td>Florence Briggs</td>
                              {!isCompact && <td>female</td>}
                              <td>38.0 yrs</td>
                              {!isCompact && <td>1st Class</td>}
                              <td style={{ color: "var(--ss-success-text)", fontWeight: 700 }}>
                                1 (Survived)
                              </td>
                            </tr>
                            <tr className="am-lab-row-flag" data-fixed={s.fixed}>
                              <td>James Moran</td>
                              {!isCompact && <td>male</td>}
                              <td>
                                <span
                                  className="am-lab-nan"
                                  data-target="nan-cell"
                                  data-cursor="pointer"
                                  data-fixed={s.fixed}
                                >
                                  <States
                                    value={s.fixed ? "done" : "nan"}
                                    states={{
                                      nan: "NaN [MISSING]",
                                      done: "28.0 yrs (Fold Median)",
                                    }}
                                  />
                                </span>
                              </td>
                              {!isCompact && <td>3rd Class</td>}
                              <td style={{ color: "var(--ss-text-faint)" }}>Hold-out</td>
                            </tr>
                          </tbody>
                        </table>

                        <Collapse open={s.showAudit}>
                          <div className="am-lab-audit">
                            <strong>In-Fold Imputation Guard (ML Rule 1):</strong>{" "}
                            Missing age imputed strictly inside each training fold (28.0 yrs)—zero test data leakage.
                          </div>
                        </Collapse>

                        <div className="am-lab-stream">
                          <div className="flex items-center justify-between text-[10px] font-mono font-bold" style={{ color: "var(--ss-accent-text)" }}>
                            <span>GEMINI 3.5 FLASH-LITE / RULE ENGINE</span>
                            <Badge tone="accent">Streamed</Badge>
                          </div>
                          <Stream text={SCANNER_NOTE} count={s.words} />
                        </div>
                      </div>
                    </Window>
                    <span
                      data-target="rest"
                      style={{
                        position: "absolute",
                        left: isCompact ? 290 : 740,
                        top: isCompact ? 110 : 120,
                        width: 1,
                        height: 1,
                      }}
                    />
                  </>
                );
              }}
            </Stage>
          )}

          {activeLens === "speedway" && (
            <Stage<SpeedwayState>
              key={`speedway-${replayKey}`}
              width={920}
              height={390}
              compact={{ below: 640, width: 358, height: 390 }}
              initial={{ done: false, lgbm: 0, rf: 0, base: 61.6 }}
              poster={{ done: true, lgbm: 84.2, rf: 83.5, base: 61.6 }}
              script={speedwayScript}
              theme={resolvedTheme}
              cursor={{
                at: { wide: { x: 640, y: 120 }, compact: { x: 240, y: 110 } },
                ripple: true,
              }}
              play="loop"
            >
              {(s, _rect, layout) => {
                const isCompact = layout === "compact";
                return (
                  <>
                    <Window
                      className="am-lab-win"
                      title="5-Fold Cross-Validation Tournament"
                      toolbar={
                        <span
                          data-target="run-race"
                          data-cursor="pointer"
                          className="px-2.5 py-1 rounded-md border border-border text-[11px] font-mono font-bold"
                          style={{
                            background: s.done ? "var(--ss-success-soft)" : "var(--ss-accent)",
                            color: s.done ? "var(--ss-success-text)" : "#fff",
                          }}
                        >
                          <States
                            value={s.done ? "done" : "run"}
                            states={{ run: "Benchmark Models", done: "5/5 Folds Complete" }}
                          />
                        </span>
                      }
                      body={{ "data-crop": true }}
                    >
                      <div className="am-lab-body">
                        <div className="am-race-card" data-champ={s.done}>
                          <div className="am-race-top">
                            <div className="flex items-center gap-2">
                              <Badge tone="success">#1 Champion</Badge>
                              <Text style={{ fontWeight: 700, fontSize: 13 }}>
                                HistGradientBoosting
                              </Text>
                            </div>
                            <span style={{ fontFamily: "var(--ss-mono)", fontWeight: 700, fontSize: 15, color: "var(--ss-success-text)" }}>
                              <Count value={s.lgbm} duration={650} format={(n) => `${n.toFixed(1)}%`} />
                            </span>
                          </div>
                          <Meter value={s.lgbm / 100} tone="success" />
                          {!isCompact && (
                            <span style={{ fontFamily: "var(--ss-mono)", fontSize: 10.5, color: "var(--ss-text-faint)" }}>
                              +22.6% lift over Dummy Baseline · Pipeline: MedianImputer + OneHotEncoder
                            </span>
                          )}
                        </div>

                        <div className="am-race-card">
                          <div className="am-race-top">
                            <div className="flex items-center gap-2">
                              <Badge tone="neutral">#2</Badge>
                              <Text style={{ fontWeight: 600, fontSize: 12.5 }}>
                                Random Forest Classifier
                              </Text>
                            </div>
                            <span style={{ fontFamily: "var(--ss-mono)", fontWeight: 700, fontSize: 14, color: "var(--ss-text-strong)" }}>
                              <Count value={s.rf} duration={650} format={(n) => `${n.toFixed(1)}%`} />
                            </span>
                          </div>
                          <Meter value={s.rf / 100} tone="accent" />
                        </div>

                        <div className="am-race-card" data-base="true">
                          <div className="am-race-top">
                            <div className="flex items-center gap-2">
                              <Badge tone="warning">Baseline</Badge>
                              <Text style={{ fontSize: 12 }}>
                                DummyClassifier (Most Frequent)
                              </Text>
                            </div>
                            <span style={{ fontFamily: "var(--ss-mono)", fontWeight: 700, fontSize: 13, color: "var(--ss-text-faint)" }}>
                              61.6%
                            </span>
                          </div>
                          <Meter value={0.616} tone="warning" />
                        </div>
                      </div>
                    </Window>
                    <span
                      data-target="rest"
                      style={{
                        position: "absolute",
                        left: isCompact ? 240 : 640,
                        top: isCompact ? 110 : 120,
                        width: 1,
                        height: 1,
                      }}
                    />
                  </>
                );
              }}
            </Stage>
          )}

          {activeLens === "xray" && (
            <Stage<XrayState>
              key={`xray-${replayKey}`}
              width={920}
              height={390}
              compact={{ below: 640, width: 358, height: 390 }}
              initial={{ mode: 0, barsOpen: false }}
              poster={{ mode: 0, barsOpen: true }}
              script={xrayScript}
              theme={resolvedTheme}
              cursor={{
                at: { wide: { x: 640, y: 120 }, compact: { x: 240, y: 110 } },
                ripple: true,
              }}
              play="loop"
            >
              {(s, _rect, layout) => (
                <>
                  <Window
                    className="am-lab-win"
                    title="SHAP Local Attribution — Florence Briggs (84.2%)"
                    toolbar={
                      <Segmented
                        value={s.mode}
                        items={["Plain English", "SHAP Math"]}
                        targets={["xray-eli5", "xray-math"]}
                        cursor="pointer"
                      />
                    }
                    body={{ "data-crop": true }}
                  >
                    <div className="am-lab-body">
                      {[
                        {
                          feature: "1. Gender: Female",
                          eli5: "Evacuation protocol prioritized women & children for lifeboats.",
                          math: "phi = +0.284 (TreeExplainer · 100 samples)",
                          pct: 0.88,
                          tone: "success" as const,
                          delta: "+28.4%",
                        },
                        {
                          feature: "2. Ticket Class: 1st Class",
                          eli5: "Upper-deck cabins sat directly adjacent to boat stations.",
                          math: "phi = +0.192 (In-fold OneHot feature)",
                          pct: 0.62,
                          tone: "accent" as const,
                          delta: "+19.2%",
                        },
                        {
                          feature: "3. Ticket Fare: $71.28",
                          eli5: "Higher fare tier correlated with upper-deck berths.",
                          math: "phi = +0.118 (StandardScaled numeric)",
                          pct: 0.41,
                          tone: "warning" as const,
                          delta: "+11.8%",
                        },
                      ].map((row) => (
                        <div key={row.feature} className="am-xray-row">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span style={{ fontWeight: 700, color: "var(--ss-text-strong)" }}>
                              {row.feature}
                            </span>
                            <span style={{ fontFamily: "var(--ss-mono)", fontWeight: 700, color: "var(--ss-success-text)" }}>
                              {row.delta}
                            </span>
                          </div>
                          <Meter value={s.barsOpen ? row.pct : 0.05} tone={row.tone} />
                          <div style={{ fontSize: 11, color: "var(--ss-text)" }}>
                            <Swap id={s.mode}>
                              {s.mode === 0 ? (
                                <span>{row.eli5}</span>
                              ) : (
                                <code style={{ fontFamily: "var(--ss-mono)", fontSize: 10.5 }}>
                                  {row.math}
                                </code>
                              )}
                            </Swap>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Window>
                  <span
                    data-target="rest"
                    style={{
                      position: "absolute",
                      left: layout === "compact" ? 240 : 640,
                      top: layout === "compact" ? 110 : 120,
                      width: 1,
                      height: 1,
                    }}
                  />
                </>
              )}
            </Stage>
          )}
        </div>
      </div>
    </section>
  );
}
