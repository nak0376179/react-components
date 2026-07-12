import { useQuery } from "@tanstack/react-query"
import type { Employee } from "../employee"
import { DEMO_GROUP_ID, fetchEmployeesPage } from "../api"

/**
 * 1回のレスポンスを小さく・速く保つためのチャンクサイズ。
 * API Gateway には 30秒 / 6MB の制限があるため、たとえ「全件取得」のデモであっても
 * サーバー側で無限にScanし続けて1レスポンスに詰め込む実装は避け、`limit` 付きの
 * Query を `nextCursor` が無くなるまで繰り返してクライアント側で結合する。
 */
const CHUNK_SIZE = 25

async function fetchAllEmployees(): Promise<Employee[]> {
  const items: Employee[] = []
  let cursor: string | null = null
  do {
    const page = await fetchEmployeesPage({ groupId: DEMO_GROUP_ID, limit: CHUNK_SIZE, cursor, search: "" })
    items.push(...page.items)
    cursor = page.nextCursor
  } while (cursor)
  return items
}

export function useEmployees() {
  return useQuery({
    queryKey: ["employees", DEMO_GROUP_ID],
    queryFn: fetchAllEmployees,
  })
}
