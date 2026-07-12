import { useState } from "react"
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material"
import { createColumnHelper } from "@tanstack/react-table"
import RefreshIcon from "@mui/icons-material/Refresh"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import DeleteIcon from "@mui/icons-material/Delete"
import { DataTable } from "../components/DataTable"
import { employeeColumns } from "./employeeColumns"
import { EmployeeFormDialog } from "./EmployeeFormDialog"
import { useEmployees } from "../hooks/useEmployees"
import { useCreateEmployee, useDeleteEmployee, useUpdateEmployee } from "../hooks/useEmployeeMutations"
import { DEMO_GROUP_ID, type EmployeeInput } from "../api"
import type { Employee } from "../employee"

const actionsHelper = createColumnHelper<Employee>()

export function DataTableDemo() {
  const { data, isPending, isError, error, refetch, isFetching } = useEmployees()
  const createEmployee = useCreateEmployee()
  const updateEmployee = useUpdateEmployee()
  const deleteEmployee = useDeleteEmployee()

  const [formState, setFormState] = useState<{ mode: "create" | "edit"; employee?: Employee } | null>(null)
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null)

  const handleSubmit = (input: EmployeeInput) => {
    const mutation = formState?.mode === "edit" ? updateEmployee : createEmployee
    mutation.mutate(input, { onSuccess: () => setFormState(null) })
  }

  const handleConfirmDelete = () => {
    if (!deletingEmployee) return
    deleteEmployee.mutate(deletingEmployee.email, { onSuccess: () => setDeletingEmployee(null) })
  }

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

  const columns = [
    ...employeeColumns,
    actionsHelper.display({
      id: "actions",
      header: "操作",
      size: 96,
      cell: (info) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="編集">
            <IconButton size="small" onClick={() => setFormState({ mode: "edit", employee: info.row.original })}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="削除">
            <IconButton size="small" onClick={() => setDeletingEmployee(info.row.original)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    }),
  ]

  return (
    <Stack spacing={1}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="body2" color="text.secondary">
          テナント <code>{DEMO_GROUP_ID}</code> の従業員一覧（自社分のみ。`Query` で他社データは読まない）
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" startIcon={<RefreshIcon />} onClick={() => refetch()} disabled={isFetching}>
            再取得
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setFormState({ mode: "create" })}
          >
            追加
          </Button>
        </Stack>
      </Stack>
      <DataTable
        data={data}
        columns={columns}
        initialPageSize={10}
        searchPlaceholder="氏名・部署・役職で検索…"
      />

      <EmployeeFormDialog
        open={formState !== null}
        mode={formState?.mode ?? "create"}
        initialValue={formState?.employee}
        onClose={() => setFormState(null)}
        onSubmit={handleSubmit}
        submitting={createEmployee.isPending || updateEmployee.isPending}
        error={
          formState?.mode === "edit"
            ? (updateEmployee.error?.message ?? null)
            : (createEmployee.error?.message ?? null)
        }
      />

      <Dialog open={deletingEmployee !== null} onClose={() => setDeletingEmployee(null)}>
        <DialogTitle>従業員を削除しますか？</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deletingEmployee?.name}（{deletingEmployee?.email}）を削除します。この操作は元に戻せません。
          </DialogContentText>
          {deleteEmployee.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteEmployee.error.message}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingEmployee(null)} disabled={deleteEmployee.isPending}>
            キャンセル
          </Button>
          <Button onClick={handleConfirmDelete} color="error" disabled={deleteEmployee.isPending}>
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
