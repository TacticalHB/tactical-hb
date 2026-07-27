"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/* ---------------------------------------------------------------------------
   The THB-OS department map — Phase E's "office".

   A stylised tactical floor plan, not a 3-D render: departments as rooms, the
   shared memory (Supabase) as a pulsing core, data lines flowing inward, and
   the real agents walking desk ↔ core with a live task pill. Everything shown
   is fed by the server page from real reads; the walking itself is the only
   decoration. prefers-reduced-motion pins every agent to its desk and stops
   the line/core animation (CSS side handles those two).

   Geometry lives here, keyed by room id; words and numbers arrive as props so
   the page stays the single place that talks to the read layer.
--------------------------------------------------------------------------- */

export type RoomTone = "ok" | "warn" | "alert" | "idle";

export type MapRoom = {
  id: keyof typeof ROOMS;
  title: string;
  href: string;
  chips?: { label: string; href: string }[];
  stat?: { text: string; tone: RoomTone };
};

export type MapAgent = {
  id: string;
  roomId: keyof typeof ROOMS;
  label: string; // short: "Advisor · 3 low"
  color: string;
};

/* A 3×3 grid with the core in the middle cell. Every room is the same size so
   the bands inside it are predictable: title at the top, stat pill top-right,
   the agent's desk in the middle band, chips along the bottom. Agents walk in
   the gutters between rooms rather than across them. */
const ROOM_W = 300;
const ROOM_H = 172;
const COL = [40, 450, 860];
const ROW = [40, 294, 548];

const room = (c: number, r: number) => ({
  x: COL[c],
  y: ROW[r],
  w: ROOM_W,
  h: ROOM_H,
  desk: [COL[c] + 62, ROW[r] + 112] as [number, number],
});

const ROOMS = {
  orders: room(0, 0),
  command: room(1, 0),
  marketing: room(2, 0),
  stock: room(0, 1),
  wholesale: room(2, 1),
  costs: room(0, 2),
  finance: room(1, 2),
  projects: room(2, 2),
} as const;

const CORE = { x: 600, y: 380, r: 78 };

const TONE_COLOR: Record<RoomTone, string> = {
  ok: "var(--console-ok)",
  warn: "var(--console-accent)",
  alert: "var(--console-alert)",
  idle: "var(--console-faint)",
};

function edgePoint(roomId: keyof typeof ROOMS): [number, number] {
  // Where a room's data line leaves it: the mid-edge facing the core.
  const r = ROOMS[roomId];
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const dx = CORE.x - cx;
  const dy = CORE.y - cy;
  if (Math.abs(dx) * r.h > Math.abs(dy) * r.w) {
    return [dx > 0 ? r.x + r.w : r.x, cy];
  }
  return [cx, dy > 0 ? r.y + r.h : r.y];
}

function corePoint(from: [number, number], gap = 6): [number, number] {
  const dx = from[0] - CORE.x;
  const dy = from[1] - CORE.y;
  const len = Math.hypot(dx, dy) || 1;
  return [CORE.x + (dx / len) * (CORE.r + gap), CORE.y + (dy / len) * (CORE.r + gap)];
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/* The figure carries no text: its finding is printed on the room's own task
   line, which never moves and so never lands on a title or the core label. */
function AgentFigure({ color }: { color: string }) {
  return (
    <g>
      <ellipse cx="0" cy="13" rx="8" ry="2.6" fill="rgba(0,0,0,0.45)" />
      <rect x="-6" y="-3" width="12" height="15" rx="5" fill={color} />
      <circle cx="0" cy="-9" r="6" fill={color} />
      <rect x="-4.5" y="-11" width="9" height="4.6" rx="2.2" fill="#0b0e13" opacity="0.85" />
    </g>
  );
}

export default function OfficeMap({
  rooms,
  agents,
  coreTitle,
  coreSub,
}: {
  rooms: MapRoom[];
  agents: MapAgent[];
  coreTitle: string;
  coreSub: string;
}) {
  const router = useRouter();
  const agentRefs = useRef<Record<string, SVGGElement | null>>({});

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const plans = agents.map((a, i) => {
      const desk = ROOMS[a.roomId].desk as unknown as [number, number];
      // Stand well clear of the hexagon: close enough to read as "reporting in",
      // far enough that the task pills never cross the core's own label.
      const core = corePoint(desk, 62);
      const dist = Math.hypot(core[0] - desk[0], core[1] - desk[1]);
      const walk = dist / 55; // seconds, ~55 px/s
      const dwellDesk = 4.5 + (i % 3) * 1.2;
      const dwellCore = 2.4;
      return {
        id: a.id,
        desk,
        core,
        dist,
        // phase boundaries within one cycle, in seconds
        t1: dwellDesk,
        t2: dwellDesk + walk,
        t3: dwellDesk + walk + dwellCore,
        cycle: dwellDesk + 2 * walk + dwellCore,
        offset: i * 3.1,
      };
    });

    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = (now - t0) / 1000;
      for (const p of plans) {
        const el = agentRefs.current[p.id];
        if (!el) continue;
        const local = (t + p.offset) % p.cycle;
        let x = p.desk[0];
        let y = p.desk[1];
        let walking = false;
        let prog = 0;
        if (local < p.t1) {
          // at desk
        } else if (local < p.t2) {
          walking = true;
          prog = smooth((local - p.t1) / (p.t2 - p.t1));
          x = p.desk[0] + (p.core[0] - p.desk[0]) * prog;
          y = p.desk[1] + (p.core[1] - p.desk[1]) * prog;
        } else if (local < p.t3) {
          x = p.core[0];
          y = p.core[1];
        } else {
          walking = true;
          prog = smooth((local - p.t3) / (p.cycle - p.t3));
          x = p.core[0] + (p.desk[0] - p.core[0]) * prog;
          y = p.core[1] + (p.desk[1] - p.core[1]) * prog;
        }
        const bob = walking ? Math.sin(prog * p.dist * 0.55) * 1.6 : Math.sin(t * 2.1) * 0.6;
        el.setAttribute("transform", `translate(${x} ${y + bob})`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [agents]);

  const go = (href: string) => router.push(href);

  return (
    <svg
      viewBox="0 0 1200 760"
      role="group"
      className="w-full h-auto select-none"
      style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
    >
      <defs>
        <pattern id="thb-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="var(--console-border)" strokeOpacity="0.35" strokeWidth="1" />
        </pattern>
        <radialGradient id="thb-core-halo">
          <stop offset="0%" stopColor="var(--console-accent)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--console-accent)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1200" height="760" fill="url(#thb-grid)" />

      {/* Data lines: every department reports into shared memory. */}
      {rooms.map((r) => {
        const a = edgePoint(r.id);
        const b = corePoint(a);
        return (
          <line
            key={`line-${r.id}`}
            x1={a[0]}
            y1={a[1]}
            x2={b[0]}
            y2={b[1]}
            className="thb-data-line"
            stroke="var(--console-data)"
            strokeOpacity="0.5"
            strokeWidth="1.5"
          />
        );
      })}

      {/* Shared memory core */}
      <g>
        <circle cx={CORE.x} cy={CORE.y} r={CORE.r + 34} fill="url(#thb-core-halo)" className="thb-core-glow" />
        {[0, 1].map((i) => (
          <polygon
            key={i}
            points={Array.from({ length: 6 }, (_, k) => {
              const ang = (Math.PI / 3) * k + Math.PI / 6;
              const rr = CORE.r - i * 14;
              return `${CORE.x + rr * Math.cos(ang)},${CORE.y + rr * Math.sin(ang)}`;
            }).join(" ")}
            fill={i === 0 ? "var(--console-panel)" : "none"}
            stroke="var(--console-accent)"
            strokeOpacity={i === 0 ? 0.9 : 0.35}
            strokeWidth="1.5"
          />
        ))}
        <text x={CORE.x} y={CORE.y - 4} textAnchor="middle" className="font-display" fontSize="17" letterSpacing="0.12em" fill="var(--console-text)">
          {coreTitle}
        </text>
        <text x={CORE.x} y={CORE.y + 16} textAnchor="middle" fontSize="10" fill="var(--console-muted)">
          {coreSub}
        </text>
      </g>

      {/* Department rooms */}
      {rooms.map((r) => {
        const g = ROOMS[r.id];
        const chips = r.chips ?? [];
        return (
          <g
            key={r.id}
            className="thb-room"
            role="link"
            tabIndex={0}
            aria-label={r.title}
            onClick={() => go(r.href)}
            onKeyDown={(e) => e.key === "Enter" && go(r.href)}
          >
            <rect
              x={g.x}
              y={g.y}
              width={g.w}
              height={g.h}
              rx="10"
              className="thb-room-fill"
              fill="var(--console-panel)"
              fillOpacity="0.92"
            />
            <rect
              x={g.x}
              y={g.y}
              width={g.w}
              height={g.h}
              rx="10"
              className="thb-room-edge"
              fill="none"
              stroke="var(--console-border)"
              strokeWidth="1.5"
            />
            <text x={g.x + 16} y={g.y + 27} className="font-display" fontSize="16" letterSpacing="0.1em" fill="var(--console-text)">
              {r.title}
            </text>

            {/* This room's agent and what it is currently reporting. */}
            {agents
              .filter((a) => a.roomId === r.id)
              .map((a, i) => (
                <g key={a.id}>
                  <circle cx={g.x + 20} cy={g.y + 50 + i * 17} r="3.5" fill={a.color} />
                  <text x={g.x + 30} y={g.y + 53.5 + i * 17} fontSize="10.5" fill="var(--console-muted)">
                    {a.label}
                  </text>
                </g>
              ))}

            {r.stat && (
              <g>
                <rect
                  x={g.x + g.w - 15 - r.stat.text.length * 5.6 - 16}
                  y={g.y + 12}
                  width={r.stat.text.length * 5.6 + 16}
                  height="19"
                  rx="9.5"
                  fill={TONE_COLOR[r.stat.tone]}
                  fillOpacity="0.16"
                  stroke={TONE_COLOR[r.stat.tone]}
                  strokeOpacity="0.6"
                  strokeWidth="1"
                />
                <text
                  x={g.x + g.w - 15 - (r.stat.text.length * 5.6 + 16) / 2}
                  y={g.y + 25.5}
                  textAnchor="middle"
                  fontSize="10"
                  fill={TONE_COLOR[r.stat.tone]}
                >
                  {r.stat.text}
                </text>
              </g>
            )}

            {chips.map((c, i) => {
              const cw = (g.w - 32 - (chips.length - 1) * 8) / chips.length;
              const cx = g.x + 16 + i * (cw + 8);
              const cy = g.y + g.h - 40;
              return (
                <g
                  key={c.href}
                  role="link"
                  tabIndex={0}
                  aria-label={c.label}
                  onClick={(e) => {
                    e.stopPropagation();
                    go(c.href);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation();
                      go(c.href);
                    }
                  }}
                >
                  <rect x={cx} y={cy} width={cw} height="26" rx="6" fill="var(--console-panel-2)" stroke="var(--console-border)" strokeWidth="1" />
                  <text x={cx + cw / 2} y={cy + 17} textAnchor="middle" fontSize="11" fill="var(--console-muted)">
                    {c.label}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}

      {/* Agents — SSR renders them at their desks; the effect walks them. */}
      {agents.map((a) => {
        const desk = ROOMS[a.roomId].desk;
        return (
          <g
            key={a.id}
            ref={(el) => {
              agentRefs.current[a.id] = el;
            }}
            transform={`translate(${desk[0]} ${desk[1]})`}
          >
            <title>{a.label}</title>
            <AgentFigure color={a.color} />
          </g>
        );
      })}
    </svg>
  );
}
