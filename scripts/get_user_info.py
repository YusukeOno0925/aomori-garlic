# ユーザーがログインしている状態で、そのユーザーの情報を取得するAPIエンドポイント

import logging
from fastapi import APIRouter, Depends, HTTPException
from .register_user import get_db_connection
from .auth import get_current_user, User

# ロギングの設定
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/user-info/")
async def get_user_info(current_user: User = Depends(get_current_user), include_private: bool = False):
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
            # 非公開チェックが必要な場合
            if not include_private and education_info['hide_institution']:
                education_info['institution'] = '非公開'
            user_info["education_id"] = education_info["education_id"]
            user_info["institution"] = education_info["institution"]
            user_info["degree"] = education_info["degree"]
            user_info["major"] = education_info["major"]
            user_info["education_start"] = education_info["education_start"]
            user_info["education_end"] = education_info["education_end"]
            user_info["hide_institution"] = education_info["hide_institution"]

        # クエリの結果を消費してから次のクエリを実行
        cursor.fetchall()

        # 職歴情報の取得
        cursor.execute("""
            SELECT id AS id, company_name, industry, position, work_start_period, work_end_period,
                    salary, job_category, job_sub_category, satisfaction_level, is_private
            FROM job_experiences 
            WHERE user_id = %s
        """, (current_user.id,))
        job_experiences = cursor.fetchall()  # すべての職歴を取得

        # 非公開フラグに基づいて表示内容を調整
        for experience in job_experiences:
            if not include_private and experience['is_private']:
                experience['company_name'] = '非公開'

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
            user_info["career_aspirations_id"] = career_info["career_aspirations_id"]
            user_info["career_type"] = career_info["career_type"]
            user_info["career_description"] = career_info["career_description"]
            user_info["career_satisfaction_feedback"] = career_info["career_satisfaction_feedback"]

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
            user_info["start_point_id"] = start_point_info["start_point_id"]
            user_info["start_reason"] = start_point_info["start_reason"]
            user_info["first_job_feedback"] = start_point_info["first_job_feedback"]
        
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
            user_info["transition_id"] = transition_info["transition_id"]
            user_info["transition_type"] = transition_info["transition_type"]
            user_info["transition_story"] = transition_info["transition_story"]
            user_info["reason_for_job_change"] = transition_info["reason_for_job_change"]
            user_info["job_experience_feedback"] = transition_info["job_experience_feedback"]
        
        # クエリの結果を消費してから次のクエリを実行
        cursor.fetchall()

        # career_achievements テーブルから情報取得
        cursor.execute("""
            SELECT achievement_id, proudest_achievement, failure_experience, lesson_learned, concerns
            FROM career_achievements 
            WHERE user_id = %s
        """, (current_user.id,))
        achievement_info = cursor.fetchone()
        if achievement_info:
            user_info["achievement_id"] = achievement_info["achievement_id"]
            user_info["proudest_achievement"] = achievement_info["proudest_achievement"]
            user_info["failure_experience"] = achievement_info["failure_experience"]
            user_info["lesson_learned"] = achievement_info["lesson_learned"]
            user_info["concerns"] = achievement_info["concerns"]
        
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
            user_info["growth_id"] = growth_info["growth_id"]
            user_info["skill"] = growth_info["skill"]
            user_info["growth_description"] = growth_info["growth_description"]
        
        # クエリの結果を消費してから次のクエリを実行
        cursor.fetchall()

    
    # カーソルとデータベース接続を閉じる
    finally:
        cursor.close()
        db.close()

    return user_info