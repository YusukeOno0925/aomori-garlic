from fastapi import APIRouter, Depends, Body
from fastapi.responses import JSONResponse
from typing import Dict
from .register_user import get_db_connection
from .auth import get_current_user, User

router = APIRouter()

@router.post("/update-user-info/")
async def update_user_info(
    data: Dict = Body(...),  # JSONデータを受け取る
    current_user: User = Depends(get_current_user)
):
    db = get_db_connection()
    cursor = db.cursor()

    # ユーザー基本情報の更新
    cursor.execute("""
        UPDATE users SET 
            username = %s, email = %s, profile = %s, birthdate = %s, education = %s, education_start = %s, education_end = %s, career_step = %s, career_challenges = %s, career_approach = %s
        WHERE id = %s
    """, (data['username'], data['email'], data.get('profile'), data.get('birthdate'), 
          data.get('education'), data.get('education_start'), data.get('education_end'), 
          data.get('career_step'), data.get('career_challenges'), 
          data.get('career_approach'), current_user.id))
    
    # 空文字列を None に変換するヘルパー関数
    def to_null_if_empty(value):
        return None if value == '' else value

    # 職歴情報の処理
    for experience in data['job_experiences']:
        if experience.get('id'):  # 更新の場合
            cursor.execute("""
                UPDATE job_experiences SET 
                    company_name = %s, industry = %s, position = %s, job_type = %s, work_start_period = %s, work_end_period = %s,
                    entry_salary = %s, entry_satisfaction = %s, current_salary = %s, current_satisfaction = %s,
                    success_experience = %s, failure_experience = %s, reflection = %s
                WHERE id = %s AND user_id = %s
            """, (experience['company_name'], experience['industry'], experience['position'], experience['job_type'],
                experience['work_start_period'], 
                to_null_if_empty(experience['work_end_period']),
                to_null_if_empty(experience['entry_salary']),
                to_null_if_empty(experience['entry_satisfaction']),
                to_null_if_empty(experience['current_salary']),
                to_null_if_empty(experience['current_satisfaction']),
                experience['success_experience'], experience['failure_experience'], experience['reflection'],
                experience['id'], current_user.id))
        else:  # 新規追加の場合
            cursor.execute("""
                INSERT INTO job_experiences (user_id, company_name, industry, position, job_type, work_start_period, work_end_period,
                                            entry_salary, entry_satisfaction, current_salary, current_satisfaction, 
                                            success_experience, failure_experience, reflection)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (current_user.id, experience['company_name'], experience['industry'], experience['position'], 
                experience['job_type'], experience['work_start_period'], 
                to_null_if_empty(experience['work_end_period']),  # 空値を None に変換
                to_null_if_empty(experience['entry_salary']),
                to_null_if_empty(experience['entry_satisfaction']), 
                to_null_if_empty(experience['current_salary']), 
                to_null_if_empty(experience['current_satisfaction']),
                experience['success_experience'], experience['failure_experience'], experience['reflection']))

    db.commit()
    cursor.close()
    
    return JSONResponse(content={"message": "プロフィールが更新されました"}, status_code=200)