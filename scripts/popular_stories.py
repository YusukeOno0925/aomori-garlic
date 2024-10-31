from fastapi import APIRouter, HTTPException
from .register_user import get_db_connection
from fastapi.responses import JSONResponse

router = APIRouter()

# 人気のキャリアストーリーを取得するエンドポイント
@router.get("/popular-career-stories/")
async def get_popular_career_stories():
    db = get_db_connection()
    try:
        query = """
        SELECT u.id, u.username, u.birthdate, e.institution, e.education_start, e.hide_institution,
               j.company_name, j.industry, j.job_category, j.salary, j.work_start_period, j.is_private,
               IFNULL(pv.view_count, 0) AS view_count  -- 閲覧回数を取得
        FROM users u
        LEFT JOIN education e ON u.id = e.user_id
        LEFT JOIN job_experiences j ON u.id = j.user_id
        LEFT JOIN profile_views pv ON u.id = pv.user_id  -- 閲覧回数を結合
        WHERE u.id IN (
            SELECT user_id FROM (
                SELECT u.id AS user_id, IFNULL(pv.view_count, 0) AS view_count
                FROM users u
                LEFT JOIN profile_views pv ON u.id = pv.user_id
                GROUP BY u.id  -- ユーザーごとにグループ化
                ORDER BY view_count DESC  -- 閲覧回数で並べ替え
                LIMIT 3  -- 人気のキャリアを持つ3ユーザーを取得
            ) AS popular_users
        )
        ORDER BY view_count DESC, j.work_start_period ASC -- 閲覧回数順に並べ、各ユーザーのキャリアは時系列で取得
        """
        cursor = db.cursor(dictionary=True)
        cursor.execute(query)
        popular_careers = cursor.fetchall()

        # ユーザーごとのキャリアをグループ化して返す
        career_dict = {}
        for row in popular_careers:
            if row['id'] not in career_dict:
                career_dict[row['id']] = {
                    "id": row['id'],
                    "name": row['username'],
                    "birthYear": row['birthdate'].year if row['birthdate'] else '不明',
                    "profession": row['job_category'] or '不明',
                    "income": [],
                    "careerStages": [],
                    "companies": [],
                    "view_count": row['view_count']
                }

                # 学歴情報の公開設定を確認
                institution_name = row['institution'] if row['hide_institution'] == 0 else '非公開'
                career_dict[row['id']]['careerStages'].append({
                    "year": row['education_start'].year if row['education_start'] else '不明',
                    "stage": f"{institution_name} 入学"
                })

            # キャリアステージを追加（職歴が存在する場合のみ）
            if row['company_name']:  # 会社名がある場合のみ
                company_name = row['company_name'] if row['is_private'] == 0 else '非公開'
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
        print(f"Error fetching popular career stories: {e}")
        raise HTTPException(status_code=500, detail="Database query failed")
    finally:
        cursor.close()
        db.close()