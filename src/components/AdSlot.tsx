"use client";

import { useEffect, useRef } from "react";

type AdSlotProps = {
  width?: number | string;
  height?: number;
  className?: string;
};

export default function AdSlot({ width = "100%", height = 280, className = "" }: AdSlotProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // AdSense can be initialised here when the publisher script is approved.
    // The reserved box intentionally remains if the ad does not fill.
  }, []);

  return (
    <div
      ref={ref}
      aria-label="Advertisement"
      className={`relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] ${className}`}
      style={{ width, minWidth: 0, height, minHeight: height }}
    >
      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Advertisement
      </span>
    </div>
  );
}
