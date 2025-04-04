import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from datetime import date
from .register_user import get_db_connection
from .auth import get_current_user, User

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/similar-career-stories/")
async def get_similar_users(
    target_user_id: int = Query(None),
    current_user: User = Depends(get_current_user)
):
    """
    シンプル条件一致型（OR 条件重み付け）の例。
    - もし `target_user_id` が指定されればそのユーザー基準。
    - 指定されなければ current_user.id を基準に類似ユーザーを検索する。
    """

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    # 1) 基準ユーザーの特定
    if target_user_id:
        base_user_id = target_user_id
    else:
        base_user_id = current_user.id

    try:
        # 基準ユーザーの年齢・最終職歴の業界 & 職種を取得
        cursor.execute("""
            SELECT u.id, u.birthdate,
                latest.industry AS latest_industry,
                latest.job_category AS latest_job_category
            FROM users u
            LEFT JOIN (
                SELECT j1.*
                FROM job_experiences j1
                INNER JOIN (
                    SELECT user_id, MAX(work_start_period) AS max_start
                    FROM job_experiences
                    GROUP BY user_id
                ) j2 ON j1.user_id = j2.user_id AND j1.work_start_period = j2.max_start
            ) latest ON u.id = latest.user_id
            WHERE u.id = %s
            LIMIT 1
        """, (base_user_id,))
        base_user = cursor.fetchone()
        if not base_user:
            raise HTTPException(status_code=404, detail="対象ユーザーが見つかりません")
            logger.debug(f"基準ユーザ情報: {base_user}")

        # 年齢計算
        age = None
        if base_user["birthdate"]:
            today = date.today()
            birth = base_user["birthdate"]
            age = today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))

        base_industry = base_user["latest_industry"] or ""
        base_job_category = base_user["latest_job_category"] or ""

        # `baseYear` を定義 — もし age が None の場合は 9999 を仮に設定
        baseYear = date.today().year - (age if age is not None else 9999)

        logger.debug(f"計算結果: age={age}, baseYear={baseYear}, industry='{base_industry}', job_category='{base_job_category}'")

        # --- カーソルを再生成して未読結果をクリアする ---
        cursor.close()
        cursor = db.cursor(dictionary=True)

        # 2) CASE WHEN を使ったシンプルスコア式
        #   （industry一致 +40, job_category一致 +40, 年齢±5歳以内 +20 など）
        #   参考例:  similarity_score = 
        #      (CASE WHEN j.industry=base_ind THEN 40 ELSE 0 END)
        #     + (CASE WHEN j.job_category=base_cat THEN 40 ELSE 0 END)
        #     + (CASE WHEN ABS(u.age - base_age)<=5 THEN 20 ELSE 0 END)
        #
        #   ここでは birthdate からYEAR()を取得、計算する形にします。
        
        # DB: 似たユーザーをスコア降順で10件
        # 自分自身は除外 (u.id != base_user_id)
        # 0点のユーザーは除外 (HAVING similarity_score>0)
        # 最新の職歴を job_experiences からjoinするにはサブクエリかMAX()か いろいろ工夫が必要です。 
        # ここでは「とりあえず最終職歴(または1レコード)をLEFT JOINしている」シンプル例。
        # birthdateがNULLのユーザーはスコア計算が0になる想定 or 取り扱い注意など

        # Pythonのformatを安全に使うにはパラメータ化... 
        # ただし CASE WHEN ... => Pythonで組み立て or Jinja2 など
        # ここではサンプルとしてSQL文字列を直接組み立てます。実運用ではSQLインジェクションに注意

        query = """
            SELECT 
                u.id AS user_id,
                u.username,
                u.birthdate,
                j.industry,
                j.job_category,
                (
                    (CASE WHEN j.industry = %s THEN 40 ELSE 0 END)
                + (CASE WHEN j.job_category = %s THEN 40 ELSE 0 END)
                + (CASE WHEN u.birthdate IS NOT NULL
                        AND YEAR(u.birthdate) BETWEEN 1900 AND 2100
                        AND YEAR(u.birthdate) BETWEEN %s - 5 AND %s + 5
                    THEN 20 ELSE 0 END)
                ) AS similarity_score
            FROM users u
            LEFT JOIN job_experiences j 
                ON u.id = j.user_id
                AND j.work_end_period IS NULL
            WHERE u.id != %s
            HAVING similarity_score > 0
            ORDER BY similarity_score DESC
            LIMIT 5
        """
        # パラメータのタプルを作成（同じ baseYear を2回渡す）
        params = (base_industry, base_job_category, baseYear, baseYear, base_user_id)
        logger.debug(f"similar_career_storiesクエリ実行パラメータ: {params}")
        
        # クエリを1回だけ実行する
        cursor.execute(query, params)
        similar_rows = cursor.fetchall()

        if not similar_rows:
            # 類似ユーザーが0人の場合
            return JSONResponse(content={"careers": []})

        # 取り出したIDをまとめる
        user_ids = [ row["user_id"] for row in similar_rows ]

        # ----------- 似たユーザ達の詳細(学歴/職歴 等)をJOIN取得 -----------
        # ここは recent_stories.py と同じロジックにする
        # 例: 5ユーザーの id IN (...) で education / job_experiences / view_count / aspirations などまとめてJOIN
        # ORDER BY j.work_start_period ASC とか
        format_ids = ", ".join(str(uid) for uid in user_ids)

        # 1つのクエリにまとめてもOKだが、ここでは例として recent_stories 風にJOINする。
        # ※ id 順で並べて連続取得 → Pythonで group化
        details_query = f"""
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
        WHERE u.id IN ({format_ids})
        ORDER BY u.id, j.work_start_period ASC
        """
        cursor.execute(details_query)
        rows = cursor.fetchall()

        # group化して { user_id: { ... careerStages, companies }} の形を組み立てる
        career_dict = {}
        for row in rows:
            uid = row['id']
            if uid not in career_dict:
                career_dict[uid] = {
                    "id": uid,
                    "name": row['username'],
                    "birthYear": row['birthdate'].year if row['birthdate'] else '不明',
                    "profession": None,
                    "income": [],
                    "careerStages": [],
                    "companies": [],
                    "view_count": row['view_count'],
                    "career_type": row['career_type'] or None
                }
                # 学歴(非公開なら '非公開')
                institution_name = row['institution'] if row['hide_institution'] == 0 else '非公開'
                # 入学
                if row['education_start']:
                    career_dict[uid]["careerStages"].append({
                        "year": row['education_start'].year,
                        "stage": f"{institution_name} 入学"
                    })

            # 職歴があれば
            if row['company_name']:
                company_name = row['company_name'] if row['is_private'] == 0 else '非公開'
                # 最後の職歴だけ profession に設定(上書き) 例:
                career_dict[uid]['profession'] = row['job_category'] or '不明'
                # income配列
                career_dict[uid]['income'].append({"income": row['salary'] or '不明'})
                # careerStagesに入社を追加
                if row['work_start_period']:
                    career_dict[uid]['careerStages'].append({
                        "year": row['work_start_period'].year,
                        "stage": f"{company_name} 入社"
                    })
                # companies配列
                career_dict[uid]['companies'].append({
                    "name": company_name,
                    "industry": row['industry'] or '不明',
                    "startYear": row['work_start_period'].year if row['work_start_period'] else '不明'
                })

        # 最終的に { "careers": [ ... ] } の形で返却
        careers_list = list(career_dict.values())
        return JSONResponse(content={"careers": careers_list})

    except Exception as e:
        print(f"Error on get_similar_career_stories: {e}")
        raise HTTPException(status_code=500, detail="類似ユーザー取得に失敗しました")
    finally:
        cursor.close()
        db.close()