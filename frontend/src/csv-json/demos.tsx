import type { Demo } from "../app/demos"
import { CsvJsonDemo } from "./demo/CsvJsonDemo"

/** csv-json feature が提供するデモの一覧。 */
export const csvJsonDemos: Demo[] = [
  {
    slug: "csv-json",
    label: "📋 CSV→JSON",
    element: <CsvJsonDemo />,
  },
]
