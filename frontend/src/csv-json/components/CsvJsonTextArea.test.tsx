import { describe, expect, it } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { CsvJsonTextArea } from "./CsvJsonTextArea"
import type { ColumnSpec } from "../core/convert"

const columns: ColumnSpec[] = [
  { label: "氏名", key: "name", usage: "required" },
  { label: "年齢", key: "age", usage: "optional" },
]

describe("CsvJsonTextArea", () => {
  it("貼り付けた CSV を変換して JSON を表示する", () => {
    render(<CsvJsonTextArea columns={columns} />)
    fireEvent.change(screen.getByLabelText("CSV/TSV 入力"), {
      target: { value: "氏名,年齢\n山田太郎,30" },
    })
    fireEvent.click(screen.getByRole("button", { name: "変換" }))

    const output = screen.getByLabelText("変換結果")
    expect(JSON.parse(output.textContent ?? "")).toEqual([{ name: "山田太郎", age: "30" }])
  })

  it("エラーがあればリストで表示する", () => {
    render(<CsvJsonTextArea columns={columns} />)
    fireEvent.change(screen.getByLabelText("CSV/TSV 入力"), {
      target: { value: "氏名,年齢\n,30" },
    })
    fireEvent.click(screen.getByRole("button", { name: "変換" }))

    expect(screen.getByText("2行目: 「氏名」は必須です")).toBeInTheDocument()
    expect(screen.queryByLabelText("変換結果")).not.toBeInTheDocument()
  })
})
