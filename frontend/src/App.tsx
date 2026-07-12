import { useMemo, useState } from "react"
import {
  AppBar,
  Box,
  Container,
  CssBaseline,
  IconButton,
  Tab,
  Tabs,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from "@mui/material"
import DarkModeIcon from "@mui/icons-material/DarkMode"
import LightModeIcon from "@mui/icons-material/LightMode"
import { CheatCode, DemoPage, JigsawPuzzle, Pixelate, ShatterGlass } from "./effects"
import { DataTableDemo, ServerPaginationDemo } from "./data-table"

const DEMOS = {
  jigsaw: {
    label: "🧩 ジグソー",
    render: () => (
      <JigsawPuzzle rows={4} cols={6} onSolved={() => console.log("solved! 🎉")}>
        <DemoPage hint="ピースをドラッグして元の位置に戻すと、カチッとはまります。" />
      </JigsawPuzzle>
    ),
  },
  shatter: {
    label: "💥 ガラス割れ",
    render: () => (
      <ShatterGlass onShatter={() => console.log("smash! 💥")}>
        <DemoPage hint="どこかをクリックすると、その場所からガラスのように割れます。" />
      </ShatterGlass>
    ),
  },
  cheat: {
    label: "🎮 隠しコマンド",
    render: () => (
      <CheatCode onUnlock={() => console.log("unlocked! 🎮")}>
        <DemoPage hint="↑ ↑ ↓ ↓ ← → ← → B A と入力してみてください。" />
      </CheatCode>
    ),
  },
  pixelate: {
    label: "🟦 モザイク",
    render: () => (
      <Pixelate>
        <DemoPage hint="マウスを乗せると、その下だけくっきり見えます。" />
      </Pixelate>
    ),
  },
  datatable: {
    label: "📊 データテーブル",
    render: () => <DataTableDemo />,
  },
  serverPagination: {
    label: "🗄️ サーバページネーション",
    render: () => <ServerPaginationDemo />,
  },
} as const

type DemoKey = keyof typeof DEMOS

export function App() {
  const [active, setActive] = useState<DemoKey>("jigsaw")
  const [mode, setMode] = useState<"light" | "dark">("light")
  const theme = useMemo(() => createTheme({ palette: { mode } }), [mode])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            🧩 react-components デモ
          </Typography>
          <IconButton
            onClick={() => setMode((m) => (m === "light" ? "dark" : "light"))}
            color="inherit"
          >
            {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
        </Toolbar>
        <Tabs
          value={active}
          onChange={(_, value: DemoKey) => setActive(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 2 }}
        >
          {(Object.keys(DEMOS) as DemoKey[]).map((key) => (
            <Tab key={key} value={key} label={DEMOS[key].label} />
          ))}
        </Tabs>
      </AppBar>

      <Container maxWidth="lg" sx={{ my: 4 }}>
        <Box key={active}>{DEMOS[active].render()}</Box>
      </Container>
    </ThemeProvider>
  )
}
