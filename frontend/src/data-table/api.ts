import type { Employee } from "./employee"

/**
 * このデモを「group_a に所属する人が自社の従業員一覧を見ている」体で固定する。
 * 実運用ではログイン中のテナントIDに置き換わる。
 */
export const DEMO_GROUP_ID = "group_a"

export type EmployeesPageResult = {
  items: Employee[]
  nextCursor: string | null
  count: number
  scannedCount: number
}

type PageParams = {
  groupId: string
  limit: number
  cursor: string | null
  search: string
}

async function parseErrorBody(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}))
  return body.detail ?? body.error ?? `HTTP ${res.status}`
}

/** `groupId` の Query（`Scan` ではない）でテナント分の1ページを取得する。 */
export async function fetchEmployeesPage(params: PageParams): Promise<EmployeesPageResult> {
  const url = new URL(`/api/groups/${params.groupId}/employees`, window.location.origin)
  url.searchParams.set("limit", String(params.limit))
  if (params.cursor) url.searchParams.set("cursor", params.cursor)
  if (params.search) url.searchParams.set("search", params.search)

  const res = await fetch(url)
  if (!res.ok) throw new Error(await parseErrorBody(res))
  return res.json()
}

export type EmployeeInput = Omit<Employee, "groupId">

export async function createEmployee(groupId: string, employee: EmployeeInput): Promise<Employee> {
  const res = await fetch(`/api/groups/${groupId}/employees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(employee),
  })
  if (!res.ok) throw new Error(await parseErrorBody(res))
  return res.json()
}

export async function updateEmployee(groupId: string, employee: EmployeeInput): Promise<Employee> {
  const res = await fetch(`/api/groups/${groupId}/employees/${encodeURIComponent(employee.email)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(employee),
  })
  if (!res.ok) throw new Error(await parseErrorBody(res))
  return res.json()
}

export async function deleteEmployee(groupId: string, email: string): Promise<void> {
  const res = await fetch(`/api/groups/${groupId}/employees/${encodeURIComponent(email)}`, {
    method: "DELETE",
  })
  if (!res.ok) throw new Error(await parseErrorBody(res))
}
