from fastapi import APIRouter, HTTPException
from .register_user import get_db_connection
from fastapi.responses import JSONResponse

router = APIRouter()

# キャリア概要ページのエンドポイント
@router.get("/career-overview/")
async def get_career_overview():
    db = get_db_connection()
    try:
        query = """
        SELECT u.id, u.username, u.birthdate, e.institution, e.education_start,
               j.company_name, j.industry, j.job_category, j.salary, j.work_start_period,
               IFNULL(pv.view_count, 0) AS view_count  -- 閲覧回数を取得
        FROM users u
        LEFT JOIN education e ON u.id = e.user_id
        LEFT JOIN job_experiences j ON u.id = j.user_id
        LEFT JOIN profile_views pv ON u.id = pv.user_id  -- 閲覧回数を結合
        """
        cursor = db.cursor(dictionary=True)
        cursor.execute(query)
        result = cursor.fetchall()

        # クエリ結果をログに出力
        print("取得したクエリ結果:", result)

        careers = []
        career_dict = {}

        for row in result:
            if row['id'] not in career_dict:
                career_dict[row['id']] = {
                    "id": row['id'],
                    "name": row['username'],
                    "birthYear": row['birthdate'].year if row['birthdate'] else '不明',
                    # 初期値を設定しないようにして、最後の職業情報で上書き
                    "profession": None,  
                    "income": [],
                    "careerStages": [],
                    "companies": [],
                    "view_count": row['view_count']  # 閲覧回数を追加
                }
                # 最初に大学の入学情報を追加
                if row['institution']:
                    education_start_year = row['education_start'].year if row['education_start'] else "不明"
                    career_dict[row['id']]['careerStages'].append({
                        "year": education_start_year, 
                        "stage": f"{row['institution']} 入学"
                    })

            # 最新の職業情報として上書き
            career_dict[row['id']]['profession'] = row['job_category'] or '不明'
            career_dict[row['id']]['income'] = [{"income": row['salary'] or '不明'}]

            # 各会社の入社情報を追加する際、会社名が存在する場合のみ追加する
            if row['company_name']:
                career_dict[row['id']]['careerStages'].append({
                    "year": row['work_start_period'].year if row['work_start_period'] else "不明",
                    "stage": f"{row['company_name']} 入社"
                })
                career_dict[row['id']]['companies'].append({
                    "name": row['company_name'],
                    "industry": row['industry'],
                    "startYear": row['work_start_period'].year if row['work_start_period'] else "不明"
                })
        
        careers = list(career_dict.values())
        
        return JSONResponse(content={"careers": careers})
    except Exception as e:
        print(f"Error fetching career data: {e}")
        raise HTTPException(status_code=500, detail="Database query failed")
    finally:
        db.close()