import type { Demo } from "../app/demos"
import { CsvJsonDemo } from "./demo/CsvJsonDemo"
import { CsvJsonVueDemo } from "./demo/CsvJsonVueDemo"

/** csv-json feature が提供するデモの一覧。 */
export const csvJsonDemos: Demo[] = [
  {
    slug: "csv-json",
    label: "📋 CSV→JSON",
    element: <CsvJsonDemo />,
  },
  {
    slug: "csv-json-vue",
    label: "📋 CSV→JSON (Vue)",
    element: <CsvJsonVueDemo />,
  },
]
