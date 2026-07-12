// jest-dom のカスタムマッチャ（toBeInTheDocument など）を vitest の expect に追加する。
import "@testing-library/jest-dom/vitest"

// jsdom には ResizeObserver がないため最小限のスタブを入れる
// （JigsawPuzzle / ShatterGlass がホスト要素の計測に使う）。
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}
