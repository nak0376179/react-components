import { useState } from "react"
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import {
  convertDelimitedText,
  MAX_ERRORS,
  type ColumnSpec,
  type ConvertResult,
  type OutputFormat,
} from "../core/convert"

export interface CsvJsonTextAreaProps {
  /** 列定義（日本語の項目名 / JSON キー / バリデーション / 必須・省略可・不要）。 */
  columns: ColumnSpec[]
  /** 変換を実行したときに結果を受け取るコールバック。 */
  onConvert?: (result: ConvertResult) => void
  /** テキストエリアの行数。 */
  rows?: number
}

/**
 * CSV/TSV を貼り付けて JSON / CSV に変換するテキストエリア。
 * 変換・検証のロジックは React 非依存の {@link convertDelimitedText} に委譲していて、
 * このコンポーネントは入力と結果表示だけを担う薄いラッパー。
 */
export function CsvJsonTextArea({ columns, onConvert, rows = 8 }: CsvJsonTextAreaProps) {
  const [text, setText] = useState("")
  const [format, setFormat] = useState<OutputFormat>("json")
  const [result, setResult] = useState<ConvertResult | null>(null)

  const handleConvert = () => {
    const next = convertDelimitedText(text, columns, format)
    setResult(next)
    onConvert?.(next)
  }

  return (
    <Stack spacing={2}>
      <TextField
        multiline
        rows={rows}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"ここに CSV / TSV を貼り付けてください（1行目はヘッダ）\n例: " + columns.map((c) => c.label).join(", ")}
        slotProps={{ htmlInput: { "aria-label": "CSV/TSV 入力" } }}
      />
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <Button variant="contained" onClick={handleConvert}>
          変換
        </Button>
        <RadioGroup row value={format} onChange={(e) => setFormat(e.target.value as OutputFormat)}>
          <FormControlLabel value="json" control={<Radio size="small" />} label="JSON" />
          <FormControlLabel value="csv" control={<Radio size="small" />} label="CSV" />
        </RadioGroup>
      </Stack>

      {result && !result.ok && (
        <Alert severity="error">
          <Typography variant="subtitle2">
            エラーが {result.errors.length}
            {result.errors.length >= MAX_ERRORS ? "件以上" : "件"} あります
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5, maxHeight: 240, overflow: "auto" }}>
            {result.errors.map((e, i) => (
              <li key={i}>{e.message}</li>
            ))}
          </Box>
        </Alert>
      )}

      {result?.ok && (
        <Stack spacing={1}>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Typography variant="subtitle2">変換結果（{result.rows.length}件）</Typography>
            <Button size="small" onClick={() => navigator.clipboard.writeText(result.output)}>
              コピー
            </Button>
          </Stack>
          <Box
            component="pre"
            aria-label="変換結果"
            sx={{
              m: 0,
              p: 1.5,
              bgcolor: "grey.100",
              borderRadius: 1,
              fontSize: 13,
              maxHeight: 320,
              overflow: "auto",
            }}
          >
            {result.output}
          </Box>
        </Stack>
      )}
    </Stack>
  )
}
