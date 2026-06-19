import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ *
 * Pixelate
 *
 * 任意のページをラップし、SVG のモザイクフィルタを通して描画することで、
 * 全体が検閲済み / 低解像度のモザイクのように見える。ポインターを乗せると
 * 円形の「曇り取り」レンズがカーソル下の鮮明な元の表示を露わにする——
 * ちょうど窓の曇りを拭うように。スライダーでブロックサイズを調整でき、
 * トグルで一気に全体を露わにできる。
 *
 * ラスタライズも canvas も html2canvas も不要: モザイクはライブ DOM に
 * かけた本物の CSS `filter: url(#…)`、レンズは子要素を円形にクリップした
 * 2 つ目のコピー。ライブ DOM なので、レンズ越しに下のページを操作できる。
 * ------------------------------------------------------------------ */

export interface PixelateProps {
  children: ReactNode;
  /** モザイクのブロックサイズ（px）。大きいほど粗くなる。@default 14 */
  size?: number;
  /** 効果をオフにする（子要素は通常どおりレンダリングされる）。@default true */
  active?: boolean;
  /** ポインター下に鮮明な円を露わにする。@default true */
  lens?: boolean;
  /** 露出レンズの半径（px）。@default 90 */
  lensRadius?: number;
  /** フローティングの操作バー（ブロックサイズのスライダー / 露出トグル）を表示する。@default true */
  controls?: boolean;
}

export function Pixelate({
  children,
  size = 14,
  active = true,
  lens = true,
  lensRadius = 90,
  controls = true,
}: PixelateProps) {
  const uid = useId().replace(/:/g, "");
  const filterId = `${uid}-pixelate`;
  const hostRef = useRef<HTMLDivElement>(null);

  const [px, setPx] = useState(size);
  const [revealed, setRevealed] = useState(false);
  // ホストローカル座標（px）でのレンズ中心。ポインターが離れているときは null。
  const [lensPos, setLensPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => setPx(size), [size]);

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      if (!lens || revealed) return;
      const el = hostRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setLensPos({ x: e.clientX - r.left, y: e.clientY - r.top });
    },
    [lens, revealed],
  );

  if (!active) return <>{children}</>;

  const showLens = lens && !revealed && lensPos !== null;
  const half = px / 2;

  return (
    <div
      ref={hostRef}
      onPointerMove={onMove}
      onPointerLeave={() => setLensPos(null)}
      style={{ position: "relative", isolation: "isolate" }}
    >
      {/* モザイクフィルタ。`px` が変わるたびに再生成する:
          feFlood がセルごとに 1 色をサンプリングし、feTile がセルの
          グリッドを繰り返し、composite がソースの形にマスクし、
          feMorphology が各サンプルをブロック全体に広げる。 */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <defs>
          <filter id={filterId} x="0" y="0" width="100%" height="100%">
            <feFlood x={half} y={half} width="1" height="1" />
            <feComposite width={px} height={px} />
            <feTile result="cells" />
            <feComposite in="SourceGraphic" in2="cells" operator="in" />
            <feMorphology operator="dilate" radius={half} />
          </filter>
        </defs>
      </svg>

      {/* ベースレイヤー: ページ全体をモザイク化（完全露出時を除く）。 */}
      <div
        style={{
          filter: revealed ? undefined : `url(#${filterId})`,
          // モザイク化したコピーは背景にすぎない。クリックは上にある鮮明な
          // コピーへ渡るので、レンズ越しに実際のページを操作できる。
          pointerEvents: revealed ? "auto" : "none",
          userSelect: revealed ? "auto" : "none",
        }}
      >
        {children}
      </div>

      {/* レンズレイヤー: ポインター下の円形にクリップした鮮明なコピー。 */}
      {showLens && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            clipPath: `circle(${lensRadius}px at ${lensPos.x}px ${lensPos.y}px)`,
            WebkitClipPath: `circle(${lensRadius}px at ${lensPos.x}px ${lensPos.y}px)`,
          }}
        >
          {children}
          {/* レンズらしく見えるよう、周囲にうっすらとした輪を描く。 */}
          <div
            style={{
              position: "absolute",
              left: lensPos.x - lensRadius,
              top: lensPos.y - lensRadius,
              width: lensRadius * 2,
              height: lensRadius * 2,
              borderRadius: "50%",
              boxShadow: "0 0 0 2px rgba(255,255,255,0.8), 0 4px 18px rgba(0,0,0,0.35)",
              pointerEvents: "none",
            }}
          />
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
            gap: 10,
            padding: "8px 12px",
            borderRadius: 999,
            background: "rgba(20,20,30,0.7)",
            color: "#fff",
            fontFamily: "system-ui, sans-serif",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            🟦
            <input
              type="range"
              min={4}
              max={40}
              value={px}
              onChange={(e) => setPx(Number(e.target.value))}
              disabled={revealed}
            />
          </label>
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            style={{
              padding: "6px 12px",
              border: "none",
              borderRadius: 999,
              background: revealed ? "#e8543f" : "#2d8f5a",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {revealed ? "🟦 モザイク" : "👓 解除"}
          </button>
        </div>
      )}
    </div>
  );
}

export default Pixelate;
