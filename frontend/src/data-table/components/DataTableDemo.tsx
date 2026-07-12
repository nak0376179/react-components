import { Alert, AlertTitle, Box, Button, CircularProgress, Stack, Typography } from "@mui/material"
import RefreshIcon from "@mui/icons-material/Refresh"
import { DataTable } from "./DataTable"
import { employeeColumns } from "./employeeColumns"
import { useEmployees } from "../hooks/useEmployees"

export function DataTableDemo() {
  const { data, isPending, isError, error, refetch, isFetching } = useEmployees()

  if (isPending) {
    return (
      <Stack sx={{ py: 8, alignItems: "center", justifyContent: "center" }} spacing={2}>
        <CircularProgress />
        <Typography color="text.secondary">DynamoDB (floci) からデータを取得中…</Typography>
      </Stack>
    )
  }

  if (isError) {
    return (
      <Alert
        severity="error"
        action={
          <Button
            color="inherit"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
          >
            再試行
          </Button>
        }
      >
        <AlertTitle>従業員データの取得に失敗しました</AlertTitle>
        <Box component="pre" sx={{ m: 0, mb: 1, whiteSpace: "pre-wrap", fontSize: 13 }}>
          {error instanceof Error ? error.message : String(error)}
        </Box>
        以下を確認してください:
        <Box component="ol" sx={{ mt: 0.5, mb: 0, pl: 2.5 }}>
          <li>
            <code>pnpm db:up</code> で floci コンテナが起動しているか
          </li>
          <li>
            <code>pnpm db:init</code> / <code>pnpm db:seed</code> でテーブル作成とデータ投入をしたか
          </li>
          <li>
            <code>pnpm api:dev</code> でバックエンド (:8000) が起動しているか
          </li>
        </Box>
      </Alert>
    )
  }

  return (
    <Stack spacing={1}>
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          size="small"
          startIcon={<RefreshIcon />}
          onClick={() => refetch()}
          disabled={isFetching}
        >
          再取得
        </Button>
      </Box>
      <DataTable
        data={data}
        columns={employeeColumns}
        initialPageSize={10}
        searchPlaceholder="氏名・部署・役職で検索…"
      />
    </Stack>
  )
}
