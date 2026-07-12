export type Status = "active" | "onLeave" | "retired"

export type Employee = {
  id: number
  name: string
  department: string
  role: string
  status: Status
  joinedAt: string
  salary: number
}

export const EMPLOYEES_TABLE = "Employees"

export const STATUS_LABEL: Record<Status, string> = {
  active: "在籍",
  onLeave: "休職",
  retired: "退職",
}

export const STATUS_COLOR: Record<Status, "success" | "warning" | "default"> = {
  active: "success",
  onLeave: "warning",
  retired: "default",
}
