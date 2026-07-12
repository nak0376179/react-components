import base64
import json
import logging
import time
from decimal import Decimal
from typing import Any

import boto3
from boto3.dynamodb.conditions import Attr
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

TABLE_NAME = "Employees"
REGION = "ap-northeast-1"
ENDPOINT_URL = "http://localhost:4566"

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("api.employees")

app = FastAPI()

# Vite の dev サーバーからは `/api` プロキシ経由 (同一オリジン) でアクセスするが、
# バックエンドへ直接アクセスするケースのために念のため許可しておく。
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

dynamodb = boto3.resource(
    "dynamodb",
    region_name=REGION,
    endpoint_url=ENDPOINT_URL,
    aws_access_key_id="test",
    aws_secret_access_key="test",
)
table = dynamodb.Table(TABLE_NAME)


def decode_cursor(cursor: str | None) -> dict[str, Any] | None:
    if not cursor:
        return None
    return json.loads(base64.b64decode(cursor).decode("utf-8"))


def encode_cursor(key: dict[str, Any] | None) -> str | None:
    if not key:
        return None
    return base64.b64encode(json.dumps(key, default=str).encode("utf-8")).decode("utf-8")


def to_jsonable(value: Any) -> Any:
    """boto3 が返す Decimal を FastAPI がそのまま JSON 化できる int/float に変換する。"""
    if isinstance(value, list):
        return [to_jsonable(v) for v in value]
    if isinstance(value, dict):
        return {k: to_jsonable(v) for k, v in value.items()}
    if isinstance(value, Decimal):
        return int(value) if value % 1 == 0 else float(value)
    return value


@app.get("/api/employees/all")
def get_all_employees():
    """全件を Scan して id 昇順で返す（クライアント側でソート・検索・ページングする用途）。"""
    logger.info("[api/employees/all] request")
    t0 = time.monotonic()

    items: list[dict[str, Any]] = []
    exclusive_start_key: dict[str, Any] | None = None
    try:
        while True:
            scan_kwargs: dict[str, Any] = {}
            if exclusive_start_key:
                scan_kwargs["ExclusiveStartKey"] = exclusive_start_key
            result = table.scan(**scan_kwargs)
            items.extend(result.get("Items", []))
            exclusive_start_key = result.get("LastEvaluatedKey")
            if not exclusive_start_key:
                break
    # API境界なので、想定外の例外も握って 500 に変換する。
    except Exception as err:
        logger.error("[api/employees/all] error: %s", err)
        return JSONResponse(status_code=500, content={"error": str(err)})

    items.sort(key=lambda e: e["id"])
    elapsed_ms = int((time.monotonic() - t0) * 1000)
    logger.info("[api/employees/all] response: %s件 (%sms)", len(items), elapsed_ms)
    return {"items": to_jsonable(items)}


@app.get("/api/employees")
def get_employees(
    limit: int = Query(10, ge=1, le=100),
    cursor: str | None = None,
    search: str = "",
):
    search = search.strip()
    logger.info(
        "[api/employees] request: limit=%s search=%r cursor=%s",
        limit,
        search,
        "yes" if cursor else "no",
    )
    t0 = time.monotonic()

    scan_kwargs: dict[str, Any] = {"Limit": limit}
    exclusive_start_key = decode_cursor(cursor)
    if exclusive_start_key:
        scan_kwargs["ExclusiveStartKey"] = exclusive_start_key
    if search:
        # DynamoDB の FilterExpression は Limit 適用後の絞り込みなので、
        # 返却件数が limit より少なくなることがある（ScannedCount と Count の差で分かる）。
        scan_kwargs["FilterExpression"] = (
            Attr("name").contains(search) | Attr("department").contains(search) | Attr("role").contains(search)
        )

    try:
        result = table.scan(**scan_kwargs)
    # API境界なので、想定外の例外も握って 500 に変換する。
    except Exception as err:
        logger.error("[api/employees] error: %s", err)
        return JSONResponse(status_code=500, content={"error": str(err)})

    next_cursor = encode_cursor(result.get("LastEvaluatedKey"))
    elapsed_ms = int((time.monotonic() - t0) * 1000)
    logger.info(
        "[api/employees] dynamodb response: ScannedCount=%s Count=%s next=%s (%sms)",
        result.get("ScannedCount"),
        result.get("Count"),
        "yes" if next_cursor else "no",
        elapsed_ms,
    )

    return {
        "items": to_jsonable(result.get("Items", [])),
        "nextCursor": next_cursor,
        "count": result.get("Count", 0),
        "scannedCount": result.get("ScannedCount", 0),
    }
