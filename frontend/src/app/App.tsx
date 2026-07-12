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
import { BrowserRouter, Navigate, Route, Routes, Link, useParams } from "react-router-dom"
import { demos } from "./demos"

function DemoRoute() {
  const { slug } = useParams()
  const demo = demos.find((d) => d.slug === slug)
  if (!demo) return <Navigate to={`/${demos[0].slug}`} replace />
  return <Box key={demo.slug}>{demo.element}</Box>
}

function Shell() {
  const { slug } = useParams()
  const [mode, setMode] = useState<"light" | "dark">("light")
  const theme = useMemo(() => createTheme({ palette: { mode } }), [mode])
  const active = demos.some((d) => d.slug === slug) ? slug : demos[0].slug

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
        <Tabs value={active} variant="scrollable" scrollButtons="auto" sx={{ px: 2 }}>
          {demos.map((demo) => (
            <Tab
              key={demo.slug}
              value={demo.slug}
              label={demo.label}
              component={Link}
              to={`/${demo.slug}`}
            />
          ))}
        </Tabs>
      </AppBar>

      <Container maxWidth="lg" sx={{ my: 4 }}>
        <DemoRoute />
      </Container>
    </ThemeProvider>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/:slug" element={<Shell />} />
        <Route path="*" element={<Navigate to={`/${demos[0].slug}`} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
