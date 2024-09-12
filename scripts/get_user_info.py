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
    
    # クエリを実行 (ユーザーIDを使って情報を取得)
    cursor.execute("""
        SELECT username, email, profile, birthdate, education,
        career_step, career_challenges, career_approach,
        company_name, industry, position, job_type, work_period, 
        success_experience, failure_experience, reflection
        FROM users 
        LEFT JOIN job_experiences ON users.id = job_experiences.user_id
        WHERE users.id = %s
    """, (current_user.id,))
    
    # 結果を1件取得
    user_info = cursor.fetchone()

    # 未処理の結果が残っている場合はfetchallで取得してクリア
    if cursor.with_rows:
        cursor.fetchall()

    # カーソルとデータベース接続を閉じる
    cursor.close()
    db.close()
    
    if not user_info:
        logger.error(f"User {current_user.username} not found in the database.")
        raise HTTPException(status_code=404, detail="User not found")
    
    return user_info