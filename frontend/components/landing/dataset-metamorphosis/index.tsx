"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { NarrativePanel } from "./narrative-panel";
import { VisualStage } from "./visual-stage";
import { STORY_SCENES } from "./story-data";
import { Scene01Arrival } from "./scenes/scene-01-arrival";
import { Scene02Discovery } from "./scenes/scene-02-discovery";
import { Scene03Decision } from "./scenes/scene-03-decision";
import { Scene04Experiment } from "./scenes/scene-04-experiment";
import { Scene05Competition } from "./scenes/scene-05-competition";
import { Scene06Explanation } from "./scenes/scene-06-explanation";
import { Scene07Outcome } from "./scenes/scene-07-outcome";

/**
 * Scene timing thresholds based on the editorial specification:
 * - Scene 01: 0% – 13%
 * - Scene 02: 13% – 27%
 * - Scene 03: 27% – 40%
 * - Scene 04: 40% – 65% (25% focus on 5-fold cross-validation)
 * - Scene 05: 65% – 77%
 * - Scene 06: 77% – 89%
 * - Scene 07: 89% – 100%
 */
function getSceneFromProgress(progress: number): number {
  if (progress < 0.13) return 0;
  if (progress < 0.27) return 1;
  if (progress < 0.4) return 2;
  if (progress < 0.65) return 3;
  if (progress < 0.77) return 4;
  if (progress < 0.89) return 5;
  return 6;
}

export function DatasetMetamorphosis() {
  const runwayRef = useRef<HTMLDivElement>(null);
  const [activeScene, setActiveScene] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Framer Motion's scroll tracker tied to the 500vh runway
  const { scrollYProgress } = useScroll({
    target: runwayRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (!isMobile) {
      const sceneIndex = getSceneFromProgress(latest);
      setActiveScene(sceneIndex);
    }
  });

  const handleSelectScene = (index: number) => {
    setActiveScene(index);
    if (!isMobile && runwayRef.current) {
      const sceneTargets = [0.05, 0.2, 0.33, 0.52, 0.71, 0.83, 0.95];
      const targetPercent = sceneTargets[index];
      const rect = runwayRef.current.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const runwayTop = rect.top + scrollTop;
      const runwayHeight = runwayRef.current.offsetHeight;
      const windowHeight = window.innerHeight;
      const scrollableDistance = runwayHeight - windowHeight;

      const targetY = runwayTop + scrollableDistance * targetPercent;
      window.scrollTo({ top: targetY, behavior: "smooth" });
    }
  };

  // Mobile Vertical Narrative Flow (< 768px: clean natural unpinned vertical stack)
  if (isMobile) {
    const scenes = [
      <Scene01Arrival key="m-0" />,
      <Scene02Discovery key="m-1" />,
      <Scene03Decision key="m-2" />,
      <Scene04Experiment key="m-3" />,
      <Scene05Competition key="m-4" />,
      <Scene06Explanation key="m-5" />,
      <Scene07Outcome key="m-6" />,
    ];

    return (
      <section className="w-full bg-[var(--story-bg)] py-16 px-4 border-b border-[var(--story-border)] transition-colors">
        <div className="max-w-xl mx-auto space-y-20">
          {STORY_SCENES.map((scene, idx) => (
            <div key={scene.id} className="space-y-4">
              {/* Scene Label & Number */}
              <div className="flex items-center justify-between border-b border-[var(--story-border)] pb-2 text-xs font-mono">
                <span className="font-bold text-[var(--story-accent-blue)]">
                  {scene.chapterLabel}
                </span>
                <span className="text-[var(--story-text-secondary)]">
                  CHAPTER {scene.chapterNumber} / 07
                </span>
              </div>

              {/* Headline & Description */}
              <div className="space-y-2">
                <h3 className="font-display text-2xl font-bold text-[var(--story-text-primary)]">
                  {scene.headline}
                </h3>
                <p className="text-sm text-[var(--story-text-secondary)] font-sans leading-relaxed">
                  {scene.narrative}
                </p>
              </div>

              {/* Visual Scene Container */}
              <div className="rounded-xl border border-[var(--story-border)] bg-[var(--story-surface)] overflow-hidden shadow-sm min-h-[420px] flex flex-col justify-between">
                {scenes[idx]}
              </div>

              {/* Annotation */}
              <div className="p-2.5 rounded bg-[var(--story-surface-subtle)] border border-[var(--story-border)] font-mono text-[11px] text-[var(--story-text-secondary)]">
                {scene.technicalAnnotation}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Desktop Pinned Storyboard Runway (520vh Runway with CSS sticky top-0 h-screen)
  return (
    <div
      ref={runwayRef}
      id="dataset-metamorphosis-runway"
      className="relative w-full h-[520vh] bg-[var(--story-bg)]"
    >
      {/* Sticky Viewport Container: Physically Locked to the Screen while user scrolls the 520vh runway */}
      <div className="sticky top-0 w-full h-screen border-b border-[var(--story-border)] transition-colors overflow-hidden flex flex-col justify-center">
        
        {/* Top Storyline Progress Hairline Beam */}
        <motion.div
          style={{ scaleX: scrollYProgress, originX: 0 }}
          className="absolute top-0 left-0 right-0 h-1 bg-[var(--story-accent-blue)] z-50 shadow-[0_0_8px_var(--story-accent-blue)]"
        />

        {/* Background Precision Grid Lines */}
        <div
          className="absolute inset-0 opacity-[0.25] dark:opacity-[0.12] pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, var(--story-grid) 1px, transparent 1px),
              linear-gradient(to bottom, var(--story-grid) 1px, transparent 1px)
            `,
            backgroundSize: "36px 36px",
          }}
        />

        {/* Main 1440px Constrained Content Container */}
        <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-12 h-full flex flex-col justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Narrative Region (~35% of width) */}
            <div className="lg:col-span-4 flex flex-col justify-center">
              <NarrativePanel
                activeScene={activeScene}
                onSelectScene={handleSelectScene}
              />
            </div>

            {/* Right Visual Stage Region (~65% of width) */}
            <div className="lg:col-span-8 flex flex-col justify-center">
              <VisualStage activeScene={activeScene} />
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
