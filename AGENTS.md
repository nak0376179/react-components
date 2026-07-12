# AGENTS.md

コーディングエージェント向けのリポジトリ案内。人間向けの説明は [README.md](README.md)、
データ仕様は [infrastructure/README.md](infrastructure/README.md) を参照。

## これは何か

React コンポーネントのショーケース。2系統ある。

- **演出系**（`frontend/src/effects/`）— 任意のページを囲むイースターエッグ／ジョークコンポーネント（JigsawPuzzle / ShatterGlass / CheatCode / Pixelate）。バックエンド不要。
- **データテーブル系**（`frontend/src/data-table/`）— 汎用 `DataTable`（TanStack Table + MUI）と、FastAPI + DynamoDB互換の floci を使ったクライアント／サーバーページネーションのデモ。
- **CSV/TSV変換系**（`frontend/src/csv-json/`）— 貼り付けた CSV/TSV を列定義に従って検証し JSON/CSV に変換する `CsvJsonTextArea`。変換ロジック（`core/convert.ts`）は papaparse ベースで React 非依存（Vue 等でも利用可）。バックエンド不要。

## モノレポ構成

JS 側は **pnpm workspace**、Python 側は **uv workspace**。依存・ロック・環境はいずれもリポジトリ直下に集約される。

```
/
├── frontend/         React/Vite（pnpm workspace member）
│   └── src/
│       ├── app/           アプリシェル（ルータ + レイアウト、全 feature の demos を集約）
│       ├── effects/       演出系コンポーネント
│       │   ├── components/  JigsawPuzzle / ShatterGlass / CheatCode / Pixelate
│       │   ├── demo/        DemoPage（デモ専用の土台ページ）
│       │   ├── demos.tsx    この feature のデモ登録
│       │   └── index.ts     公開バレル
│       └── data-table/    データテーブル系
│           ├── components/  DataTable（汎用・ライブラリ本体）
│           ├── demo/        DataTableDemo / ServerPaginationDemo / employeeColumns（セル描画）
│           ├── hooks/       useEmployees / useEmployeesPage
│           ├── employee.ts  ドメインモデル（型・ラベル）
│           ├── demos.tsx    この feature のデモ登録
│           └── index.ts     公開バレル
├── backend/          FastAPI（uv workspace member）
├── infrastructure/   floci（docker-compose）+ boto3 スクリプト（uv workspace member）
│   ├── data/employees.json   投入データ87件（コミット済み）
│   └── scripts/              create_table.py（設定）/ load_data.py（注入）
├── scripts/dev-all.sh   フルスタック起動のオーケストレーション
├── package.json         pnpm workspace ルート + オーケストレーションスクリプト
└── pyproject.toml       uv workspace ルート（members: backend, infrastructure）
```

- `.venv` / `uv.lock` / `node_modules` はすべてルートに1つだけ。メンバー配下には作られない。
- **すべての `pnpm` コマンドはリポジトリ直下から**実行する（内部で `--filter` や `cd` する）。

## コマンド

```bash
pnpm install         # JS依存（frontend）
pnpm dev             # Vite 開発サーバー (:5173)  ※演出系だけならこれだけでよい
pnpm build           # tsc + vite build（型チェック込み）

# フルスタック（データテーブル系）
pnpm dev:all         # floci起動 → テーブル作成 → データ投入 → API(:8000)+Web(:5173)
pnpm db:up           # floci コンテナ起動
pnpm db:init         # ① Employees テーブル作成（設定）
pnpm db:seed         # ② employees.json を投入（注入）
pnpm api:dev         # FastAPI (:8000)
pnpm db:down         # floci 停止
```

Python スクリプトは `uv run` 経由（例: `cd backend && uv run …`）。uv が上位の workspace ルートを見つけて共通 `.venv` を使うので、メンバーへ `cd` してから実行してよい。

### 品質チェック

```bash
pnpm check        # lint → lint:py → typecheck:py → build(tsc含む) → test を順に実行（変更後はこれ1つでよい）

pnpm test         # frontend の vitest（jsdom）
pnpm lint         # frontend の eslint
pnpm format       # frontend の prettier --write
pnpm lint:py      # ruff check（backend / infrastructure）
pnpm format:py    # ruff format + ruff check --fix（import整列など）
pnpm typecheck:py # mypy
```

- Python: lint・format・import整列はすべて **ruff**（`ruff check` / `ruff format`）1本に統合、型は **mypy**。black・pylint は入れていない（ruff がフォーマット互換 + pylint相当の `PL` ルールを両方カバーするため、別ツールにする理由がなかった）。設定はルート `pyproject.toml` に集約、ツールは共有 `.venv` の dev グループ。
- 行長は **120**（ruff format / lint）。`E501`（行長）・`PLR0913`・`PLR2004` は好みや本デモの規模に対して厳しすぎるノイズなので **ruff で無効化**（日本語 docstring などで無用な折り返しを避ける）。
- フロント: lint は **ESLint**（flat config、`typescript-eslint` + `react-hooks`）、format は **Prettier**（`semi: false` — このプロジェクトはセミコロンなしが好み）、テストは **vitest**（`*.test.tsx`、`@testing-library/react` + jsdom、setup は `frontend/src/test/setup.ts`）。型チェックは `tsc`（`pnpm build` に内包）。
- `react-hooks/recommended` は React Compiler 向けの厳格なルール（`set-state-in-effect` 等）を含み、演出コンポーネントの既存のドラッグ物理演算で誤検知するため使わない。`rules-of-hooks` / `exhaustive-deps` のみ有効（[eslint.config.js](frontend/eslint.config.js)）。
- `typescript` は **6.0.3 に固定**。7系（ネイティブコンパイラ系統）は `typescript-eslint` が未対応（`peerDependencies` が `<6.1.0`）のため、対応するまでは 6.x を使う。

## 規約・注意

- **フロントは DB に直接触れない**。データ取得はすべて backend の `/api` 経由。`@aws-sdk` は依存に入れない（ブラウザからの直接 DynamoDB アクセスは廃止済み）。
- **設定と注入は分離**する。テーブル作成は `create_table.py`、データ投入は `load_data.py`。混ぜない。
- 投入データは `infrastructure/data/employees.json`（固定シードで生成済み・コミット）。型はフロントの `Employee`（`frontend/src/data-table/employee.ts`）と一致させる。
- `Employees` テーブルは `groupId`（テナントID）をパーティションキー、`email` をソートキーにしており、一覧取得は
  `Scan` ではなく **`Query`（`groupId` スコープ）** で行う（[backend/main.py](backend/main.py)）。新しいアクセス
  パターンを追加するときも `Scan` は避け、`groupId` を起点にした `Query` で組み立てる。詳細は [infrastructure/README.md](infrastructure/README.md)。
- **コメント・UI 文字列は日本語**。既存のトーンに合わせる。
- コンポーネントは**名前付きエクスポート**。feature 単位（`effects` / `data-table`）にまとめ、`index.ts` バレルで公開面を絞る。
- **feature 内の構成規約**: `components/` = 公開コンポーネント（ライブラリ本体）、`demo/` = ショーケース専用コード（ドメイン固有の見せ方）、`demos.tsx` = この feature が提供するデモの登録（`slug` / `label` / `element`）。テストは対象ファイルの隣に `*.test.tsx`。
- **新しいデモの追加手順**: feature 内に実装 → その feature の `demos.tsx` に登録 → （新規 feature のときのみ）[frontend/src/app/demos.ts](frontend/src/app/demos.ts) に import 1行を追加。`app/App.tsx` はルーティングとレイアウトのみを担うので触らない。
- ルーティングは `react-router-dom`。デモの URL は `/<slug>`（[frontend/src/app/App.tsx](frontend/src/app/App.tsx)）。`/` や未知の slug は先頭デモへリダイレクトする。
- MUI（`@mui/material`）+ Emotion、状態取得は `@tanstack/react-query`、テーブルは `@tanstack/react-table`（ヘッドレス）+ MUI（見た目）。
- floci は**メモリモード**（`FLOCI_STORAGE_MODE=memory`）。`db:down` でデータは消える。再起動後は `db:init` → `db:seed` で復元。
- docker compose のプロジェクト名はディレクトリ名（`infrastructure`）由来。旧レイアウトのコンテナが残っていると 4566 で衝突するので、その場合は古いコンテナを削除する。

## 変更後に確認すること

- 静的チェック: `pnpm check`（Python lint/型 + tsc + build + vitest）が通ること。
- 挙動: 演出系は `pnpm dev` で全タブ描画。データテーブル系を変えたら `pnpm dev:all` で floci + API を上げ、両タブが `/api` 経由でデータ表示することを確認。
