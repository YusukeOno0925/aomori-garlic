# ユーザーがログインしている状態で、そのユーザーの情報を取得するAPIエンドポイント

import logging
from fastapi import APIRouter, Depends, HTTPException
from .register_user import get_db_connection
from .auth import get_current_user, User

# ロギングの設定
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/user-info/")
async def get_user_info(current_user: User = Depends(get_current_user)):
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    
    # クエリを実行
    cursor.execute("SELECT username, email, profile FROM users WHERE username = %s", (current_user.username,))
    
    # 結果を1件取得
    user_info = cursor.fetchone()
    
    # カーソルに未処理の結果が残っている場合は全てをfetchallで取得してクリア
    if cursor.with_rows:
        cursor.fetchall()

    # カーソルとデータベース接続を閉じる
    cursor.close()
    db.close()
    
    if not user_info:
        logger.error(f"User {current_user.username} not found in the database.")
        raise HTTPException(status_code=404, detail="User not found")
    
    logger.info(f"User {current_user.username} information retrieved successfully.")
    
    return user_info