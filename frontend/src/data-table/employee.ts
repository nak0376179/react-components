export type Status = "active" | "onLeave" | "retired"

export type Employee = {
  groupId: string
  email: string
  name: string
  department: string
  role: string
  status: Status
  joinedAt: string
  salary: number
}

export const EMPLOYEES_TABLE = "Employees"

export const DEPARTMENTS = ["営業", "エンジニアリング", "人事", "マーケティング", "経理"] as const

export const ROLES = ["メンバー", "リーダー", "マネージャー", "ディレクター"] as const

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
