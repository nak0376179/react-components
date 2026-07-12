import { useEffect, useRef } from "react"
import { createApp } from "vue"
import { Box, Container, Paper, Typography } from "@mui/material"
import VueCsvJsonTextArea from "../vue/CsvJsonTextArea.vue"
import vueSource from "../vue/CsvJsonTextArea.vue?raw"
import { ColumnSpecTable } from "./ColumnSpecTable"
import { demoColumns, sampleCsv } from "./demoColumns"

/**
 * ヘッドレスコア（core/convert.ts）が React 非依存であることを示すため、
 * 同じコアを使った Vue 3 の SFC（vue/CsvJsonTextArea.vue）を React ページ内にそのままマウントする。
 */
export function CsvJsonVueDemo() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const app = createApp(VueCsvJsonTextArea, { columns: demoColumns })
    app.mount(host)
    return () => app.unmount()
  }, [])

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        📋 CSV/TSV → JSON 変換（Vue 版）
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        下のフォームは <code>Vue 3</code> の SFC（<code>vue/CsvJsonTextArea.vue</code>）を
        このページにマウントしたものです。変換・検証ロジックは React 版とまったく同じヘッドレスコア（
        <code>core/convert.ts</code>）を使っています。
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

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        {/* ここから下は Vue が描画する */}
        <div ref={hostRef} />
      </Paper>

      <Box component="details">
        <Box component="summary" sx={{ cursor: "pointer", color: "text.secondary", fontSize: 14 }}>
          Vue SFC のソースコードを見る（CsvJsonTextArea.vue）
        </Box>
        <Box
          component="pre"
          sx={{ p: 1.5, mt: 1, bgcolor: "grey.100", borderRadius: 1, fontSize: 12, overflow: "auto" }}
        >
          {vueSource}
        </Box>
      </Box>
    </Container>
  )
}
