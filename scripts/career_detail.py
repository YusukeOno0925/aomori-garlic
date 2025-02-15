from fastapi import APIRouter, HTTPException
from .register_user import get_db_connection
from fastapi.responses import JSONResponse
from datetime import date

router = APIRouter()


@router.get("/career-detail/{career_id}")
async def get_career_detail(career_id: int):
    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        
        # 最新の職種を取得するクエリ
        cursor.execute("""
            SELECT job_category 
            FROM job_experiences 
            WHERE user_id = %s 
            ORDER BY work_end_period IS NULL DESC, work_end_period DESC
            LIMIT 1
        """, (career_id,))
        latest_job_category_data = cursor.fetchone()

        # 全職歴データを取得するクエリ
        cursor.execute("""
            SELECT u.id, u.username, u.birthdate, j.company_name, j.position, j.salary,
                j.satisfaction_level, j.work_start_period, j.work_end_period, j.is_private,
                c.start_reason, c.first_job_feedback, t.transition_type, t.transition_story,
                t.reason_for_job_change, t.job_experience_feedback,
                a.proudest_achievement, a.failure_experience, a.lesson_learned, a.concerns
            FROM users u
            JOIN job_experiences j ON u.id = j.user_id
            LEFT JOIN career_start_point c ON u.id = c.user_id
            LEFT JOIN career_transitions t ON u.id = t.user_id
            LEFT JOIN career_achievements a ON u.id = a.user_id
            WHERE u.id = %s
            ORDER BY j.work_start_period ASC
        """, (career_id,))
        career_data = cursor.fetchall()

        # 結果がない場合のエラーハンドリング
        if not career_data or not latest_job_category_data:
            raise HTTPException(status_code=404, detail="Career not found")

        # 年齢の計算
        birthdate = career_data[0].get("birthdate")
        if birthdate:
            today = date.today()
            age = today.year - birthdate.year - ((today.month, today.day) < (birthdate.month, birthdate.day))
        else:
            age = "N/A"

        # null値を適切に処理する
        for row in career_data:
            if row['salary'] is None:
                row['salary'] = "N/A"
            if row['satisfaction_level'] is None:
                row['satisfaction_level'] = "N/A"

        response_data = {
            "name": career_data[0]["username"],
            "age": age,
            "profession": latest_job_category_data["job_category"],  # 最新の職種を使用
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
                    "name": row["company_name"] if row["is_private"] == 0 else "非公開",
                    "startYear": row["work_start_period"].year if row["work_start_period"] else None,
                    "endYear": row["work_end_period"].year if row["work_end_period"] else '現時点',
                    "salary": row["salary"],
                    "satisfaction_level": row["satisfaction_level"]
                } for row in career_data
                if row["work_start_period"]
            ]
        }

        return JSONResponse(content=response_data)

    finally:
        cursor.close()
        db.close()