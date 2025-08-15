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

        response_data = {
            "name": career_data[0]["username"],
            "age": age,
            "profession": latest_job_category_data["job_category"],
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
                    "name": (row["company_name"] if row["is_private"] == 0 else "非公開"),
                    "startYear":
                        (_normalize_date(row["work_start_period"]).year
                         if _normalize_date(row["work_start_period"]) else None),
                    "endYear": _endyear_label(row["work_end_period"]),
                    "salary": row["salary"],
                    "satisfaction_level": row["satisfaction_level"]
                }
                for row in career_data
                if _normalize_date(row["work_start_period"])
            ]
        }

        return JSONResponse(content=response_data)

    finally:
        cursor.close()
        db.close()