"use client";

import { useEffect, useRef } from "react";

type Point = { x: number; y: number };

function getIsDarkMode(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}

export default function DotBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const cursorRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  const pointsRef = useRef<Point[]>([]);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const canvasNode: HTMLCanvasElement = canvasEl;

    const ctx = canvasNode.getContext("2d");
    if (!ctx) return;
    const ctxNode: CanvasRenderingContext2D = ctx;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const step = 24; // density
    const radius = 300; // cursor influence radius
    const strength = 22; // max local displacement
    const globalStrength = 14; // subtle parallax displacement

    let width = 0;
    let height = 0;
    let dpr = 1;

    function rebuildPoints() {
      const w = width;
      const h = height;
      const pts: Point[] = [];
      const startX = step / 2;
      const startY = step / 2;

      for (let y = startY; y < h; y += step) {
        for (let x = startX; x < w; x += step) {
          pts.push({ x, y });
        }
      }

      pointsRef.current = pts;
    }

    function resize() {
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);

      canvasNode.style.width = `${width}px`;
      canvasNode.style.height = `${height}px`;
      canvasNode.width = Math.floor(width * dpr);
      canvasNode.height = Math.floor(height * dpr);

      ctxNode.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuildPoints();
    }

    function draw() {
      const w = width;
      const h = height;
      if (w <= 0 || h <= 0) return;

      const isDark = getIsDarkMode();
      const baseAlpha = isDark ? 0.22 : 0.34;
      const dotColor = isDark
        ? `rgba(255,255,255,${baseAlpha})`
        : `rgba(210,210,210,${baseAlpha})`;

      ctxNode.clearRect(0, 0, w, h);

      const cursor = cursorRef.current;
      const cx = cursor.active ? cursor.x : w / 2;
      const cy = cursor.active ? cursor.y : h / 2;

      // Global parallax: move the whole field slightly based on cursor position.
      const nx = (cx - w / 2) / (w / 2);
      const ny = (cy - h / 2) / (h / 2);
      const globalX = nx * globalStrength;
      const globalY = ny * globalStrength;

      ctxNode.fillStyle = dotColor;

      const pts = pointsRef.current;
      const r2 = radius * radius;

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];

        let x = p.x + globalX * 0.25;
        let y = p.y + globalY * 0.25;

        if (!prefersReducedMotion) {
          const dx = p.x - cx;
          const dy = p.y - cy;
          const dist2 = dx * dx + dy * dy;

          if (dist2 < r2 && dist2 > 0.0001) {
            const dist = Math.sqrt(dist2);
            const falloff = 1 - dist / radius; // 0..1
            const disp = falloff * falloff * strength;
            // Repel away from the cursor (dx,dy already point away from cursor).
            x += (dx / dist) * disp * 0.55;
            y += (dy / dist) * disp * 0.55;
          }
        }

        // Small dots; slightly larger for discoverability.
        ctxNode.beginPath();
        ctxNode.arc(x, y, 1.55, 0, Math.PI * 2);
        ctxNode.fill();
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      cursorRef.current.x = e.clientX;
      cursorRef.current.y = e.clientY;
      cursorRef.current.active = true;
    };

    const onPointerLeave = () => {
      cursorRef.current.active = false;
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);

    const tick = () => {
      draw();
      rafRef.current = window.requestAnimationFrame(tick);
    };

    tick();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 opacity-100"
    />
  );
}

