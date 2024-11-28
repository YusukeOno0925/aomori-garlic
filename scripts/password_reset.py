import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
import secrets
import uuid
from scripts.auth import get_db_connection, get_user_from_db, get_password_hash
from scripts.email_config import fast_mail
from dotenv import load_dotenv
import os
from fastapi_mail import MessageSchema

# ロギングの設定
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG)  # ログレベルをDEBUGに設定

# 環境変数の読み込み
load_dotenv()

# 環境に応じたBASE_URLの設定
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

if ENVIRONMENT == "production":
    BASE_URL = os.getenv("PRODUCTION_BASE_URL", "https://www.imnormal.jp")
else:
    BASE_URL = os.getenv("LOCAL_BASE_URL", "http://127.0.0.1:5501")

router = APIRouter()

# パスワードリセット用の設定
PASSWORD_RESET_TOKEN_EXPIRE_HOURS = 1  # トークンの有効期限

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    token: str
    new_password: str

def create_password_reset_token(user_id: int):
    token = secrets.token_urlsafe(32)
    reset_id = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(hours=PASSWORD_RESET_TOKEN_EXPIRE_HOURS)

    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute("""
        INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
        VALUES (%s, %s, %s, %s)
    """, (reset_id, user_id, token, expires_at))
    connection.commit()
    cursor.close()
    connection.close()

    logger.debug(f"Generated reset token for user_id {user_id}: {token}")
    return token

def verify_password_reset_token(token: str):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT user_id, expires_at FROM password_reset_tokens WHERE token = %s", (token,))
    record = cursor.fetchone()
    if not record:
        logger.warning("Token not found.")
        cursor.close()
        connection.close()
        return None

    if record['expires_at'] < datetime.utcnow():
        logger.warning("Token expired.")
        cursor.execute("DELETE FROM password_reset_tokens WHERE token = %s", (token,))
        connection.commit()
        cursor.close()
        connection.close()
        return None

    # トークンを使用済みにする
    cursor.execute("DELETE FROM password_reset_tokens WHERE token = %s", (token,))
    connection.commit()
    cursor.close()
    connection.close()

    logger.debug(f"Token verified for user_id: {record['user_id']}")
    return record['user_id']

@router.post("/password-reset-request/", tags=["Authentication"])
async def password_reset_request(request: PasswordResetRequest):
    user = get_user_from_db(username=None, email=request.email)
    if not user:
        # セキュリティ上、存在しないメールアドレスでも同じメッセージを返す
        logger.info(f"Password reset requested for non-existent email: {request.email}")
        return {"message": "パスワードリセット用のリンクをメールに送信しました。"}

    # トークンの生成と保存（ユーザーIDを使用）
    reset_token = create_password_reset_token(user.id)

    # リセットリンクの生成
    reset_link = f"{BASE_URL}/Reset_password.html?token={reset_token}"

    # メールの内容を MessageSchema で構築
    message = MessageSchema(
        subject="パスワードリセットのご案内",
        recipients=[user.email],  # recipients はリストで渡す必要があります
        body=f"以下のリンクから新しいパスワードを設定してください。\n\n{reset_link}\n\nこのリンクは1時間後に無効になります。",
        subtype="plain"  # "plain" または "html" を指定
    )

    try:
        await fast_mail.send_message(message)
        logger.info(f"Password reset email sent to {user.email}")
    except Exception as e:
        # ログを記録し、エラーメッセージを返す
        logger.error(f"Failed to send password reset email to {user.email}: {e}")
        raise HTTPException(status_code=500, detail="メールの送信に失敗しました。後でもう一度お試しください。")

    return {"message": "パスワードリセット用のリンクをメールに送信しました。"}

@router.post("/password-reset/", tags=["Authentication"])
async def password_reset(password_reset: PasswordReset):
    logger.debug(f"Received password reset request with token: {password_reset.token}")
    # トークンの検証（ユーザーIDを取得）
    user_id = verify_password_reset_token(password_reset.token)
    if not user_id:
        logger.warning("Invalid or expired token used for password reset.")
        raise HTTPException(status_code=400, detail="無効または期限切れのトークンです。")

    user = get_user_from_db(username=None, email=None, user_id=user_id)
    if not user:
        logger.error(f"User not found for user_id: {user_id}")
        raise HTTPException(status_code=400, detail="ユーザーが存在しません。")

    # パスワードの強度チェックを一時的に無効化
    # if not is_strong_password(password_reset.new_password):
    #     logger.warning("Weak password attempted during reset.")
    #     raise HTTPException(status_code=400, detail="パスワードが弱すぎます。強力なパスワードを使用してください。")

    # 新しいパスワードのハッシュ化
    hashed_password = get_password_hash(password_reset.new_password)
    logger.debug(f"Hashed new password for user_id: {user_id}")

    # データベースの更新
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute("UPDATE users SET password = %s WHERE id = %s", (hashed_password, user_id))
        connection.commit()
        logger.info(f"Password successfully updated for user_id: {user_id}")
    except Exception as e:
        logger.error(f"Failed to update password for user_id: {user_id}. Error: {e}")
        raise HTTPException(status_code=500, detail="パスワードのリセットに失敗しました。")
    finally:
        cursor.close()
        connection.close()

    return {"message": "パスワードが正常にリセットされました。ログインしてください。"}