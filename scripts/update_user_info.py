# ユーザーがプロフィールを更新できるようにするAPIエンドポイント

from fastapi import APIRouter, Depends, Form
from fastapi.responses import JSONResponse
from .register_user import get_db_connection
from .auth import get_current_user, User

router = APIRouter()

@router.post("/update-user-info/")
async def update_user_info(username: str = Form(...), email: str = Form(...), profile: str = Form(None), current_user: User = Depends(get_current_user)):
    db = get_db_connection()
    cursor = db.cursor()
    cursor.execute("UPDATE users SET username = %s, email = %s, profile = %s WHERE username = %s", (username, email, profile, current_user.username))
    db.commit()
    cursor.close()
    return JSONResponse(content={"message": "プロフィールが更新されました"}, status_code=200)