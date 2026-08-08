from fastapi import APIRouter, HTTPException
from .register_user import get_db_connection
from fastapi.responses import JSONResponse
from datetime import date as _date, datetime

router = APIRouter()

# --- helpers -------------------------------------------------
def _normalize_date(v):
    """DATE/str/None/0000-00-00 -> date or None"""
    if v is None or v == "" or v == "0000-00-00":
        return None
    if isinstance(v, (datetime, _date)):
        return v if isinstance(v, _date) else v.date()
    try:
        return datetime.strptime(str(v), "%Y-%m-%d").date()
    except Exception:
        return None

def _endyear_label(v):
    """end date -> 年 or '現時点'"""
    d = _normalize_date(v)
    return "現時点" if d is None else d.year
# -------------------------------------------------------------

@router.get("/career-detail/{career_id}")
async def get_career_detail(career_id: int):
    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)

        # 1) 最新の職種を取得（SQLでは0000-00-00に触れない）
        cursor.execute("""
            SELECT job_category, work_end_period, work_start_period
            FROM job_experiences
            WHERE user_id = %s
        """, (career_id,))
        all_jobs = cursor.fetchall()
        if not all_jobs:
            raise HTTPException(status_code=404, detail="Career not found")

        # Python側で「現職＞終了年降順＞開始年降順」にソートして先頭を採用
        all_jobs.sort(
            key=lambda r: (
                _normalize_date(r["work_end_period"]) is None,                    # 現職を最優先
                _normalize_date(r["work_end_period"]) or _date(9999, 12, 31),    # 終了年 降順
                _normalize_date(r["work_start_period"]) or _date(1, 1, 1)        # 開始年 降順
            ),
            reverse=True
        )
        latest_job_category_data = {"job_category": all_jobs[0]["job_category"]}

        # 2) 詳細データ取得（こちらもSQLでは加工しない）
        cursor.execute("""
        SELECT u.id, u.username, u.birthdate,
            j.id AS job_experience_id,
            j.company_name, j.position, j.salary, j.satisfaction_level,
            j.work_start_period, j.work_end_period, j.is_private,
            c.start_reason, c.first_job_feedback,
            t.transition_type, t.transition_story, t.reason_for_job_change, t.job_experience_feedback,
            a.proudest_achievement, a.failure_experience, a.lesson_learned, a.concerns
            FROM users u
            JOIN job_experiences j ON u.id = j.user_id
            LEFT JOIN career_start_point c ON u.id = c.user_id
            LEFT JOIN career_transitions  t ON u.id = t.user_id
            LEFT JOIN career_achievements a ON u.id = a.user_id
            WHERE u.id = %s
            ORDER BY j.work_start_period ASC
        """, (career_id,))
        career_data = cursor.fetchall()
        if not career_data:
            raise HTTPException(status_code=404, detail="Career not found")
        
        # Role履歴を取得
        cursor.execute("""
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
                je.work_start_period ASC,
                rh.display_order ASC,
                rh.start_period ASC,
                rh.id ASC
        """, (career_id,))

        role_history_data = cursor.fetchall()

        # Career Decisionを取得
        cursor.execute("""
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
        """, (career_id,))

        career_decisions_data = cursor.fetchall()

        # 年齢
        birthdate = career_data[0].get("birthdate")
        if isinstance(birthdate, (datetime, _date)):
            today = _date.today()
            age = today.year - birthdate.year - ((today.month, today.day) < (birthdate.month, birthdate.day))
        else:
            age = "N/A"

        # 表示用整形
        for row in career_data:
            if row["salary"] is None:
                row["salary"] = "N/A"
            if row["satisfaction_level"] is None:
                row["satisfaction_level"] = "N/A"
        
        roles_by_company = {}

        for role in role_history_data:
            job_experience_id = role["job_experience_id"]

            if job_experience_id not in roles_by_company:
                roles_by_company[job_experience_id] = []

            roles_by_company[job_experience_id].append({
                "id": role["id"],
                "department": role["department"],
                "position": role["position"],
                "job_category": role["job_category"],
                "job_sub_category": role["job_sub_category"],
                "start_period": (
                    _normalize_date(role["start_period"]).isoformat()
                    if _normalize_date(role["start_period"])
                    else None
                ),
                "end_period": (
                    _normalize_date(role["end_period"]).isoformat()
                    if _normalize_date(role["end_period"])
                    else None
                ),
                "display_order": role["display_order"]
                })

        response_data = {
            "name": career_data[0]["username"],
            "age": age,
            "profession": latest_job_category_data["job_category"],
            "career_decisions": [
                {
                    "id": row["id"],
                    "job_experience_id": row["job_experience_id"],
                    "role_history_id": row["role_history_id"],

                    "title": row["title"],
                    "decision_type": row["decision_type"],

                    "occurred_at": (
                        _normalize_date(row["occurred_at"]).isoformat()
                        if _normalize_date(row["occurred_at"])
                        else None
                    ),

                    "company_name": row["company_name"],
                    "department": row["department"],
                    "position": row["position"],

                    "trigger_text": row["trigger_text"],
                    "dilemma_text": row["dilemma_text"],
                    "priority_text": row["priority_text"],
                    "final_reason": row["final_reason"],

                    "result_text": row["result_text"],
                    "unexpected_result": row["unexpected_result"],
                    "learning_text": row["learning_text"],

                    "same_choice_answer": row["same_choice_answer"],
                    "same_choice_reason": row["same_choice_reason"],

                    "advice_text": row["advice_text"]
                }
                for row in career_decisions_data
            ],

            "career_experiences": {
                "start_reason": career_data[0]["start_reason"],
                "first_job_feedback": career_data[0]["first_job_feedback"],
                "transition_type": career_data[0]["transition_type"],
                "transition_story": career_data[0]["transition_story"],
                "reason_for_job_change": career_data[0]["reason_for_job_change"],
                "job_experience_feedback": career_data[0]["job_experience_feedback"],
                "proudest_achievement": career_data[0]["proudest_achievement"],
                "failure_experience": career_data[0]["failure_experience"],
                "lesson_learned": career_data[0]["lesson_learned"],
                "concerns": career_data[0]["concerns"]
            },
            "companies": [
                {
                    "id": row["job_experience_id"],

                    "name": (
                        row["company_name"]
                        if row["is_private"] == 0
                        else "非公開"
                    ),

                    "startYear": (
                        _normalize_date(
                            row["work_start_period"]
                        ).year
                        if _normalize_date(
                            row["work_start_period"]
                        )
                        else None
                    ),

                    "endYear":
                        _endyear_label(
                            row["work_end_period"]
                        ),

                    "salary": row["salary"],

                    "satisfaction_level":
                        row["satisfaction_level"],

                    "roles":
                        roles_by_company.get(
                            row["job_experience_id"],
                            []
                        )
                }
                for row in career_data
                if _normalize_date(
                    row["work_start_period"]
                )
            ]
        }

        return JSONResponse(content=response_data)

    finally:
        cursor.close()
        db.close()