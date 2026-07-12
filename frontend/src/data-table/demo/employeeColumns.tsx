import { Chip } from "@mui/material"
import { createColumnHelper } from "@tanstack/react-table"
import { STATUS_COLOR, STATUS_LABEL, type Employee, type Status } from "../employee"

/** 在籍状態を色付きChipで表示する（両デモで共通）。 */
export function StatusChip({ status }: { status: Status }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      label={STATUS_LABEL[status]}
      color={STATUS_COLOR[status]}
    />
  )
}

/** 年収を「¥3,500,000」形式に整形する（両デモで共通）。 */
export function formatSalary(salary: number): string {
  return `¥${salary.toLocaleString()}`
}

const columnHelper = createColumnHelper<Employee>()

/** クライアント側 DataTable 用のカラム定義。 */
export const employeeColumns = [
  columnHelper.accessor("email", { header: "メールアドレス" }),
  columnHelper.accessor("name", { header: "氏名" }),
  columnHelper.accessor("department", { header: "部署" }),
  columnHelper.accessor("role", { header: "役職" }),
  columnHelper.accessor("status", {
    header: "状態",
    cell: (info) => <StatusChip status={info.getValue()} />,
  }),
  columnHelper.accessor("joinedAt", { header: "入社日" }),
  columnHelper.accessor("salary", {
    header: "年収",
    cell: (info) => formatSalary(info.getValue()),
  }),
]
