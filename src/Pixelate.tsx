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
 * Wrap any page and render it through an SVG pixelation filter, so the
 * whole thing looks like a censored / low-res mosaic. Move the pointer
 * over it and a circular "defog" lens reveals the crisp original under
 * your cursor — like wiping fog off a window. A slider controls the
 * block size; a toggle reveals everything at once.
 *
 * No rasterisation, no canvas, no html2canvas: the mosaic is a real CSS
 * `filter: url(#…)` over the live DOM, and the lens is a second copy of
 * the children clipped to a circle. Because it's the live DOM, the page
 * underneath stays interactive through the lens.
 * ------------------------------------------------------------------ */

export interface PixelateProps {
  children: ReactNode;
  /** Mosaic block size in px (bigger = chunkier). @default 14 */
  size?: number;
  /** Turn the effect off (children render normally). @default true */
  active?: boolean;
  /** Reveal a crisp circle under the pointer. @default true */
  lens?: boolean;
  /** Radius of the reveal lens in px. @default 90 */
  lensRadius?: number;
  /** Show the floating control bar (block-size slider / reveal toggle). @default true */
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
  // Lens centre in host-local px; null when the pointer is away.
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
      {/* The pixelation filter. Regenerated whenever `px` changes:
          feFlood samples one colour per cell, feTile repeats the cell
          grid, the composite masks it to the source, and feMorphology
          spreads each sample across its whole block. */}
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

      {/* Base layer: the whole page, mosaicked (unless fully revealed). */}
      <div
        style={{
          filter: revealed ? undefined : `url(#${filterId})`,
          // The mosaicked copy is just scenery; clicks go to the crisp
          // copy on top so the real page stays usable through the lens.
          pointerEvents: revealed ? "auto" : "none",
          userSelect: revealed ? "auto" : "none",
        }}
      >
        {children}
      </div>

      {/* Lens layer: a crisp copy clipped to a circle under the pointer. */}
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
          {/* A faint ring around the lens so it reads as a lens. */}
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
            {revealed ? "🟦 Pixelate" : "👓 Reveal"}
          </button>
        </div>
      )}
    </div>
  );
}

export default Pixelate;
