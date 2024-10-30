# ユーザーがログインしている状態で、そのユーザーの情報を取得するAPIエンドポイント

import logging
from fastapi import APIRouter, Depends, HTTPException
from .register_user import get_db_connection
from .auth import get_current_user, User

# ロギングの設定
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/user-info/")
async def get_user_info(current_user: User = Depends(get_current_user)):
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    try:    
        # ユーザー基本情報の取得
        cursor.execute("""
            SELECT username, email, family_name, given_name, birthdate, gender, newsletter_subscription
            FROM users 
            WHERE id = %s
        """, (current_user.id,))
        user_info = cursor.fetchone()

        # 学歴情報の取得
        cursor.execute("""
            SELECT education_id, institution, degree, major, education_start, education_end, hide_institution
            FROM education 
            WHERE user_id = %s
        """, (current_user.id,))
        education_info = cursor.fetchone()
        if education_info:
            user_info.update(education_info)

        # クエリの結果を消費してから次のクエリを実行
        cursor.fetchall()

        # 職歴情報の取得
        cursor.execute("""
            SELECT id, company_name, industry, position, work_start_period, work_end_period,
                    salary, job_category, job_sub_category, satisfaction_level, is_private
            FROM job_experiences 
            WHERE user_id = %s
        """, (current_user.id,))
        job_experiences = cursor.fetchall()  # すべての職歴を取得
        user_info["job_experiences"] = job_experiences

        # クエリの結果を消費してから次のクエリを実行
        cursor.fetchall()

        # 今後のキャリア志向情報の取得
        cursor.execute("""
            SELECT career_aspirations_id, type AS career_type, description AS career_description, career_satisfaction_feedback
            FROM career_aspirations 
            WHERE user_id = %s
        """, (current_user.id,))
        career_info = cursor.fetchone()
        if career_info:
            user_info.update(career_info)

        # クエリの結果を消費してから次のクエリを実行
        cursor.fetchall()

        # career_start_point テーブルから情報取得
        cursor.execute("""
            SELECT start_point_id, start_reason, first_job_feedback
            FROM career_start_point 
            WHERE user_id = %s
        """, (current_user.id,))
        start_point_info = cursor.fetchone()
        if start_point_info:
            user_info.update(start_point_info)
        
        # クエリの結果を消費してから次のクエリを実行
        cursor.fetchall()

        # career_transitions テーブルから情報取得
        cursor.execute("""
            SELECT transition_id, transition_type, transition_story, reason_for_job_change, job_experience_feedback
            FROM career_transitions 
            WHERE user_id = %s
        """, (current_user.id,))
        transition_info = cursor.fetchone()
        if transition_info:
            user_info.update(transition_info)
        
        # クエリの結果を消費してから次のクエリを実行
        cursor.fetchall()

        # career_achievements テーブルから情報取得
        cursor.execute("""
            SELECT achievement_id, proudest_achievement, failure_experience, lesson_learned
            FROM career_achievements 
            WHERE user_id = %s
        """, (current_user.id,))
        achievement_info = cursor.fetchone()
        if achievement_info:
            user_info.update(achievement_info)
        
        # クエリの結果を消費してから次のクエリを実行
        cursor.fetchall()

        # 学びと成長情報の取得
        cursor.execute("""
            SELECT growth_id, skill, description AS growth_description
            FROM learning_and_growth 
            WHERE user_id = %s
        """, (current_user.id,))
        growth_info = cursor.fetchone()
        if growth_info:
            user_info.update(growth_info)
        
        # クエリの結果を消費してから次のクエリを実行
        cursor.fetchall()

    
    # カーソルとデータベース接続を閉じる
    finally:
        cursor.close()
        db.close()

    return user_info