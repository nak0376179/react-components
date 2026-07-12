import { render, screen, fireEvent } from "@testing-library/react"
import { CheatCode, CHEAT_SEQUENCE } from "./CheatCode"

/** 正規シーケンスを window に打ち込む。 */
function typeSequence(keys: readonly string[] = CHEAT_SEQUENCE) {
  for (const key of keys) fireEvent.keyDown(window, { key })
}

describe("CheatCode", () => {
  it("子要素を通常どおり描画し、秘密は表示しない", () => {
    render(
      <CheatCode confetti={false} sound={false}>
        <p>ページ本体</p>
      </CheatCode>,
    )
    expect(screen.getByText("ページ本体")).toBeInTheDocument()
    expect(screen.queryByText("残機 30 機 解除！")).not.toBeInTheDocument()
  })

  it("コード入力で秘密が表示され、Esc で閉じる", () => {
    render(
      <CheatCode confetti={false} sound={false}>
        <p>ページ本体</p>
      </CheatCode>,
    )
    typeSequence()
    expect(screen.getByText("残機 30 機 解除！")).toBeInTheDocument()
    // 解除中も子要素はそのまま
    expect(screen.getByText("ページ本体")).toBeInTheDocument()

    fireEvent.keyDown(window, { key: "Escape" })
    expect(screen.queryByText("残機 30 機 解除！")).not.toBeInTheDocument()
  })

  it("secret prop と onUnlock が機能する", () => {
    const onUnlock = vi.fn()
    render(
      <CheatCode confetti={false} sound={false} secret={<p>カスタム秘密</p>} onUnlock={onUnlock}>
        <p>ページ本体</p>
      </CheatCode>,
    )
    typeSequence()
    expect(screen.getByText("カスタム秘密")).toBeInTheDocument()
    expect(onUnlock).toHaveBeenCalledTimes(1)
  })

  it("途中で間違えるとリセットされる", () => {
    render(
      <CheatCode confetti={false} sound={false}>
        <p>ページ本体</p>
      </CheatCode>,
    )
    fireEvent.keyDown(window, { key: "ArrowUp" })
    fireEvent.keyDown(window, { key: "x" }) // 失敗
    typeSequence(CHEAT_SEQUENCE.slice(1)) // 先頭抜きでは完成しない
    expect(screen.queryByText("残機 30 機 解除！")).not.toBeInTheDocument()
  })
})
