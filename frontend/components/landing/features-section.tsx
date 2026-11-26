"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Layers, ShieldCheck } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import {
  Badge,
  Bar,
  Connector,
  Count,
  Icon,
  Segmented,
  Stage,
  States,
  Stream,
  Swap,
  Text,
  Window,
  type Act,
  type Rect,
  useReducedMotion,
} from "@/components/stageshow/kit";
import "@/components/stageshow/automlens-look.css";
import "./features-bento.css";

function usePictureWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(420);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => setWidth(Math.max(220, Math.round(node.getBoundingClientRect().width)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  return [ref, width] as const;
}

function useInViewOnce<T extends Element>(delayMs = 200) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        timer = window.setTimeout(() => setSeen(true), delayMs);
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [delayMs]);

  return [ref, seen] as const;
}

/* ---------------- Tile 1: Hero Analyst Window ---------------- */

type AnalystBeat = { words: number; ready: boolean };
const ANALYST_REPLY =
  "Month-to-month contract (+0.34) and $115 monthly fee (+0.21) explain 84% churn risk. Switching to 1-year drops risk to 22%.";
const ANALYST_TOTAL_WORDS = ANALYST_REPLY.split(" ").length;

async function analystScript(a: Act<AnalystBeat>) {
  await a.wait(350);
  for (let w = 4; w <= ANALYST_TOTAL_WORDS; w += 4) {
    await a.set({ words: Math.min(w, ANALYST_TOTAL_WORDS) });
    await a.wait(90);
  }
  await a.set({ words: ANALYST_TOTAL_WORDS, ready: true });
}

function AnalystHeroTile({ theme }: { theme: "light" | "dark" }) {
  const [ref, width] = usePictureWidth();
  return (
    <article className="am-bento-tile am-bento-tile--hero">
      <p className="am-bento-copy">
        <b>Ask your numbers in plain English.</b> Built-in AI Data Analyst cites real SHAP values and model metrics without SQL.
      </p>

      <div ref={ref} className="am-bento-picture" style={{ height: 266 }}>
        <div className="look-automlens" style={{ width: "100%", height: "100%" }}>
          <Stage<AnalystBeat>
            width={width}
            height={266}
            initial={{ words: 4, ready: false }}
            poster={{ words: ANALYST_TOTAL_WORDS, ready: true }}
            play="once"
            script={analystScript}
            theme={theme}
          >
            {(s) => (
              <Window
                className="am-bento-window"
                title="Lens AI Copilot · Grounded in Run #42"
                toolbar={
                  <Badge tone={s.ready ? "success" : "accent"} dot={!s.ready}>
                    {s.ready ? "Verified" : "Streaming"}
                  </Badge>
                }
                body={{ "data-crop": true }}
              >
                <div className="am-bento-chat">
                  <div className="am-bento-msg-user">
                    Why did Customer #492 churn right after month 3?
                  </div>
                  <div className="am-bento-msg-ai">
                    <div className="am-bento-msg-meta">
                      <span>AI ANALYST · SHAP GROUNDED</span>
                      <Bar w={38} h={5} tone={2} />
                    </div>
                    <div>
                      <Stream text={ANALYST_REPLY} count={s.words} />
                    </div>
                  </div>
                </div>
              </Window>
            )}
          </Stage>
        </div>
      </div>
    </article>
  );
}

/* ---------------- Tile 2: Dark Stat Tile ---------------- */

function ZeroLeakageStatTile() {
  const reduced = useReducedMotion();
  const [ref, seen] = useInViewOnce<HTMLDivElement>(180);

  return (
    <article ref={ref} className="am-bento-tile am-bento-tile--stat">
      <div className="am-bento-stat">
        <div className="flex items-center justify-between">
          <span className="am-bento-stat-kicker">Academic Rule 1 &amp; 3</span>
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </div>

        <div className="space-y-1.5">
          <div className="am-bento-stat-num">
            <Count value={seen || reduced ? 5 : 1} duration={850} />
            <span className="text-sky-400 text-2xl ml-1.5 font-mono">Folds</span>
          </div>
          <div className="text-xs font-mono text-emerald-400 font-bold">
            0.00 Leakage Guarantee
          </div>
        </div>

        <p className="am-bento-stat-sub">
          Imputation, encoding, and scaling fit strictly inside each cross-validation fold—never on the full dataset.
        </p>
      </div>
    </article>
  );
}

/* ---------------- Tile 3: ELI5 Cropped Control ---------------- */

function Eli5ControlTile({ theme }: { theme: "light" | "dark" }) {
  const [ref, width] = usePictureWidth();
  const [mode, setMode] = useState<0 | 1>(0);

  return (
    <article className="am-bento-tile am-bento-tile--eli5">
      <p className="am-bento-copy">
        <b>Math or plain English.</b> Toggle any SHAP explanation between human takeaways and exact Shapley values.
      </p>

      <div ref={ref} className="am-bento-picture" style={{ height: 175 }}>
        <div className="look-automlens" style={{ width: "100%", height: "100%" }}>
          <Stage width={width} height={175} theme={theme}>
            {() => (
              <div className="am-bento-eli5-stage">
                <div
                  className="inline-flex cursor-pointer"
                  onClick={() => setMode((m) => (m === 0 ? 1 : 0))}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setMode((m) => (m === 0 ? 1 : 0));
                    }
                  }}
                  aria-label="Toggle Plain English and Raw SHAP view"
                >
                  <Segmented
                    value={mode}
                    items={["★ Plain English", "Raw SHAP Math"]}
                  />
                </div>

                <div className="am-bento-eli5-card">
                  <Swap id={mode}>
                    {mode === 0 ? (
                      <span>
                        1st-class passengers had a{" "}
                        <strong style={{ color: "var(--ss-accent-text)" }}>+47.6%</strong>{" "}
                        higher survival likelihood due to deck proximity.
                      </span>
                    ) : (
                      <code style={{ fontFamily: "var(--ss-mono)", fontSize: 11 }}>
                        phi_class = +0.192 | TreeExplainer (100 samples)
                      </code>
                    )}
                  </Swap>
                </div>
              </div>
            )}
          </Stage>
        </div>
      </div>
    </article>
  );
}

/* ---------------- Tile 4: Live What-If Simulator ---------------- */

function WhatIfControlTile({ theme }: { theme: "light" | "dark" }) {
  const [ref, width] = usePictureWidth();
  const [fare, setFare] = useState(75);
  const [family, setFamily] = useState(true);

  const prob = Math.min(95, Math.max(15, Math.round(35 + fare * 0.45 + (family ? 18 : 0))));

  return (
    <article className="am-bento-tile am-bento-tile--whatif">
      <p className="am-bento-copy">
        <b>Live What-If scenarios.</b> Test hypothetical records in real time without retraining.
      </p>

      <div ref={ref} className="am-bento-picture" style={{ height: 192 }}>
        <div className="look-automlens" style={{ width: "100%", height: "100%" }}>
          <Stage width={width} height={192} theme={theme}>
            {() => (
              <div className="am-bento-eli5-stage" style={{ gap: 10 }}>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span style={{ color: "var(--ss-text)" }}>Ticket Fare</span>
                  <strong style={{ color: "var(--ss-accent-text)" }}>${fare}.00</strong>
                </div>

                <input
                  type="range"
                  min={10}
                  max={150}
                  value={fare}
                  onChange={(e) => setFare(Number(e.target.value))}
                  aria-label="Simulate ticket fare"
                  className="w-full accent-accent cursor-pointer"
                />

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setFamily((f) => !f)}
                    className="px-2.5 py-1 rounded-md border border-border bg-surface-subtle text-[11px] font-mono font-bold text-text-primary cursor-pointer"
                  >
                    {family ? "✓ Family (+18%)" : "Alone (0%)"}
                  </button>

                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        fontFamily: "var(--ss-mono)",
                        fontWeight: 700,
                        fontSize: 16,
                        color: "var(--ss-text-strong)",
                      }}
                    >
                      <Count value={prob} duration={360} format={(n) => `${Math.round(n)}%`} />
                    </span>
                    <Badge tone={prob >= 60 ? "success" : "warning"}>
                      <States
                        value={prob >= 60 ? "high" : "risk"}
                        states={{ high: "Likely", risk: "At Risk" }}
                      />
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </Stage>
        </div>
      </div>
    </article>
  );
}

/* ---------------- Tile 5: Pipeline Connector Diagram ---------------- */

type PipeBeat = { drawn: boolean };

async function pipeScript(a: Act<PipeBeat>) {
  await a.wait(420);
  await a.set({ drawn: true });
}

function PipelineConnectorTile({ theme }: { theme: "light" | "dark" }) {
  const [ref, width] = usePictureWidth();

  return (
    <article className="am-bento-tile am-bento-tile--pipeline">
      <p className="am-bento-copy">
        <b>Auditable pipeline export.</b> Full preprocessing + estimator + seed sealed in one `.joblib` artifact.
      </p>

      <div ref={ref} className="am-bento-picture" style={{ height: 190 }}>
        <div className="look-automlens" style={{ width: "100%", height: "100%" }}>
          <Stage<PipeBeat>
            width={width}
            height={190}
            initial={{ drawn: false }}
            poster={{ drawn: true }}
            play="once"
            script={pipeScript}
            theme={theme}
          >
            {(s, rect) => {
              const rightOf = (r: Rect) => ({ x: r.x + r.width, y: r.y + r.height / 2 });
              const leftOf = (r: Rect) => ({ x: r.x, y: r.y + r.height / 2 });
              const target = rect("bundle");
              const sources = ["src-csv", "src-cv", "src-shap"];

              return (
                <>
                  <div className="am-bento-pipe-nodes">
                    <div className="am-bento-pipe-col">
                      <span className="am-bento-node" data-target="src-csv">
                        <Icon name="file" size={12} />
                        <Text>dataset.csv</Text>
                      </span>
                      <span className="am-bento-node" data-target="src-cv">
                        <Icon name="bolt" size={12} />
                        <Text>5-Fold CV</Text>
                      </span>
                      <span className="am-bento-node" data-target="src-shap">
                        <Icon name="star" size={12} />
                        <Text>SHAP Map</Text>
                      </span>
                    </div>

                    <div className="am-bento-target-node" data-target="bundle">
                      <span style={{ fontSize: 11, fontWeight: 700 }}>model.joblib</span>
                      <span style={{ fontSize: 9.5, color: "var(--ss-text-faint)" }}>
                        SHA-256 · Seed 42
                      </span>
                    </div>
                  </div>

                  {target.width > 0 &&
                    sources.map((id) => {
                      const from = rect(id);
                      return from.width > 0 ? (
                        <Connector
                          key={id}
                          from={rightOf(from)}
                          to={leftOf(target)}
                          route="step"
                          show={s.drawn}
                        />
                      ) : null;
                    })}
                </>
              );
            }}
          </Stage>
        </div>
      </div>
    </article>
  );
}

export function FeaturesSection() {
  const { resolvedTheme } = useTheme();

  return (
    <section
      id="features"
      className="py-20 sm:py-28 border-b-2 border-border bg-canvas relative overflow-hidden transition-colors"
    >
      <div className="relative max-w-7xl mx-auto px-4 sm:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 border-border bg-surface shadow-neo-sm text-xs font-mono font-bold text-accent mb-3">
            <Layers className="w-3.5 h-3.5" />
            <span>ENGINEERING SUITE // FIVE COHESIVE INSTRUMENTS</span>
          </div>

          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-text-primary mb-3">
            Built for Clarity.{" "}
            <span className="font-marker font-bold text-4xl sm:text-6xl text-accent -rotate-1 inline-block px-1">
              Zero Code.
            </span>
          </h2>

          <p className="text-sm sm:text-base text-text-secondary font-sans max-w-2xl mx-auto">
            Every part of the modeling lifecycle—from fold-isolated cleaning to counterfactual What-If testing—is transparent, interactive, and auditable.
          </p>
        </div>

        {/* Stageshow Disciplined Asymmetric Bento Grid */}
        <div className="am-bento">
          <div className="am-bento-grid">
            <AnalystHeroTile theme={resolvedTheme} />
            <ZeroLeakageStatTile />
            <Eli5ControlTile theme={resolvedTheme} />
            <WhatIfControlTile theme={resolvedTheme} />
            <PipelineConnectorTile theme={resolvedTheme} />
          </div>
        </div>
      </div>
    </section>
  );
}
