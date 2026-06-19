import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { JigsawPuzzle } from "./JigsawPuzzle";
import { ShatterGlass } from "./ShatterGlass";
import { CheatCode } from "./CheatCode";
import { Pixelate } from "./Pixelate";

/** 各効果に題材を与えるための、偽の「実ページ」。 */
function DemoPage({ hint }: { hint: string }) {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: "#1c1c1c" }}>
      <header
        style={{
          padding: "28px 32px",
          background: "linear-gradient(120deg,#6a5cff,#00c2ff)",
          color: "#fff",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 30 }}>🧩 Acme Dashboard</h1>
        <p style={{ margin: "6px 0 0", opacity: 0.9 }}>
          ごく普通のページ……に見えますよね？
        </p>
      </header>

      <main
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          padding: 32,
          background: "#f4f5f7",
        }}
      >
        {[
          ["売上", "¥1,284,000", "#2d8f5a"],
          ["新規ユーザー", "3,920", "#6a5cff"],
          ["解約率", "1.8%", "#e8543f"],
          ["平均滞在", "4m 12s", "#0a9396"],
          ["問い合わせ", "57件", "#ca6702"],
          ["稼働率", "99.97%", "#005f73"],
        ].map(([label, value, color]) => (
          <div
            key={label}
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: 20,
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontSize: 13, color: "#777" }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
            <div
              style={{
                marginTop: 12,
                height: 8,
                borderRadius: 4,
                background: `linear-gradient(90deg, ${color}, ${color}33)`,
              }}
            />
          </div>
        ))}
      </main>

      <footer style={{ padding: "20px 32px", background: "#22223b", color: "#cfcfe0" }}>
        © 2026 Acme Inc. — {hint}
      </footer>
    </div>
  );
}

const DEMOS = {
  jigsaw: {
    label: "🧩 ジグソー",
    render: () => (
      <JigsawPuzzle rows={4} cols={6} onSolved={() => console.log("solved! 🎉")}>
        <DemoPage hint="ピースをドラッグして元の位置に戻すと、カチッとはまります。" />
      </JigsawPuzzle>
    ),
  },
  shatter: {
    label: "💥 ガラス割れ",
    render: () => (
      <ShatterGlass onShatter={() => console.log("smash! 💥")}>
        <DemoPage hint="どこかをクリックすると、その場所からガラスのように割れます。" />
      </ShatterGlass>
    ),
  },
  cheat: {
    label: "🎮 隠しコマンド",
    render: () => (
      <CheatCode onUnlock={() => console.log("unlocked! 🎮")}>
        <DemoPage hint="↑ ↑ ↓ ↓ ← → ← → B A と入力してみてください。" />
      </CheatCode>
    ),
  },
  pixelate: {
    label: "🟦 モザイク",
    render: () => (
      <Pixelate>
        <DemoPage hint="マウスを乗せると、その下だけくっきり見えます。" />
      </Pixelate>
    ),
  },
} as const;

type DemoKey = keyof typeof DEMOS;

function App() {
  const [active, setActive] = useState<DemoKey>("jigsaw");
  return (
    <div style={{ maxWidth: 980, margin: "40px auto", padding: "0 16px" }}>
      <nav
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 20,
          flexWrap: "wrap",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {(Object.keys(DEMOS) as DemoKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setActive(key)}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: 999,
              background: active === key ? "#1c1c1c" : "#e7e7ee",
              color: active === key ? "#fff" : "#1c1c1c",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {DEMOS[key].label}
          </button>
        ))}
      </nav>

      {/* 切り替え時に再マウントして、各効果を最初からやり直す。 */}
      <div key={active}>{DEMOS[active].render()}</div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
