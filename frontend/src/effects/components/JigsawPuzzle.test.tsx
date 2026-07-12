import { render, screen } from "@testing-library/react"
import { JigsawPuzzle } from "./JigsawPuzzle"

// jsdom ではホスト要素のサイズが 0 のためピースは生成されないが、
// レイアウト用の子要素コピーと操作バーの描画は検証できる。
describe("JigsawPuzzle", () => {
  it("子要素（レイアウト用コピー）と操作バーを描画する", () => {
    render(
      <JigsawPuzzle sound={false}>
        <p>ページ本体</p>
      </JigsawPuzzle>,
    )
    expect(screen.getByText("ページ本体")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /シャッフル/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /そろえる/ })).toBeInTheDocument()
  })

  it("active=false なら子要素だけを描画する", () => {
    render(
      <JigsawPuzzle active={false}>
        <p>ページ本体</p>
      </JigsawPuzzle>,
    )
    expect(screen.getByText("ページ本体")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("controls=false なら操作バーを出さない", () => {
    render(
      <JigsawPuzzle controls={false} sound={false}>
        <p>ページ本体</p>
      </JigsawPuzzle>,
    )
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
