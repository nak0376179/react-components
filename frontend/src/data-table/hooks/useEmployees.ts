import { useQuery } from "@tanstack/react-query"
import type { Employee } from "../employee"

/** `/api/employees/all`（バックエンドで全件 Scan → id 昇順）を叩いて全従業員を取得する。 */
async function fetchAllEmployees(): Promise<Employee[]> {
  const res = await fetch("/api/employees/all")
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  const data: { items: Employee[] } = await res.json()
  return data.items
}

export function useEmployees() {
  return useQuery({
    queryKey: ["employees"],
    queryFn: fetchAllEmployees,
  })
}
