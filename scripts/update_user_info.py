from fastapi import APIRouter, Depends, Body
from fastapi.responses import JSONResponse
from typing import Dict
from .register_user import get_db_connection
from .auth import get_current_user, User

router = APIRouter()

@router.post("/update-user-info/")
async def update_user_info(
    data: Dict = Body(...),  
    current_user: User = Depends(get_current_user)
):
    db = get_db_connection()
    cursor = db.cursor()

    # ユーザー基本情報の更新
    cursor.execute("""
        UPDATE users SET 
            username = %s, email = %s, family_name = %s, given_name = %s, birthdate = %s, gender = %s, newsletter_subscription = %s
        WHERE id = %s
    """, (data['username'], data['email'], data['family_name'], data['given_name'],
          data.get('birthdate'), data.get('gender'), data.get('newsletter_subscription'), current_user.id))

    # 学歴情報の処理
    education_id = data.get('education_id')
    if education_id is not None and education_id != '':
        cursor.execute("""
            UPDATE education SET 
                institution = %s, degree = %s, major = %s, education_start = %s, education_end = %s, hide_institution = %s
            WHERE education_id = %s AND user_id = %s
        """, (data.get('institution'), data.get('degree'), data.get('major'), 
              data.get('education_start'), data.get('education_end'), 
              data.get('hide_institution', False),
              data['education_id'], current_user.id))
    else:  # IDが存在しなければ新規追加
        cursor.execute("""
            INSERT INTO education (user_id, institution, degree, major, education_start, education_end, hide_institution)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (current_user.id, data.get('institution'), data.get('degree'), data.get('major'), 
              data.get('education_start'), data.get('education_end'), data.get('hide_institution', False)))

    # 職歴情報の処理
    for experience in data['job_experiences']:
        experience_id = experience.get('id')
        if experience_id is not None and experience_id != '':
            cursor.execute("""
                UPDATE job_experiences SET 
                    company_name = %s, industry = %s, position = %s, work_start_period = %s, work_end_period = %s,
                    salary = %s, satisfaction_level = %s, job_category = %s, job_sub_category = %s, is_private = %s
                WHERE id = %s AND user_id = %s
            """, (experience['company_name'], experience['industry'], experience['position'], 
                  experience['work_start_period'], experience['work_end_period'],
                  experience['salary'], experience['satisfaction_level'],
                  experience['job_category'], experience['job_sub_category'],
                  experience.get('is_private', False), 
                  experience['id'], current_user.id))
        else:  # IDが存在しなければ新規追加
            cursor.execute("""
                INSERT INTO job_experiences (user_id, company_name, industry, position, work_start_period, work_end_period, 
                                            salary, satisfaction_level, job_category, job_sub_category, is_private)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (current_user.id, experience['company_name'], experience['industry'], experience['position'], 
                  experience['work_start_period'], experience['work_end_period'],  
                  experience['salary'], experience['satisfaction_level'], 
                  experience['job_category'], experience['job_sub_category'], experience.get('is_private', False)))

    # キャリア志向と成長の処理
    if 'career_aspirations_id' in data and data['career_aspirations_id']:  # IDが存在すれば更新
        cursor.execute("""
            UPDATE career_aspirations SET 
                type = %s, description = %s, career_satisfaction_feedback = %s
            WHERE career_aspirations_id = %s AND user_id = %s
        """, (data.get('career_type'), data.get('career_description'), 
              data.get('career_satisfaction_feedback'), data['career_aspirations_id'], current_user.id))
    else:  # IDが存在しなければ新規追加
        cursor.execute("""
            INSERT INTO career_aspirations (user_id, type, description, career_satisfaction_feedback)
            VALUES (%s, %s, %s, %s)
        """, (current_user.id, data.get('career_type'), data.get('career_description'), data.get('career_satisfaction_feedback')))
    
    # キャリアのスタート地点の処理
    if 'start_point_id' in data and data['start_point_id']:  # IDが存在すれば更新
        cursor.execute("""
            UPDATE career_start_point SET 
                start_reason = %s, first_job_feedback = %s
            WHERE start_point_id = %s AND user_id = %s
        """, (data.get('start_reason'), data.get('first_job_feedback'), data['start_point_id'], current_user.id))
    else:  # IDが存在しなければ新規追加
        cursor.execute("""
            INSERT INTO career_start_point (user_id, start_reason, first_job_feedback)
            VALUES (%s, %s, %s)
        """, (current_user.id, data.get('start_reason'), data.get('first_job_feedback')))

    # キャリアの転機の処理
    if 'transition_id' in data and data['transition_id']:  # IDが存在すれば更新
        cursor.execute("""
            UPDATE career_transitions SET 
                transition_type = %s, transition_story = %s, reason_for_job_change = %s, job_experience_feedback = %s
            WHERE transition_id = %s AND user_id = %s
        """, (data.get('transition_type'), data.get('transition_story'), 
              data.get('reason_for_job_change'), data.get('job_experience_feedback'), 
              data['transition_id'], current_user.id))
    else:  # IDが存在しなければ新規追加
        cursor.execute("""
            INSERT INTO career_transitions (user_id, transition_type, transition_story, reason_for_job_change, job_experience_feedback)
            VALUES (%s, %s, %s, %s, %s)
        """, (current_user.id, data.get('transition_type'), data.get('transition_story'), 
              data.get('reason_for_job_change'), data.get('job_experience_feedback')))

    # キャリアの達成と失敗経験の処理
    if 'achievement_id' in data and data['achievement_id']:  # IDが存在すれば更新
        cursor.execute("""
            UPDATE career_achievements SET 
                proudest_achievement = %s, failure_experience = %s, lesson_learned = %s
            WHERE achievement_id = %s AND user_id = %s
        """, (data.get('proudest_achievement'), data.get('failure_experience'), 
              data.get('lesson_learned'), data['achievement_id'], current_user.id))
    else:  # IDが存在しなければ新規追加
        cursor.execute("""
            INSERT INTO career_achievements (user_id, proudest_achievement, failure_experience, lesson_learned)
            VALUES (%s, %s, %s, %s)
        """, (current_user.id, data.get('proudest_achievement'), data.get('failure_experience'), data.get('lesson_learned')))

    # 学びと成長情報の処理
    if 'growth_id' in data and data['growth_id']:  # IDが存在すれば更新
        cursor.execute("""
            UPDATE learning_and_growth SET 
                skill = %s, description = %s
            WHERE growth_id = %s AND user_id = %s
        """, (data.get('skill'), data.get('growth_description'), 
              data['growth_id'], current_user.id))
    else:  # IDが存在しなければ新規追加
        cursor.execute("""
            INSERT INTO learning_and_growth (user_id, skill, description)
            VALUES (%s, %s, %s)
        """, (current_user.id, data.get('skill'), data.get('growth_description')))

    db.commit()
    cursor.close()

    return JSONResponse(content={"message": "プロフィールが更新されました"}, status_code=200)