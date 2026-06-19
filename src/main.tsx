import React from "react";
import ReactDOM from "react-dom/client";
import { JigsawPuzzle } from "./JigsawPuzzle";

/** A fake "real page" so the puzzle effect has something to chew on. */
function DemoPage() {
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
        © 2026 Acme Inc. — ピースをドラッグして元の位置に戻すと、カチッとはまります。
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div style={{ maxWidth: 980, margin: "40px auto", padding: "0 16px" }}>
      <JigsawPuzzle rows={4} cols={6} onSolved={() => console.log("solved! 🎉")}>
        <DemoPage />
      </JigsawPuzzle>
    </div>
  </React.StrictMode>,
);
