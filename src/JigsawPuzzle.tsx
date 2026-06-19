import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ *
 * Geometry: build interlocking jigsaw piece paths.
 *
 * The trick that makes everything tile perfectly: neighbouring pieces
 * share the *exact same* boundary curve. We generate every grid edge
 * once, then each piece is assembled from its 4 edges (two of them
 * walked in reverse). Because the curves are identical, a tab on one
 * piece is precisely the blank on its neighbour.
 * ------------------------------------------------------------------ */

type Pt = [number, number];
/** A cubic segment ending at `p`, with control points `c1`,`c2`. */
type Seg = { c1: Pt; c2: Pt; p: Pt };
type Edge = { start: Pt; segs: Seg[] };

/** A straight (degenerate cubic) segment to `p`. */
function line(from: Pt, p: Pt): Seg {
  return { c1: from, c2: p, p };
}

/**
 * One classic jigsaw edge (three cubic Béziers), the shape you see on a
 * real boxed puzzle: a near-straight shoulder, a slight *undercut* into
 * the body, a pinched neck, then a big round ball, mirrored back. The
 * undercut is what makes the knob look like a ball on a stem rather than
 * a plain dome. Only depth and centre are lightly jittered, so pieces
 * stay clean and regular.
 *
 * Coordinates are parametric: `v` runs 0→1 along the edge, `w` is the
 * perpendicular displacement (× `sign` for knob direction).
 * `sign === 0` yields a straight border edge.
 *
 * `ax,ay` = unit vector along the edge, `px,py` = unit perpendicular.
 */
function makeEdge(
  x0: number,
  y0: number,
  ax: number,
  ay: number,
  px: number,
  py: number,
  L: number,
  sign: number,
  rnd: () => number,
): Edge {
  const start: Pt = [x0, y0];
  if (sign === 0) return { start, segs: [line(start, [x0 + ax * L, y0 + ay * L])] };

  const u = (k: number) => (rnd() * 2 - 1) * k; // small jitter in ±k
  const t = 0.15; // knob half-width along the edge (narrow neck)
  const hc = 1.8; // head control spread (× t) → ball overhangs the neck
  const uc = 0.7; // undercut depth (× e) → crisp pinch, not an oval bulge
  const D = 0.26 + u(0.02); // knob depth (perpendicular peak)
  const e = D / 2.5; // perpendicular unit (peak ≈ 2.5·e = D)
  const m = 0.5 + u(0.02); // knob centre along the edge

  // (v,w) -> absolute point.
  const P = (v: number, w: number): Pt => [
    x0 + ax * L * v + px * L * w * sign,
    y0 + ay * L * v + py * L * w * sign,
  ];

  return {
    start: P(0, 0),
    segs: [
      // shoulder, slight undercut, up to the pinched neck
      { c1: P(0.2, 0), c2: P(m, -e * uc), p: P(m - t, e) },
      // the round ball, overhanging the neck on both sides
      { c1: P(m - hc * t, 3 * e), c2: P(m + hc * t, 3 * e), p: P(m + t, e) },
      // mirror: undercut again, back to the far corner
      { c1: P(m, -e * uc), c2: P(0.8, 0), p: P(1, 0) },
    ],
  };
}

/** Horizontal edge from (x,y) going +x, length L. */
function hEdge(x: number, y: number, L: number, sign: number, rnd: () => number): Edge {
  return makeEdge(x, y, 1, 0, 0, 1, L, sign, rnd);
}

/** Vertical edge from (x,y) going +y, length L. */
function vEdge(x: number, y: number, L: number, sign: number, rnd: () => number): Edge {
  return makeEdge(x, y, 0, 1, 1, 0, L, sign, rnd);
}

/** Walk an edge backwards (same curve, reversed direction). */
function reverse(e: Edge): Edge {
  const pts: Pt[] = [e.start, ...e.segs.map((s) => s.p)];
  const segs: Seg[] = [];
  for (let k = e.segs.length - 1; k >= 0; k--) {
    segs.push({ c1: e.segs[k].c2, c2: e.segs[k].c1, p: pts[k] });
  }
  return { start: pts[pts.length - 1], segs };
}

function edgesToPath(edges: Edge[]): string {
  let d = `M ${edges[0].start[0]} ${edges[0].start[1]}`;
  for (const e of edges) {
    for (const s of e.segs) {
      d += ` C ${s.c1[0]} ${s.c1[1]} ${s.c2[0]} ${s.c2[1]} ${s.p[0]} ${s.p[1]}`;
    }
  }
  return d + " Z";
}

// Small deterministic RNG so a given `seed` always cuts the same way.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type PieceGeom = { r: number; c: number; cx: number; cy: number; d: string };

function buildPieces(
  w: number,
  h: number,
  rows: number,
  cols: number,
  seed: number,
): PieceGeom[] {
  const rnd = mulberry32(seed);
  const cw = w / cols;
  const ch = h / rows;
  const sign = () => (rnd() < 0.5 ? -1 : 1);

  // Horizontal grid edges H[i][j]: row line i (0..rows), cell column j.
  const H: Edge[][] = [];
  for (let i = 0; i <= rows; i++) {
    H[i] = [];
    for (let j = 0; j < cols; j++) {
      const border = i === 0 || i === rows;
      H[i][j] = hEdge(j * cw, i * ch, cw, border ? 0 : sign(), rnd);
    }
  }
  // Vertical grid edges V[r][j]: column line j (0..cols), cell row r.
  const V: Edge[][] = [];
  for (let r = 0; r < rows; r++) {
    V[r] = [];
    for (let j = 0; j <= cols; j++) {
      const border = j === 0 || j === cols;
      V[r][j] = vEdge(j * cw, r * ch, ch, border ? 0 : sign(), rnd);
    }
  }

  const pieces: PieceGeom[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const d = edgesToPath([
        H[r][c], // top    : left -> right
        V[r][c + 1], // right  : top  -> bottom
        reverse(H[r + 1][c]), // bottom : right -> left
        reverse(V[r][c]), // left   : bottom -> top
      ]);
      pieces.push({ r, c, cx: (c + 0.5) * cw, cy: (r + 0.5) * ch, d });
    }
  }
  return pieces;
}

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */

type Transform = { x: number; y: number; rot: number };
const ZERO: Transform = { x: 0, y: 0, rot: 0 };

export interface JigsawPuzzleProps {
  children: ReactNode;
  /** Number of puzzle rows. @default 4 */
  rows?: number;
  /** Number of puzzle columns. @default 6 */
  cols?: number;
  /** Turn the effect on/off. When off, children render normally. @default true */
  active?: boolean;
  /** Start the game with the pieces shuffled. @default true */
  scattered?: boolean;
  /** Let the user drag pieces around. @default true */
  draggable?: boolean;
  /** Show the floating control bar (Shuffle / Solve / progress). @default true */
  controls?: boolean;
  /** Re-cut the puzzle differently. @default 1 */
  seed?: number;
  /** Play a synthesised click when a piece snaps home. @default true */
  sound?: boolean;
  /** Fired once every piece is locked in place. */
  onSolved?: () => void;
}

export function JigsawPuzzle({
  children,
  rows = 4,
  cols = 6,
  active = true,
  scattered = true,
  draggable = true,
  controls = true,
  seed = 1,
  sound = true,
  onSolved,
}: JigsawPuzzleProps) {
  const uid = useId().replace(/:/g, "");
  const hostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Measure the host so piece geometry matches the real rendered area.
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

  const cw = cols > 0 ? size.w / cols : 0;
  const ch = rows > 0 ? size.h / rows : 0;
  // How close (px) a piece must be to its home before it snaps & locks.
  const snap = Math.max(30, Math.min(cw, ch) * 0.5);

  const pieces = useMemo(
    () => (size.w > 0 && size.h > 0 ? buildPieces(size.w, size.h, rows, cols, seed) : []),
    [size.w, size.h, rows, cols, seed],
  );
  const n = pieces.length;

  const [transforms, setTransforms] = useState<Transform[]>([]);
  const [locked, setLocked] = useState<boolean[]>([]);
  const [zTop, setZTop] = useState(1); // running counter to raise the active piece
  const [z, setZ] = useState<number[]>([]);
  // While dragging, true when the held piece is within snapping range of home.
  const [snapReady, setSnapReady] = useState(false);

  // Lazily-created AudioContext for the snap "click" (synthesised, no assets).
  const audioRef = useRef<AudioContext | null>(null);
  const getAudio = useCallback(() => {
    if (!sound) return null;
    let ctx = audioRef.current;
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      audioRef.current = ctx;
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  }, [sound]);

  // A dry mechanical "カチッ": two very short, sharp noise transients (the
  // "ka" then the "tchi") with fast decay — no pitched tone, so it reads as
  // a hard click/clack rather than a "pyu" sweep.
  const playClick = useCallback(() => {
    const ctx = getAudio();
    if (!ctx) return;
    const now = ctx.currentTime;

    // One short filtered noise burst (an impulsive "tick").
    const tick = (at: number, dur: number, freq: number, q: number, peak: number) => {
      const len = Math.max(1, Math.ceil(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / len); // white noise, linear fade
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = freq;
      bp.Q.value = q;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 1400; // strip low rumble -> crisp click
      const g = ctx.createGain();
      g.gain.setValueAtTime(peak, at); // instant attack
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      src.connect(bp).connect(hp).connect(g).connect(ctx.destination);
      src.start(at);
      src.stop(at + dur + 0.005);
    };

    tick(now, 0.012, 2700, 1.1, 0.5); // "ka" — brighter, slightly longer
    tick(now + 0.022, 0.008, 3500, 1.4, 0.38); // "tchi" — sharper, quieter
  }, [getAudio]);

  // A little 3-note flourish when the whole puzzle is finished.
  const playWin = useCallback(() => {
    const ctx = getAudio();
    if (!ctx) return;
    [0, 0.12, 0.24].forEach((dt, k) => {
      const t = ctx.currentTime + dt;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime([523, 659, 784][k], t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(g).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }, [getAudio]);
  const dragging = useRef<{
    i: number;
    px: number; // pointer x at grab
    py: number; // pointer y at grab
    ox: number; // piece offset x at grab
    oy: number; // piece offset y at grab
    x: number; // live offset x
    y: number; // live offset y
  } | null>(null);

  const placed = locked.filter(Boolean).length;
  const solved = n > 0 && placed === n;

  const shuffle = useCallback(() => {
    if (n === 0) return;
    const pad = Math.min(cw, ch) * 0.5;
    setLocked(pieces.map(() => false));
    setTransforms(
      pieces.map((p) => {
        const tx = pad + Math.random() * (size.w - 2 * pad);
        const ty = pad + Math.random() * (size.h - 2 * pad);
        return { x: tx - p.cx, y: ty - p.cy, rot: 0 };
      }),
    );
  }, [pieces, n, cw, ch, size.w, size.h]);

  const solve = useCallback(() => {
    setTransforms(pieces.map(() => ZERO));
    setLocked(pieces.map(() => true));
  }, [pieces]);

  // (Re)initialise whenever the piece count changes (resize / re-cut).
  useEffect(() => {
    if (n === 0) return;
    setZ(Array.from({ length: n }, () => 0));
    setZTop(1);
    if (scattered) shuffle();
    else {
      setTransforms(Array.from({ length: n }, () => ZERO));
      setLocked(Array.from({ length: n }, () => true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, scattered]);

  // Fire onSolved once when the board is completed.
  const wasSolved = useRef(false);
  useEffect(() => {
    if (solved && !wasSolved.current) {
      wasSolved.current = true;
      playWin();
      onSolved?.();
    } else if (!solved) {
      wasSolved.current = false;
    }
  }, [solved, onSolved, playWin]);

  // Global pointer handlers: drag, then snap-and-lock on release.
  useEffect(() => {
    if (!draggable) return;
    const move = (e: PointerEvent) => {
      const d = dragging.current;
      if (!d) return;
      const nx = d.ox + (e.clientX - d.px);
      const ny = d.oy + (e.clientY - d.py);
      d.x = nx;
      d.y = ny;
      setSnapReady(Math.hypot(nx, ny) <= snap);
      setTransforms((t) => {
        const next = t.slice();
        next[d.i] = { x: nx, y: ny, rot: 0 };
        return next;
      });
    };
    const up = () => {
      const d = dragging.current;
      dragging.current = null;
      setSnapReady(false);
      if (!d) return;
      if (Math.hypot(d.x, d.y) <= snap) {
        playClick();
        setTransforms((t) => {
          const next = t.slice();
          next[d.i] = ZERO;
          return next;
        });
        setLocked((l) => {
          const next = l.slice();
          next[d.i] = true;
          return next;
        });
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [draggable, snap, playClick]);

  const onPiecePointerDown = (i: number) => (e: React.PointerEvent) => {
    if (!draggable || locked[i]) return;
    e.preventDefault();
    const t = transforms[i] ?? ZERO;
    dragging.current = {
      i,
      px: e.clientX,
      py: e.clientY,
      ox: t.x,
      oy: t.y,
      x: t.x,
      y: t.y,
    };
    setZ((order) => {
      const next = order.slice();
      next[i] = zTop;
      return next;
    });
    setZTop((v) => v + 1);
  };

  if (!active) return <>{children}</>;

  return (
    <div
      ref={hostRef}
      style={{ position: "relative", overflow: "visible", isolation: "isolate" }}
    >
      {/* Hidden copy reserves the natural layout size. */}
      <div style={{ visibility: "hidden", pointerEvents: "none" }}>{children}</div>

      {/* clipPath definitions, one per piece. */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <defs>
          {pieces.map((p, i) => (
            <clipPath key={i} id={`${uid}-p${i}`} clipPathUnits="userSpaceOnUse">
              <path d={p.d} />
            </clipPath>
          ))}
        </defs>
      </svg>

      {/* Home guide: faint silhouette of every piece at its target spot, so
          the player can see where each piece belongs. Hidden once solved. */}
      {!solved && (
        <svg
          width={size.w}
          height={size.h}
          viewBox={`0 0 ${size.w} ${size.h}`}
          style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}
          aria-hidden
        >
          <rect
            x={0.5}
            y={0.5}
            width={Math.max(0, size.w - 1)}
            height={Math.max(0, size.h - 1)}
            fill="rgba(0,0,0,0.04)"
            stroke="rgba(0,0,0,0.25)"
            strokeWidth={1}
          />
          {pieces.map((p, i) => (
            <path
              key={i}
              d={p.d}
              fill="none"
              stroke="rgba(0,0,0,0.16)"
              strokeWidth={1}
              strokeDasharray="3 4"
            />
          ))}
        </svg>
      )}

      {/* One clipped copy of the page per piece, plus its outline. */}
      {pieces.map((p, i) => {
        const t = transforms[i] ?? ZERO;
        const isDragging = dragging.current?.i === i;
        const isLocked = locked[i];
        const isSnapping = isDragging && snapReady;
        return (
          // Outer wrapper carries the transform only; it does NOT capture
          // pointer events (it's a full-size rectangle). Hit-testing happens
          // on the clipped layer below, whose shape == the piece shape.
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              width: size.w,
              height: size.h,
              pointerEvents: "none",
              transformOrigin: `${p.cx}px ${p.cy}px`,
              transform: `translate(${t.x}px, ${t.y}px) rotate(${t.rot}deg) scale(${
                isDragging ? 1.06 : 1
              })`,
              transition: isDragging
                ? "none"
                : "transform 0.45s cubic-bezier(.2,.9,.25,1.3)",
              zIndex: isLocked ? 1 : 100 + (z[i] ?? 0),
              filter: isLocked
                ? "none"
                : `drop-shadow(0 ${isDragging ? 10 : 5}px ${
                    isDragging ? 16 : 9
                  }px rgba(0,0,0,0.4))`,
            }}
          >
            {/* Clipped page content. clip-path also clips hit-testing, so
                only the real piece shape grabs the pointer — clicks outside
                fall through to whatever piece is actually underneath. */}
            <div
              onPointerDown={onPiecePointerDown(i)}
              style={{
                position: "absolute",
                inset: 0,
                clipPath: `url(#${uid}-p${i})`,
                WebkitClipPath: `url(#${uid}-p${i})`,
                pointerEvents: isLocked ? "none" : "auto",
                cursor: isDragging ? "grabbing" : "grab",
              }}
            >
              <div style={{ pointerEvents: "none", userSelect: "none" }}>{children}</div>
            </div>

            {/* piece outline (縁取り): light halo + dark line, drawn on top */}
            <svg
              width={size.w}
              height={size.h}
              viewBox={`0 0 ${size.w} ${size.h}`}
              style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
              aria-hidden
            >
              <path
                d={p.d}
                fill="none"
                stroke="rgba(255,255,255,0.9)"
                strokeWidth={isLocked ? 2 : 3}
                strokeLinejoin="round"
              />
              <path
                d={p.d}
                fill="none"
                stroke={
                  isSnapping
                    ? "#2d8f5a"
                    : isLocked
                      ? "rgba(0,0,0,0.28)"
                      : "rgba(20,20,30,0.7)"
                }
                strokeWidth={isSnapping ? 2.4 : isLocked ? 1 : 1.4}
                strokeLinejoin="round"
              />
            </svg>
          </div>
        );
      })}

      {/* Win banner */}
      {solved && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
            zIndex: 10000,
          }}
        >
          <div
            style={{
              padding: "16px 28px",
              borderRadius: 16,
              background: "rgba(20,20,30,0.82)",
              color: "#fff",
              fontFamily: "system-ui, sans-serif",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: 1,
              boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
            }}
          >
            🎉 Clear!
          </div>
        </div>
      )}

      {controls && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 10001,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <span
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(20,20,30,0.7)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {placed} / {n}
          </span>
          <button type="button" onClick={shuffle} style={btn("#e8543f")}>
            🔀 Shuffle
          </button>
          <button type="button" onClick={solve} style={btn("#2d8f5a")}>
            🧩 Solve
          </button>
        </div>
      )}
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

export default JigsawPuzzle;
