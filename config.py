import os
from dotenv import load_dotenv

# .env ファイルから環境変数をロード
load_dotenv()

# 環境変数の取得
environment = os.getenv("ENVIRONMENT")
local_base_url = os.getenv("LOCAL_BASE_URL")
production_base_url = os.getenv("PRODUCTION_BASE_URL")
database_url = os.getenv("DATABASE_URL")