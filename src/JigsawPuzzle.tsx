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
 * ジオメトリ: かみ合うジグソーピースのパスを生成する。
 *
 * すべてが隙間なくぴったり並ぶ仕掛け: 隣り合うピースは *まったく同じ*
 * 境界曲線を共有する。各グリッドの辺を一度だけ生成し、各ピースはその
 * 4 辺（うち 2 辺は逆向きにたどる）から組み立てる。曲線が同一なので、
 * あるピースの凸（タブ）はそのまま隣のピースの凹（ブランク）になる。
 * ------------------------------------------------------------------ */

type Pt = [number, number];
/** `p` で終わる 3 次セグメント。制御点は `c1`,`c2`。 */
type Seg = { c1: Pt; c2: Pt; p: Pt };
type Edge = { start: Pt; segs: Seg[] };

/** `p` まで引く直線（退化した 3 次曲線）セグメント。 */
function line(from: Pt, p: Pt): Seg {
  return { c1: from, c2: p, p };
}

/**
 * 古典的なジグソーの辺 1 本（3 本の 3 次ベジェ曲線）。市販の箱入り
 * パズルで見る形状: ほぼ直線の肩、本体側へのわずかな *えぐり*、くびれた
 * 首、そして大きな丸い玉、を反対側へ鏡映する。このえぐりがあるおかげで
 * 突起が単なるドームではなく「軸の上の玉」に見える。揺らぎを加えるのは
 * 深さと中心だけなので、ピースは整って規則的なまま。
 *
 * 座標はパラメトリック: `v` は辺に沿って 0→1、`w` は垂直方向の変位
 * （突起の向きは `sign` を掛けて決める）。`sign === 0` なら直線の縁の辺。
 *
 * `ax,ay` = 辺に沿う単位ベクトル、`px,py` = 垂直方向の単位ベクトル。
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

  const u = (k: number) => (rnd() * 2 - 1) * k; // ±k の小さな揺らぎ
  const t = 0.15; // 辺に沿った突起の半幅（くびれた首）
  const hc = 1.8; // 頭部の制御点の広がり（× t）→ 玉が首より張り出す
  const uc = 0.7; // えぐりの深さ（× e）→ 楕円のふくらみではなく鋭いくびれ
  const D = 0.26 + u(0.02); // 突起の深さ（垂直方向のピーク）
  const e = D / 2.5; // 垂直方向の単位（ピーク ≈ 2.5·e = D）
  const m = 0.5 + u(0.02); // 辺に沿った突起の中心

  // (v,w) を絶対座標の点へ変換する。
  const P = (v: number, w: number): Pt => [
    x0 + ax * L * v + px * L * w * sign,
    y0 + ay * L * v + py * L * w * sign,
  ];

  return {
    start: P(0, 0),
    segs: [
      // 肩、わずかなえぐり、くびれた首まで
      { c1: P(0.2, 0), c2: P(m, -e * uc), p: P(m - t, e) },
      // 丸い玉。首の両側へ張り出す
      { c1: P(m - hc * t, 3 * e), c2: P(m + hc * t, 3 * e), p: P(m + t, e) },
      // 鏡映: もう一度えぐり、反対側の角へ戻る
      { c1: P(m, -e * uc), c2: P(0.8, 0), p: P(1, 0) },
    ],
  };
}

/** (x,y) から +x 方向へ伸びる長さ L の水平な辺。 */
function hEdge(x: number, y: number, L: number, sign: number, rnd: () => number): Edge {
  return makeEdge(x, y, 1, 0, 0, 1, L, sign, rnd);
}

/** (x,y) から +y 方向へ伸びる長さ L の垂直な辺。 */
function vEdge(x: number, y: number, L: number, sign: number, rnd: () => number): Edge {
  return makeEdge(x, y, 0, 1, 1, 0, L, sign, rnd);
}

/** 辺を逆向きにたどる（同じ曲線で方向だけ反転）。 */
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

// 同じ `seed` なら必ず同じ切り方になる、小さな決定論的乱数生成器。
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

  // 水平方向のグリッド辺 H[i][j]: 行ライン i（0..rows）、セル列 j。
  const H: Edge[][] = [];
  for (let i = 0; i <= rows; i++) {
    H[i] = [];
    for (let j = 0; j < cols; j++) {
      const border = i === 0 || i === rows;
      H[i][j] = hEdge(j * cw, i * ch, cw, border ? 0 : sign(), rnd);
    }
  }
  // 垂直方向のグリッド辺 V[r][j]: 列ライン j（0..cols）、セル行 r。
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
        H[r][c], // 上    : 左 -> 右
        V[r][c + 1], // 右    : 上 -> 下
        reverse(H[r + 1][c]), // 下    : 右 -> 左
        reverse(V[r][c]), // 左    : 下 -> 上
      ]);
      pieces.push({ r, c, cx: (c + 0.5) * cw, cy: (r + 0.5) * ch, d });
    }
  }
  return pieces;
}

/* ------------------------------------------------------------------ *
 * コンポーネント
 * ------------------------------------------------------------------ */

type Transform = { x: number; y: number; rot: number };
const ZERO: Transform = { x: 0, y: 0, rot: 0 };

export interface JigsawPuzzleProps {
  children: ReactNode;
  /** パズルの行数。@default 4 */
  rows?: number;
  /** パズルの列数。@default 6 */
  cols?: number;
  /** 効果のオン/オフ。オフのとき子要素は通常どおりレンダリングされる。@default true */
  active?: boolean;
  /** ピースをシャッフルした状態でゲームを開始する。@default true */
  scattered?: boolean;
  /** ユーザーがピースをドラッグできるようにする。@default true */
  draggable?: boolean;
  /** フローティングの操作バー（Shuffle / Solve / 進捗）を表示する。@default true */
  controls?: boolean;
  /** パズルの切り方を変える。@default 1 */
  seed?: number;
  /** ピースが定位置にはまったときに合成したクリック音を鳴らす。@default true */
  sound?: boolean;
  /** すべてのピースが定位置に固定されたときに一度だけ発火する。 */
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

  // ピースのジオメトリが実際の描画領域と一致するようホスト要素を計測する。
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
  // ピースが定位置にスナップして固定されるまでに、どれだけ近づく必要があるか（px）。
  const snap = Math.max(30, Math.min(cw, ch) * 0.5);

  const pieces = useMemo(
    () => (size.w > 0 && size.h > 0 ? buildPieces(size.w, size.h, rows, cols, seed) : []),
    [size.w, size.h, rows, cols, seed],
  );
  const n = pieces.length;

  const [transforms, setTransforms] = useState<Transform[]>([]);
  const [locked, setLocked] = useState<boolean[]>([]);
  const [zTop, setZTop] = useState(1); // アクティブなピースを前面に出すための連番カウンター
  const [z, setZ] = useState<number[]>([]);
  // ドラッグ中、持っているピースが定位置のスナップ範囲内にあるとき true。
  const [snapReady, setSnapReady] = useState(false);

  // スナップ時の「カチッ」音用に遅延生成する AudioContext（音源ファイル不要の合成音）。
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

  // 乾いた機械的な「カチッ」: 非常に短く鋭いノイズの過渡音を 2 つ（「カ」
  // その後「チ」）、素早く減衰させる。音程のあるトーンを使わないので、
  // 「ピュッ」というスイープではなく硬いクリック/カチャという音に聞こえる。
  const playClick = useCallback(() => {
    const ctx = getAudio();
    if (!ctx) return;
    const now = ctx.currentTime;

    // フィルタを通した短いノイズバースト 1 回（衝撃的な「チッ」音）。
    const tick = (at: number, dur: number, freq: number, q: number, peak: number) => {
      const len = Math.max(1, Math.ceil(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / len); // ホワイトノイズ、線形フェード
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = freq;
      bp.Q.value = q;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 1400; // 低い唸りを除去 -> くっきりしたクリック音
      const g = ctx.createGain();
      g.gain.setValueAtTime(peak, at); // 瞬時のアタック
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      src.connect(bp).connect(hp).connect(g).connect(ctx.destination);
      src.start(at);
      src.stop(at + dur + 0.005);
    };

    tick(now, 0.012, 2700, 1.1, 0.5); // 「カ」— 明るめで少し長い
    tick(now + 0.022, 0.008, 3500, 1.4, 0.38); // 「チ」— 鋭く小さめ
  }, [getAudio]);

  // パズル全体が完成したときの 3 音の小さなファンファーレ。
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
    px: number; // つかんだ時点のポインター x
    py: number; // つかんだ時点のポインター y
    ox: number; // つかんだ時点のピースのオフセット x
    oy: number; // つかんだ時点のピースのオフセット y
    x: number; // 現在のオフセット x
    y: number; // 現在のオフセット y
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

  // ピース数が変わるたびに（リサイズ / 切り直し）初期化（再初期化）する。
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

  // ボードが完成したときに onSolved を一度だけ発火する。
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

  // グローバルなポインターハンドラ: ドラッグし、離したときにスナップして固定する。
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
      {/* 非表示のコピーで自然なレイアウトサイズを確保する。 */}
      <div style={{ visibility: "hidden", pointerEvents: "none" }}>{children}</div>

      {/* clipPath の定義。ピースごとに 1 つ。 */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <defs>
          {pieces.map((p, i) => (
            <clipPath key={i} id={`${uid}-p${i}`} clipPathUnits="userSpaceOnUse">
              <path d={p.d} />
            </clipPath>
          ))}
        </defs>
      </svg>

      {/* 配置ガイド: 各ピースの目標位置に薄いシルエットを表示し、どこに
          収まるかが分かるようにする。完成すると非表示になる。 */}
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

      {/* ピースごとにクリップしたページのコピー 1 つと、その輪郭線。 */}
      {pieces.map((p, i) => {
        const t = transforms[i] ?? ZERO;
        const isDragging = dragging.current?.i === i;
        const isLocked = locked[i];
        const isSnapping = isDragging && snapReady;
        return (
          // 外側のラッパーは transform だけを担い、ポインターイベントは
          // 受け取らない（フルサイズの矩形だから）。ヒットテストは、形状が
          // ピース形状と一致する下のクリップ済みレイヤーで行う。
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
            {/* クリップされたページの内容。clip-path はヒットテストもクリップ
                するので、実際のピース形状だけがポインターを受け取り、外側の
                クリックは下にある実際のピースへ素通りする。 */}
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

            {/* ピースの輪郭線（縁取り）: 明るいハロー + 暗い線を上に描く */}
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

      {/* クリア時のバナー */}
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
🎉 クリア！
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
            🔀 シャッフル
          </button>
          <button type="button" onClick={solve} style={btn("#2d8f5a")}>
            🧩 そろえる
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
