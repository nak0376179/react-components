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
 * 定番の隠しイースターエッグ。任意のページをラップし、秘密のキー入力
 * （有名な ↑ ↑ ↓ ↓ ← → ← → B A）を打ち込むと解除される。紙吹雪が舞い、
 * ページ全体に虹色のきらめきがかかり、渡した `secret` の中身（または
 * デフォルトの 🎉 バナー）が表示される。`Esc` で再び閉じる。
 *
 * 子要素はキャプチャもクローンもされず、コード発動の前後を通じて完全に
 * 通常どおりレンダリングされるため、実際のページを囲んでも安全。残す
 * 痕跡は window への `keydown` リスナー 1 つだけ。
 * ------------------------------------------------------------------ */

/** 正式なキー入力シーケンス（KeyboardEvent.key の値を使用）。 */
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
  /** 解除されたときに表示する内容。デフォルトはお祝いのバナー。 */
  secret?: ReactNode;
  /** キー入力シーケンスを上書きする（KeyboardEvent.key の値、大文字小文字は無視）。 */
  code?: readonly string[];
  /** 解除時に紙吹雪を降らせる。@default true */
  confetti?: boolean;
  /** 解除時にページ全体へ短い虹色のきらめきをかける。@default true */
  shimmer?: boolean;
  /** 解除時に合成したパワーアップ音を鳴らす。@default true */
  sound?: boolean;
  /** 2 回目の入力で解除を切り替えず、解除したままにする。@default false */
  sticky?: boolean;
  /** コードが完成するたびに発火する。 */
  onUnlock?: () => void;
}

type Confetto = {
  id: number;
  left: number; // vw
  delay: number; // 秒
  dur: number; // 秒
  color: string;
  size: number; // px
  rot: number; // 度
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

  // 解除音用に遅延生成する AudioContext（音源ファイル不要の合成音）。
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
    // 1UP 風に上昇するアルペジオ。
    [659, 784, 988, 1319].forEach((freq, k) => {
      const t = ctx!.currentTime + k * 0.08;
      const osc = ctx!.createOscillator();
      const g = ctx!.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.08, t + 0.02);
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
        // より新しい紙吹雪に置き換えられていない場合のみクリアする。
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
        // リセットするが寛容に扱う。間違ったキーでも *先頭* のキーと一致すれば
        // 新たな開始としてカウントする（例: ↑ ↑ ↑ でも進行する）。
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

      {/* 紙吹雪 */}
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

      {/* 秘密のコンテンツ */}
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
残機 30 機 解除！
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
