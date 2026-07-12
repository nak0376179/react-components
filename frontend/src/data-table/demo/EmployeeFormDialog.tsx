import { useEffect, useState } from "react"
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material"
import { DEPARTMENTS, ROLES, STATUS_LABEL, type Employee, type Status } from "../employee"
import type { EmployeeInput } from "../api"

const EMPTY_VALUE: EmployeeInput = {
  email: "",
  name: "",
  department: DEPARTMENTS[0],
  role: ROLES[0],
  status: "active",
  joinedAt: new Date().toISOString().slice(0, 10),
  salary: 4000000,
}

export type EmployeeFormDialogProps = {
  open: boolean
  mode: "create" | "edit"
  initialValue?: Employee
  onClose: () => void
  onSubmit: (employee: EmployeeInput) => void
  submitting?: boolean
  error?: string | null
}

/** 作成・編集で共用するフォームダイアログ。email はソートキーなので編集時は変更不可にする。 */
export function EmployeeFormDialog({
  open,
  mode,
  initialValue,
  onClose,
  onSubmit,
  submitting = false,
  error = null,
}: EmployeeFormDialogProps) {
  const [value, setValue] = useState<EmployeeInput>(initialValue ?? EMPTY_VALUE)

  useEffect(() => {
    if (open) setValue(initialValue ?? EMPTY_VALUE)
  }, [open, initialValue])

  const handleSubmit = () => onSubmit(value)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === "create" ? "従業員を追加" : "従業員を編集"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="メールアドレス"
            type="email"
            value={value.email}
            onChange={(e) => setValue({ ...value, email: e.target.value })}
            disabled={mode === "edit"}
            helperText={mode === "edit" ? "メールアドレスは識別子のため変更できません" : undefined}
            fullWidth
            required
          />
          <TextField
            label="氏名"
            value={value.name}
            onChange={(e) => setValue({ ...value, name: e.target.value })}
            fullWidth
            required
          />
          <Stack direction="row" spacing={2}>
            <TextField
              select
              label="部署"
              value={value.department}
              onChange={(e) => setValue({ ...value, department: e.target.value })}
              fullWidth
            >
              {DEPARTMENTS.map((d) => (
                <MenuItem key={d} value={d}>
                  {d}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="役職"
              value={value.role}
              onChange={(e) => setValue({ ...value, role: e.target.value })}
              fullWidth
            >
              {ROLES.map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField
              select
              label="状態"
              value={value.status}
              onChange={(e) => setValue({ ...value, status: e.target.value as Status })}
              fullWidth
            >
              {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                <MenuItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="入社日"
              type="date"
              value={value.joinedAt}
              onChange={(e) => setValue({ ...value, joinedAt: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
          </Stack>
          <TextField
            label="年収"
            type="number"
            value={value.salary}
            onChange={(e) => setValue({ ...value, salary: Number(e.target.value) })}
            slotProps={{ input: { inputProps: { step: 100000, min: 0 } } }}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          キャンセル
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting || !value.email || !value.name}
        >
          {mode === "create" ? "追加" : "保存"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
