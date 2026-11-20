"use client";

import React, { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useMotionTemplate } from "framer-motion";

export function HeroGridBackground() {
  const [mounted, setMounted] = useState(false);

  // Motion values for smooth cursor tracking
  const mouseX = useMotionValue(500);
  const mouseY = useMotionValue(250);

  // Smooth spring physics for spotlight follow
  const springX = useSpring(mouseX, { stiffness: 100, damping: 18 });
  const springY = useSpring(mouseY, { stiffness: 100, damping: 18 });

  useEffect(() => {
    setMounted(true);

    if (typeof window !== "undefined") {
      mouseX.set(window.innerWidth / 2);
      mouseY.set(240);
    }

    const handleMouseMove = (e: MouseEvent) => {
      const hero = document.getElementById("hero-section");
      if (hero) {
        const rect = hero.getBoundingClientRect();
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
      } else {
        mouseX.set(e.clientX);
        mouseY.set(e.clientY);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  // Spotlight templates for Light & Dark mode
  const spotlightDark = useMotionTemplate`radial-gradient(420px circle at ${springX}px ${springY}px, rgba(34, 211, 238, 0.38), rgba(99, 102, 241, 0.16) 45%, transparent 75%)`;
  const spotlightLight = useMotionTemplate`radial-gradient(380px circle at ${springX}px ${springY}px, rgba(2, 132, 199, 0.24), rgba(245, 158, 11, 0.14) 45%, transparent 75%)`;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      {/* 1. VISIBLE GRID LAYER (Light & Dark with distinct contrast) */}
      {/* Light Mode Grid */}
      <div
        className="block dark:hidden absolute inset-0 w-full h-full"
        style={{
          maskImage: "radial-gradient(ellipse 85% 75% at 50% 45%, black 45%, transparent 90%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 85% 75% at 50% 45%, black 45%, transparent 90%)",
        }}
      >
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="hero-grid-light"
              width="48"
              height="48"
              patternUnits="userSpaceOnUse"
            >
              {/* Grid cell lines */}
              <path
                d="M 48 0 L 0 0 0 48"
                fill="none"
                stroke="#0F172A"
                strokeWidth="1.2"
                strokeOpacity="0.12"
              />
              {/* Intersection Crosshair */}
              <path
                d="M -5 0 L 5 0 M 0 -5 L 0 5"
                fill="none"
                stroke="#0284C7"
                strokeWidth="1.8"
                strokeOpacity="0.55"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid-light)" />
        </svg>
      </div>

      {/* Dark Mode Grid */}
      <div
        className="hidden dark:block absolute inset-0 w-full h-full"
        style={{
          maskImage: "radial-gradient(ellipse 85% 75% at 50% 45%, black 45%, transparent 90%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 85% 75% at 50% 45%, black 45%, transparent 90%)",
        }}
      >
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="hero-grid-dark"
              width="48"
              height="48"
              patternUnits="userSpaceOnUse"
            >
              {/* Grid cell lines */}
              <path
                d="M 48 0 L 0 0 0 48"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="1.2"
                strokeOpacity="0.18"
              />
              {/* Glowing Intersection Crosshair */}
              <path
                d="M -5 0 L 5 0 M 0 -5 L 0 5"
                fill="none"
                stroke="#22D3EE"
                strokeWidth="2"
                strokeOpacity="0.85"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid-dark)" />
        </svg>
      </div>

      {/* 2. DYNAMIC MOUSE SPOTLIGHT (Illuminates the grid under the cursor) */}
      {mounted && (
        <>
          {/* Dark Mode Spotlight */}
          <motion.div
            className="hidden dark:block absolute inset-0"
            style={{
              background: spotlightDark,
            }}
          />

          {/* Light Mode Spotlight */}
          <motion.div
            className="block dark:hidden absolute inset-0"
            style={{
              background: spotlightLight,
            }}
          />
        </>
      )}

      {/* 3. AMBIENT GLOWING LIGHT ORBS (Continuous breathing aura) */}
      {/* Light Mode Orbs */}
      <div className="block dark:hidden">
        <motion.div
          animate={{
            x: [-30, 40, -30],
            y: [-20, 30, -20],
            scale: [1, 1.2, 1],
            opacity: [0.35, 0.55, 0.35],
          }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 left-1/4 w-[420px] h-[320px] rounded-full blur-[80px] bg-sky-300/40 pointer-events-none"
        />
        <motion.div
          animate={{
            x: [30, -40, 30],
            y: [20, -30, 20],
            scale: [1, 1.25, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-24 right-1/4 w-[380px] h-[300px] rounded-full blur-[90px] bg-amber-300/35 pointer-events-none"
        />
      </div>

      {/* Dark Mode Orbs */}
      <div className="hidden dark:block">
        <motion.div
          animate={{
            x: [-40, 50, -40],
            y: [-20, 30, -20],
            scale: [1, 1.25, 1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-8 left-1/4 w-[460px] h-[360px] rounded-full blur-[95px] bg-cyan-500/35 pointer-events-none"
        />
        <motion.div
          animate={{
            x: [40, -50, 40],
            y: [20, -30, 20],
            scale: [1, 1.2, 1],
            opacity: [0.35, 0.6, 0.35],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-20 right-1/4 w-[420px] h-[340px] rounded-full blur-[100px] bg-purple-600/30 pointer-events-none"
        />
      </div>

      {/* 4. VISIBLE TRAVELING LIGHT BEAMS (Animated Beams sweeping across grid lines) */}
      {/* Horizontal Light Beam Sweep 1 */}
      <motion.div
        animate={{
          x: ["-100%", "250%"],
          opacity: [0, 0.8, 1, 0.8, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
          repeatDelay: 2.5,
        }}
        className="absolute top-[144px] left-0 w-[300px] h-[2px] bg-gradient-to-r from-transparent via-cyan-400 dark:via-cyan-300 to-transparent blur-[1px] shadow-[0_0_12px_#38BDF8] pointer-events-none"
      />

      {/* Horizontal Light Beam Sweep 2 (Lower grid line) */}
      <motion.div
        animate={{
          x: ["250%", "-100%"],
          opacity: [0, 0.7, 1, 0.7, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          repeatDelay: 3.5,
          delay: 2,
        }}
        className="absolute top-[336px] left-0 w-[320px] h-[2px] bg-gradient-to-r from-transparent via-amber-400 dark:via-sky-400 to-transparent blur-[1px] shadow-[0_0_10px_#F59E0B] pointer-events-none"
      />

      {/* Vertical Light Beam Sweep (Travels down a grid line) */}
      <motion.div
        animate={{
          y: ["-50%", "200%"],
          opacity: [0, 0.7, 1, 0.7, 0],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
          repeatDelay: 4,
          delay: 1,
        }}
        className="absolute top-0 left-1/3 w-[2px] h-[220px] bg-gradient-to-b from-transparent via-cyan-400 dark:via-cyan-300 to-transparent blur-[1px] shadow-[0_0_10px_#22D3EE] pointer-events-none"
      />
    </div>
  );
}
