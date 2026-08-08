import logging
from datetime import date
from typing import Optional

import mysql.connector
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from .auth import get_current_user, User
from .register_user import get_db_connection


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/career-decisions",
    tags=["career-decisions"]
)


# ============================================================
# リクエストモデル
# ============================================================

class CareerDecisionCreateRequest(BaseModel):
    """
    キャリアの振り返り新規登録用モデル。
    HTMLフォームとcareer_decisionsテーブルの項目を対応させる。
    """

    job_experience_id: Optional[int] = None
    role_history_id: Optional[int] = None

    title: Optional[str] = Field(
        default=None,
        max_length=255
    )

    decision_type: str = Field(
        min_length=1,
        max_length=100
    )

    occurred_at: Optional[date] = None

    trigger_text: Optional[str] = None
    dilemma_text: Optional[str] = None
    priority_text: Optional[str] = None
    final_reason: Optional[str] = None

    result_text: Optional[str] = None
    unexpected_result: Optional[str] = None
    learning_text: Optional[str] = None

    same_choice_answer: Optional[str] = Field(
        default=None,
        max_length=30
    )

    same_choice_reason: Optional[str] = None
    advice_text: Optional[str] = None

    status: str = Field(
        default="draft",
        max_length=30
    )

    needs_review: int = Field(
        default=0,
        ge=0,
        le=1
    )

    display_order: int = Field(
        default=1,
        ge=1
    )


# ============================================================
# 共通処理
# ============================================================

def normalize_optional_text(value: Optional[str]) -> Optional[str]:
    """
    空文字や空白だけの文字列をNULL相当のNoneへ変換する。
    """

    if value is None:
        return None

    normalized_value = value.strip()

    if normalized_value == "":
        return None

    return normalized_value


def validate_related_career(
    cursor,
    user_id: int,
    job_experience_id: Optional[int],
    role_history_id: Optional[int]
) -> None:
    """
    指定された会社・役割がログインユーザー本人のデータか確認する。

    role_history_idが指定された場合は、
    その役割が指定されたjob_experience_idに属していることも確認する。
    """

    if job_experience_id is not None:
        cursor.execute(
            """
            SELECT id
            FROM job_experiences
            WHERE id = %s
              AND user_id = %s
            """,
            (
                job_experience_id,
                user_id
            )
        )

        job_experience = cursor.fetchone()

        if job_experience is None:
            raise HTTPException(
                status_code=400,
                detail="指定された会社情報が見つからないか、操作権限がありません。"
            )

    if role_history_id is not None:
        cursor.execute(
            """
            SELECT
                rh.id,
                rh.job_experience_id
            FROM role_histories rh
            INNER JOIN job_experiences je
                ON je.id = rh.job_experience_id
            WHERE rh.id = %s
              AND je.user_id = %s
            """,
            (
                role_history_id,
                user_id
            )
        )

        role_history = cursor.fetchone()

        if role_history is None:
            raise HTTPException(
                status_code=400,
                detail="指定された役割情報が見つからないか、操作権限がありません。"
            )

        role_job_experience_id = role_history[1]

        if job_experience_id is None:
            raise HTTPException(
                status_code=400,
                detail="役割を指定する場合は、関連する会社も指定してください。"
            )

        if role_job_experience_id != job_experience_id:
            raise HTTPException(
                status_code=400,
                detail="指定された役割は、選択した会社に属していません。"
            )


# ============================================================
# 会社・役割の選択肢取得
# ============================================================

@router.get("/options/")
async def get_career_decision_options(
    current_user: User = Depends(get_current_user)
):
    """
    ログインユーザーが登録している会社と役割を取得する。

    Career_decision_edit.htmlの以下で利用する。
    ・関連する会社
    ・関連する役割
    """

    db = None
    cursor = None

    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        # ログインユーザー本人の会社一覧を取得
        cursor.execute(
            """
            SELECT
                id,
                company_name,
                industry,
                work_start_period,
                work_end_period
            FROM job_experiences
            WHERE user_id = %s
            ORDER BY
                CASE
                    WHEN work_start_period IS NULL THEN 1
                    ELSE 0
                END,
                work_start_period,
                id
            """,
            (current_user.id,)
        )

        companies = cursor.fetchall()

        # ログインユーザー本人の会社に紐づく役割一覧を取得
        cursor.execute(
            """
            SELECT
                rh.id,
                rh.job_experience_id,
                rh.department,
                rh.position,
                rh.job_category,
                rh.job_sub_category,
                rh.start_period,
                rh.end_period,
                rh.display_order
            FROM role_histories rh
            INNER JOIN job_experiences je
                ON je.id = rh.job_experience_id
            WHERE je.user_id = %s
            ORDER BY
                rh.job_experience_id,
                rh.display_order,
                rh.id
            """,
            (current_user.id,)
        )

        roles = cursor.fetchall()

        return {
            "companies": companies,
            "roles": roles
        }

    except HTTPException:
        raise

    except mysql.connector.Error as error:
        logger.exception(
            "会社・役割の選択肢取得中にDBエラーが発生しました。user_id=%s",
            current_user.id
        )

        raise HTTPException(
            status_code=500,
            detail="会社・役割情報の取得に失敗しました。"
        ) from error

    except Exception as error:
        logger.exception(
            "会社・役割の選択肢取得中にエラーが発生しました。user_id=%s",
            current_user.id
        )

        raise HTTPException(
            status_code=500,
            detail="会社・役割情報の取得に失敗しました。"
        ) from error

    finally:
        if cursor is not None:
            cursor.close()

        if db is not None and db.is_connected():
            db.close()


# ============================================================
# キャリアの振り返り新規登録
# ============================================================

@router.post("/", status_code=201)
async def create_career_decision(
    request_data: CareerDecisionCreateRequest,
    current_user: User = Depends(get_current_user)
):
    """
    キャリアの振り返りを新規登録する。
    """

    db = None
    cursor = None

    try:
        db = get_db_connection()
        cursor = db.cursor()

        # 会社・役割が本人のデータか検証
        validate_related_career(
            cursor=cursor,
            user_id=current_user.id,
            job_experience_id=request_data.job_experience_id,
            role_history_id=request_data.role_history_id
        )

        # 必須項目の最終チェック
        decision_type = normalize_optional_text(
            request_data.decision_type
        )

        if decision_type is None:
            raise HTTPException(
                status_code=422,
                detail="意思決定の種類を選択してください。"
            )

        title = normalize_optional_text(
            request_data.title
        )

        trigger_text = normalize_optional_text(
            request_data.trigger_text
        )

        dilemma_text = normalize_optional_text(
            request_data.dilemma_text
        )

        priority_text = normalize_optional_text(
            request_data.priority_text
        )

        final_reason = normalize_optional_text(
            request_data.final_reason
        )

        result_text = normalize_optional_text(
            request_data.result_text
        )

        unexpected_result = normalize_optional_text(
            request_data.unexpected_result
        )

        learning_text = normalize_optional_text(
            request_data.learning_text
        )

        same_choice_answer = normalize_optional_text(
            request_data.same_choice_answer
        )

        same_choice_reason = normalize_optional_text(
            request_data.same_choice_reason
        )

        advice_text = normalize_optional_text(
            request_data.advice_text
        )

        allowed_same_choice_answers = {
            None,
            "はい",
            "いいえ",
            "どちらともいえない"
        }

        if same_choice_answer not in allowed_same_choice_answers:
            raise HTTPException(
                status_code=422,
                detail="「今なら同じ選択をするか」の値が不正です。"
            )

        cursor.execute(
            """
            INSERT INTO career_decisions (
                user_id,
                job_experience_id,
                role_history_id,
                title,
                decision_type,
                occurred_at,
                trigger_text,
                dilemma_text,
                priority_text,
                final_reason,
                result_text,
                unexpected_result,
                learning_text,
                same_choice_answer,
                same_choice_reason,
                advice_text,
                status,
                needs_review,
                display_order,
                migration_source,
                legacy_source_id
            )
            VALUES (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                NULL,
                NULL
            )
            """,
            (
                current_user.id,
                request_data.job_experience_id,
                request_data.role_history_id,
                title,
                decision_type,
                request_data.occurred_at,
                trigger_text,
                dilemma_text,
                priority_text,
                final_reason,
                result_text,
                unexpected_result,
                learning_text,
                same_choice_answer,
                same_choice_reason,
                advice_text,
                request_data.status,
                request_data.needs_review,
                request_data.display_order
            )
        )

        decision_id = cursor.lastrowid

        db.commit()

        return {
            "message": "キャリアの振り返りを登録しました。",
            "id": decision_id
        }

    except HTTPException:
        if db is not None:
            db.rollback()

        raise

    except mysql.connector.IntegrityError as error:
        if db is not None:
            db.rollback()

        logger.exception(
            "キャリアの振り返り登録中に整合性エラーが発生しました。user_id=%s",
            current_user.id
        )

        raise HTTPException(
            status_code=400,
            detail="入力内容または関連する会社・役割の指定に問題があります。"
        ) from error

    except mysql.connector.Error as error:
        if db is not None:
            db.rollback()

        logger.exception(
            "キャリアの振り返り登録中にDBエラーが発生しました。user_id=%s",
            current_user.id
        )

        raise HTTPException(
            status_code=500,
            detail="キャリアの振り返りの登録に失敗しました。"
        ) from error

    except Exception as error:
        if db is not None:
            db.rollback()

        logger.exception(
            "キャリアの振り返り登録中にエラーが発生しました。user_id=%s",
            current_user.id
        )

        raise HTTPException(
            status_code=500,
            detail="キャリアの振り返りの登録に失敗しました。"
        ) from error

    finally:
        if cursor is not None:
            cursor.close()

        if db is not None and db.is_connected():
            db.close()

# ============================================================
# キャリアの振り返り一覧取得
# ============================================================

@router.get("/")
async def get_career_decisions(
    current_user: User = Depends(get_current_user)
):
    """
    ログインユーザー本人が登録したキャリアの振り返りを取得する。
    """

    db = None
    cursor = None

    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                cd.id,
                cd.job_experience_id,
                cd.role_history_id,
                cd.title,
                cd.decision_type,
                cd.occurred_at,
                cd.trigger_text,
                cd.dilemma_text,
                cd.priority_text,
                cd.final_reason,
                cd.result_text,
                cd.unexpected_result,
                cd.learning_text,
                cd.same_choice_answer,
                cd.same_choice_reason,
                cd.advice_text,
                cd.status,
                cd.needs_review,
                cd.display_order,
                cd.created_at,
                cd.updated_at,

                je.company_name,

                rh.department,
                rh.position

            FROM career_decisions cd

            LEFT JOIN job_experiences je
                ON je.id = cd.job_experience_id
               AND je.user_id = cd.user_id

            LEFT JOIN role_histories rh
                ON rh.id = cd.role_history_id
               AND rh.job_experience_id = cd.job_experience_id

            WHERE cd.user_id = %s

            ORDER BY
                CASE
                    WHEN cd.occurred_at IS NULL THEN 1
                    ELSE 0
                END,
                cd.occurred_at DESC,
                cd.display_order,
                cd.id DESC
            """,
            (current_user.id,)
        )

        decisions = cursor.fetchall()

        return {
            "count": len(decisions),
            "decisions": decisions
        }

    except mysql.connector.Error as error:
        logger.exception(
            "キャリアの振り返り一覧取得中にDBエラーが発生しました。user_id=%s",
            current_user.id
        )

        raise HTTPException(
            status_code=500,
            detail="キャリアの振り返り一覧の取得に失敗しました。"
        ) from error

    except Exception as error:
        logger.exception(
            "キャリアの振り返り一覧取得中にエラーが発生しました。user_id=%s",
            current_user.id
        )

        raise HTTPException(
            status_code=500,
            detail="キャリアの振り返り一覧の取得に失敗しました。"
        ) from error

    finally:
        if cursor is not None:
            cursor.close()

        if db is not None and db.is_connected():
            db.close()


# ============================================================
# キャリアの振り返り詳細取得
# ============================================================

@router.get("/{decision_id}")
async def get_career_decision_detail(
    decision_id: int,
    current_user: User = Depends(get_current_user)
):
    """
    ログインユーザー本人のキャリアの振り返りを1件取得する。
    """

    db = None
    cursor = None

    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id,
                user_id,
                job_experience_id,
                role_history_id,
                title,
                decision_type,
                occurred_at,
                trigger_text,
                dilemma_text,
                priority_text,
                final_reason,
                result_text,
                unexpected_result,
                learning_text,
                same_choice_answer,
                same_choice_reason,
                advice_text,
                status,
                needs_review,
                display_order,
                created_at,
                updated_at
            FROM career_decisions
            WHERE id = %s
              AND user_id = %s
            """,
            (
                decision_id,
                current_user.id
            )
        )

        decision = cursor.fetchone()

        if decision is None:
            raise HTTPException(
                status_code=404,
                detail="指定されたキャリアの振り返りが見つかりません。"
            )

        return decision

    except HTTPException:
        raise

    except mysql.connector.Error as error:
        logger.exception(
            "キャリアの振り返り詳細取得中にDBエラーが発生しました。"
            "user_id=%s decision_id=%s",
            current_user.id,
            decision_id
        )

        raise HTTPException(
            status_code=500,
            detail="キャリアの振り返りの取得に失敗しました。"
        ) from error

    except Exception as error:
        logger.exception(
            "キャリアの振り返り詳細取得中にエラーが発生しました。"
            "user_id=%s decision_id=%s",
            current_user.id,
            decision_id
        )

        raise HTTPException(
            status_code=500,
            detail="キャリアの振り返りの取得に失敗しました。"
        ) from error

    finally:
        if cursor is not None:
            cursor.close()

        if db is not None and db.is_connected():
            db.close()


# ============================================================
# キャリアの振り返り更新
# ============================================================

@router.put("/{decision_id}")
async def update_career_decision(
    decision_id: int,
    request_data: CareerDecisionCreateRequest,
    current_user: User = Depends(get_current_user)
):
    """
    ログインユーザー本人のキャリアの振り返りを更新する。
    """

    db = None
    cursor = None

    try:
        db = get_db_connection()
        cursor = db.cursor()

        # 更新対象が本人のデータか確認
        cursor.execute(
            """
            SELECT id
            FROM career_decisions
            WHERE id = %s
              AND user_id = %s
            """,
            (
                decision_id,
                current_user.id
            )
        )

        existing_decision = cursor.fetchone()

        if existing_decision is None:
            raise HTTPException(
                status_code=404,
                detail="更新対象のキャリアの振り返りが見つかりません。"
            )

        # 関連会社・役割が本人のデータか確認
        validate_related_career(
            cursor=cursor,
            user_id=current_user.id,
            job_experience_id=request_data.job_experience_id,
            role_history_id=request_data.role_history_id
        )

        decision_type = normalize_optional_text(
            request_data.decision_type
        )

        if decision_type is None:
            raise HTTPException(
                status_code=422,
                detail="意思決定の種類を選択してください。"
            )

        same_choice_answer = normalize_optional_text(
            request_data.same_choice_answer
        )

        allowed_same_choice_answers = {
            None,
            "はい",
            "いいえ",
            "どちらともいえない"
        }

        if same_choice_answer not in allowed_same_choice_answers:
            raise HTTPException(
                status_code=422,
                detail="「今なら同じ選択をするか」の値が不正です。"
            )

        cursor.execute(
            """
            UPDATE career_decisions
            SET
                job_experience_id = %s,
                role_history_id = %s,
                title = %s,
                decision_type = %s,
                occurred_at = %s,
                trigger_text = %s,
                dilemma_text = %s,
                priority_text = %s,
                final_reason = %s,
                result_text = %s,
                unexpected_result = %s,
                learning_text = %s,
                same_choice_answer = %s,
                same_choice_reason = %s,
                advice_text = %s,
                status = %s,
                needs_review = %s,
                display_order = %s
            WHERE id = %s
              AND user_id = %s
            """,
            (
                request_data.job_experience_id,
                request_data.role_history_id,
                normalize_optional_text(request_data.title),
                decision_type,
                request_data.occurred_at,
                normalize_optional_text(request_data.trigger_text),
                normalize_optional_text(request_data.dilemma_text),
                normalize_optional_text(request_data.priority_text),
                normalize_optional_text(request_data.final_reason),
                normalize_optional_text(request_data.result_text),
                normalize_optional_text(request_data.unexpected_result),
                normalize_optional_text(request_data.learning_text),
                same_choice_answer,
                normalize_optional_text(request_data.same_choice_reason),
                normalize_optional_text(request_data.advice_text),
                request_data.status,
                request_data.needs_review,
                request_data.display_order,
                decision_id,
                current_user.id
            )
        )

        db.commit()

        return {
            "message": "キャリアの振り返りを更新しました。",
            "id": decision_id
        }

    except HTTPException:
        if db is not None:
            db.rollback()

        raise

    except mysql.connector.IntegrityError as error:
        if db is not None:
            db.rollback()

        logger.exception(
            "キャリアの振り返り更新中に整合性エラーが発生しました。"
            "user_id=%s decision_id=%s",
            current_user.id,
            decision_id
        )

        raise HTTPException(
            status_code=400,
            detail="入力内容または関連する会社・役割の指定に問題があります。"
        ) from error

    except mysql.connector.Error as error:
        if db is not None:
            db.rollback()

        logger.exception(
            "キャリアの振り返り更新中にDBエラーが発生しました。"
            "user_id=%s decision_id=%s",
            current_user.id,
            decision_id
        )

        raise HTTPException(
            status_code=500,
            detail="キャリアの振り返りの更新に失敗しました。"
        ) from error

    except Exception as error:
        if db is not None:
            db.rollback()

        logger.exception(
            "キャリアの振り返り更新中にエラーが発生しました。"
            "user_id=%s decision_id=%s",
            current_user.id,
            decision_id
        )

        raise HTTPException(
            status_code=500,
            detail="キャリアの振り返りの更新に失敗しました。"
        ) from error

    finally:
        if cursor is not None:
            cursor.close()

        if db is not None and db.is_connected():
            db.close()


# ============================================================
# キャリアの振り返り削除
# ============================================================

@router.delete("/{decision_id}")
async def delete_career_decision(
    decision_id: int,
    current_user: User = Depends(get_current_user)
):
    """
    ログインユーザー本人のキャリアの振り返りを削除する。

    他ユーザーのデータは削除できない。
    """

    db = None
    cursor = None

    try:
        db = get_db_connection()
        cursor = db.cursor()

        # 削除対象がログインユーザー本人のデータか確認
        cursor.execute(
            """
            SELECT id
            FROM career_decisions
            WHERE id = %s
              AND user_id = %s
            """,
            (
                decision_id,
                current_user.id
            )
        )

        existing_decision = cursor.fetchone()

        if existing_decision is None:
            raise HTTPException(
                status_code=404,
                detail="削除対象のキャリアの振り返りが見つかりません。"
            )

        cursor.execute(
            """
            DELETE FROM career_decisions
            WHERE id = %s
              AND user_id = %s
            """,
            (
                decision_id,
                current_user.id
            )
        )

        db.commit()

        return {
            "message": "キャリアの振り返りを削除しました。",
            "id": decision_id
        }

    except HTTPException:
        if db is not None:
            db.rollback()

        raise

    except mysql.connector.Error as error:
        if db is not None:
            db.rollback()

        logger.exception(
            "キャリアの振り返り削除中にDBエラーが発生しました。"
            "user_id=%s decision_id=%s",
            current_user.id,
            decision_id
        )

        raise HTTPException(
            status_code=500,
            detail="キャリアの振り返りの削除に失敗しました。"
        ) from error

    except Exception as error:
        if db is not None:
            db.rollback()

        logger.exception(
            "キャリアの振り返り削除中にエラーが発生しました。"
            "user_id=%s decision_id=%s",
            current_user.id,
            decision_id
        )

        raise HTTPException(
            status_code=500,
            detail="キャリアの振り返りの削除に失敗しました。"
        ) from error

    finally:
        if cursor is not None:
            cursor.close()

        if db is not None and db.is_connected():
            db.close()