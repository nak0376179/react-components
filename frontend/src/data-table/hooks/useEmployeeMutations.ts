import { useMutation, useQueryClient } from "@tanstack/react-query"
import { DEMO_GROUP_ID, createEmployee, deleteEmployee, updateEmployee, type EmployeeInput } from "../api"

/** CRUD 系ミューテーション共通: 成功したら一覧系クエリ（クライアント/サーバーページネーション両方）を再取得する。 */
function useInvalidateEmployees() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ["employees"] })
    queryClient.invalidateQueries({ queryKey: ["employees-page"] })
  }
}

export function useCreateEmployee() {
  const invalidate = useInvalidateEmployees()
  return useMutation({
    mutationFn: (employee: EmployeeInput) => createEmployee(DEMO_GROUP_ID, employee),
    onSuccess: invalidate,
  })
}

export function useUpdateEmployee() {
  const invalidate = useInvalidateEmployees()
  return useMutation({
    mutationFn: (employee: EmployeeInput) => updateEmployee(DEMO_GROUP_ID, employee),
    onSuccess: invalidate,
  })
}

export function useDeleteEmployee() {
  const invalidate = useInvalidateEmployees()
  return useMutation({
    mutationFn: (email: string) => deleteEmployee(DEMO_GROUP_ID, email),
    onSuccess: invalidate,
  })
}
