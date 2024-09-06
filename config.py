import os
from dotenv import load_dotenv

# .env ファイルから環境変数をロード
load_dotenv()

# 環境変数の取得
environment = os.getenv("ENVIRONMENT")
local_base_url = os.getenv("LOCAL_BASE_URL")
production_base_url = os.getenv("PRODUCTION_BASE_URL")


# データベース接続情報の取得
db_host = os.getenv("DB_HOST")
db_user = os.getenv("DB_USER")
db_password = os.getenv("DB_PASSWORD")
db_name = os.getenv("DB_NAME")
db_port = os.getenv("DB_PORT")