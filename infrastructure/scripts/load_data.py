"""② データ注入: data/employees.json を Employees テーブルへ投入する。

テーブル作成（設定）は create_table.py の担当。
"""

import json
from pathlib import Path

from _floci import ENDPOINT_URL, TABLE_NAME, resource

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "employees.json"


def main() -> None:
    employees = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    table = resource().Table(TABLE_NAME)

    print(f"floci ({ENDPOINT_URL}) に {len(employees)} 件を投入しています…")
    with table.batch_writer() as batch:
        for emp in employees:
            batch.put_item(Item=emp)
    print(f"投入完了: {len(employees)} 件 ({DATA_FILE.name})")


if __name__ == "__main__":
    main()
