import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ *
 * CheatCode
 *
 * The classic hidden easter egg: wrap any page, type the secret button
 * sequence (the famous ↑ ↑ ↓ ↓ ← → ← → B A) and it unlocks — a confetti
 * burst, a cheeky rainbow shimmer over the page, and whatever `secret`
 * content you passed (or a default 🎉 banner). `Esc` puts it away again.
 *
 * Nothing is captured or cloned; children render completely normally
 * until (and after) the code fires, so it's safe to drop around a real
 * page. The only footprint is a single window `keydown` listener.
 * ------------------------------------------------------------------ */

/** The canonical sequence, using KeyboardEvent.key values. */
export const CHEAT_SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
] as const;

export interface CheatCodeProps {
  children: ReactNode;
  /** What to show once unlocked. Defaults to a celebratory banner. */
  secret?: ReactNode;
  /** Override the key sequence (KeyboardEvent.key values, case-insensitive). */
  code?: readonly string[];
  /** Rain confetti on unlock. @default true */
  confetti?: boolean;
  /** Give the whole page a brief rainbow shimmer on unlock. @default true */
  shimmer?: boolean;
  /** Play a synthesised power-up jingle on unlock. @default true */
  sound?: boolean;
  /** Stay unlocked instead of toggling back off on a second entry. @default false */
  sticky?: boolean;
  /** Fired each time the code completes. */
  onUnlock?: () => void;
}

type Confetto = {
  id: number;
  left: number; // vw
  delay: number; // s
  dur: number; // s
  color: string;
  size: number; // px
  rot: number; // deg
};

const CONFETTI_COLORS = [
  "#e8543f",
  "#ca6702",
  "#2d8f5a",
  "#0a9396",
  "#6a5cff",
  "#00c2ff",
  "#ee9b00",
];

export function CheatCode({
  children,
  secret,
  code = CHEAT_SEQUENCE,
  confetti = true,
  shimmer = true,
  sound = true,
  sticky = false,
  onUnlock,
}: CheatCodeProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [burst, setBurst] = useState<Confetto[]>([]);
  const progress = useRef(0);
  const burstId = useRef(0);

  const wanted = useMemo(() => code.map((k) => k.toLowerCase()), [code]);

  // Lazily-created AudioContext for the unlock jingle (synthesised, no assets).
  const audioRef = useRef<AudioContext | null>(null);
  const playJingle = useCallback(() => {
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
    // A rising 1-up style arpeggio.
    [659, 784, 988, 1319].forEach((freq, k) => {
      const t = ctx!.currentTime + k * 0.08;
      const osc = ctx!.createOscillator();
      const g = ctx!.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(g).connect(ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  }, [sound]);

  const fire = useCallback(() => {
    setUnlocked((u) => (sticky ? true : !u));
    playJingle();
    if (confetti) {
      const id = ++burstId.current;
      const pieces: Confetto[] = Array.from({ length: 80 }, (_, i) => ({
        id: id * 1000 + i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 2.4 + Math.random() * 1.6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 8,
        rot: Math.random() * 360,
      }));
      setBurst(pieces);
      window.setTimeout(() => {
        // Only clear if no newer burst superseded this one.
        if (burstId.current === id) setBurst([]);
      }, 4200);
    }
    onUnlock?.();
  }, [sticky, confetti, playJingle, onUnlock]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setUnlocked(false);
        progress.current = 0;
        return;
      }
      const want = wanted[progress.current];
      if (e.key.toLowerCase() === want) {
        progress.current += 1;
        if (progress.current === wanted.length) {
          progress.current = 0;
          fire();
        }
      } else {
        // Reset, but be forgiving: a wrong key that equals the *first*
        // key counts as a fresh start (e.g. ↑ ↑ ↑ still progresses).
        progress.current = e.key.toLowerCase() === wanted[0] ? 1 : 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [wanted, fire]);

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          animation: unlocked && shimmer ? "cheat-shimmer 1.2s ease-in-out" : undefined,
        }}
      >
        {children}
      </div>

      {/* Confetti rain */}
      {burst.length > 0 && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            overflow: "hidden",
            zIndex: 100000,
          }}
        >
          {burst.map((c) => (
            <span
              key={c.id}
              style={{
                position: "absolute",
                top: -20,
                left: `${c.left}vw`,
                width: c.size,
                height: c.size * 0.6,
                background: c.color,
                borderRadius: 2,
                transform: `rotate(${c.rot}deg)`,
                animation: `cheat-fall ${c.dur}s linear ${c.delay}s forwards`,
              }}
            />
          ))}
        </div>
      )}

      {/* The secret payload */}
      {unlocked && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
            zIndex: 100001,
          }}
        >
          <div
            style={{
              pointerEvents: "auto",
              animation: "cheat-pop 0.5s cubic-bezier(.2,.9,.25,1.4)",
            }}
          >
            {secret ?? <DefaultSecret onClose={() => setUnlocked(false)} />}
          </div>
        </div>
      )}

      <style>{KEYFRAMES}</style>
    </div>
  );
}

function DefaultSecret({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        padding: "28px 36px",
        borderRadius: 20,
        background: "rgba(20,20,30,0.9)",
        color: "#fff",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
        boxShadow: "0 18px 50px rgba(0,0,0,0.5)",
        maxWidth: 360,
      }}
    >
      <div style={{ fontSize: 44 }}>🎉</div>
      <div style={{ fontSize: 24, fontWeight: 800, margin: "6px 0" }}>
        30 lives unlocked!
      </div>
      <div style={{ opacity: 0.8, fontSize: 14 }}>
        隠しコマンド成功。<code>secret</code> prop で中身を差し替えられます。
      </div>
      <button
        type="button"
        onClick={onClose}
        style={{
          marginTop: 18,
          padding: "8px 18px",
          border: "none",
          borderRadius: 999,
          background: "#6a5cff",
          color: "#fff",
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        閉じる (Esc)
      </button>
    </div>
  );
}

const KEYFRAMES = `
@keyframes cheat-fall {
  to { transform: translateY(110vh) rotate(720deg); opacity: 0.9; }
}
@keyframes cheat-pop {
  from { transform: scale(0.6); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}
@keyframes cheat-shimmer {
  0%, 100% { filter: none; }
  50% { filter: hue-rotate(320deg) saturate(1.6); }
}
`;

export default CheatCode;
