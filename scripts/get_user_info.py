# ユーザーがログインしている状態で、そのユーザーの情報を取得するAPIエンドポイント

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException

from .auth import User, get_current_user
from .register_user import get_db_connection


logger = logging.getLogger(__name__)
router = APIRouter()


def normalize_private_company(
    experience: Dict[str, Any],
    include_private: bool,
) -> Dict[str, Any]:
    """
    他ユーザー向け取得時に、非公開会社名をマスクする。
    自分自身の編集画面など、include_private=True の場合は元の値を返す。
    """
    if not include_private and experience.get("is_private"):
        experience["company_name"] = "非公開"

    return experience


@router.get("/user-info/")
async def get_user_info(
    current_user: User = Depends(get_current_user),
    include_private: bool = False,
):
    if current_user.id is None:
        raise HTTPException(
            status_code=401,
            detail="ユーザーIDを取得できません。",
        )

    db = get_db_connection()

    # buffered=True にして、クエリ結果の未読エラーを防ぐ
    cursor = db.cursor(dictionary=True, buffered=True)

    try:
        # =========================================================
        # 1. ユーザー基本情報
        # =========================================================
        cursor.execute(
            """
            SELECT
                id,
                username,
                email,
                family_name,
                given_name,
                birthdate,
                gender,
                newsletter_subscription
            FROM users
            WHERE id = %s
            """,
            (current_user.id,),
        )

        user_info = cursor.fetchone()

        if not user_info:
            raise HTTPException(
                status_code=404,
                detail="ユーザー情報が見つかりません。",
            )

        # =========================================================
        # 2. 学歴
        #    将来の複数学歴に備え、配列として返す
        # =========================================================
        cursor.execute(
            """
            SELECT
                education_id,
                institution,
                degree,
                major,
                education_start,
                education_end,
                hide_institution
            FROM education
            WHERE user_id = %s
            ORDER BY education_start ASC, education_id ASC
            """,
            (current_user.id,),
        )

        educations = cursor.fetchall()

        for education in educations:
            if (
                not include_private
                and education.get("hide_institution")
            ):
                education["institution"] = "非公開"

        user_info["educations"] = educations

        # 既存フロントエンドとの互換性のため、
        # 最初の1件を従来のフラット項目でも返す
        if educations:
            first_education = educations[0]

            user_info["education_id"] = first_education.get(
                "education_id"
            )
            user_info["institution"] = first_education.get(
                "institution"
            )
            user_info["degree"] = first_education.get("degree")
            user_info["major"] = first_education.get("major")
            user_info["education_start"] = first_education.get(
                "education_start"
            )
            user_info["education_end"] = first_education.get(
                "education_end"
            )
            user_info["hide_institution"] = first_education.get(
                "hide_institution"
            )

        # =========================================================
        # 3. 会社単位の職歴
        # =========================================================
        cursor.execute(
            """
            SELECT
                id,
                company_name,
                industry,
                position,
                work_start_period,
                work_end_period,
                salary,
                job_category,
                job_sub_category,
                satisfaction_level,
                is_private
            FROM job_experiences
            WHERE user_id = %s
            ORDER BY
                work_start_period ASC,
                id ASC
            """,
            (current_user.id,),
        )

        job_experiences = cursor.fetchall()

        for experience in job_experiences:
            normalize_private_company(
                experience,
                include_private,
            )

            # =====================================================
            # 4. 各会社に紐づく役割履歴
            # =====================================================
            cursor.execute(
                """
                SELECT
                    id,
                    job_experience_id,
                    department,
                    position,
                    job_category,
                    job_sub_category,
                    role_description,
                    start_period,
                    end_period,
                    salary_range,
                    satisfaction_level,
                    work_style,
                    display_order,
                    created_at,
                    updated_at
                FROM role_histories
                WHERE job_experience_id = %s
                ORDER BY
                    display_order ASC,
                    start_period ASC,
                    id ASC
                """,
                (experience["id"],),
            )

            experience["role_histories"] = cursor.fetchall()

        user_info["job_experiences"] = job_experiences

        # =========================================================
        # 5. Career GPSの意思決定
        # =========================================================
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
                migration_source,
                legacy_source_id,
                created_at,
                updated_at
            FROM career_decisions
            WHERE user_id = %s
            ORDER BY
                display_order ASC,
                occurred_at ASC,
                id ASC
            """,
            (current_user.id,),
        )

        career_decisions = cursor.fetchall()
        user_info["career_decisions"] = career_decisions

        # ---------------------------------------------------------
        # 既存画面との暫定互換
        #
        # 既存JSが transition_type などを参照している場合に備え、
        # 最初の意思決定を従来の項目名でも返す。
        # ---------------------------------------------------------
        if career_decisions:
            first_decision = career_decisions[0]

            user_info["transition_id"] = first_decision.get("id")
            user_info["transition_type"] = first_decision.get(
                "decision_type"
            )
            user_info["transition_story"] = first_decision.get(
                "trigger_text"
            )
            user_info["reason_for_job_change"] = first_decision.get(
                "final_reason"
            )
            user_info["job_experience_feedback"] = (
                first_decision.get("result_text")
            )

        else:
            # 新テーブルに存在しないユーザーのみ旧テーブルを読む
            cursor.execute(
                """
                SELECT
                    transition_id,
                    transition_type,
                    transition_story,
                    reason_for_job_change,
                    job_experience_feedback
                FROM career_transitions
                WHERE user_id = %s
                ORDER BY transition_id ASC
                LIMIT 1
                """,
                (current_user.id,),
            )

            legacy_transition = cursor.fetchone()

            if legacy_transition:
                user_info.update(legacy_transition)

        # =========================================================
        # 6. 現在のキャリア観・今後
        # =========================================================
        cursor.execute(
            """
            SELECT
                id,
                user_id,
                current_career_view,
                current_concerns,
                future_goals,
                desired_direction,
                desired_role,
                skills_to_develop,
                environment_to_avoid,
                five_year_goal,
                message_to_younger_self,
                message_to_similar_people,
                status,
                needs_review,
                migration_source,
                legacy_source_id,
                created_at,
                updated_at
            FROM current_career_views
            WHERE user_id = %s
            LIMIT 1
            """,
            (current_user.id,),
        )

        current_career_view = cursor.fetchone()
        user_info["current_career_view_detail"] = (
            current_career_view
        )

        # ---------------------------------------------------------
        # 既存画面との暫定互換
        # ---------------------------------------------------------
        if current_career_view:
            user_info["career_aspirations_id"] = (
                current_career_view.get("id")
            )
            user_info["career_type"] = (
                current_career_view.get("desired_direction")
            )
            user_info["career_description"] = (
                current_career_view.get("future_goals")
            )
            user_info["career_satisfaction_feedback"] = (
                current_career_view.get("current_career_view")
            )

        else:
            # 新テーブルに存在しないユーザーのみ旧データを読む
            cursor.execute(
                """
                SELECT
                    career_aspirations_id,
                    type AS career_type,
                    description AS career_description,
                    career_satisfaction_feedback
                FROM career_aspirations
                WHERE user_id = %s
                ORDER BY career_aspirations_id ASC
                LIMIT 1
                """,
                (current_user.id,),
            )

            legacy_aspiration = cursor.fetchone()

            if legacy_aspiration:
                user_info.update(legacy_aspiration)

        # =========================================================
        # 7. キャリアの原点
        #    新規入力には使用しないが、旧データ表示用に残す
        # =========================================================
        cursor.execute(
            """
            SELECT
                id,
                start_reason,
                first_job_feedback,
                status,
                needs_review,
                migration_source,
                legacy_source_id
            FROM career_start_points
            WHERE user_id = %s
            ORDER BY id ASC
            LIMIT 1
            """,
            (current_user.id,),
        )

        career_start_point = cursor.fetchone()
        user_info["career_start_point"] = career_start_point

        if career_start_point:
            user_info["start_point_id"] = (
                career_start_point.get("id")
            )
            user_info["start_reason"] = (
                career_start_point.get("start_reason")
            )
            user_info["first_job_feedback"] = (
                career_start_point.get("first_job_feedback")
            )

        else:
            # 旧データフォールバック
            cursor.execute(
                """
                SELECT
                    start_point_id,
                    start_reason,
                    first_job_feedback
                FROM career_start_point
                WHERE user_id = %s
                ORDER BY start_point_id ASC
                LIMIT 1
                """,
                (current_user.id,),
            )

            legacy_start_point = cursor.fetchone()

            if legacy_start_point:
                user_info.update(legacy_start_point)

        # =========================================================
        # 8. 旧成果・失敗・悩み
        #    現時点では旧テーブルを参照専用で読む
        # =========================================================
        cursor.execute(
            """
            SELECT
                achievement_id,
                proudest_achievement,
                failure_experience,
                lesson_learned,
                concerns
            FROM career_achievements
            WHERE user_id = %s
            ORDER BY achievement_id ASC
            LIMIT 1
            """,
            (current_user.id,),
        )

        achievement_info = cursor.fetchone()

        user_info["legacy_career_achievement"] = achievement_info

        if achievement_info:
            user_info.update(achievement_info)

        # =========================================================
        # 9. 旧学び・成長
        #    新規user_skillsテーブルは作らず、参照専用で返す
        # =========================================================
        cursor.execute(
            """
            SELECT
                growth_id,
                skill,
                description AS growth_description
            FROM learning_and_growth
            WHERE user_id = %s
            ORDER BY growth_id ASC
            LIMIT 1
            """,
            (current_user.id,),
        )

        growth_info = cursor.fetchone()
        user_info["legacy_learning_and_growth"] = growth_info

        if growth_info:
            user_info.update(growth_info)

        return user_info

    except HTTPException:
        raise

    except Exception as exc:
        logger.exception(
            "ユーザー情報取得中にエラーが発生しました。user_id=%s",
            current_user.id,
        )

        raise HTTPException(
            status_code=500,
            detail="ユーザー情報の取得に失敗しました。",
        ) from exc

    finally:
        cursor.close()
        db.close()