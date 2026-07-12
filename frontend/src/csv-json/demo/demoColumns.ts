import type { ColumnSpec, ColumnUsage } from "../core/convert"

/** デモ用の列定義。React / Vue 両方のデモで共有する。Excel からのコピペ（TSV）も想定。 */
export const demoColumns: ColumnSpec[] = [
  { label: "氏名", key: "name", usage: "required" },
  {
    label: "メールアドレス",
    key: "email",
    usage: "required",
    validate: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "メールアドレスの形式ではありません"),
  },
  {
    label: "年齢",
    key: "age",
    usage: "optional",
    validate: (v) => (/^\d+$/.test(v) ? null : "数値で入力してください"),
  },
  { label: "部署", key: "department", usage: "optional" },
  { label: "メモ", key: "memo", usage: "unused" },
]

export const usageLabel: Record<ColumnUsage, string> = {
  required: "必須",
  optional: "省略可",
  unused: "不要",
}

/** 貼り付けて試せるサンプルデータ。 */
export const sampleCsv = [
  "氏名,メールアドレス,年齢,部署,メモ",
  "山田太郎,taro@example.com,30,開発部,自由記入",
  "佐藤花子,hanako@example.com,,営業部,",
].join("\n")
