import { keepPreviousData, useQuery } from "@tanstack/react-query"
import type { Employee } from "../employee"

export type EmployeesPageResult = {
  items: Employee[]
  nextCursor: string | null
  count: number
  scannedCount: number
}

type PageParams = {
  limit: number
  cursor: string | null
  search: string
}

async function fetchEmployeesPage(params: PageParams): Promise<EmployeesPageResult> {
  const url = new URL("/api/employees", window.location.origin)
  url.searchParams.set("limit", String(params.limit))
  if (params.cursor) url.searchParams.set("cursor", params.cursor)
  if (params.search) url.searchParams.set("search", params.search)

  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

/** `/api/employees`（サーバー側でのカーソルベース Scan）を叩くページネーション用フック。 */
export function useEmployeesPage(params: PageParams) {
  return useQuery({
    queryKey: ["employees-page", params],
    queryFn: () => fetchEmployeesPage(params),
    placeholderData: keepPreviousData,
  })
}
