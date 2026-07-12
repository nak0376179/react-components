#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

compose="docker compose -f infrastructure/docker-compose.yml"

echo "→ floci (DynamoDB) を起動しています…"
$compose up -d

echo "→ floci のヘルスチェック待ち…"
container_id="$($compose ps -q floci)"
until [ "$(docker inspect -f '{{.State.Health.Status}}' "$container_id" 2>/dev/null)" = "healthy" ]; do
  sleep 1
done
echo "→ floci is healthy"

echo "→ Employees テーブルを作成しています…"
pnpm run db:init

echo "→ Employees テーブルへデータを投入しています…"
pnpm run db:seed

exec pnpm exec concurrently -n api,web -c blue,green \
  "pnpm run api:dev" \
  "pnpm run dev"
