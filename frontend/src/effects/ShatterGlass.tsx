import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

/* ------------------------------------------------------------------ *
 * ShatterGlass
 *
 * 任意のページをラップする。クリックするまでは完全に普通に見える。
 * クリック地点が衝撃点となり、放射状のひびが外へ走り、表示がガラスの
 * 破片に砕け、各破片はドラッグ（そして放り投げ）できるピースになって、
 * めくると下にあるものが見える。「🔧 Repair」ですべて元どおりに戻る。
 *
 * ジオメトリ — 全面を覆う放射状の破砕:
 *   衝撃点から放射状にスポークを伸ばす。4 つの角は *必ず* スポークに
 *   なるので、隣り合う 2 本のスポークの間では両端の境界ヒットが同じ
 *   矩形の辺に落ちる → 外側の破片が隙間なくページを端まで敷き詰める。
 *   各スポークに沿っていくつかのリング（境界までの距離の割合）を置く。
 *   最も内側のリングは衝撃点を中心に三角形へ広がり、外側のリングは
 *   四角形を作る。各破片は子要素をクリップしたコピー（JigsawPuzzle と
 *   同じ仕掛け）なので、組み直せばピクセル単位で元のページに戻る。
 * ------------------------------------------------------------------ */

type Pt = [number, number]

export type Shard = {
  /** ホストローカル座標（px）でのポリゴンの頂点。 */
  poly: Pt[]
  /** 重心（transform の原点 + 放り投げる方向の基準）。 */
  cx: number
  cy: number
}

/** 内部の点から矩形の境界へ伸ばしたレイ。当たった点を返す。 */
function rayToRect(ix: number, iy: number, ang: number, w: number, h: number): Pt {
  const dx = Math.cos(ang)
  const dy = Math.sin(ang)
  let t = Infinity
  if (dx > 1e-9) t = Math.min(t, (w - ix) / dx)
  else if (dx < -1e-9) t = Math.min(t, -ix / dx)
  if (dy > 1e-9) t = Math.min(t, (h - iy) / dy)
  else if (dy < -1e-9) t = Math.min(t, -iy / dy)
  return [ix + dx * t, iy + dy * t]
}

function centroid(poly: Pt[]): Pt {
  let x = 0
  let y = 0
  for (const [px, py] of poly) {
    x += px
    y += py
  }
  return [x / poly.length, y / poly.length]
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
  // 隣り合う境界ヒットが辺を共有するよう、角の角度は必ずスポークにする。
  const corners = [
    Math.atan2(-iy, -ix), // 左上
    Math.atan2(-iy, w - ix), // 右上
    Math.atan2(h - iy, w - ix), // 右下
    Math.atan2(h - iy, -ix), // 左下
  ].map((a) => (a + Math.PI * 2) % (Math.PI * 2))
  corners.sort((a, b) => a - b)

  // 角から角までの各セクター内に、等間隔のスポークを配置する。
  const per = Math.max(1, Math.round(spokes / 4))
  const angles: number[] = []
  for (let k = 0; k < 4; k++) {
    const a0 = corners[k]
    let a1 = corners[(k + 1) % 4]
    if (a1 <= a0) a1 += Math.PI * 2
    angles.push(a0) // 角のスポークそのもの
    for (let s = 1; s < per; s++) {
      const f = s / per
      const jit = (Math.random() * 2 - 1) * jitter * ((a1 - a0) / per)
      angles.push(a0 + (a1 - a0) * f + jit)
    }
  }
  const A = angles.length

  // 衝撃点（0）から境界（1）までの距離の割合。揺らぎを加える。
  const fr: number[] = []
  for (let r = 1; r <= rings; r++) {
    const base = r / rings
    fr.push(base)
  }
  // point[a][r]: スポーク a に沿ったリング r（r のインデックスは 0..rings-1）。
  const hit: Pt[] = angles.map((a) => rayToRect(ix, iy, a, w, h))
  const pt = (a: number, r: number): Pt => {
    const [hx, hy] = hit[a]
    let f = fr[r]
    if (r < rings - 1) f += (Math.random() * 2 - 1) * jitter * (1 / rings)
    f = Math.max(0.04, Math.min(0.999, f))
    return [ix + (hx - ix) * f, iy + (hy - iy) * f]
  }

  // 隣り合う破片が同一の頂点を共有するよう、リングの点をキャッシュする。
  const grid: Pt[][] = angles.map((_, a) => Array.from({ length: rings }, (_, r) => pt(a, r)))

  const shards: Shard[] = []
  for (let a = 0; a < A; a++) {
    const a2 = (a + 1) % A
    // 最も内側: 衝撃点を中心とした三角形のファン。
    const tri: Pt[] = [[ix, iy], grid[a][0], grid[a2][0]]
    shards.push({ poly: tri, ...centroidObj(tri) })
    // 外側の帯: 連続するリングの間の四角形。
    for (let r = 0; r < rings - 1; r++) {
      const quad: Pt[] = [grid[a][r], grid[a2][r], grid[a2][r + 1], grid[a][r + 1]]
      shards.push({ poly: quad, ...centroidObj(quad) })
    }
  }
  return shards
}

function centroidObj(poly: Pt[]): { cx: number; cy: number } {
  const [cx, cy] = centroid(poly)
  return { cx, cy }
}

function polyToClip(poly: Pt[]): string {
  return `polygon(${poly.map(([x, y]) => `${x}px ${y}px`).join(", ")})`
}

type Transform = { x: number; y: number; rot: number }
const ZERO: Transform = { x: 0, y: 0, rot: 0 }

export interface ShatterGlassProps {
  children: ReactNode
  /** 効果をオフにする（子要素は通常どおりレンダリングされ、砕けない）。@default true */
  active?: boolean
  /** 放射状スポークのおおよその本数（4 の倍数に丸められる）。@default 16 */
  spokes?: number
  /** 衝撃点から端までの同心リングの数。@default 4 */
  rings?: number
  /** ひび模様の不規則さ 0–1。@default 0.5 */
  jitter?: number
  /** 砕けたあとユーザーが破片をドラッグできるようにする。@default true */
  draggable?: boolean
  /** フローティングの操作バー（Repair / Drop）を表示する。@default true */
  controls?: boolean
  /** 衝撃時に合成したガラスの割れる音を鳴らす。@default true */
  sound?: boolean
  /** ガラスが最初に砕けたときに一度だけ発火する。 */
  onShatter?: () => void
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
  const hostRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  // リサイズ後も保持できるよう、衝撃点を割合座標で保持する。
  const [impact, setImpact] = useState<{ fx: number; fy: number } | null>(null)

  useLayoutEffect(() => {
    const el = hostRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize((s) => (s.w === width && s.h === height ? s : { w: width, h: height }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const shards = useMemo(() => {
    if (!impact || size.w === 0 || size.h === 0) return []
    return buildShards(
      size.w,
      size.h,
      impact.fx * size.w,
      impact.fy * size.h,
      spokes,
      rings,
      jitter,
    )
  }, [impact, size.w, size.h, spokes, rings, jitter])
  const n = shards.length

  const [transforms, setTransforms] = useState<Transform[]>([])
  const [z, setZ] = useState<number[]>([])
  const [zTop, setZTop] = useState(1)
  const dragging = useRef<{
    i: number
    px: number
    py: number
    ox: number
    oy: number
  } | null>(null)

  // 破片の集合が変わるたびに（新しい衝撃 / リサイズ）transform をリセットする。
  useEffect(() => {
    setTransforms(Array.from({ length: n }, () => ZERO))
    setZ(Array.from({ length: n }, () => 0))
    setZTop(1)
  }, [n])

  // --- ガラスの割れる音（音源ファイル不要の合成音） ---
  const audioRef = useRef<AudioContext | null>(null)
  const playBreak = useCallback(() => {
    if (!sound) return
    let ctx = audioRef.current
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      ctx = new AC()
      audioRef.current = ctx
    }
    if (ctx.state === "suspended") void ctx.resume()
    const now = ctx.currentTime

    // 衝撃: 短く明るいノイズバースト。
    const len = Math.ceil(ctx.sampleRate * 0.18)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = ctx.createBufferSource()
    src.buffer = buf
    const hp = ctx.createBiquadFilter()
    hp.type = "highpass"
    hp.frequency.value = 2000
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.22, now)
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)
    src.connect(hp).connect(g).connect(ctx.destination)
    src.start(now)
    src.stop(now + 0.2)

    // チリンチリン: 落ちる破片のような、高く小さな音の散らばり。
    for (let k = 0; k < 9; k++) {
      const t = now + 0.03 + Math.random() * 0.4
      const osc = ctx.createOscillator()
      const og = ctx.createGain()
      osc.type = "triangle"
      osc.frequency.setValueAtTime(2200 + Math.random() * 3500, t)
      og.gain.setValueAtTime(0.0001, t)
      og.gain.exponentialRampToValueAtTime(0.06, t + 0.005)
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
      osc.connect(og).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.14)
    }
  }, [sound])

  const shatterAt = (clientX: number, clientY: number) => {
    const el = hostRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setImpact({ fx: (clientX - r.left) / r.width, fy: (clientY - r.top) / r.height })
    playBreak()
    onShatter?.()
  }

  const repair = useCallback(() => setImpact(null), [])

  /** すべての破片を衝撃点から外へ、重力と回転を付けて放り投げる。 */
  const drop = useCallback(() => {
    if (!impact || size.w === 0) return
    const ix = impact.fx * size.w
    const iy = impact.fy * size.h
    setTransforms(
      shards.map((s) => {
        const ang = Math.atan2(s.cy - iy, s.cx - ix)
        const push = 60 + Math.random() * 140
        return {
          x: Math.cos(ang) * push,
          y: Math.sin(ang) * push + 220 + Math.random() * 260, // 重力による下向きバイアス
          rot: (Math.random() * 2 - 1) * 90,
        }
      }),
    )
  }, [impact, size.w, size.h, shards])

  // グローバルなドラッグハンドラ。
  useEffect(() => {
    if (!draggable) return
    const move = (e: PointerEvent) => {
      const d = dragging.current
      if (!d) return
      setTransforms((t) => {
        const next = t.slice()
        next[d.i] = {
          x: d.ox + (e.clientX - d.px),
          y: d.oy + (e.clientY - d.py),
          rot: next[d.i]?.rot ?? 0,
        }
        return next
      })
    }
    const up = () => {
      dragging.current = null
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    return () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
  }, [draggable])

  const onShardPointerDown = (i: number) => (e: React.PointerEvent) => {
    if (!draggable) return
    e.preventDefault()
    const t = transforms[i] ?? ZERO
    dragging.current = { i, px: e.clientX, py: e.clientY, ox: t.x, oy: t.y }
    setZ((order) => {
      const next = order.slice()
      next[i] = zTop
      return next
    })
    setZTop((v) => v + 1)
  }

  if (!active) return <>{children}</>

  const shattered = impact !== null && n > 0

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
      {/* 無傷の表示: 実際の操作可能なページ。クリックで砕ける。砕けたあとは
          これを非表示にし（レイアウトのサイズ計算のために残す）、代わりに
          破片のコピーを表示する。 */}
      <div
        onClick={(e) => {
          if (!shattered) shatterAt(e.clientX, e.clientY)
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
          const t = transforms[i] ?? ZERO
          const isDragging = dragging.current?.i === i
          const clip = polyToClip(s.poly)
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
                transition: isDragging ? "none" : "transform 0.7s cubic-bezier(.2,.8,.2,1)",
                zIndex: 100 + (z[i] ?? 0),
                filter: `drop-shadow(0 ${isDragging ? 8 : 3}px ${
                  isDragging ? 14 : 6
                }px rgba(0,0,0,0.45))`,
              }}
            >
              {/* クリップされたページのコピー。clip-path はヒットテストも
                  クリップするので、破片の形状だけがポインターを受け取る。 */}
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
                <div style={{ pointerEvents: "none", userSelect: "none" }}>{children}</div>
              </div>

              {/* ひびの縁: 破片に沿った明るいガラス質のハイライト。 */}
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
          )
        })}

      {/* 衝撃のフラッシュ */}
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
            💧 落とす
          </button>
          <button type="button" onClick={repair} style={btn("#2d8f5a")}>
            🔧 元に戻す
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
  )
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
  }
}

export default ShatterGlass
