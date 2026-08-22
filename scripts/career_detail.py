from fastapi import APIRouter, HTTPException
from .register_user import get_db_connection
from fastapi.responses import JSONResponse
from datetime import date as _date, datetime

router = APIRouter()


# ============================================================
# Helper functions
# ============================================================

def _normalize_date(value):
    """
    DATE, datetime, string, None を date または None に変換する
    """

    if value is None or value == "" or value == "0000-00-00":
        return None

    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, _date):
        return value

    try:
        return datetime.strptime(
            str(value),
            "%Y-%m-%d"
        ).date()

    except Exception:
        return None


def _endyear_label(value):
    """
    終了日を表示用の年に変換する
    終了日がない場合は現時点を返す
    """

    date_value = _normalize_date(value)

    if date_value is None:
        return "現時点"

    return date_value.year


def _date_to_iso(value):
    """
    日付をISO形式の文字列に変換する
    """

    date_value = _normalize_date(value)

    if date_value is None:
        return None

    return date_value.isoformat()


# ============================================================
# Career Detail API
# ============================================================

@router.get("/career-detail/{career_id}")
async def get_career_detail(career_id: int):

    db = get_db_connection()
    cursor = None

    try:

        cursor = db.cursor(dictionary=True)


        # ====================================================
        # 1. UserとCareer Experienceを取得
        #
        # 最初にUserの存在確認を行う。
        #
        # Userが存在しない場合のみ404とする。
        # Userは存在するが職歴未登録の場合は、
        # Career Story未登録ユーザーとして200を返す。
        # ====================================================

        cursor.execute(
            """
            SELECT
                u.id,
                u.username,
                u.birthdate,

                c.start_reason,
                c.first_job_feedback,

                t.transition_type,
                t.transition_story,
                t.reason_for_job_change,
                t.job_experience_feedback,

                a.proudest_achievement,
                a.failure_experience,
                a.lesson_learned,
                a.concerns

            FROM users u

            LEFT JOIN career_start_point c
                ON u.id = c.user_id

            LEFT JOIN career_transitions t
                ON u.id = t.user_id

            LEFT JOIN career_achievements a
                ON u.id = a.user_id

            WHERE u.id = %s
            LIMIT 1
            """,
            (career_id,)
        )

        user_data = cursor.fetchone()


        # ====================================================
        # Userそのものが存在しない場合のみ404
        # ====================================================

        if not user_data:

            raise HTTPException(
                status_code=404,
                detail="Career not found"
            )


        # ====================================================
        # 2. Job Experienceを取得
        #
        # 職歴が0件でも404にはしない。
        # all_jobs = [] のまま後続処理を行う。
        # ====================================================

        cursor.execute(
            """
            SELECT
                j.id,
                j.user_id,
                j.company_name,
                j.position,
                j.job_category,
                j.salary,
                j.satisfaction_level,
                j.work_start_period,
                j.work_end_period,
                j.is_private
            FROM job_experiences j
            WHERE j.user_id = %s
            """,
            (career_id,)
        )

        all_jobs = cursor.fetchall()


        # ====================================================
        # 3. 最新職種を取得
        # ====================================================

        jobs_for_latest = list(all_jobs)


        jobs_for_latest.sort(
            key=lambda row: (
                _normalize_date(
                    row["work_end_period"]
                ) is None,

                _normalize_date(
                    row["work_end_period"]
                )
                or _date(9999, 12, 31),

                _normalize_date(
                    row["work_start_period"]
                )
                or _date(1, 1, 1)
            ),
            reverse=True
        )


        latest_job_category = (
            jobs_for_latest[0]["job_category"]
            if jobs_for_latest
            else None
        )


        # ====================================================
        # 4. Role Historyを取得
        #
        # 年収と満足度は会社単位ではなくRole単位で取得する。
        #
        # 職歴が0件の場合は結果も0件になるため、
        # そのまま空配列として扱う。
        # ====================================================

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

                rh.salary_range,
                rh.satisfaction_level,

                rh.display_order

            FROM role_histories rh

            INNER JOIN job_experiences je
                ON je.id = rh.job_experience_id

            WHERE je.user_id = %s

            ORDER BY
                je.work_start_period ASC,
                rh.display_order ASC,
                rh.start_period ASC,
                rh.id ASC
            """,
            (career_id,)
        )

        role_history_data = cursor.fetchall()


        # ====================================================
        # 5. Career Decisionを取得
        # ====================================================

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

                CASE
                    WHEN je.id IS NULL THEN NULL
                    WHEN je.is_private = 1 THEN '非公開'
                    ELSE je.company_name
                END AS company_name,

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
                cd.id DESC
            """,
            (career_id,)
        )

        career_decisions_data = cursor.fetchall()


        # ====================================================
        # 6. 年齢を計算
        # ====================================================

        birthdate = user_data.get("birthdate")


        if isinstance(birthdate, (datetime, _date)):

            if isinstance(birthdate, datetime):
                birthdate = birthdate.date()

            today = _date.today()

            age = (
                today.year
                - birthdate.year
                - (
                    (today.month, today.day)
                    <
                    (birthdate.month, birthdate.day)
                )
            )

        else:

            age = "N/A"


        # ====================================================
        # 7. Role Historyを会社ごとに整理
        # ====================================================

        roles_by_company = {}


        for role in role_history_data:

            job_experience_id = role[
                "job_experience_id"
            ]


            if job_experience_id not in roles_by_company:

                roles_by_company[
                    job_experience_id
                ] = []


            roles_by_company[
                job_experience_id
            ].append(
                {
                    "id":
                        role["id"],

                    "department":
                        role["department"],

                    "position":
                        role["position"],

                    "job_category":
                        role["job_category"],

                    "job_sub_category":
                        role["job_sub_category"],

                    "start_period":
                        _date_to_iso(
                            role["start_period"]
                        ),

                    "end_period":
                        _date_to_iso(
                            role["end_period"]
                        ),

                    "salary":
                        (
                            role["salary_range"]
                            if role["salary_range"] is not None
                            else "N/A"
                        ),

                    "satisfaction_level":
                        (
                            role["satisfaction_level"]
                            if role["satisfaction_level"] is not None
                            else "N/A"
                        ),

                    "display_order":
                        role["display_order"]
                }
            )


        # ====================================================
        # 8. Companyデータを作成
        #
        # work_start_period がNULLでも会社情報は捨てない。
        #
        # これにより、
        # 「会社は登録済みだが入社日が未入力」
        # というCareer Storyも保持できる。
        # ====================================================

        companies = []


        sorted_jobs = sorted(
            all_jobs,
            key=lambda row:
                _normalize_date(
                    row["work_start_period"]
                )
                or _date(1, 1, 1)
        )


        for row in sorted_jobs:

            start_date = _normalize_date(
                row["work_start_period"]
            )


            company_roles = roles_by_company.get(
                row["id"],
                []
            )


            companies.append(
                {
                    "id":
                        row["id"],

                    "name":
                        (
                            row["company_name"]
                            if row["is_private"] == 0
                            else "非公開"
                        ),

                    "position":
                        row["position"],

                    "job_category":
                        row["job_category"],

                    # 入社日未入力の場合はNoneを返す
                    "startYear":
                        (
                            start_date.year
                            if start_date
                            else None
                        ),

                    "endYear":
                        _endyear_label(
                            row["work_end_period"]
                        ),

                    # 既存データとの互換性のため
                    # 会社単位の値も残す
                    "salary":
                        (
                            row["salary"]
                            if row["salary"] is not None
                            else "N/A"
                        ),

                    "satisfaction_level":
                        (
                            row["satisfaction_level"]
                            if row["satisfaction_level"] is not None
                            else "N/A"
                        ),

                    # Career Detailではこちらを優先して利用する
                    "roles":
                        company_roles
                }
            )


        # ====================================================
        # 9. Career Decisionレスポンスを作成
        # ====================================================

        career_decisions = []


        for row in career_decisions_data:

            career_decisions.append(
                {
                    "id":
                        row["id"],

                    "job_experience_id":
                        row["job_experience_id"],

                    "role_history_id":
                        row["role_history_id"],

                    "title":
                        row["title"],

                    "decision_type":
                        row["decision_type"],

                    "occurred_at":
                        _date_to_iso(
                            row["occurred_at"]
                        ),

                    "company_name":
                        row["company_name"],

                    "department":
                        row["department"],

                    "position":
                        row["position"],

                    "trigger_text":
                        row["trigger_text"],

                    "dilemma_text":
                        row["dilemma_text"],

                    "priority_text":
                        row["priority_text"],

                    "final_reason":
                        row["final_reason"],

                    "result_text":
                        row["result_text"],

                    "unexpected_result":
                        row["unexpected_result"],

                    "learning_text":
                        row["learning_text"],

                    "same_choice_answer":
                        row["same_choice_answer"],

                    "same_choice_reason":
                        row["same_choice_reason"],

                    "advice_text":
                        row["advice_text"]
                }
            )


        # ====================================================
        # 10. Response
        #
        # 職歴がない場合：
        #
        # profession      = None
        # companies       = []
        #
        # として正常レスポンス（200）を返す。
        # ====================================================

        response_data = {

            "name":
                user_data["username"],

            "age":
                age,

            "profession":
                latest_job_category,

            "career_decisions":
                career_decisions,

            "career_experiences": {

                "start_reason":
                    user_data["start_reason"],

                "first_job_feedback":
                    user_data["first_job_feedback"],

                "transition_type":
                    user_data["transition_type"],

                "transition_story":
                    user_data["transition_story"],

                "reason_for_job_change":
                    user_data[
                        "reason_for_job_change"
                    ],

                "job_experience_feedback":
                    user_data[
                        "job_experience_feedback"
                    ],

                "proudest_achievement":
                    user_data[
                        "proudest_achievement"
                    ],

                "failure_experience":
                    user_data[
                        "failure_experience"
                    ],

                "lesson_learned":
                    user_data[
                        "lesson_learned"
                    ],

                "concerns":
                    user_data["concerns"]
            },

            "companies":
                companies
        }


        return JSONResponse(
            content=response_data
        )


    finally:

        if cursor is not None:
            cursor.close()

        db.close()