import { Box, Container, Typography } from "@mui/material"
import { CsvJsonTextArea } from "../components/CsvJsonTextArea"
import { ColumnSpecTable } from "./ColumnSpecTable"
import { demoColumns, sampleCsv } from "./demoColumns"

/** CSV/TSV → JSON 変換テキストエリアのショーケース（React 版）。 */
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

      <ColumnSpecTable columns={demoColumns} />

      <Typography variant="body2" color="text.secondary" gutterBottom>
        サンプル（コピーして貼り付けてみてください）:
      </Typography>
      <Box
        component="pre"
        sx={{ p: 1.5, mb: 2, bgcolor: "grey.100", borderRadius: 1, fontSize: 13, overflow: "auto" }}
      >
        {sampleCsv}
      </Box>

      <CsvJsonTextArea columns={demoColumns} />
    </Container>
  )
}
