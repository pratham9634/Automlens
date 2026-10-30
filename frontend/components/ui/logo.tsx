import * as React from "react";
import { cn } from "@/lib/utils";

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  showGlow?: boolean;
}

/**
 * AutoMLens Icon: Stylized 'A' + Precision Optical Lens Aperture + Glowing Telemetry Orbit Ring.
 * Designed to fit the "Icy Tech Telemetry" aesthetic.
 */
export function AutoMLensIcon({
  size = 32,
  showGlow = true,
  className,
  ...props
}: LogoProps) {
  const numSize = typeof size === "number" ? size : parseInt(size, 10) || 32;

  return (
    <svg
      width={numSize}
      height={numSize}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 select-none", showGlow && "filter drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]", className)}
      {...props}
    >
      <defs>
        {/* 'A' Structure Gradient (Cool Azure to Deep Violet) */}
        <linearGradient id="automlens_a_gradient" x1="15" y1="15" x2="85" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>

        {/* Telemetry Orbital Ring Gradient (Electric Cyan Glow) */}
        <linearGradient id="automlens_orbit_gradient" x1="5" y1="65" x2="95" y2="45" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#22D3EE" stopOpacity="1" />
          <stop offset="100%" stopColor="#818CF8" stopOpacity="0.85" />
        </linearGradient>

        {/* Optical Lens Core Gradient */}
        <radialGradient id="automlens_lens_core" cx="50" cy="56" r="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="35%" stopColor="#0284C7" />
          <stop offset="70%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#090D16" />
        </radialGradient>

        {/* Lens Rim Reflection */}
        <linearGradient id="automlens_rim_gradient" x1="38" y1="44" x2="62" y2="68" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E2E8F0" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#334155" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* 1. Back Arc of Orbital Telemetry Ring (passes behind the top of A) */}
      <path
        d="M 12,56 C 12,43 88,38 88,50"
        stroke="url(#automlens_orbit_gradient)"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.35"
      />

      {/* 2. Primary Letter 'A' Monogram Structure */}
      {/* Left Leg + Apex + Right Leg */}
      <path
        d="M 50,14 C 53,14 55,17 57,21 L 82,74 C 84,78 82,82 77,82 L 67,82 C 63,82 60,79 59,76 L 53,62 L 47,62 L 41,76 C 40,79 37,82 33,82 L 23,82 C 18,82 16,78 18,74 L 43,21 C 45,17 47,14 50,14 Z"
        fill="url(#automlens_a_gradient)"
      />

      {/* 3. The "Lens" (Optical Aperture System in the core triangle) */}
      {/* Outer Aperture Ring */}
      <circle cx="50" cy="56" r="14" fill="#090D16" stroke="url(#automlens_rim_gradient)" strokeWidth="2.5" />

      {/* Concentric Optical Element */}
      <circle cx="50" cy="56" r="10" fill="url(#automlens_lens_core)" />

      {/* Aperture Iris Aperture Shutter Blades Indicator */}
      <circle cx="50" cy="56" r="5" fill="#090D16" stroke="#06B6D4" strokeWidth="1.5" />

      {/* Lens Optical Light Glint Reflection */}
      <circle cx="47.5" cy="53.5" r="2" fill="#FFFFFF" opacity="0.95" />
      <circle cx="52" cy="58" r="0.8" fill="#38BDF8" opacity="0.8" />

      {/* 4. Front Arc of Orbital Telemetry Ring (loops boldly across the front of A) */}
      <path
        d="M 10,54 C 10,68 90,72 88,52"
        stroke="url(#automlens_orbit_gradient)"
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* 5. Telemetry Validation Orbit Node (Small glowing cyan satellite data particle) */}
      <circle cx="83" cy="53" r="3" fill="#22D3EE" />
      <circle cx="83" cy="53" r="5" stroke="#06B6D4" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

interface FullLogoProps {
  size?: "sm" | "md" | "lg";
  showSubtitle?: boolean;
  className?: string;
}

/**
 * Complete AutoMLens Brand Unit: Icon + Anton Wordmark + Telemetry Subtitle
 */
export function AutoMLensLogo({
  size = "md",
  showSubtitle = true,
  className,
}: FullLogoProps) {
  const iconSizes = {
    sm: 26,
    md: 34,
    lg: 44,
  };

  const titleSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  };

  const subtitleSizes = {
    sm: "text-[9px]",
    md: "text-[10px]",
    lg: "text-[11px]",
  };

  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <AutoMLensIcon size={iconSizes[size]} />
      <div className="flex flex-col min-w-0">
        <div className={cn("font-display tracking-wide uppercase leading-none flex items-center", titleSizes[size])}>
          <span className="text-text-primary">AutoM</span>
          <span className="bg-gradient-to-r from-cyan-400 to-accent bg-clip-text text-transparent">
            Lens
          </span>
        </div>
        {showSubtitle && (
          <span
            className={cn(
              "font-mono text-text-muted uppercase tracking-wider leading-tight mt-0.5",
              subtitleSizes[size]
            )}
          >
            Human-Assisted AutoML
          </span>
        )}
      </div>
    </div>
  );
}

