import { describe, expect, it } from "vitest"
import { convertDelimitedText, MAX_ERRORS, type ColumnSpec } from "./convert"

/** テスト用の列定義。氏名・メールは必須、年齢は省略可、メモは不要。 */
const columns: ColumnSpec[] = [
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
  { label: "メモ", key: "memo", usage: "unused" },
]

describe("convertDelimitedText", () => {
  it("CSV を JSON に変換できる（不要な列は削られる）", () => {
    const input = ["氏名,メールアドレス,年齢,メモ", "山田太郎,taro@example.com,30,備考A"].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows).toEqual([{ name: "山田太郎", email: "taro@example.com", age: "30" }])
    expect(JSON.parse(result.output)).toEqual(result.rows)
  })

  it("TSV も自動判別して変換できる", () => {
    const input = ["氏名\tメールアドレス\t年齢", "山田太郎\ttaro@example.com\t30"].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows).toEqual([{ name: "山田太郎", email: "taro@example.com", age: "30" }])
  })

  it("入力の列順が違っても、キーは列定義の順に組みなおされる", () => {
    const input = ["年齢,氏名,メールアドレス", "30,山田太郎,taro@example.com"].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(Object.keys(result.rows[0])).toEqual(["name", "email", "age"])
  })

  it("ヘッダとセルの前後の空白は取り除かれる", () => {
    const input = [" 氏名 , メールアドレス , 年齢 ", " 山田太郎 , taro@example.com , 30 "].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows).toEqual([{ name: "山田太郎", email: "taro@example.com", age: "30" }])
  })

  it("省略可の列が入力にない場合は空文字で埋める", () => {
    const input = ["氏名,メールアドレス", "山田太郎,taro@example.com"].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows).toEqual([{ name: "山田太郎", email: "taro@example.com", age: "" }])
  })

  it("必須項目が空の行はエラーになる", () => {
    const input = ["氏名,メールアドレス,年齢", ",taro@example.com,30"].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toEqual([{ row: 2, label: "氏名", message: "2行目: 「氏名」は必須です" }])
  })

  it("バリデーションエラーは行番号と項目名つきで返る", () => {
    const input = ["氏名,メールアドレス,年齢", "山田太郎,これはメールではない,30", "佐藤花子,hanako@example.com,abc"].join(
      "\n",
    )
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toEqual([
      {
        row: 2,
        label: "メールアドレス",
        message: "2行目: 「メールアドレス」が不正です（メールアドレスの形式ではありません）",
      },
      { row: 3, label: "年齢", message: "3行目: 「年齢」が不正です（数値で入力してください）" },
    ])
  })

  it("項目数が足りない行はエラーになる", () => {
    const input = ["氏名,メールアドレス,年齢", "山田太郎,taro@example.com"].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toEqual([
      { row: 2, label: null, message: "2行目: 項目が不足しています（3列必要ですが2列です）" },
    ])
  })

  it("定義されていない項目名がヘッダにあるとエラーになる", () => {
    const input = ["氏名,メールアドレス,住所", "山田太郎,taro@example.com,東京"].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toEqual([{ row: null, label: "住所", message: "ヘッダ: 「住所」は定義されていない項目です" }])
  })

  it("必須項目がヘッダにないとエラーになる", () => {
    const input = ["氏名,年齢", "山田太郎,30"].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toEqual([
      { row: null, label: "メールアドレス", message: "ヘッダ: 必須項目「メールアドレス」がありません" },
    ])
  })

  it("エラーは最大100件で打ち切られる", () => {
    const body = Array.from({ length: 150 }, () => ",taro@example.com,30")
    const input = ["氏名,メールアドレス,年齢", ...body].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toHaveLength(MAX_ERRORS)
  })

  it("空行は読み飛ばし、行番号は貼り付けテキストの行のまま数える", () => {
    const input = ["氏名,メールアドレス,年齢", "", "山田太郎,,30"].join("\n")
    const result = convertDelimitedText(input, columns)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toEqual([
      { row: 3, label: "メールアドレス", message: "3行目: 「メールアドレス」は必須です" },
    ])
  })

  it("空入力・データ行なしはエラーになる", () => {
    const empty = convertDelimitedText("   ", columns)
    expect(empty.ok).toBe(false)
    if (!empty.ok) expect(empty.errors[0].message).toBe("データがありません")

    const headerOnly = convertDelimitedText("氏名,メールアドレス,年齢", columns)
    expect(headerOnly.ok).toBe(false)
    if (!headerOnly.ok) expect(headerOnly.errors[0].message).toBe("データ行がありません")
  })

  it("CSV 形式でも出力できる（キーは列定義の順）", () => {
    const input = ["年齢,氏名,メールアドレス", "30,山田太郎,taro@example.com", "25,佐藤花子,hanako@example.com"].join(
      "\n",
    )
    const result = convertDelimitedText(input, columns, "csv")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.output).toBe(
      ["name,email,age", "山田太郎,taro@example.com,30", "佐藤花子,hanako@example.com,25"].join("\r\n"),
    )
  })
})
