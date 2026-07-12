import { render, screen, fireEvent, within } from "@testing-library/react"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "./DataTable"

// employeeColumns に依存しない、DataTable 単体の汎用テスト用データ。
type Fruit = { name: string; price: number }

const columns: ColumnDef<Fruit, string | number>[] = [
  { accessorKey: "name", header: "名前" },
  { accessorKey: "price", header: "価格" },
]

const fruits: Fruit[] = [
  { name: "りんご", price: 120 },
  { name: "みかん", price: 80 },
  { name: "バナナ", price: 100 },
]

describe("DataTable", () => {
  it("ヘッダーと全行を描画する", () => {
    render(<DataTable data={fruits} columns={columns} />)
    expect(screen.getByText("名前")).toBeInTheDocument()
    expect(screen.getByText("価格")).toBeInTheDocument()
    expect(screen.getByText("りんご")).toBeInTheDocument()
    expect(screen.getByText("みかん")).toBeInTheDocument()
    expect(screen.getByText("バナナ")).toBeInTheDocument()
  })

  it("data が空のとき空状態メッセージを表示する", () => {
    render(<DataTable data={[]} columns={columns} />)
    expect(screen.getByText("該当するデータがありません")).toBeInTheDocument()
  })

  it("検索ボックスの入力で行を絞り込む", () => {
    render(<DataTable data={fruits} columns={columns} />)
    fireEvent.change(screen.getByPlaceholderText("検索…"), { target: { value: "みかん" } })
    expect(screen.getByText("みかん")).toBeInTheDocument()
    expect(screen.queryByText("りんご")).not.toBeInTheDocument()
  })

  it("ヘッダークリックで昇順ソートする", () => {
    render(<DataTable data={fruits} columns={columns} />)
    fireEvent.click(screen.getByText("価格"))
    const body = screen.getAllByRole("rowgroup")[1] // thead, tbody の順
    const firstRow = within(body).getAllByRole("row")[0]
    expect(within(firstRow).getByText("みかん")).toBeInTheDocument()
  })

  it("initialPageSize でページ分割し件数ラベルを表示する", () => {
    const many: Fruit[] = Array.from({ length: 7 }, (_, i) => ({
      name: `品目${i + 1}`,
      price: i * 10,
    }))
    render(<DataTable data={many} columns={columns} initialPageSize={5} />)
    expect(screen.getByText("品目1")).toBeInTheDocument()
    expect(screen.queryByText("品目6")).not.toBeInTheDocument()
    expect(screen.getByText("1–5 / 7件")).toBeInTheDocument()
  })
})
