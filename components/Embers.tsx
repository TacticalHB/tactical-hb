"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  amax: number;
  phase: number;
  ember: boolean;
  bright: boolean;
};

export default function Embers({
  density = 1,
  className = "",
}: {
  density?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let particles: Particle[] = [];
    let raf = 0;
    let running = true;

    const root = getComputedStyle(document.documentElement);
    const accentRgb = root.getPropertyValue("--accent-rgb").trim() || "196, 163, 90";
    const accentBrightRgb = root.getPropertyValue("--accent-ember-bright-rgb").trim() || "228, 210, 160";

    const spawn = (initial: boolean): Particle => {
      const ember = Math.random() < 0.7;
      const bright = ember && Math.random() < 0.18;
      return {
        x: Math.random() * w,
        y: initial ? Math.random() * h : ember ? h + 8 : -8,
        r: ember ? 0.6 + Math.random() * (bright ? 2 : 1.4) : 0.4 + Math.random() * 0.9,
        vy: ember ? -(0.12 + Math.random() * 0.35) : 0.08 + Math.random() * 0.22,
        vx: (Math.random() - 0.5) * 0.22,
        amax: ember ? (bright ? 0.85 : 0.45 + Math.random() * 0.35) : 0.1 + Math.random() * 0.14,
        phase: Math.random() * Math.PI * 2,
        ember,
        bright,
      };
    };

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(((w * h) / 16000) * density);
      particles = Array.from({ length: count }, () => spawn(true));
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx + Math.sin(t / 1000 + p.phase) * 0.1;
        p.y += p.vy;

        const prog = p.ember ? (h - p.y) / h : p.y / h;
        const envelope = Math.sin(Math.max(0, Math.min(1, prog)) * Math.PI);
        const flicker = p.ember ? 0.7 + 0.3 * Math.sin(t * 0.006 + p.phase) : 1;
        const a = p.amax * envelope * flicker;

        if (p.ember) {
          ctx.shadowBlur = p.bright ? 10 : 6;
          ctx.shadowColor = `rgba(${accentRgb},0.9)`;
          ctx.fillStyle = p.bright
            ? `rgba(${accentBrightRgb},${a})`
            : `rgba(${accentRgb},${a})`;
        } else {
          ctx.shadowBlur = 0;
          ctx.fillStyle = `rgba(190,190,196,${a})`;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        if (p.ember && p.y < -8) Object.assign(p, spawn(false));
        if (!p.ember && p.y > h + 8) Object.assign(p, spawn(false));
      }
      ctx.shadowBlur = 0;
      if (running) raf = requestAnimationFrame(draw);
    };

    resize();

    if (reduce) {
      // static, subtle scatter — no animation
      draw(0);
      return;
    }

    // pause when scrolled out of view
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running) {
          running = true;
          raf = requestAnimationFrame(draw);
        } else if (!entry.isIntersecting) {
          running = false;
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0 }
    );
    io.observe(parent);

    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    raf = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [density]);

  return <canvas ref={canvasRef} className={`absolute inset-0 pointer-events-none ${className}`} aria-hidden="true" />;
}
