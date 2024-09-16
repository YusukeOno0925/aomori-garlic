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
    
    # ユーザー基本情報の取得
    cursor.execute("""
        SELECT username, email, profile, birthdate, education, education_start, education_end,
        career_step, career_challenges, career_approach
        FROM users 
        WHERE id = %s
    """, (current_user.id,))
    user_info = cursor.fetchone()

    # 職歴情報の取得
    cursor.execute("""
        SELECT id, company_name, industry, position, job_type, work_start_period, work_end_period,
        entry_salary, entry_satisfaction, current_salary, current_satisfaction,
        success_experience, failure_experience, reflection
        FROM job_experiences 
        WHERE user_id = %s
    """, (current_user.id,))
    job_experiences = cursor.fetchall()  # すべての職歴を取得
    
    # カーソルとデータベース接続を閉じる
    cursor.close()
    db.close()

    if not user_info:
        logger.error(f"User {current_user.username} not found in the database.")
        raise HTTPException(status_code=404, detail="User not found")
    
    # 職歴情報を user_info に追加
    user_info["job_experiences"] = job_experiences

    return user_info