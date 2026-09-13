import logging
import os
import secrets
import uuid

from datetime import datetime, timedelta

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from fastapi_mail import MessageSchema
from pydantic import BaseModel, EmailStr

from scripts.auth import (
    get_db_connection,
    get_user_from_db,
    get_password_hash,
)
from scripts.email_config import fast_mail


# =========================================================
# ロギング設定
# =========================================================

logger = logging.getLogger(__name__)


# =========================================================
# 環境変数
# =========================================================

load_dotenv()

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

if ENVIRONMENT == "production":
    BASE_URL = os.getenv(
        "PRODUCTION_BASE_URL",
        "https://www.imnormal.jp"
    )
else:
    BASE_URL = os.getenv(
        "LOCAL_BASE_URL",
        "http://127.0.0.1:5501"
    )


# =========================================================
# Router
# =========================================================

router = APIRouter()


# =========================================================
# パスワードリセット設定
# =========================================================

# リセットURLの有効期限
PASSWORD_RESET_TOKEN_EXPIRE_HOURS = 1

# 同一ユーザーへのリセットメール再送待機時間
PASSWORD_RESET_RESEND_INTERVAL_SECONDS = 60

# 最低パスワード文字数
MIN_PASSWORD_LENGTH = 8


# =========================================================
# Request Model
# =========================================================

class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordReset(BaseModel):
    token: str
    new_password: str


# =========================================================
# リセットトークン生成
# =========================================================

def create_password_reset_token(user_id: int):
    """
    パスワードリセット用トークンを生成してDBへ保存する。

    新しいトークンを発行する際は、
    同じユーザーの古いトークンを無効化する。
    """

    token = secrets.token_urlsafe(32)
    reset_id = str(uuid.uuid4())

    now = datetime.utcnow()
    expires_at = now + timedelta(
        hours=PASSWORD_RESET_TOKEN_EXPIRE_HOURS
    )

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        # 同一ユーザーの古いトークンを無効化
        cursor.execute(
            """
            DELETE FROM password_reset_tokens
            WHERE user_id = %s
            """,
            (user_id,)
        )

        # 新しいトークンを保存
        cursor.execute(
            """
            INSERT INTO password_reset_tokens
                (id, user_id, token, expires_at)
            VALUES
                (%s, %s, %s, %s)
            """,
            (
                reset_id,
                user_id,
                token,
                expires_at,
            )
        )

        connection.commit()

        # tokenそのものはログへ出さない
        logger.debug(
            f"Generated password reset token for user_id: {user_id}"
        )

        return token

    except Exception:
        connection.rollback()

        logger.exception(
            f"Failed to create password reset token "
            f"for user_id: {user_id}"
        )

        raise

    finally:
        cursor.close()
        connection.close()


# =========================================================
# 再送制限チェック
# =========================================================

def is_password_reset_rate_limited(user_id: int):
    """
    同じユーザーに対して直近でリセットトークンが
    発行されている場合、短時間の再送を制限する。
    """

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT expires_at
            FROM password_reset_tokens
            WHERE user_id = %s
            ORDER BY expires_at DESC
            LIMIT 1
            """,
            (user_id,)
        )

        record = cursor.fetchone()

        if not record:
            return False

        expires_at = record["expires_at"]

        # expires_at からトークン作成時刻を逆算
        created_at = expires_at - timedelta(
            hours=PASSWORD_RESET_TOKEN_EXPIRE_HOURS
        )

        elapsed_seconds = (
            datetime.utcnow() - created_at
        ).total_seconds()

        return (
            elapsed_seconds
            < PASSWORD_RESET_RESEND_INTERVAL_SECONDS
        )

    except Exception:
        logger.exception(
            f"Failed to check password reset rate limit "
            f"for user_id: {user_id}"
        )

        raise

    finally:
        cursor.close()
        connection.close()


# =========================================================
# リセットトークン検証
# =========================================================

def verify_password_reset_token(token: str):
    """
    トークンが存在し、有効期限内であることを確認する。

    この時点ではトークンを削除しない。
    パスワード変更成功時に削除する。
    """

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT user_id, expires_at
            FROM password_reset_tokens
            WHERE token = %s
            """,
            (token,)
        )

        record = cursor.fetchone()

        if not record:
            logger.warning(
                "Invalid password reset token was used."
            )
            return None

        if record["expires_at"] < datetime.utcnow():

            # 期限切れトークンを削除
            cursor.execute(
                """
                DELETE FROM password_reset_tokens
                WHERE token = %s
                """,
                (token,)
            )

            connection.commit()

            logger.warning(
                "Expired password reset token was used."
            )

            return None

        logger.debug(
            f"Password reset token verified "
            f"for user_id: {record['user_id']}"
        )

        return record["user_id"]

    except Exception:
        connection.rollback()

        logger.exception(
            "Failed to verify password reset token."
        )

        raise

    finally:
        cursor.close()
        connection.close()


# =========================================================
# パスワードリセットメール要求
# =========================================================

@router.post(
    "/password-reset-request/",
    tags=["Authentication"]
)
async def password_reset_request(
    request: PasswordResetRequest
):
    """
    パスワードリセットメールを送信する。

    登録されていないメールアドレスの場合も、
    同じレスポンスを返してアカウントの存在を秘匿する。
    """

    response_message = {
        "message":
        "パスワードリセット用のリンクをメールに送信しました。"
    }

    user = get_user_from_db(
        username=None,
        email=request.email
    )

    # =====================================================
    # 存在しないメール
    # =====================================================

    if not user:

        # メールアドレスそのものはログへ出さない
        logger.info(
            "Password reset requested for "
            "an unregistered email address."
        )

        # 存在する場合と同じレスポンス
        return response_message


    # =====================================================
    # 短時間の再送制限
    # =====================================================

    try:
        if is_password_reset_rate_limited(user.id):

            logger.info(
                f"Password reset request rate limited "
                f"for user_id: {user.id}"
            )

            # レート制限されていても
            # 外部から状態を判断しにくくするため同じレスポンス
            return response_message

    except Exception:

        logger.exception(
            "Failed while checking password reset rate limit."
        )

        raise HTTPException(
            status_code=500,
            detail="パスワードリセット処理に失敗しました。"
        )


    # =====================================================
    # トークン生成
    # =====================================================

    try:
        reset_token = create_password_reset_token(
            user.id
        )

    except Exception:

        raise HTTPException(
            status_code=500,
            detail="パスワードリセット処理に失敗しました。"
        )


    # =====================================================
    # リセットURL
    # =====================================================

    reset_link = (
        f"{BASE_URL}/Reset_password.html"
        f"?token={reset_token}"
    )


    # =====================================================
    # メール
    # =====================================================

    message = MessageSchema(
        subject="パスワードリセットのご案内",
        recipients=[user.email],
        body=(
            "以下のリンクから新しいパスワードを"
            "設定してください。\n\n"
            f"{reset_link}\n\n"
            "このリンクは1時間後に無効になります。\n\n"
            "このメールに心当たりがない場合は、"
            "このメールを無視してください。"
        ),
        subtype="plain"
    )

    try:

        await fast_mail.send_message(message)

        # メールアドレスそのものはログへ出さない
        logger.info(
            f"Password reset email sent "
            f"for user_id: {user.id}"
        )

    except Exception:

        logger.exception(
            f"Failed to send password reset email "
            f"for user_id: {user.id}"
        )

        # メール送信に失敗したトークンを残さない
        connection = get_db_connection()
        cursor = connection.cursor()

        try:
            cursor.execute(
                """
                DELETE FROM password_reset_tokens
                WHERE token = %s
                """,
                (reset_token,)
            )

            connection.commit()

        except Exception:
            connection.rollback()

            logger.exception(
                "Failed to delete reset token "
                "after email delivery failure."
            )

        finally:
            cursor.close()
            connection.close()

        raise HTTPException(
            status_code=500,
            detail=(
                "メールの送信に失敗しました。"
                "後でもう一度お試しください。"
            )
        )

    return response_message


# =========================================================
# 新しいパスワード設定
# =========================================================

@router.post(
    "/password-reset/",
    tags=["Authentication"]
)
async def password_reset(
    password_reset: PasswordReset
):
    """
    リセットトークンを検証し、
    新しいパスワードを設定する。
    """

    # tokenそのものはログへ出さない
    logger.debug(
        "Received password reset request."
    )


    # =====================================================
    # パスワード最低文字数チェック
    # =====================================================

    # tokenを検証する前に行うことで、
    # 入力ミスだけでtokenを無効化することを避ける
    if len(password_reset.new_password) < MIN_PASSWORD_LENGTH:

        logger.warning(
            "Password reset rejected because "
            "the password was too short."
        )

        raise HTTPException(
            status_code=400,
            detail=(
                f"パスワードは"
                f"{MIN_PASSWORD_LENGTH}文字以上で設定してください。"
            )
        )


    # =====================================================
    # トークン検証
    # =====================================================

    try:
        user_id = verify_password_reset_token(
            password_reset.token
        )

    except Exception:

        raise HTTPException(
            status_code=500,
            detail="パスワードリセット処理に失敗しました。"
        )

    if not user_id:

        raise HTTPException(
            status_code=400,
            detail="無効または期限切れのトークンです。"
        )


    # =====================================================
    # ユーザー確認
    # =====================================================

    user = get_user_from_db(
        username=None,
        email=None,
        user_id=user_id
    )

    if not user:

        logger.error(
            f"User not found for user_id: {user_id}"
        )

        raise HTTPException(
            status_code=400,
            detail="ユーザーが存在しません。"
        )


    # =====================================================
    # パスワードをハッシュ化
    # =====================================================

    try:

        hashed_password = get_password_hash(
            password_reset.new_password
        )

    except Exception:

        logger.exception(
            f"Failed to hash password "
            f"for user_id: {user_id}"
        )

        raise HTTPException(
            status_code=500,
            detail="パスワードのリセットに失敗しました。"
        )


    # =====================================================
    # パスワード更新 + token無効化
    #
    # 同じDBトランザクションで実行する。
    # =====================================================

    connection = get_db_connection()
    cursor = connection.cursor()

    try:

        # パスワード更新
        cursor.execute(
            """
            UPDATE users
            SET password = %s
            WHERE id = %s
            """,
            (
                hashed_password,
                user_id,
            )
        )

        if cursor.rowcount != 1:
            raise RuntimeError(
                "Password update affected "
                "an unexpected number of rows."
            )

        # 使用したtokenを無効化
        cursor.execute(
            """
            DELETE FROM password_reset_tokens
            WHERE token = %s
            AND user_id = %s
            """,
            (
                password_reset.token,
                user_id,
            )
        )

        if cursor.rowcount != 1:
            raise RuntimeError(
                "Reset token could not be invalidated."
            )

        # 両方成功して初めてcommit
        connection.commit()

        logger.info(
            f"Password successfully reset "
            f"for user_id: {user_id}"
        )

    except Exception:

        # どちらかに失敗した場合は両方戻す
        connection.rollback()

        logger.exception(
            f"Failed to reset password "
            f"for user_id: {user_id}"
        )

        raise HTTPException(
            status_code=500,
            detail="パスワードのリセットに失敗しました。"
        )

    finally:
        cursor.close()
        connection.close()


    return {
        "message":
        "パスワードが正常にリセットされました。"
        "ログインしてください。"
    }