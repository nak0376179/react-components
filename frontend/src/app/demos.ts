import type { ReactNode } from "react"
import { effectsDemos } from "../effects/demos"
import { dataTableDemos } from "../data-table/demos"

export type Demo = {
  /** URL パスにもなるデモの識別子（例: "jigsaw"）。 */
  slug: string
  /** タブに表示するラベル。 */
  label: string
  /** デモ本体。 */
  element: ReactNode
}

/** 全 feature のデモを集約したレジストリ。新しい feature を足したらここに1行追加する。 */
export const demos: Demo[] = [...effectsDemos, ...dataTableDemos]
