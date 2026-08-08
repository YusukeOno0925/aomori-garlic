import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends
from fastapi.responses import JSONResponse

from .auth import User, get_current_user
from .register_user import get_db_connection


logger = logging.getLogger(__name__)
router = APIRouter()


def has_value(value: Any) -> bool:
    """
    値が入力されているか判定する。

    未入力:
    - None
    - 空文字
    - 空白だけの文字列

    有効:
    - 0
    - False
    - その他の値
    """
    if value is None:
        return False

    if isinstance(value, str):
        return bool(value.strip())

    return True


def normalize_optional_value(value: Any) -> Any:
    """
    空文字・空白だけの文字列をNoneへ変換する。
    """
    if value is None:
        return None

    if isinstance(value, str):
        stripped_value = value.strip()
        return stripped_value if stripped_value else None

    return value


def normalize_optional_int(value: Any) -> Optional[int]:
    """
    任意の整数項目を正規化する。

    - None  -> None
    - ""    -> None
    - "3"   -> 3
    - 3     -> 3
    """
    if value is None:
        return None

    if isinstance(value, str):
        stripped_value = value.strip()

        if not stripped_value:
            return None

        try:
            return int(stripped_value)
        except ValueError as exc:
            raise ValueError(
                f"整数として扱えない値が入力されています: {value}"
            ) from exc

    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(
            f"整数として扱えない値が入力されています: {value}"
        ) from exc


def normalize_date_value(value: Any) -> Any:
    """
    日付項目を正規化する。

    - None
    - 空文字
    - 0000-00-00

    はNoneへ変換する。
    """
    if value in (None, "", "0000-00-00"):
        return None

    if isinstance(value, str):
        stripped_value = value.strip()

        if not stripped_value or stripped_value == "0000-00-00":
            return None

        return stripped_value

    return value


def normalize_bool(value: Any, default: bool = False) -> bool:
    """
    Boolean項目を安全に正規化する。
    """
    if value is None or value == "":
        return default

    if isinstance(value, bool):
        return value

    if isinstance(value, int):
        return value != 0

    if isinstance(value, str):
        normalized = value.strip().lower()

        if normalized in ("1", "true", "on", "yes"):
            return True

        if normalized in ("0", "false", "off", "no"):
            return False

    return bool(value)


def normalize_role(
    role: Dict[str, Any],
    fallback_start_period: Any = None,
    fallback_end_period: Any = None,
) -> Dict[str, Any]:
    """
    role_historiesの入力をDB保存用に正規化する。
    """
    return {
        "id": normalize_optional_int(role.get("id")),
        "department": normalize_optional_value(
            role.get("department")
        ),
        "position": normalize_optional_value(
            role.get("position")
        ),
        "job_category": normalize_optional_value(
            role.get("job_category")
        ),
        "job_sub_category": normalize_optional_value(
            role.get("job_sub_category")
        ),
        "role_description": normalize_optional_value(
            role.get("role_description")
        ),
        "start_period": normalize_date_value(
            role.get("start_period") or fallback_start_period
        ),
        "end_period": normalize_date_value(
            role.get("end_period") or fallback_end_period
        ),
        "salary_range": normalize_optional_value(
            role.get("salary_range")
        ),
        "satisfaction_level": normalize_optional_int(
            role.get("satisfaction_level")
        ),
        "work_style": normalize_optional_value(
            role.get("work_style")
        ),
        "display_order": (
            normalize_optional_int(role.get("display_order")) or 1
        ),
    }


def has_role_content(role: Dict[str, Any]) -> bool:
    """
    役割として保存すべき内容があるか判定する。
    """
    return any(
        [
            has_value(role.get("department")),
            has_value(role.get("position")),
            has_value(role.get("job_category")),
            has_value(role.get("job_sub_category")),
            has_value(role.get("role_description")),
            has_value(role.get("start_period")),
            has_value(role.get("end_period")),
            has_value(role.get("salary_range")),
            has_value(role.get("satisfaction_level")),
            has_value(role.get("work_style")),
        ]
    )


def build_legacy_role(
    experience: Dict[str, Any],
    work_start_period: Any,
    work_end_period: Any,
) -> Dict[str, Any]:
    """
    現行画面の旧形式をrole_histories形式へ変換する。

    現行画面:
    - position
    - job_category
    - job_sub_category
    - salary
    - satisfaction_level

    新形式:
    - role_histories: [...]
    """
    return normalize_role(
        {
            "position": experience.get("position"),
            "job_category": experience.get("job_category"),
            "job_sub_category": experience.get(
                "job_sub_category"
            ),
            "salary_range": experience.get("salary"),
            "satisfaction_level": experience.get(
                "satisfaction_level"
            ),
            "start_period": work_start_period,
            "end_period": work_end_period,
            "display_order": 1,
        }
    )


@router.post("/update-user-info/")
async def update_user_info(
    data: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user),
):
    if current_user.id is None:
        return JSONResponse(
            content={
                "message": "ユーザー情報を確認できませんでした。"
            },
            status_code=401,
        )

    db = get_db_connection()
    cursor = db.cursor()

    try:
        # =========================================================
        # 1. ユーザー基本情報
        # =========================================================
        cursor.execute(
            """
            UPDATE users
            SET
                username = %s,
                email = %s,
                family_name = %s,
                given_name = %s,
                birthdate = %s,
                gender = %s,
                newsletter_subscription = %s
            WHERE id = %s
            """,
            (
                data.get("username"),
                data.get("email"),
                normalize_optional_value(
                    data.get("family_name")
                ),
                normalize_optional_value(
                    data.get("given_name")
                ),
                normalize_date_value(
                    data.get("birthdate")
                ),
                normalize_optional_value(
                    data.get("gender")
                ),
                normalize_bool(
                    data.get("newsletter_subscription"),
                    default=False,
                ),
                current_user.id,
            ),
        )

        # =========================================================
        # 2. 学歴
        # =========================================================
        education_id = data.get("education_id")

        institution = normalize_optional_value(
            data.get("institution")
        )
        degree = normalize_optional_value(
            data.get("degree")
        )
        major = normalize_optional_value(
            data.get("major")
        )
        education_start = normalize_date_value(
            data.get("education_start")
        )
        education_end = normalize_date_value(
            data.get("education_end")
        )
        hide_institution = normalize_bool(
            data.get("hide_institution"),
            default=False,
        )

        has_education_content = any(
            [
                has_value(institution),
                has_value(degree),
                has_value(major),
                has_value(education_start),
                has_value(education_end),
            ]
        )

        if has_value(education_id):
            cursor.execute(
                """
                UPDATE education
                SET
                    institution = %s,
                    degree = %s,
                    major = %s,
                    education_start = %s,
                    education_end = %s,
                    hide_institution = %s
                WHERE education_id = %s
                  AND user_id = %s
                """,
                (
                    institution,
                    degree,
                    major,
                    education_start,
                    education_end,
                    hide_institution,
                    education_id,
                    current_user.id,
                ),
            )

        elif has_education_content:
            cursor.execute(
                """
                INSERT INTO education (
                    user_id,
                    institution,
                    degree,
                    major,
                    education_start,
                    education_end,
                    hide_institution
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    current_user.id,
                    institution,
                    degree,
                    major,
                    education_start,
                    education_end,
                    hide_institution,
                ),
            )

        # =========================================================
        # 3. 会社・役割履歴
        #
        # 旧形式:
        # job_experiences[].position 等
        #
        # 新形式:
        # job_experiences[].role_histories[]
        #
        # 両方を受け付ける。
        # =========================================================
        job_experiences = data.get("job_experiences", [])

        if job_experiences is None:
            job_experiences = []

        if not isinstance(job_experiences, list):
            raise ValueError(
                "job_experiencesは配列形式で指定してください。"
            )

        for experience in job_experiences:
            if not isinstance(experience, dict):
                continue

            experience_id = normalize_optional_int(
                experience.get("id")
            )

            company_name = normalize_optional_value(
                experience.get("company_name")
            )
            industry = normalize_optional_value(
                experience.get("industry")
            )
            work_start_period = normalize_date_value(
                experience.get("work_start_period")
            )
            work_end_period = normalize_date_value(
                experience.get("work_end_period")
            )
            is_private = normalize_bool(
                experience.get("is_private"),
                default=False,
            )

            # ---------------------------------------------
            # 新形式か旧形式かを判定
            # ---------------------------------------------
            raw_roles = experience.get("role_histories")

            if raw_roles is not None:
                if not isinstance(raw_roles, list):
                    raise ValueError(
                        "role_historiesは配列形式で指定してください。"
                    )

                roles: List[Dict[str, Any]] = []

                for raw_role in raw_roles:
                    if not isinstance(raw_role, dict):
                        continue

                    normalized_role = normalize_role(
                        raw_role,
                        fallback_start_period=work_start_period,
                        fallback_end_period=work_end_period,
                    )

                    if (
                        normalized_role.get("id") is not None
                        or has_role_content(normalized_role)
                    ):
                        roles.append(normalized_role)

            else:
                # 現行画面から送られる旧形式を1件の役割へ変換
                legacy_role = build_legacy_role(
                    experience,
                    work_start_period,
                    work_end_period,
                )

                roles = (
                    [legacy_role]
                    if has_role_content(legacy_role)
                    else []
                )

            has_company_content = any(
                [
                    has_value(company_name),
                    has_value(industry),
                    has_value(work_start_period),
                    has_value(work_end_period),
                    bool(roles),
                ]
            )

            if not has_company_content:
                continue

            # ---------------------------------------------
            # 3-1. 会社情報を保存
            # ---------------------------------------------
            primary_role = roles[0] if roles else {}

            # 移行期間中の旧カラム同期用
            legacy_position = primary_role.get("position")
            legacy_job_category = primary_role.get(
                "job_category"
            )
            legacy_job_sub_category = primary_role.get(
                "job_sub_category"
            )
            legacy_salary = primary_role.get("salary_range")
            legacy_satisfaction = primary_role.get(
                "satisfaction_level"
            )

            if experience_id is not None:
                cursor.execute(
                    """
                    UPDATE job_experiences
                    SET
                        company_name = %s,
                        industry = %s,
                        position = %s,
                        work_start_period = %s,
                        work_end_period = %s,
                        salary = %s,
                        satisfaction_level = %s,
                        job_category = %s,
                        job_sub_category = %s,
                        is_private = %s
                    WHERE id = %s
                      AND user_id = %s
                    """,
                    (
                        company_name,
                        industry,
                        legacy_position,
                        work_start_period,
                        work_end_period,
                        legacy_salary,
                        legacy_satisfaction,
                        legacy_job_category,
                        legacy_job_sub_category,
                        is_private,
                        experience_id,
                        current_user.id,
                    ),
                )

                if cursor.rowcount == 0:
                    cursor.execute(
                        """
                        SELECT id
                        FROM job_experiences
                        WHERE id = %s
                          AND user_id = %s
                        """,
                        (
                            experience_id,
                            current_user.id,
                        ),
                    )

                    if cursor.fetchone() is None:
                        raise ValueError(
                            "更新対象の職歴が見つかりません。"
                        )

                job_experience_id = experience_id

            else:
                if not has_value(company_name):
                    raise ValueError(
                        "新しい職歴には会社名が必要です。"
                    )

                cursor.execute(
                    """
                    INSERT INTO job_experiences (
                        user_id,
                        company_name,
                        industry,
                        position,
                        work_start_period,
                        work_end_period,
                        salary,
                        satisfaction_level,
                        job_category,
                        job_sub_category,
                        is_private
                    )
                    VALUES (
                        %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s
                    )
                    """,
                    (
                        current_user.id,
                        company_name,
                        industry,
                        legacy_position,
                        work_start_period,
                        work_end_period,
                        legacy_salary,
                        legacy_satisfaction,
                        legacy_job_category,
                        legacy_job_sub_category,
                        is_private,
                    ),
                )

                job_experience_id = cursor.lastrowid

            # ---------------------------------------------
            # 3-2. 役割履歴を保存
            # ---------------------------------------------
            if raw_roles is None:
                # 旧画面の場合は、従来どおり最初の役割を更新する
                if roles:
                    role = roles[0]

                    cursor.execute(
                        """
                        SELECT id
                        FROM role_histories
                        WHERE job_experience_id = %s
                        ORDER BY
                            display_order ASC,
                            start_period ASC,
                            id ASC
                        LIMIT 1
                        """,
                        (job_experience_id,),
                    )

                    existing_role = cursor.fetchone()

                    if existing_role:
                        role_history_id = existing_role[0]

                        cursor.execute(
                            """
                            UPDATE role_histories
                            SET
                                department = %s,
                                position = %s,
                                job_category = %s,
                                job_sub_category = %s,
                                role_description = %s,
                                start_period = %s,
                                end_period = %s,
                                salary_range = %s,
                                satisfaction_level = %s,
                                work_style = %s,
                                display_order = %s,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = %s
                              AND job_experience_id = %s
                            """,
                            (
                                role.get("department"),
                                role.get("position"),
                                role.get("job_category"),
                                role.get("job_sub_category"),
                                role.get("role_description"),
                                role.get("start_period"),
                                role.get("end_period"),
                                role.get("salary_range"),
                                role.get("satisfaction_level"),
                                role.get("work_style"),
                                role.get("display_order"),
                                role_history_id,
                                job_experience_id,
                            ),
                        )

                    else:
                        cursor.execute(
                            """
                            INSERT INTO role_histories (
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
                                migration_source
                            )
                            VALUES (
                                %s, %s, %s, %s, %s, %s,
                                %s, %s, %s, %s, %s, %s, NULL
                            )
                            """,
                            (
                                job_experience_id,
                                role.get("department"),
                                role.get("position"),
                                role.get("job_category"),
                                role.get("job_sub_category"),
                                role.get("role_description"),
                                role.get("start_period"),
                                role.get("end_period"),
                                role.get("salary_range"),
                                role.get("satisfaction_level"),
                                role.get("work_style"),
                                role.get("display_order"),
                            ),
                        )

            else:
                # 新形式の場合は、role_histories配列を順番に保存
                for role_index, role in enumerate(
                    roles,
                    start=1,
                ):
                    role_history_id = role.get("id")
                    display_order = (
                        role.get("display_order")
                        or role_index
                    )

                    if role_history_id is not None:
                        # 他ユーザー・他会社の役割を更新しないよう、
                        # job_experience_idもWHERE条件へ含める
                        cursor.execute(
                            """
                            UPDATE role_histories
                            SET
                                department = %s,
                                position = %s,
                                job_category = %s,
                                job_sub_category = %s,
                                role_description = %s,
                                start_period = %s,
                                end_period = %s,
                                salary_range = %s,
                                satisfaction_level = %s,
                                work_style = %s,
                                display_order = %s,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = %s
                              AND job_experience_id = %s
                            """,
                            (
                                role.get("department"),
                                role.get("position"),
                                role.get("job_category"),
                                role.get("job_sub_category"),
                                role.get("role_description"),
                                role.get("start_period"),
                                role.get("end_period"),
                                role.get("salary_range"),
                                role.get("satisfaction_level"),
                                role.get("work_style"),
                                display_order,
                                role_history_id,
                                job_experience_id,
                            ),
                        )

                        if cursor.rowcount == 0:
                            cursor.execute(
                                """
                                SELECT id
                                FROM role_histories
                                WHERE id = %s
                                  AND job_experience_id = %s
                                """,
                                (
                                    role_history_id,
                                    job_experience_id,
                                ),
                            )

                            if cursor.fetchone() is None:
                                raise ValueError(
                                    "更新対象の役割履歴が"
                                    "見つかりません。"
                                )

                    else:
                        if not has_role_content(role):
                            continue

                        cursor.execute(
                            """
                            INSERT INTO role_histories (
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
                                migration_source
                            )
                            VALUES (
                                %s, %s, %s, %s, %s, %s,
                                %s, %s, %s, %s, %s, %s, NULL
                            )
                            """,
                            (
                                job_experience_id,
                                role.get("department"),
                                role.get("position"),
                                role.get("job_category"),
                                role.get("job_sub_category"),
                                role.get("role_description"),
                                role.get("start_period"),
                                role.get("end_period"),
                                role.get("salary_range"),
                                role.get("satisfaction_level"),
                                role.get("work_style"),
                                display_order,
                            ),
                        )

                # この段階では、画面から消えた役割の物理削除はしない。
                # 削除処理はUI実装時に別途、明示的に追加する。

        # =========================================================
        # 4. 現在のキャリア観・今後
        # =========================================================
        current_career_view = normalize_optional_value(
            data.get("career_satisfaction_feedback")
        )
        future_goals = normalize_optional_value(
            data.get("career_description")
        )
        desired_direction = normalize_optional_value(
            data.get("career_type")
        )

        has_current_career_view_content = any(
            [
                has_value(current_career_view),
                has_value(future_goals),
                has_value(desired_direction),
            ]
        )

        if has_current_career_view_content:
            cursor.execute(
                """
                INSERT INTO current_career_views (
                    user_id,
                    current_career_view,
                    future_goals,
                    desired_direction,
                    status,
                    needs_review
                )
                VALUES (
                    %s, %s, %s, %s, 'draft', 0
                )
                ON DUPLICATE KEY UPDATE
                    current_career_view =
                        VALUES(current_career_view),
                    future_goals =
                        VALUES(future_goals),
                    desired_direction =
                        VALUES(desired_direction),
                    status = 'draft',
                    needs_review = 0,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (
                    current_user.id,
                    current_career_view,
                    future_goals,
                    desired_direction,
                ),
            )

        # =========================================================
        # 5. キャリアのスタート地点
        # =========================================================
        start_point_id = data.get("start_point_id")
        start_reason = normalize_optional_value(
            data.get("start_reason")
        )
        first_job_feedback = normalize_optional_value(
            data.get("first_job_feedback")
        )

        has_start_point_content = any(
            [
                has_value(start_reason),
                has_value(first_job_feedback),
            ]
        )

        if has_value(start_point_id):
            cursor.execute(
                """
                UPDATE career_start_point
                SET
                    start_reason = %s,
                    first_job_feedback = %s
                WHERE start_point_id = %s
                  AND user_id = %s
                """,
                (
                    start_reason,
                    first_job_feedback,
                    start_point_id,
                    current_user.id,
                ),
            )

        elif has_start_point_content:
            cursor.execute(
                """
                INSERT INTO career_start_point (
                    user_id,
                    start_reason,
                    first_job_feedback
                )
                VALUES (%s, %s, %s)
                """,
                (
                    current_user.id,
                    start_reason,
                    first_job_feedback,
                ),
            )

        # =========================================================
        # 6. Career GPSの意思決定
        # =========================================================
        decision_id = data.get("transition_id")

        decision_type = normalize_optional_value(
            data.get("transition_type")
        )
        trigger_text = normalize_optional_value(
            data.get("transition_story")
        )
        final_reason = normalize_optional_value(
            data.get("reason_for_job_change")
        )
        result_text = normalize_optional_value(
            data.get("job_experience_feedback")
        )

        has_decision_content = any(
            [
                has_value(decision_type),
                has_value(trigger_text),
                has_value(final_reason),
                has_value(result_text),
            ]
        )

        if has_decision_content:
            normalized_decision_type = (
                decision_type or "その他"
            )

            if has_value(decision_id):
                cursor.execute(
                    """
                    UPDATE career_decisions
                    SET
                        decision_type = %s,
                        trigger_text = %s,
                        final_reason = %s,
                        result_text = %s,
                        status = 'draft',
                        needs_review = 0,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                      AND user_id = %s
                    """,
                    (
                        normalized_decision_type,
                        trigger_text,
                        final_reason,
                        result_text,
                        decision_id,
                        current_user.id,
                    ),
                )

                if cursor.rowcount == 0:
                    cursor.execute(
                        """
                        SELECT id
                        FROM career_decisions
                        WHERE id = %s
                          AND user_id = %s
                        """,
                        (
                            decision_id,
                            current_user.id,
                        ),
                    )

                    if cursor.fetchone() is None:
                        cursor.execute(
                            """
                            INSERT INTO career_decisions (
                                user_id,
                                decision_type,
                                trigger_text,
                                final_reason,
                                result_text,
                                status,
                                needs_review,
                                display_order
                            )
                            VALUES (
                                %s, %s, %s, %s, %s,
                                'draft', 0, 1
                            )
                            """,
                            (
                                current_user.id,
                                normalized_decision_type,
                                trigger_text,
                                final_reason,
                                result_text,
                            ),
                        )

            else:
                cursor.execute(
                    """
                    INSERT INTO career_decisions (
                        user_id,
                        decision_type,
                        trigger_text,
                        final_reason,
                        result_text,
                        status,
                        needs_review,
                        display_order
                    )
                    VALUES (
                        %s, %s, %s, %s, %s,
                        'draft', 0, 1
                    )
                    """,
                    (
                        current_user.id,
                        normalized_decision_type,
                        trigger_text,
                        final_reason,
                        result_text,
                    ),
                )

        # =========================================================
        # 7. 旧達成・失敗経験
        # =========================================================
        achievement_id = data.get("achievement_id")

        proudest_achievement = normalize_optional_value(
            data.get("proudest_achievement")
        )
        failure_experience = normalize_optional_value(
            data.get("failure_experience")
        )
        lesson_learned = normalize_optional_value(
            data.get("lesson_learned")
        )
        concerns = normalize_optional_value(
            data.get("concerns")
        )

        has_achievement_content = any(
            [
                has_value(proudest_achievement),
                has_value(failure_experience),
                has_value(lesson_learned),
                has_value(concerns),
            ]
        )

        if has_value(achievement_id):
            cursor.execute(
                """
                UPDATE career_achievements
                SET
                    proudest_achievement = %s,
                    failure_experience = %s,
                    lesson_learned = %s,
                    concerns = %s
                WHERE achievement_id = %s
                  AND user_id = %s
                """,
                (
                    proudest_achievement,
                    failure_experience,
                    lesson_learned,
                    concerns,
                    achievement_id,
                    current_user.id,
                ),
            )

        elif has_achievement_content:
            cursor.execute(
                """
                INSERT INTO career_achievements (
                    user_id,
                    proudest_achievement,
                    failure_experience,
                    lesson_learned,
                    concerns
                )
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    current_user.id,
                    proudest_achievement,
                    failure_experience,
                    lesson_learned,
                    concerns,
                ),
            )

        # =========================================================
        # 8. 旧学び・成長
        # =========================================================
        growth_id = data.get("growth_id")

        skill = normalize_optional_value(
            data.get("skill")
        )
        growth_description = normalize_optional_value(
            data.get("growth_description")
        )

        has_growth_content = any(
            [
                has_value(skill),
                has_value(growth_description),
            ]
        )

        if has_value(growth_id):
            cursor.execute(
                """
                UPDATE learning_and_growth
                SET
                    skill = %s,
                    description = %s
                WHERE growth_id = %s
                  AND user_id = %s
                """,
                (
                    skill,
                    growth_description,
                    growth_id,
                    current_user.id,
                ),
            )

        elif has_growth_content:
            cursor.execute(
                """
                INSERT INTO learning_and_growth (
                    user_id,
                    skill,
                    description
                )
                VALUES (%s, %s, %s)
                """,
                (
                    current_user.id,
                    skill,
                    growth_description,
                ),
            )

        # =========================================================
        # 9. コミット
        # =========================================================
        db.commit()

        return JSONResponse(
            content={
                "message": "プロフィールが更新されました"
            },
            status_code=200,
        )

    except ValueError as exc:
        db.rollback()

        logger.warning(
            "プロフィール更新内容に不正な値があります。"
            "user_id=%s, detail=%s",
            current_user.id,
            str(exc),
        )

        return JSONResponse(
            content={
                "message": "入力内容を確認してください。",
                "detail": str(exc),
            },
            status_code=400,
        )

    except Exception as exc:
        db.rollback()

        logger.exception(
            "プロフィール更新中にエラーが発生しました。"
            "user_id=%s",
            current_user.id,
        )

        return JSONResponse(
            content={
                "message": "プロフィールの更新に失敗しました。",
                "detail": str(exc),
            },
            status_code=500,
        )

    finally:
        cursor.close()
        db.close()