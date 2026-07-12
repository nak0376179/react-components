import type { Demo } from "../app/demos"
import { DataTableDemo } from "./demo/DataTableDemo"
import { ServerPaginationDemo } from "./demo/ServerPaginationDemo"

/** data-table feature が提供するデモの一覧。 */
export const dataTableDemos: Demo[] = [
  {
    slug: "datatable",
    label: "📊 データテーブル",
    element: <DataTableDemo />,
  },
  {
    slug: "server-pagination",
    label: "🗄️ サーバページネーション",
    element: <ServerPaginationDemo />,
  },
]
