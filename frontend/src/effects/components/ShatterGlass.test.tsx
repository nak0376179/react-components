import { render, screen, fireEvent } from "@testing-library/react"
import { ShatterGlass } from "./ShatterGlass"

describe("ShatterGlass", () => {
  it("砕ける前は子要素を通常どおり描画し、操作バーは出さない", () => {
    render(
      <ShatterGlass sound={false}>
        <p>ページ本体</p>
      </ShatterGlass>,
    )
    expect(screen.getByText("ページ本体")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("クリックで onShatter が発火する", () => {
    const onShatter = vi.fn()
    render(
      <ShatterGlass sound={false} onShatter={onShatter}>
        <p>ページ本体</p>
      </ShatterGlass>,
    )
    fireEvent.click(screen.getByText("ページ本体"))
    expect(onShatter).toHaveBeenCalledTimes(1)
  })

  it("active=false ならクリックしても砕けない", () => {
    const onShatter = vi.fn()
    render(
      <ShatterGlass active={false} onShatter={onShatter}>
        <p>ページ本体</p>
      </ShatterGlass>,
    )
    fireEvent.click(screen.getByText("ページ本体"))
    expect(onShatter).not.toHaveBeenCalled()
  })
})
