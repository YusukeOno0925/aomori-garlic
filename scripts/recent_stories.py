from fastapi import APIRouter, HTTPException
from .register_user import get_db_connection
from fastapi.responses import JSONResponse

router = APIRouter()

# 最近のキャリアストーリーを取得するエンドポイント
@router.get("/recent-career-stories/")
async def get_recent_career_stories():
    db = get_db_connection()
    try:
        # 最新の3ユーザーとその職歴、学歴を一度に取得
        query = """
        SELECT 
            u.id, u.username, u.birthdate, 
            e.institution, e.education_start,
            j.company_name, j.industry, j.job_category, j.salary, j.work_start_period
        FROM users u
        LEFT JOIN education e ON u.id = e.user_id
        LEFT JOIN job_experiences j ON u.id = j.user_id
        INNER JOIN (
            SELECT id
            FROM users
            ORDER BY created_at DESC
            LIMIT 3
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
                }

                # 学歴情報を最初に追加（入学年）
                if row['institution']:
                    career_dict[row['id']]['careerStages'].append({
                        "year": row['education_start'].year if row['education_start'] else '不明',
                        "stage": f"{row['institution'] or '学歴情報なし'} 入学"
                    })

            # キャリアステージを追加（職歴が存在する場合のみ）
            if row['company_name']:  # 会社名がある場合のみ
                career_dict[row['id']]['profession'] = row['job_category']
                career_dict[row['id']]['income'].append({"income": row['salary'] or '不明'}) 
                career_dict[row['id']]['careerStages'].append({
                    "year": row['work_start_period'].year if row['work_start_period'] else '不明',
                    "stage": f"{row['company_name'] or '会社情報なし'} 入社"
                })
                career_dict[row['id']]['companies'].append({
                    "name": row['company_name'],
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