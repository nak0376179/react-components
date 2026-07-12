import { afterEach, describe, expect, it } from "vitest"
import { createApp, nextTick, type App } from "vue"
import { fireEvent, screen } from "@testing-library/dom"
import CsvJsonTextArea from "./CsvJsonTextArea.vue"
import type { ColumnSpec } from "../core/convert"

const columns: ColumnSpec[] = [
  { label: "氏名", key: "name", usage: "required" },
  { label: "年齢", key: "age", usage: "optional" },
]

let app: App | null = null

/** Vue コンポーネントを document.body 配下にマウントする。 */
function mount() {
  const host = document.createElement("div")
  document.body.appendChild(host)
  app = createApp(CsvJsonTextArea, { columns })
  app.mount(host)
}

afterEach(() => {
  app?.unmount()
  app = null
  document.body.innerHTML = ""
})

describe("CsvJsonTextArea (Vue)", () => {
  it("貼り付けた CSV を変換して JSON を表示する", async () => {
    mount()
    fireEvent.input(screen.getByLabelText("CSV/TSV 入力"), {
      target: { value: "氏名,年齢\n山田太郎,30" },
    })
    fireEvent.click(screen.getByRole("button", { name: "変換" }))
    await nextTick()

    const output = screen.getByLabelText("変換結果")
    expect(JSON.parse(output.textContent ?? "")).toEqual([{ name: "山田太郎", age: "30" }])
  })

  it("エラーがあればリストで表示する", async () => {
    mount()
    fireEvent.input(screen.getByLabelText("CSV/TSV 入力"), {
      target: { value: "氏名,年齢\n,30" },
    })
    fireEvent.click(screen.getByRole("button", { name: "変換" }))
    await nextTick()

    expect(screen.getByText("2行目: 「氏名」は必須です")).toBeInTheDocument()
    expect(screen.queryByLabelText("変換結果")).toBeNull()
  })
})
