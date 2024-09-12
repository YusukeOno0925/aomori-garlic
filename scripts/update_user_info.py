# ユーザーがプロフィールを更新できるようにするAPIエンドポイント

from fastapi import APIRouter, Depends, Form
from fastapi.responses import JSONResponse
from .register_user import get_db_connection
from .auth import get_current_user, User

router = APIRouter()

@router.post("/update-user-info/")
async def update_user_info(
    username: str = Form(...), 
    email: str = Form(...), 
    profile: str = Form(None),
    birthdate: str = Form(None),
    education: str = Form(None), 
    career_step: str = Form(None),
    career_challenges: str = Form(None),
    career_approach: str = Form(None),
    company_name: str = Form(None),
    industry: str = Form(None),
    position: str = Form(None),
    job_type: str = Form(None),
    work_period: str = Form(None),
    success_experience: str = Form(None),
    failure_experience: str = Form(None),
    reflection: str = Form(None),
    current_user: User = Depends(get_current_user)
):
    db = get_db_connection()
    cursor = db.cursor()

    # ユーザー基本情報の更新
    cursor.execute("""
        UPDATE users SET 
            username = %s, email = %s, profile = %s, birthdate = %s, education = %s, career_step = %s, career_challenges = %s, career_approach = %s
        WHERE id = %s
    """, (username, email, profile, birthdate, education, career_step, career_challenges, career_approach, current_user.id))

    # 職歴情報の更新
    cursor.execute("""
        UPDATE job_experiences SET 
            company_name = %s, industry = %s, position = %s, job_type = %s, work_period = %s, 
            success_experience = %s, failure_experience = %s, reflection = %s 
        WHERE user_id = %s
    """, (company_name, industry, position, job_type, work_period, success_experience, failure_experience, reflection, current_user.id))

    db.commit()
    cursor.close()
    
    return JSONResponse(content={"message": "プロフィールが更新されました"}, status_code=200)