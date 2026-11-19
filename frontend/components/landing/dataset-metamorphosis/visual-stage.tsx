"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Scene01Arrival } from "./scenes/scene-01-arrival";
import { Scene02Discovery } from "./scenes/scene-02-discovery";
import { Scene03Decision } from "./scenes/scene-03-decision";
import { Scene04Experiment } from "./scenes/scene-04-experiment";
import { Scene05Competition } from "./scenes/scene-05-competition";
import { Scene06Explanation } from "./scenes/scene-06-explanation";
import { Scene07Outcome } from "./scenes/scene-07-outcome";

interface VisualStageProps {
  activeScene: number;
}

export function VisualStage({ activeScene }: VisualStageProps) {
  const renderScene = () => {
    switch (activeScene) {
      case 0:
        return <Scene01Arrival key="scene-01" />;
      case 1:
        return <Scene02Discovery key="scene-02" />;
      case 2:
        return <Scene03Decision key="scene-03" />;
      case 3:
        return <Scene04Experiment key="scene-04" />;
      case 4:
        return <Scene05Competition key="scene-05" />;
      case 5:
        return <Scene06Explanation key="scene-06" />;
      case 6:
        return <Scene07Outcome key="scene-07" />;
      default:
        return <Scene01Arrival key="scene-default" />;
    }
  };

  return (
    <div className="relative w-full h-[480px] sm:h-[530px] lg:h-[min(580px,68vh)] rounded-xl border border-[var(--story-border)] bg-[var(--story-surface)] shadow-neo-sm overflow-hidden flex flex-col justify-between transition-colors">
      {/* Precision CAD Corner Registration Marks */}
      <div className="absolute top-2 left-2 text-[9px] font-mono text-[var(--story-text-muted)] pointer-events-none select-none">
        ┌
      </div>
      <div className="absolute top-2 right-2 text-[9px] font-mono text-[var(--story-text-muted)] pointer-events-none select-none">
        ┐
      </div>
      <div className="absolute bottom-2 left-2 text-[9px] font-mono text-[var(--story-text-muted)] pointer-events-none select-none">
        └
      </div>
      <div className="absolute bottom-2 right-2 text-[9px] font-mono text-[var(--story-text-muted)] pointer-events-none select-none">
        ┘
      </div>

      {/* Background Precision Blueprint Grid */}
      <div
        className="absolute inset-0 opacity-[0.25] dark:opacity-[0.12] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--story-grid) 1px, transparent 1px),
            linear-gradient(to bottom, var(--story-grid) 1px, transparent 1px)
          `,
          backgroundSize: "28px 28px",
        }}
      />

      {/* Central Visual Metamorphosis Container */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeScene}
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="w-full h-full flex flex-col justify-between"
          >
            {renderScene()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
