"""floci (DynamoDB互換) への接続設定。create_table / load_data で共有する。"""

import os

import boto3

TABLE_NAME = "Employees"
REGION = "ap-northeast-1"
ENDPOINT_URL = os.environ.get("DYNAMODB_ENDPOINT", "http://localhost:4566")

# floci はローカルのダミー資格情報で動く（本物のAWSには接続しない）。
_KWARGS = {
    "region_name": REGION,
    "endpoint_url": ENDPOINT_URL,
    "aws_access_key_id": "test",
    "aws_secret_access_key": "test",
}


def client():
    return boto3.client("dynamodb", **_KWARGS)


def resource():
    return boto3.resource("dynamodb", **_KWARGS)
