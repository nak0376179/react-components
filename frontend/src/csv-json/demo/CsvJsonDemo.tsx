import {
  Box,
  Chip,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material"
import { CsvJsonTextArea } from "../components/CsvJsonTextArea"
import type { ColumnSpec, ColumnUsage } from "../core/convert"

/** デモ用の列定義。Excel からのコピペ（TSV）も想定。 */
const demoColumns: ColumnSpec[] = [
  { label: "氏名", key: "name", usage: "required" },
  {
    label: "メールアドレス",
    key: "email",
    usage: "required",
    validate: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "メールアドレスの形式ではありません"),
  },
  {
    label: "年齢",
    key: "age",
    usage: "optional",
    validate: (v) => (/^\d+$/.test(v) ? null : "数値で入力してください"),
  },
  { label: "部署", key: "department", usage: "optional" },
  { label: "メモ", key: "memo", usage: "unused" },
]

const usageLabel: Record<ColumnUsage, string> = {
  required: "必須",
  optional: "省略可",
  unused: "不要",
}

const sample = [
  "氏名,メールアドレス,年齢,部署,メモ",
  "山田太郎,taro@example.com,30,開発部,自由記入",
  "佐藤花子,hanako@example.com,,営業部,",
].join("\n")

/** CSV/TSV → JSON 変換テキストエリアのショーケース。 */
export function CsvJsonDemo() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        📋 CSV/TSV → JSON 変換
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        CSV や TSV（Excel からのコピペ）を貼り付けて「変換」を押すと、列定義に従って検証し、JSON または CSV
        に変換します。エラーは行番号・項目名つきで最大100件まで表示します。
      </Typography>

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
            {demoColumns.map((c) => (
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

      <Typography variant="body2" color="text.secondary" gutterBottom>
        サンプル（コピーして貼り付けてみてください）:
      </Typography>
      <Box
        component="pre"
        sx={{ p: 1.5, mb: 2, bgcolor: "grey.100", borderRadius: 1, fontSize: 13, overflow: "auto" }}
      >
        {sample}
      </Box>

      <CsvJsonTextArea columns={demoColumns} />
    </Container>
  )
}
