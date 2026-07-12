import base64
import json
import logging
import time
from decimal import Decimal
from typing import Any, Literal

import boto3
from boto3.dynamodb.conditions import Attr, Key
from botocore.exceptions import ClientError
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field

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
    allow_methods=["GET", "POST", "PUT", "DELETE"],
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


class EmployeeIn(BaseModel):
    """作成・更新で受け取る従業員データ（email はパスパラメータで指定するためここには含めない）。"""

    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    name: str
    department: str
    role: str
    status: Literal["active", "onLeave", "retired"]
    joinedAt: str
    salary: int


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


@app.get("/api/groups/{group_id}/employees")
def get_employees(
    group_id: str,
    limit: int = Query(10, ge=1, le=100),
    cursor: str | None = None,
    search: str = "",
):
    """`groupId` (テナント) を Query する。Scan と違い、他社のデータを一切読まずに自社分だけ取得できる。"""
    search = search.strip()
    logger.info(
        "[api/groups/%s/employees] request: limit=%s search=%r cursor=%s",
        group_id,
        limit,
        search,
        "yes" if cursor else "no",
    )
    t0 = time.monotonic()

    query_kwargs: dict[str, Any] = {
        "KeyConditionExpression": Key("groupId").eq(group_id),
        "Limit": limit,
    }
    exclusive_start_key = decode_cursor(cursor)
    if exclusive_start_key:
        query_kwargs["ExclusiveStartKey"] = exclusive_start_key
    if search:
        # DynamoDB の FilterExpression は Limit 適用後の絞り込みなので、
        # 返却件数が limit より少なくなることがある（ScannedCount と Count の差で分かる）。
        query_kwargs["FilterExpression"] = (
            Attr("name").contains(search) | Attr("department").contains(search) | Attr("role").contains(search)
        )

    try:
        result = table.query(**query_kwargs)
    # API境界なので、想定外の例外も握って 500 に変換する。
    except Exception as err:
        logger.error("[api/groups/%s/employees] error: %s", group_id, err)
        return JSONResponse(status_code=500, content={"error": str(err)})

    next_cursor = encode_cursor(result.get("LastEvaluatedKey"))
    elapsed_ms = int((time.monotonic() - t0) * 1000)
    logger.info(
        "[api/groups/%s/employees] dynamodb query response: ScannedCount=%s Count=%s next=%s (%sms)",
        group_id,
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


@app.post("/api/groups/{group_id}/employees", status_code=201)
def create_employee(group_id: str, employee: EmployeeIn):
    """新規作成。`attribute_not_exists` 条件で、同じ email の重複作成を防ぐ。"""
    item = {"groupId": group_id, **employee.model_dump()}
    try:
        table.put_item(Item=item, ConditionExpression="attribute_not_exists(email)")
    except ClientError as err:
        if err.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise HTTPException(status_code=409, detail="このメールアドレスの従業員は既に存在します") from err
        logger.error("[api/groups/%s/employees POST] error: %s", group_id, err)
        raise HTTPException(status_code=500, detail=str(err)) from err

    logger.info("[api/groups/%s/employees POST] created: %s", group_id, employee.email)
    return to_jsonable(item)


@app.put("/api/groups/{group_id}/employees/{email}")
def update_employee(group_id: str, email: str, employee: EmployeeIn):
    """既存の従業員を更新する。email はパスの値を正とし、ボディの email とは無関係に上書きしない。"""
    if employee.email != email:
        raise HTTPException(status_code=400, detail="email は変更できません")

    item = {"groupId": group_id, **employee.model_dump()}
    try:
        table.put_item(Item=item, ConditionExpression="attribute_exists(email)")
    except ClientError as err:
        if err.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise HTTPException(status_code=404, detail="従業員が見つかりません") from err
        logger.error("[api/groups/%s/employees/%s PUT] error: %s", group_id, email, err)
        raise HTTPException(status_code=500, detail=str(err)) from err

    logger.info("[api/groups/%s/employees/%s PUT] updated", group_id, email)
    return to_jsonable(item)


@app.delete("/api/groups/{group_id}/employees/{email}", status_code=204)
def delete_employee(group_id: str, email: str):
    try:
        table.delete_item(
            Key={"groupId": group_id, "email": email},
            ConditionExpression="attribute_exists(email)",
        )
    except ClientError as err:
        if err.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise HTTPException(status_code=404, detail="従業員が見つかりません") from err
        logger.error("[api/groups/%s/employees/%s DELETE] error: %s", group_id, email, err)
        raise HTTPException(status_code=500, detail=str(err)) from err

    logger.info("[api/groups/%s/employees/%s DELETE] deleted", group_id, email)
    return Response(status_code=204)
