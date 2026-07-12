import { render, screen, fireEvent } from "@testing-library/react"
import { Pixelate } from "./Pixelate"

describe("Pixelate", () => {
  it("子要素と操作バーを描画する", () => {
    render(
      <Pixelate>
        <p>ページ本体</p>
      </Pixelate>,
    )
    // モザイクレイヤーの子要素（レンズは非表示なので 1 つ）
    expect(screen.getByText("ページ本体")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /解除/ })).toBeInTheDocument()
    expect(screen.getByRole("slider")).toBeInTheDocument()
  })

  it("解除トグルでボタン表示が切り替わる", () => {
    render(
      <Pixelate>
        <p>ページ本体</p>
      </Pixelate>,
    )
    fireEvent.click(screen.getByRole("button", { name: /解除/ }))
    expect(screen.getByRole("button", { name: /モザイク/ })).toBeInTheDocument()
    expect(screen.getByRole("slider")).toBeDisabled()
  })

  it("active=false なら子要素だけを描画する", () => {
    render(
      <Pixelate active={false}>
        <p>ページ本体</p>
      </Pixelate>,
    )
    expect(screen.getByText("ページ本体")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("controls=false なら操作バーを出さない", () => {
    render(
      <Pixelate controls={false}>
        <p>ページ本体</p>
      </Pixelate>,
    )
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
