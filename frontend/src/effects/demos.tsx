import type { Demo } from "../app/demos"
import { CheatCode, JigsawPuzzle, Pixelate, ShatterGlass } from "./index"
import { DemoPage } from "./demo/DemoPage"

/** effects feature が提供するデモの一覧。 */
export const effectsDemos: Demo[] = [
  {
    slug: "jigsaw",
    label: "🧩 ジグソー",
    element: (
      <JigsawPuzzle rows={4} cols={6} onSolved={() => console.log("solved! 🎉")}>
        <DemoPage hint="ピースをドラッグして元の位置に戻すと、カチッとはまります。" />
      </JigsawPuzzle>
    ),
  },
  {
    slug: "shatter",
    label: "💥 ガラス割れ",
    element: (
      <ShatterGlass onShatter={() => console.log("smash! 💥")}>
        <DemoPage hint="どこかをクリックすると、その場所からガラスのように割れます。" />
      </ShatterGlass>
    ),
  },
  {
    slug: "cheat",
    label: "🎮 隠しコマンド",
    element: (
      <CheatCode onUnlock={() => console.log("unlocked! 🎮")}>
        <DemoPage hint="↑ ↑ ↓ ↓ ← → ← → B A と入力してみてください。" />
      </CheatCode>
    ),
  },
  {
    slug: "pixelate",
    label: "🟦 モザイク",
    element: (
      <Pixelate>
        <DemoPage hint="マウスを乗せると、その下だけくっきり見えます。" />
      </Pixelate>
    ),
  },
]
