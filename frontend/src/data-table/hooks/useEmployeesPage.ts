import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { DEMO_GROUP_ID, fetchEmployeesPage } from "../api"

type PageParams = {
  limit: number
  cursor: string | null
  search: string
}

/** `groupId` を Query（サーバー側でのカーソルベース）するページネーション用フック。 */
export function useEmployeesPage(params: PageParams) {
  return useQuery({
    queryKey: ["employees-page", DEMO_GROUP_ID, params],
    queryFn: () => fetchEmployeesPage({ groupId: DEMO_GROUP_ID, ...params }),
    placeholderData: keepPreviousData,
  })
}
