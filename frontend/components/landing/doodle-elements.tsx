"use client";

import React from "react";

/**
 * Hand-drawn wavy underline doodle for highlighting key words in headlines
 */
export function DoodleUnderline({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full overflow-visible ${className}`}
      preserveAspectRatio="none"
    >
      <path
        d="M3 13C38.5 4.5 98.2 2.8 141.5 6.5C178.5 9.6 215.8 14.5 237 8"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M28 15C74 8 160 5.5 220 12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

/**
 * Hand-drawn curved arrow with organic arrowhead
 */
export function DoodleArrow({
  className = "",
  flip = false,
}: {
  className?: string;
  flip?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 100 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-14 h-10 ${flip ? "-scale-x-100" : ""} ${className}`}
    >
      <path
        d="M8 12C28 8 72 16 82 46"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M68 45C75 47 81 48 84 48C83 41 81 33 80 25"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Washi Tape sticker with torn edges to pin cards to the sketchbook
 */
export function TapeSticker({
  className = "",
  color = "bg-amber-200/80 dark:bg-amber-500/30",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`h-6 w-20 backdrop-blur-[1px] border border-black/10 dark:border-white/10 shadow-sm rotate-[-3deg] select-none pointer-events-none ${color} ${className}`}
      style={{
        clipPath:
          "polygon(0% 15%, 5% 0%, 95% 4%, 100% 20%, 96% 85%, 100% 100%, 5% 95%, 0% 80%)",
      }}
    />
  );
}

/**
 * Rubber Stamp badge with a weathered, hand-stamped border
 */
export function SketchStamp({
  label,
  sublabel,
  color = "border-red-500 text-red-600 dark:border-red-400 dark:text-red-400",
  rotation = "-rotate-3",
}: {
  label: string;
  sublabel?: string;
  color?: string;
  rotation?: string;
}) {
  return (
    <div
      className={`inline-flex flex-col items-center justify-center px-2.5 py-1 rounded-sm border-2 border-dashed uppercase font-mono font-black tracking-widest text-[9px] sm:text-[10px] select-none ${color} ${rotation} shadow-sm`}
    >
      <span>{label}</span>
      {sublabel && <span className="text-[7px] tracking-normal font-sans opacity-80">{sublabel}</span>}
    </div>
  );
}

/**
 * Hand-drawn paper clip pinning notes together
 */
export function PaperClip({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-6 h-12 text-slate-400 dark:text-slate-500 select-none ${className}`}
    >
      <path
        d="M12 4C7 4 4 7 4 13V35C4 41 8 44 13 44C18 44 21 41 21 35V10C21 6 18 3 14 3C10 3 7 6 7 10V33C7 36 9 38 12 38C15 38 17 36 17 33V12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
