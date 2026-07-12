import { Chip, Paper, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material"
import type { ColumnSpec } from "../core/convert"
import { usageLabel } from "./demoColumns"

/** デモ用の列定義を一覧表示するテーブル。React / Vue 両方のデモページで使う。 */
export function ColumnSpecTable({ columns }: { columns: ColumnSpec[] }) {
  return (
    <Paper variant="outlined" sx={{ my: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>項目名</TableCell>
            <TableCell>JSON キー</TableCell>
            <TableCell>扱い</TableCell>
            <TableCell>バリデーション</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {columns.map((c) => (
            <TableRow key={c.key}>
              <TableCell>{c.label}</TableCell>
              <TableCell>
                <code>{c.key}</code>
              </TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={usageLabel[c.usage]}
                  color={c.usage === "required" ? "error" : c.usage === "optional" ? "default" : "warning"}
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                {c.label === "メールアドレス" ? "メール形式" : c.label === "年齢" ? "数値" : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  )
}
