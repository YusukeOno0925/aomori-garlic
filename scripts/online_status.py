from fastapi import APIRouter, Request, Depends, Body
from datetime import datetime, timedelta
from typing import List
from .auth import get_current_user, get_token_from_request  # 既存の認証関数をインポート
from .register_user import get_db_connection
from fastapi import HTTPException

router = APIRouter()

# オンラインステータスの閾値を設定
ONLINE_THRESHOLD = timedelta(minutes=5)

# ミドルウェア関数を定義
async def update_last_active(request: Request, call_next):
    try:
        token = await get_token_from_request(request)
        current_user = await get_current_user(token=token)
        if current_user:
            db = get_db_connection()
            cursor = db.cursor()
            cursor.execute("""
                UPDATE users SET last_active = %s WHERE id = %s
            """, (datetime.utcnow(), current_user.id))
            db.commit()
            cursor.close()
            db.close()
    except Exception as e:
        print(f"Error updating last_active: {e}")
    response = await call_next(request)
    return response

# 複数のユーザーのオンラインステータスを取得するエンドポイント
@router.post("/users-status/")
async def get_users_status(user_ids: List[int] = Body(...)):
    try:
        current_time = datetime.utcnow()
        statuses = {}
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)
        format_strings = ','.join(['%s'] * len(user_ids))
        cursor.execute(f"SELECT id, last_active FROM users WHERE id IN ({format_strings})", tuple(user_ids))
        results = cursor.fetchall()
        for row in results:
            last_active = row['last_active']
            if last_active:
                time_since_active = current_time - last_active
                if time_since_active <= ONLINE_THRESHOLD:
                    activity_status = "online"
                elif time_since_active <= timedelta(days=7):
                    activity_status = "recently_active"
                else:
                    activity_status = "inactive"
            else:
                activity_status = "inactive"
            statuses[row['id']] = activity_status
        cursor.close()
        db.close()
        return {"statuses": statuses}
    except Exception as e:
        print(f"Error in /users-status/ endpoint: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")