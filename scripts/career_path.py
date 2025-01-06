from fastapi import APIRouter, HTTPException, Query
from .register_user import get_db_connection
from fastapi.responses import JSONResponse

router = APIRouter()

@router.get("/career-path-data/")
async def get_career_path_data(university: str = Query(None), industry: str = Query(None)):
    """
    ユーザーが選択した大学や業界に基づいてキャリアパスデータを取得します。
    """
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        # 基本クエリ
        query = """
            SELECT 
                u.id AS user_id, 
                u.username, 
                u.birthdate, 
                e.institution, 
                e.education_start, 
                e.hide_institution,
                j.company_name, 
                j.industry, 
                j.job_category, 
                j.salary, 
                j.work_start_period, 
                j.work_end_period, 
                j.is_private
            FROM users u
            LEFT JOIN education e ON u.id = e.user_id
            LEFT JOIN job_experiences j ON u.id = j.user_id
            WHERE 1=1
        """
        params = []
        
        # フィルタリング条件の追加
        if university and university != "any":
            query += " AND e.institution = %s"
            params.append(university)
        if industry:
            query += " AND j.industry = %s"
            params.append(industry)
        
        query += " ORDER BY u.id, j.work_start_period;"
        
        cursor.execute(query, tuple(params))
        result = cursor.fetchall()

        career_dict = {}

        for row in result:
            user_id = row['user_id']
            if user_id not in career_dict:
                # 大学公開設定
                institution_name = row['institution'] if row['hide_institution'] == 0 else '非公開'

                career_dict[user_id] = {
                    "id": user_id,
                    "name": row['username'],
                    "birthYear": row['birthdate'].year if row['birthdate'] else None,
                    "education": institution_name or '不明',
                    "companies": []
                }

            # 職歴情報を追加
            if row['company_name']:
                company_name = row['company_name'] if row['is_private'] == 0 else '非公開'
                career_dict[user_id]['companies'].append({
                    "company_name": company_name,
                    "industry": row['industry'] or '不明',
                    "position": row['job_category'] or '不明',
                    "start_year": row['work_start_period'].year if row['work_start_period'] else None,
                    "end_year": row['work_end_period'].year if row['work_end_period'] else None,
                    "salary": row['salary'] if 'salary' in row else None  # 年収情報を追加
                })

        careers = list(career_dict.values())
        
        # ユニークな大学と業界のリストを取得
        query_universities = """
            SELECT DISTINCT institution
            FROM education
            WHERE hide_institution = 0
            ORDER BY institution ASC;
        """
        cursor.execute(query_universities)
        universities_rows = cursor.fetchall()
        universities = [row["institution"] for row in universities_rows]
        
        query_industries = """
            SELECT DISTINCT industry
            FROM job_experiences
            WHERE industry IS NOT NULL AND industry != ''
            ORDER BY industry ASC;
        """
        cursor.execute(query_industries)
        industries_rows = cursor.fetchall()
        industries = [row["industry"] for row in industries_rows]
        
        return JSONResponse(content={
            "universities": universities,
            "industries": industries,
            "careers": careers
        })
    except Exception as e:
        print(f"Error fetching career path data: {e}")
        raise HTTPException(status_code=500, detail="データの取得に失敗しました")
    finally:
        cursor.close()
        db.close()