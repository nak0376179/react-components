import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ *
 * ShatterGlass
 *
 * Wrap any page; it looks completely normal until you click. The click
 * point becomes an impact: radial cracks race outwards, the display
 * fractures into glass shards, and every shard becomes a draggable
 * (and flingable) piece you can peel off to reveal what's underneath.
 * "🔧 Repair" snaps it all back together.
 *
 * Geometry — full-coverage radial fracture:
 *   We shoot spokes out from the impact point. The four corners are
 *   *always* spokes, so between any two adjacent spokes both boundary
 *   hits land on the same rectangle edge → the outer shards tile the
 *   page edge-to-edge with no gaps. Along each spoke we place a few
 *   rings (fractions of the distance to the boundary); the innermost
 *   ring fans into triangles around the impact, the outer rings form
 *   quads. Every shard is a clipped copy of the children (same trick as
 *   JigsawPuzzle), so reassembled it's pixel-for-pixel the original.
 * ------------------------------------------------------------------ */

type Pt = [number, number];

export type Shard = {
  /** Polygon points in host-local px. */
  poly: Pt[];
  /** Centroid (transform origin + fling direction reference). */
  cx: number;
  cy: number;
};

/** Ray from an interior point to the rectangle boundary, returning the hit. */
function rayToRect(ix: number, iy: number, ang: number, w: number, h: number): Pt {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  let t = Infinity;
  if (dx > 1e-9) t = Math.min(t, (w - ix) / dx);
  else if (dx < -1e-9) t = Math.min(t, -ix / dx);
  if (dy > 1e-9) t = Math.min(t, (h - iy) / dy);
  else if (dy < -1e-9) t = Math.min(t, -iy / dy);
  return [ix + dx * t, iy + dy * t];
}

function centroid(poly: Pt[]): Pt {
  let x = 0;
  let y = 0;
  for (const [px, py] of poly) {
    x += px;
    y += py;
  }
  return [x / poly.length, y / poly.length];
}

function buildShards(
  w: number,
  h: number,
  ix: number,
  iy: number,
  spokes: number,
  rings: number,
  jitter: number,
): Shard[] {
  // Corner angles must be spokes so adjacent boundary hits share an edge.
  const corners = [
    Math.atan2(-iy, -ix), // top-left
    Math.atan2(-iy, w - ix), // top-right
    Math.atan2(h - iy, w - ix), // bottom-right
    Math.atan2(h - iy, -ix), // bottom-left
  ].map((a) => (a + Math.PI * 2) % (Math.PI * 2));
  corners.sort((a, b) => a - b);

  // Within each corner-to-corner sector, drop in evenly spaced spokes.
  const per = Math.max(1, Math.round(spokes / 4));
  const angles: number[] = [];
  for (let k = 0; k < 4; k++) {
    const a0 = corners[k];
    let a1 = corners[(k + 1) % 4];
    if (a1 <= a0) a1 += Math.PI * 2;
    angles.push(a0); // the corner spoke itself
    for (let s = 1; s < per; s++) {
      const f = s / per;
      const jit = (Math.random() * 2 - 1) * jitter * ((a1 - a0) / per);
      angles.push(a0 + (a1 - a0) * f + jit);
    }
  }
  const A = angles.length;

  // Distance fractions from impact (0) to boundary (1), with jitter.
  const fr: number[] = [];
  for (let r = 1; r <= rings; r++) {
    const base = r / rings;
    fr.push(base);
  }
  // point[a][r]: ring r along spoke a (r index 0..rings-1).
  const hit: Pt[] = angles.map((a) => rayToRect(ix, iy, a, w, h));
  const pt = (a: number, r: number): Pt => {
    const [hx, hy] = hit[a];
    let f = fr[r];
    if (r < rings - 1) f += (Math.random() * 2 - 1) * jitter * (1 / rings);
    f = Math.max(0.04, Math.min(0.999, f));
    return [ix + (hx - ix) * f, iy + (hy - iy) * f];
  };

  // Cache ring points so neighbouring shards share identical vertices.
  const grid: Pt[][] = angles.map((_, a) =>
    Array.from({ length: rings }, (_, r) => pt(a, r)),
  );

  const shards: Shard[] = [];
  for (let a = 0; a < A; a++) {
    const a2 = (a + 1) % A;
    // Innermost: triangle fan around the impact.
    const tri: Pt[] = [[ix, iy], grid[a][0], grid[a2][0]];
    shards.push({ poly: tri, ...centroidObj(tri) });
    // Outer bands: quads between consecutive rings.
    for (let r = 0; r < rings - 1; r++) {
      const quad: Pt[] = [grid[a][r], grid[a2][r], grid[a2][r + 1], grid[a][r + 1]];
      shards.push({ poly: quad, ...centroidObj(quad) });
    }
  }
  return shards;
}

function centroidObj(poly: Pt[]): { cx: number; cy: number } {
  const [cx, cy] = centroid(poly);
  return { cx, cy };
}

function polyToClip(poly: Pt[]): string {
  return `polygon(${poly.map(([x, y]) => `${x}px ${y}px`).join(", ")})`;
}

type Transform = { x: number; y: number; rot: number };
const ZERO: Transform = { x: 0, y: 0, rot: 0 };

export interface ShatterGlassProps {
  children: ReactNode;
  /** Turn the effect off (children render normally, no shatter). @default true */
  active?: boolean;
  /** Approximate number of radial spokes (rounded to a multiple of 4). @default 16 */
  spokes?: number;
  /** Number of concentric rings from impact to edge. @default 4 */
  rings?: number;
  /** 0–1 irregularity of the crack pattern. @default 0.5 */
  jitter?: number;
  /** Let the user drag shards around after the shatter. @default true */
  draggable?: boolean;
  /** Show the floating control bar (Repair / Drop). @default true */
  controls?: boolean;
  /** Play a synthesised glass-break on impact. @default true */
  sound?: boolean;
  /** Fired once when the glass first shatters. */
  onShatter?: () => void;
}

export function ShatterGlass({
  children,
  active = true,
  spokes = 16,
  rings = 4,
  jitter = 0.5,
  draggable = true,
  controls = true,
  sound = true,
  onShatter,
}: ShatterGlassProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  // Impact point in fractional coords so it survives a resize.
  const [impact, setImpact] = useState<{ fx: number; fy: number } | null>(null);

  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((s) => (s.w === width && s.h === height ? s : { w: width, h: height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const shards = useMemo(() => {
    if (!impact || size.w === 0 || size.h === 0) return [];
    return buildShards(
      size.w,
      size.h,
      impact.fx * size.w,
      impact.fy * size.h,
      spokes,
      rings,
      jitter,
    );
  }, [impact, size.w, size.h, spokes, rings, jitter]);
  const n = shards.length;

  const [transforms, setTransforms] = useState<Transform[]>([]);
  const [z, setZ] = useState<number[]>([]);
  const [zTop, setZTop] = useState(1);
  const dragging = useRef<{
    i: number;
    px: number;
    py: number;
    ox: number;
    oy: number;
  } | null>(null);

  // Reset transforms whenever the shard set changes (new impact / resize).
  useEffect(() => {
    setTransforms(Array.from({ length: n }, () => ZERO));
    setZ(Array.from({ length: n }, () => 0));
    setZTop(1);
  }, [n]);

  // --- glass-break sound (synthesised, no assets) ---
  const audioRef = useRef<AudioContext | null>(null);
  const playBreak = useCallback(() => {
    if (!sound) return;
    let ctx = audioRef.current;
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      audioRef.current = ctx;
    }
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;

    // Impact: a short bright noise burst.
    const len = Math.ceil(ctx.sampleRate * 0.18);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    src.connect(hp).connect(g).connect(ctx.destination);
    src.start(now);
    src.stop(now + 0.2);

    // Tinkles: a scatter of tiny high pings, like falling shards.
    for (let k = 0; k < 9; k++) {
      const t = now + 0.03 + Math.random() * 0.4;
      const osc = ctx.createOscillator();
      const og = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(2200 + Math.random() * 3500, t);
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.12, t + 0.005);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(og).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.14);
    }
  }, [sound]);

  const shatterAt = (clientX: number, clientY: number) => {
    const el = hostRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setImpact({ fx: (clientX - r.left) / r.width, fy: (clientY - r.top) / r.height });
    playBreak();
    onShatter?.();
  };

  const repair = useCallback(() => setImpact(null), []);

  /** Fling every shard outward from the impact, with gravity & spin. */
  const drop = useCallback(() => {
    if (!impact || size.w === 0) return;
    const ix = impact.fx * size.w;
    const iy = impact.fy * size.h;
    setTransforms(
      shards.map((s) => {
        const ang = Math.atan2(s.cy - iy, s.cx - ix);
        const push = 60 + Math.random() * 140;
        return {
          x: Math.cos(ang) * push,
          y: Math.sin(ang) * push + 220 + Math.random() * 260, // gravity bias
          rot: (Math.random() * 2 - 1) * 90,
        };
      }),
    );
  }, [impact, size.w, size.h, shards]);

  // Global drag handlers.
  useEffect(() => {
    if (!draggable) return;
    const move = (e: PointerEvent) => {
      const d = dragging.current;
      if (!d) return;
      setTransforms((t) => {
        const next = t.slice();
        next[d.i] = {
          x: d.ox + (e.clientX - d.px),
          y: d.oy + (e.clientY - d.py),
          rot: next[d.i]?.rot ?? 0,
        };
        return next;
      });
    };
    const up = () => {
      dragging.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [draggable]);

  const onShardPointerDown = (i: number) => (e: React.PointerEvent) => {
    if (!draggable) return;
    e.preventDefault();
    const t = transforms[i] ?? ZERO;
    dragging.current = { i, px: e.clientX, py: e.clientY, ox: t.x, oy: t.y };
    setZ((order) => {
      const next = order.slice();
      next[i] = zTop;
      return next;
    });
    setZTop((v) => v + 1);
  };

  if (!active) return <>{children}</>;

  const shattered = impact !== null && n > 0;

  return (
    <div
      ref={hostRef}
      style={{
        position: "relative",
        overflow: "visible",
        isolation: "isolate",
        cursor: shattered ? "default" : "crosshair",
      }}
    >
      {/* Intact view: the real, interactive page. Clicking shatters it.
          Once shattered we hide it (but keep it for layout sizing) and
          show the shard copies instead. */}
      <div
        onClick={(e) => {
          if (!shattered) shatterAt(e.clientX, e.clientY);
        }}
        style={{
          visibility: shattered ? "hidden" : "visible",
          pointerEvents: shattered ? "none" : "auto",
        }}
      >
        {children}
      </div>

      {shattered &&
        shards.map((s, i) => {
          const t = transforms[i] ?? ZERO;
          const isDragging = dragging.current?.i === i;
          const clip = polyToClip(s.poly);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                inset: 0,
                width: size.w,
                height: size.h,
                pointerEvents: "none",
                transformOrigin: `${s.cx}px ${s.cy}px`,
                transform: `translate(${t.x}px, ${t.y}px) rotate(${t.rot}deg) scale(${
                  isDragging ? 1.04 : 1
                })`,
                transition: isDragging
                  ? "none"
                  : "transform 0.7s cubic-bezier(.2,.8,.2,1)",
                zIndex: 100 + (z[i] ?? 0),
                filter: `drop-shadow(0 ${isDragging ? 8 : 3}px ${
                  isDragging ? 14 : 6
                }px rgba(0,0,0,0.45))`,
              }}
            >
              {/* Clipped page copy. clip-path also clips hit-testing, so
                  only the shard shape grabs the pointer. */}
              <div
                onPointerDown={onShardPointerDown(i)}
                style={{
                  position: "absolute",
                  inset: 0,
                  clipPath: clip,
                  WebkitClipPath: clip,
                  pointerEvents: draggable ? "auto" : "none",
                  cursor: isDragging ? "grabbing" : "grab",
                }}
              >
                <div style={{ pointerEvents: "none", userSelect: "none" }}>
                  {children}
                </div>
              </div>

              {/* Crack edges: a bright glassy highlight along the shard. */}
              <svg
                width={size.w}
                height={size.h}
                viewBox={`0 0 ${size.w} ${size.h}`}
                style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
                aria-hidden
              >
                <polygon
                  points={s.poly.map(([x, y]) => `${x},${y}`).join(" ")}
                  fill="none"
                  stroke="rgba(255,255,255,0.85)"
                  strokeWidth={1.2}
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          );
        })}

      {/* Impact flash */}
      {shattered && (
        <div
          key={`${impact!.fx}-${impact!.fy}`}
          aria-hidden
          style={{
            position: "absolute",
            left: impact!.fx * size.w,
            top: impact!.fy * size.h,
            width: 0,
            height: 0,
            zIndex: 9000,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              transform: "translate(-50%, -50%)",
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "radial-gradient(circle, #fff, rgba(255,255,255,0))",
              animation: "glass-flash 0.5s ease-out forwards",
            }}
          />
        </div>
      )}

      {controls && shattered && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 10001,
            display: "flex",
            gap: 8,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <button type="button" onClick={drop} style={btn("#0a9396")}>
            💧 Drop
          </button>
          <button type="button" onClick={repair} style={btn("#2d8f5a")}>
            🔧 Repair
          </button>
        </div>
      )}

      <style>{`
        @keyframes glass-flash {
          from { width: 12px; height: 12px; opacity: 0.9; }
          to   { width: 160px; height: 160px; opacity: 0;
                 margin-left: -74px; margin-top: -74px; }
        }
      `}</style>
    </div>
  );
}

function btn(bg: string): React.CSSProperties {
  return {
    padding: "8px 14px",
    border: "none",
    borderRadius: 999,
    background: bg,
    color: "#fff",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
  };
}

export default ShatterGlass;
