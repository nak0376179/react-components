// CSV/TSV テキストを列定義に従って検証し、JSON/CSV に変換するヘッドレスなコア。
// React に依存しないので、Vue などほかのフレームワークからもそのまま使える。
import Papa from "papaparse"

/**
 * 列の扱い。
 * - required: 必須。ヘッダにも各行にも値が必要。
 * - optional: 省略可。列や値がなければ "" で埋める。
 * - unused:   不要。入力にあっても出力から項目ごと削る。
 */
export type ColumnUsage = "required" | "optional" | "unused"

/** 値のバリデータ。エラーなら理由（日本語）を返し、問題なければ null を返す。 */
export type ColumnValidator = (value: string) => string | null

/** 変換に渡す列定義。 */
export interface ColumnSpec {
  /** 貼り付けデータのヘッダ行に現れる日本語の項目名。 */
  label: string
  /** 変換後の JSON キー。 */
  key: string
  /** 列の扱い（必須 / 省略可 / 不要）。 */
  usage: ColumnUsage
  /** バリデーション。空でない値にのみ適用される（必須チェックは usage が担う）。 */
  validate?: ColumnValidator
}

/** 変換エラー1件。 */
export interface ConvertError {
  /** ヘッダを1行目とした貼り付けテキスト内の行番号。ヘッダ起因のエラーは null。 */
  row: number | null
  /** エラーの起きた項目名。項目数の過不足など列を特定できない場合は null。 */
  label: string | null
  /** 表示用の日本語メッセージ（行番号・項目名込み）。 */
  message: string
}

export type OutputFormat = "json" | "csv"

export type ConvertResult =
  | { ok: true; rows: Record<string, string>[]; output: string }
  | { ok: false; errors: ConvertError[] }

/** 返すエラー件数の上限。これを超えた分は打ち切る。 */
export const MAX_ERRORS = 100

/** セルの前後の空白（全角スペース含む）を取り除く。 */
const trimCell = (value: string | undefined): string =>
  (value ?? "").replace(/^[\s\u3000]+|[\s\u3000]+$/g, "")

/**
 * CSV/TSV テキストを列定義に従って検証・変換する。
 *
 * - 1行目をヘッダ（日本語の項目名）として列定義と突き合わせる。列の並び順は自由。
 * - ヘッダ・各セルとも前後の空白は取り除いて扱う。
 * - エラーが1件でもあれば変換結果は返さず、エラーを最大 {@link MAX_ERRORS} 件まで返す。
 * - 出力のキー順は入力の列順ではなく、列定義（columns）の順に組みなおす。
 */
export function convertDelimitedText(
  input: string,
  columns: ColumnSpec[],
  format: OutputFormat = "json",
): ConvertResult {
  const errors: ConvertError[] = []
  const addError = (row: number | null, label: string | null, message: string): boolean => {
    if (errors.length < MAX_ERRORS) errors.push({ row, label, message })
    return errors.length >= MAX_ERRORS
  }

  const text = input.trim()
  if (text === "") {
    addError(null, null, "データがありません")
    return { ok: false, errors }
  }

  // delimiter を指定しなければ papaparse がカンマ / タブなどを自動判別する。
  const parsed = Papa.parse<string[]>(text, { delimiter: "" })
  const lines = parsed.data

  // --- ヘッダ行の検証 ---------------------------------------------------
  const header = lines[0].map(trimCell)
  const specByLabel = new Map(columns.map((c) => [c.label, c]))
  /** 項目名 → 貼り付けデータ内の列番号。 */
  const indexByLabel = new Map<string, number>()

  header.forEach((label, i) => {
    if (label === "") {
      addError(null, null, `ヘッダ: ${i + 1}列目の項目名が空です`)
    } else if (!specByLabel.has(label)) {
      addError(null, label, `ヘッダ: 「${label}」は定義されていない項目です`)
    } else if (indexByLabel.has(label)) {
      addError(null, label, `ヘッダ: 「${label}」が重複しています`)
    } else {
      indexByLabel.set(label, i)
    }
  })
  for (const spec of columns) {
    if (spec.usage === "required" && !indexByLabel.has(spec.label)) {
      addError(null, spec.label, `ヘッダ: 必須項目「${spec.label}」がありません`)
    }
  }
  // ヘッダが不正なままでは行の検証結果が信用できないので、ここで打ち切る。
  if (errors.length > 0) return { ok: false, errors }

  // --- データ行の検証と変換 ---------------------------------------------
  /** 出力に含める列（不要な列は項目ごと削る）。順序は列定義に従う。 */
  const outputColumns = columns.filter((c) => c.usage !== "unused")
  const rows: Record<string, string>[] = []
  let hasDataRow = false

  for (let i = 1; i < lines.length && errors.length < MAX_ERRORS; i++) {
    const cells = lines[i].map(trimCell)
    // 空行は行番号を保ったまま読み飛ばす。
    if (cells.every((c) => c === "")) continue
    hasDataRow = true
    const rowNo = i + 1

    if (cells.length < header.length) {
      addError(rowNo, null, `${rowNo}行目: 項目が不足しています（${header.length}列必要ですが${cells.length}列です）`)
      continue
    }
    if (cells.length > header.length) {
      addError(rowNo, null, `${rowNo}行目: 項目が多すぎます（${header.length}列必要ですが${cells.length}列です）`)
      continue
    }

    const record: Record<string, string> = {}
    for (const spec of outputColumns) {
      const index = indexByLabel.get(spec.label)
      // 省略可の列が入力にない場合は "" で埋める。
      const value = index === undefined ? "" : cells[index]

      if (value === "") {
        if (spec.usage === "required") {
          if (addError(rowNo, spec.label, `${rowNo}行目: 「${spec.label}」は必須です`)) break
        }
      } else if (spec.validate) {
        const reason = spec.validate(value)
        if (reason !== null) {
          if (addError(rowNo, spec.label, `${rowNo}行目: 「${spec.label}」が不正です（${reason}）`)) break
        }
      }
      record[spec.key] = value
    }
    rows.push(record)
  }

  if (!hasDataRow) addError(null, null, "データ行がありません")
  if (errors.length > 0) return { ok: false, errors }

  const keys = outputColumns.map((c) => c.key)
  const output =
    format === "json"
      ? JSON.stringify(rows, null, 2)
      : Papa.unparse({ fields: keys, data: rows.map((r) => keys.map((k) => r[k])) })
  return { ok: true, rows, output }
}
