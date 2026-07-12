"""① DynamoDB設定: Employees テーブルを作成する（データ投入は load_data.py の担当）。"""

from _floci import ENDPOINT_URL, TABLE_NAME, client


def main() -> None:
    ddb = client()
    print(f"floci ({ENDPOINT_URL}) に接続しています…")

    existing = ddb.list_tables().get("TableNames", [])
    if TABLE_NAME in existing:
        print(f'テーブル "{TABLE_NAME}" は既に存在します。')
        return

    ddb.create_table(
        TableName=TABLE_NAME,
        AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "N"}],
        KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
        BillingMode="PAY_PER_REQUEST",
    )
    ddb.get_waiter("table_exists").wait(TableName=TABLE_NAME)
    print(f'テーブル "{TABLE_NAME}" を作成しました。')


if __name__ == "__main__":
    main()
