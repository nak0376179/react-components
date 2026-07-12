import { render, screen } from "@testing-library/react"
import { StatusChip, formatSalary, employeeColumns } from "./employeeColumns"
import { DataTable } from "./DataTable"
import type { Employee } from "../employee"

describe("formatSalary", () => {
  it("¥ + 桁区切りで整形する", () => {
    expect(formatSalary(8_600_000)).toBe("¥8,600,000")
    expect(formatSalary(0)).toBe("¥0")
  })
})

describe("StatusChip", () => {
  it("status に対応する日本語ラベルを表示する", () => {
    render(<StatusChip status="active" />)
    expect(screen.getByText("在籍")).toBeInTheDocument()
  })
})

const sample: Employee[] = [
  {
    id: 1,
    name: "山本 陽菜",
    department: "人事",
    role: "リーダー",
    status: "onLeave",
    joinedAt: "2021-06-24",
    salary: 8_600_000,
  },
]

describe("DataTable", () => {
  it("data の行を描画する", () => {
    render(<DataTable data={sample} columns={employeeColumns} />)
    expect(screen.getByText("山本 陽菜")).toBeInTheDocument()
    expect(screen.getByText("¥8,600,000")).toBeInTheDocument()
    expect(screen.getByText("休職")).toBeInTheDocument()
  })
})
