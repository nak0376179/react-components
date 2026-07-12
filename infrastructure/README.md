# infrastructure

ローカル開発用のデータ基盤。**floci**（DynamoDB 互換のローカル DB）の起動と、
`Employees` テーブルの **作成（設定）** と **データ投入（注入）** を担当します。

すべてのコマンドは **リポジトリ直下** から実行します（内部で `cd infrastructure` します）。

## 構成

```
infrastructure/
├── docker-compose.yml      floci コンテナ（:4566）
├── pyproject.toml          boto3（uv workspace member。.venv/uv.lock はリポジトリ直下に集約）
├── data/
│   └── employees.json      投入する従業員データ（87件）
└── scripts/
    ├── _floci.py           接続設定（TABLE/REGION/ENDPOINT）
    ├── create_table.py     ① テーブル作成（設定）
    └── load_data.py        ② データ投入（注入）
```

## 使い方

```bash
pnpm db:up      # floci コンテナ起動 (docker compose)
pnpm db:init    # ① Employees テーブルを作成（既存ならスキップ）
pnpm db:seed    # ② data/employees.json を投入
pnpm db:down    # floci 停止
```

設定（テーブル作成）とデータ注入を **別プロセスに分離** しています。スキーマだけ用意したい・
データだけ入れ直したい、といった操作を独立して行えます。floci はメモリモード（`FLOCI_STORAGE_MODE=memory`）
なので、コンテナを落とすとデータは消えます。再起動後は `db:init` → `db:seed` で復元します。

接続先はデフォルト `http://localhost:4566`。環境変数 `DYNAMODB_ENDPOINT` で上書きできます。

## データ仕様

### `Employees` テーブル

- パーティションキー: `id`（数値 `N`）。ソートキーなし。
- 課金モード: `PAY_PER_REQUEST`。
- グローバル/ローカルセカンダリインデックスなし（検索はアプリ側の `Scan` + `FilterExpression`）。

### レコード（`data/employees.json`）

87 件の擬似従業員データ。1 レコードは以下の属性を持ちます。

| 属性         | 型       | 例             | 説明                             |
| ------------ | -------- | -------------- | -------------------------------- |
| `id`         | number   | `1`            | 主キー。1〜87 の連番             |
| `name`       | string   | `"山本 陽菜"`  | 「姓 名」（日本語のダミー氏名）  |
| `department` | string   | `"人事"`       | 部署（営業 / エンジニアリング / 人事 / マーケティング / 経理） |
| `role`       | string   | `"リーダー"`   | 役職（メンバー / リーダー / マネージャー / ディレクター） |
| `status`     | string   | `"onLeave"`    | 在籍状態（下記 enum）            |
| `joinedAt`   | string   | `"2021-06-24"` | 入社日（`YYYY-MM-DD`、2015〜2025） |
| `salary`     | number   | `8600000`      | 年収（350万〜940万、10万円刻み） |

`status` の enum とフロントエンドでの表示ラベルの対応:

| `status`   | 表示（在籍状態） | Chip 色   |
| ---------- | ---------------- | --------- |
| `active`   | 在籍             | success   |
| `onLeave`  | 休職             | warning   |
| `retired`  | 退職             | default   |

このデータは固定シードの擬似乱数で一度生成し、`data/employees.json` として
コミットしています（実行のたびに内容が変わらない再現可能なデータセット）。属性の型は
フロントエンドの `Employee` 型（`frontend/src/data-table/employee.ts`）と一致します。
