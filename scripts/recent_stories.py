from fastapi import APIRouter, HTTPException
from .register_user import get_db_connection
from fastapi.responses import JSONResponse

router = APIRouter()

# 最近のキャリアストーリーを取得するエンドポイント
# 最近のキャリアストーリーを取得するエンドポイント
@router.get("/recent-career-stories/")
async def get_recent_career_stories():
    db = get_db_connection()
    try:
        # 最新の3ユーザーとその職歴、学歴、閲覧回数を取得
        query = """
        SELECT 
            u.id, u.username, u.birthdate, 
            e.institution, e.education_start, e.hide_institution,
            j.company_name, j.industry, j.job_category, j.salary, j.work_start_period, j.is_private,
            IFNULL(pv.view_count, 0) AS view_count,
            ca.type AS career_type
        FROM users u
        LEFT JOIN education e ON u.id = e.user_id
        LEFT JOIN job_experiences j ON u.id = j.user_id
        LEFT JOIN profile_views pv ON u.id = pv.user_id
        LEFT JOIN career_aspirations ca ON u.id = ca.user_id
        INNER JOIN (
            SELECT id
            FROM users
            ORDER BY created_at DESC
            LIMIT 5
        ) recent ON u.id = recent.id
        ORDER BY u.created_at DESC, j.work_start_period ASC;
        """
        cursor = db.cursor(dictionary=True)
        cursor.execute(query)
        recent_careers = cursor.fetchall()

        # ユーザーごとのキャリアをグループ化して返す
        career_dict = {}
        for row in recent_careers:
            if row['id'] not in career_dict:
                # ユーザー情報を初期化
                career_dict[row['id']] = {
                    "id": row['id'],
                    "name": row['username'],
                    "birthYear": row['birthdate'].year if row['birthdate'] else '不明',
                    "profession": None,
                    "income": [],
                    "careerStages": [],
                    "companies": [],
                    "view_count": row['view_count'],
                    "career_type": row['career_type'] or None
                }

                # 学歴情報の非公開フラグを確認
                institution_name = row['institution'] if row['hide_institution'] == 0 else '非公開'
                career_dict[row['id']]['careerStages'].append({
                    "year": row['education_start'].year if row['education_start'] else '不明',
                    "stage": f"{institution_name} 入学"
                })

            # キャリアステージを追加（職歴が存在する場合のみ）
            if row['company_name']:  # 会社名がある場合のみ
                # 非公開フラグをチェックして企業名を処理
                company_name = row['company_name'] if row['is_private'] == 0 else '非公開'

                career_dict[row['id']]['profession'] = row['job_category']
                career_dict[row['id']]['income'].append({"income": row['salary'] or '不明'}) 
                career_dict[row['id']]['careerStages'].append({
                    "year": row['work_start_period'].year if row['work_start_period'] else '不明',
                    "stage": f"{company_name} 入社"
                })
                career_dict[row['id']]['companies'].append({
                    "name": company_name,
                    "industry": row['industry'] or '不明',
                    "startYear": row['work_start_period'].year if row['work_start_period'] else '不明'
                })

        # すべてのユーザーのキャリアをリスト化
        careers = list(career_dict.values())

        return JSONResponse(content={"careers": careers})
    except Exception as e:
        print(f"Error fetching recent career stories: {e}")
        raise HTTPException(status_code=500, detail="Database query failed")
    finally:
        cursor.close()
        db.close()