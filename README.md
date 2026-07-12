# react-components

React コンポーネントのショーケース。大きく2系統で構成しています。

- **🎭 演出系（`frontend/src/effects/`）** — 任意のページを丸ごと囲むイースターエッグ／ジョークコンポーネント（JigsawPuzzle / ShatterGlass / CheatCode / Pixelate）。
- **📊 データテーブル系（`frontend/src/data-table/`）** — TanStack Table + MUI の汎用 `DataTable` と、FastAPI バックエンド（DynamoDB互換の floci が裏側）を使ったクライアント／サーバーページネーションのデモ。フロントは DB へ直接触れず、すべて `/api` 経由。

frontend / backend / infrastructure に分かれた pnpm workspace 構成で、ルートの `package.json` が各ワークスペースをオーケストレーションします。すべての `pnpm` コマンドはリポジトリ直下から実行します。

デモは `pnpm dev` の上部タブで切り替えられます。

## セットアップ

前提: [pnpm](https://pnpm.io/)、（データテーブル系を動かす場合は）Docker と [uv](https://docs.astral.sh/uv/)。

### 演出系だけ動かす（バックエンド不要）

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

### データテーブル系も含めて全部動かす（フルスタック）

DynamoDB 互換の [floci](https://hub.docker.com/r/floci/floci) コンテナ + FastAPI バックエンドが必要です。

```bash
pnpm install
pnpm dev:all      # floci起動 → テーブル作成 → データ投入 → API(:8000)とWeb(:5173)を並行起動
```

`dev:all` は [scripts/dev-all.sh](scripts/dev-all.sh) が floci の healthy を待ってから初期化と開発サーバーを立ち上げます。個別に動かす場合:

```bash
pnpm db:up        # floci コンテナ起動 (docker compose)
pnpm db:init      # ① Employees テーブル作成（設定）
pnpm db:seed      # ② 87件のデータ投入（注入）
pnpm api:dev      # FastAPI バックエンド (:8000)
pnpm dev          # Vite 開発サーバー (:5173)
pnpm db:down      # floci 停止
```

floci の起動・テーブル作成・データ投入は infrastructure の担当です。詳細は [infrastructure/README.md](infrastructure/README.md) を参照。Vite の dev サーバーは `/api`（→ :8000）を同一オリジンでプロキシします（[frontend/vite.config.ts](frontend/vite.config.ts)）。

## ディレクトリ構成

JS 側は **pnpm workspace**（`frontend`）、Python 側は **uv workspace**（`backend` / `infrastructure`）のモノレポ構成です。依存はそれぞれルートに集約され、`node_modules` と Python の `.venv`・`uv.lock` はいずれもルートに1つだけできます。

```
/
├── frontend/            React/Vite アプリ（pnpm workspace パッケージ）
│   └── src/
│       ├── effects/       演出系コンポーネント + DemoPage（題材）
│       ├── data-table/
│       │   ├── components/   DataTable本体 / 2つのデモ / セル描画
│       │   ├── hooks/        useEmployees / useEmployeesPage（データ取得）
│       │   ├── employee.ts   Employeeモデル（型・ラベル）
│       │   └── index.ts      公開バレル
│       ├── App.tsx        タブでデモを切り替えるシェル
│       └── main.tsx       QueryClientProvider でラップして起動
├── backend/             FastAPI（/api/employees・/api/employees/all）※uv workspace member
├── infrastructure/      floci（docker-compose）+ テーブル作成/データ投入（boto3）+ データ仕様
│   ├── data/employees.json   投入する87件（コミット済み）
│   └── scripts/              create_table.py（設定）/ load_data.py（注入）
│                             ※uv workspace member
├── scripts/dev-all.sh   floci起動 → 初期化 → API+Web 並行起動のオーケストレーション
├── package.json         ルート: pnpm workspace（frontend）+ オーケストレーションスクリプト
└── pyproject.toml       ルート: uv workspace（backend / infrastructure）
```

- 従業員の**型・ラベル**は [frontend/src/data-table/employee.ts](frontend/src/data-table/employee.ts)（フロント側）。
- **投入データと仕様**は infrastructure 側（[infrastructure/data/employees.json](infrastructure/data/employees.json) と [infrastructure/README.md](infrastructure/README.md)）。フロントは DB に直接触れず、データ取得はすべて backend の `/api` 経由。

---

# 📊 DataTable

TanStack Table（ヘッドレスなロジック）+ MUI（見た目）の汎用データテーブル。検索・ソート・クライアントページネーション付き。

```tsx
import { DataTable } from "./data-table";

<DataTable data={rows} columns={columns} initialPageSize={10} searchPlaceholder="検索…" />;
```

| prop              | 型                    | 既定値   | 説明                       |
| ----------------- | --------------------- | -------- | -------------------------- |
| `data`            | `T[]`                 | —        | 行データ                   |
| `columns`         | `ColumnDef<T, any>[]` | —        | TanStack Table のカラム定義 |
| `initialPageSize` | `number`              | `10`     | 初期ページサイズ           |
| `searchPlaceholder` | `string`            | `"検索…"` | 検索ボックスのプレースホルダ |

デモは2種類:

- **📊 データテーブル**（[DataTableDemo](frontend/src/data-table/DataTableDemo.tsx)）— backend の `/api/employees/all` で全件取得し、検索・ソート・ページングをすべてクライアント側で行う。
- **🗄️ サーバページネーション**（[ServerPaginationDemo](frontend/src/data-table/ServerPaginationDemo.tsx)）— FastAPI の `/api/employees` にカーソル（`LastEvaluatedKey` を base64 化）を渡し、ページ単位で取得。検索は DynamoDB の `FilterExpression` でサーバー側実行。

状態Chipや年収フォーマットなど、両デモ共通のセル描画は [employeeColumns.tsx](frontend/src/data-table/employeeColumns.tsx) に集約しています。

---

# 🎭 演出系コンポーネント

任意のページ（React の子要素）を丸ごと囲むイースターエッグ系。

## 🧩 JigsawPuzzle

表示領域を **ジグソーパズル化** するジョークコンポーネント。しかもちゃんと遊べます。最初はピースがバラバラに散らばっていて、
**ドラッグして元の位置に戻すとカチッとスナップして固定**、全部はめると「🎉 Clear!」。「🔀 Shuffle」でやり直し、「🧩 Solve」で自動完成。

### しくみ

- 子要素を `rows × cols` 個のレイヤーに複製し、各レイヤーを **SVG `clip-path`（1ピース形状）** で切り抜く
- すべてのレイヤーは同じ内容・同じ位置なので、重ねると元のページに戻る
- 隣り合うピースは **まったく同じ境界カーブを共有** するため、タブ（凸）とブランク（凹）が完全にかみ合う
- 縁取りは各ピースの上に同じパスを2重ストローク（白ハロー＋濃い線）で描画。どんな背景でもピースの形が読める
- ドラッグはポインタイベント、移動は CSS `transform`、浮遊感は `drop-shadow`。ホーム付近で離すと `ZERO` にスナップしてロック

```tsx
import { JigsawPuzzle } from "./effects";

<JigsawPuzzle rows={4} cols={6}>
  <YourPage />
</JigsawPuzzle>;
```

| prop        | 型           | 既定値 | 説明                                              |
| ----------- | ------------ | ------ | ------------------------------------------------- |
| `rows`      | `number`     | `4`    | 行数                                              |
| `cols`      | `number`     | `6`    | 列数                                              |
| `active`    | `boolean`    | `true` | `false` で効果オフ（子要素をそのまま描画）        |
| `scattered` | `boolean`    | `true` | ゲーム開始時にピースをシャッフル（`false` で完成状態） |
| `draggable` | `boolean`    | `true` | ピースをドラッグ可能にする                        |
| `controls`  | `boolean`    | `true` | Shuffle / Solve / 進捗のフローティングバーを表示   |
| `seed`      | `number`     | `1`    | カット形状の乱数シード（変えると切り方が変わる）   |
| `onSolved`  | `() => void` | —      | 全ピースがはまった瞬間に一度だけ呼ばれる          |

### 注意（ジョークゆえの割り切り）

- パズルモード中、子要素は複製され `pointer-events: none` になるため、**元ページのクリック操作は無効**になります。実運用ではなく演出用途で。
- 子要素を `rows × cols` 回レンダリングするので、重いページではグリッドを粗めに。

## 💥 ShatterGlass

ページを囲むと普通に見えますが、**どこかをクリックするとその地点を衝撃点としてガラスのように放射状に割れます**。
破片はドラッグで剥がせて、`💧 Drop` で重力に従って飛び散り、`🔧 Repair` で元通り。割れ方は衝撃点からスポークを放射し、
四隅を必ずスポークに含めることで**隙間なく全面をタイル化**します。各破片は children を `clip-path: polygon()` で切り抜いた複製です。

```tsx
<ShatterGlass spokes={16} rings={4}>
  <YourPage />
</ShatterGlass>
```

| prop        | 型           | 既定値 | 説明                             |
| ----------- | ------------ | ------ | -------------------------------- |
| `active`    | `boolean`    | `true` | `false` で効果オフ               |
| `spokes`    | `number`     | `16`   | 放射スポーク数（4の倍数に丸め）  |
| `rings`     | `number`     | `4`    | 衝撃点から端までの同心リング数   |
| `jitter`    | `number`     | `0.5`  | 0–1 のヒビの不規則さ             |
| `draggable` | `boolean`    | `true` | 破片をドラッグ可能に             |
| `controls`  | `boolean`    | `true` | Repair / Drop バーを表示         |
| `sound`     | `boolean`    | `true` | 衝撃時にガラス破砕音を合成再生   |
| `onShatter` | `() => void` | —      | 最初に割れた瞬間に一度呼ばれる   |

## 🎮 CheatCode

子要素は**完全に通常表示**のまま。`↑ ↑ ↓ ↓ ← → ← → B A`（おなじみの隠しコマンド）を入力すると、紙吹雪・虹色シマー・
シークレット内容が解禁されます。`Esc` で閉じる。唯一の副作用は window の `keydown` リスナー1つだけなので、実ページに被せても安全。
コマンド列は `code` prop で好きな配列に差し替え可能です。

```tsx
<CheatCode secret={<MyEasterEgg />} onUnlock={() => console.log("🎮")}>
  <YourPage />
</CheatCode>
```

| prop       | 型                  | 既定値       | 説明                              |
| ---------- | ------------------- | ------------ | --------------------------------- |
| `secret`   | `ReactNode`         | 既定バナー   | 解禁時に表示する中身              |
| `code`     | `readonly string[]` | コナミコマンド | キー列（`KeyboardEvent.key`、大小無視） |
| `confetti` | `boolean`           | `true`       | 解禁時に紙吹雪                    |
| `shimmer`  | `boolean`           | `true`       | ページを一瞬虹色に                |
| `sound`    | `boolean`           | `true`       | 1-up 風ジングルを合成再生         |
| `sticky`   | `boolean`           | `false`      | 再入力でトグルせず解禁を維持      |
| `onUnlock` | `() => void`        | —            | コマンド成立ごとに呼ばれる        |

## 🟦 Pixelate

ページ全体を **SVG ピクセル化フィルタ**でモザイク表示。canvas や html2canvas を使わず、ライブ DOM に
`filter: url(#…)` を当てるだけ。マウスを乗せると**その下だけ円形にくっきり解除**（曇りガラスを拭く感覚）、
スライダーでブロックサイズ調整、`👓 Reveal` で全面解除。レンズ部分は children を `clip-path: circle()` で切り抜いた鮮明な複製です。

```tsx
<Pixelate size={14} lensRadius={90}>
  <YourPage />
</Pixelate>
```

| prop         | 型        | 既定値 | 説明                        |
| ------------ | --------- | ------ | --------------------------- |
| `size`       | `number`  | `14`   | モザイクのブロックサイズ(px) |
| `active`     | `boolean` | `true` | `false` で効果オフ          |
| `lens`       | `boolean` | `true` | ポインタ下を円形に解除      |
| `lensRadius` | `number`  | `90`   | 解除レンズの半径(px)        |
| `controls`   | `boolean` | `true` | ブロックサイズ/全面解除バーを表示 |
