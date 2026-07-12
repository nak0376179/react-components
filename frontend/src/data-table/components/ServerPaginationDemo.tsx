import { useState } from "react"
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore"
import NavigateNextIcon from "@mui/icons-material/NavigateNext"
import { useEmployeesPage } from "../hooks/useEmployeesPage"
import { StatusChip, formatSalary } from "./employeeColumns"

export function ServerPaginationDemo() {
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState("")
  const [cursors, setCursors] = useState<(string | null)[]>([null])
  const [pageIndex, setPageIndex] = useState(0)

  const cursor = cursors[pageIndex]
  const { data, isPending, isFetching, isError, error } = useEmployeesPage({
    limit: pageSize,
    cursor,
    search,
  })

  const resetPaging = () => {
    setCursors([null])
    setPageIndex(0)
  }

  const handleNext = () => {
    if (!data?.nextCursor) return
    setCursors((prev) => {
      const next = [...prev]
      next[pageIndex + 1] = data.nextCursor
      return next
    })
    setPageIndex((p) => p + 1)
  }

  if (isError) {
    return (
      <Alert severity="error">
        <Box component="pre" sx={{ m: 0, whiteSpace: "pre-wrap", fontSize: 13 }}>
          {error instanceof Error ? error.message : String(error)}
        </Box>
      </Alert>
    )
  }

  return (
    <Paper variant="outlined">
      <Stack direction="row" spacing={2} sx={{ p: 2 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="氏名・部署・役職で検索…（サーバー側 FilterExpression）"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            resetPaging()
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <Select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              resetPaging()
            }}
          >
            {[5, 10, 25].map((n) => (
              <MenuItem key={n} value={n}>
                {n}件/ページ
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>氏名</TableCell>
              <TableCell>部署</TableCell>
              <TableCell>役職</TableCell>
              <TableCell>状態</TableCell>
              <TableCell>入社日</TableCell>
              <TableCell>年収</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  該当するデータがありません
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((emp) => (
                <TableRow key={emp.id} hover>
                  <TableCell>{emp.id}</TableCell>
                  <TableCell>{emp.name}</TableCell>
                  <TableCell>{emp.department}</TableCell>
                  <TableCell>{emp.role}</TableCell>
                  <TableCell>
                    <StatusChip status={emp.status} />
                  </TableCell>
                  <TableCell>{emp.joinedAt}</TableCell>
                  <TableCell>{formatSalary(emp.salary)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack
        direction="row"
        spacing={2}
        sx={{ p: 2, alignItems: "center", justifyContent: "space-between" }}
      >
        <Typography variant="body2" color="text.secondary">
          {data
            ? `${pageIndex + 1}ページ目 — 返却${data.count}件 (DynamoDBスキャン${data.scannedCount}件)${
                isFetching ? " · 更新中…" : ""
              }`
            : ""}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<NavigateBeforeIcon />}
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            disabled={pageIndex === 0 || isFetching}
          >
            前へ
          </Button>
          <Button
            endIcon={<NavigateNextIcon />}
            onClick={handleNext}
            disabled={!data?.nextCursor || isFetching}
          >
            次へ
          </Button>
        </Stack>
      </Stack>
    </Paper>
  )
}
