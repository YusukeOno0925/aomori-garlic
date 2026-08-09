from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from .register_user import get_db_connection


router = APIRouter()


# =========================================================
# 人気のCareer Storyを取得
# =========================================================

@router.get("/popular-career-stories/")
async def get_popular_career_stories():

    db = get_db_connection()
    cursor = None

    try:

        # -------------------------------------------------
        # 閲覧数が多いユーザーのうち、
        # 職歴を1件以上持つ上位6ユーザーを取得する
        #
        # job_experiences を持たないユーザーを除外することで、
        # Homeの「みんなが読んでいるCareer Story」に
        # 空のCareer Storyが表示されるのを防ぐ
        # -------------------------------------------------

        query = """
            SELECT
                u.id,
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
                j.is_private,

                IFNULL(pv.view_count, 0) AS view_count,

                ca.type AS career_type

            FROM users AS u

            LEFT JOIN education AS e
                ON u.id = e.user_id

            LEFT JOIN job_experiences AS j
                ON u.id = j.user_id

            LEFT JOIN profile_views AS pv
                ON u.id = pv.user_id

            LEFT JOIN career_aspirations AS ca
                ON u.id = ca.user_id

            WHERE u.id IN (

                SELECT popular_users.user_id

                FROM (

                    SELECT
                        u2.id AS user_id,
                        IFNULL(pv2.view_count, 0) AS view_count

                    FROM users AS u2

                    LEFT JOIN profile_views AS pv2
                        ON u2.id = pv2.user_id

                    WHERE EXISTS (

                        SELECT 1

                        FROM job_experiences AS j2

                        WHERE j2.user_id = u2.id
                          AND j2.company_name IS NOT NULL
                          AND j2.company_name <> ''

                    )

                    GROUP BY
                        u2.id,
                        pv2.view_count

                    ORDER BY
                        view_count DESC,
                        u2.id ASC

                    LIMIT 6

                ) AS popular_users

            )

            ORDER BY
                view_count DESC,
                u.id ASC,
                e.education_start ASC,
                j.work_start_period ASC
        """


        cursor = db.cursor(
            dictionary=True
        )

        cursor.execute(query)

        popular_careers = cursor.fetchall()


        # -------------------------------------------------
        # ユーザー単位にまとめる
        # -------------------------------------------------

        career_dict = {}


        for row in popular_careers:

            user_id = row["id"]


            # ---------------------------------------------
            # 初回だけユーザー情報を作成
            # ---------------------------------------------

            if user_id not in career_dict:

                career_dict[user_id] = {

                    "id":
                        user_id,

                    "name":
                        row["username"] or "匿名",

                    "birthYear":
                        (
                            row["birthdate"].year
                            if row["birthdate"]
                            else None
                        ),

                    "profession":
                        None,

                    "income":
                        [],

                    "careerStages":
                        [],

                    "companies":
                        [],

                    "view_count":
                        row["view_count"] or 0,

                    "career_type":
                        row["career_type"] or "",

                    # 重複排除用
                    "_education_keys":
                        set(),

                    "_job_keys":
                        set(),

                    "_company_keys":
                        set()

                }


            career = career_dict[user_id]


            # =================================================
            # 学歴
            # =================================================

            if row["institution"]:

                institution_name = (

                    row["institution"]

                    if row["hide_institution"] == 0

                    else "非公開"

                )


                education_year = (

                    row["education_start"].year

                    if row["education_start"]

                    else "不明"

                )


                education_key = (

                    education_year,
                    institution_name

                )


                # JOINによる重複を除外
                if (
                    education_key
                    not in career["_education_keys"]
                ):

                    career["_education_keys"].add(
                        education_key
                    )


                    career["careerStages"].append({

                        "year":
                            education_year,

                        "stage":
                            f"{institution_name} 入学"

                    })


            # =================================================
            # 職歴
            # =================================================

            if row["company_name"]:

                company_name = (

                    row["company_name"]

                    if row["is_private"] == 0

                    else "非公開"

                )


                start_year = (

                    row["work_start_period"].year

                    if row["work_start_period"]

                    else "不明"

                )


                # ---------------------------------------------
                # 同一職歴の重複判定
                # ---------------------------------------------

                job_key = (

                    company_name,
                    start_year,
                    row["job_category"],
                    row["salary"]

                )


                if (
                    job_key
                    not in career["_job_keys"]
                ):

                    career["_job_keys"].add(
                        job_key
                    )


                    # -----------------------------------------
                    # ORDER BY work_start_period ASC のため、
                    # 後から処理される職歴ほど新しい。
                    #
                    # そのため毎回上書きすることで、
                    # 最終的に「最新職歴」の職種・年収になる。
                    # -----------------------------------------

                    career["profession"] = (
                        row["job_category"]
                        or career["profession"]
                        or "不明"
                    )


                    # 最新年収だけを保持
                    career["income"] = [{

                        "income":
                            row["salary"]
                            or "不明"

                    }]


                    # Career Journey
                    career["careerStages"].append({

                        "year":
                            start_year,

                        "stage":
                            f"{company_name} 入社"

                    })


                # ---------------------------------------------
                # Companies
                # ---------------------------------------------

                company_key = (

                    company_name,
                    start_year

                )


                if (
                    company_key
                    not in career["_company_keys"]
                ):

                    career["_company_keys"].add(
                        company_key
                    )


                    career["companies"].append({

                        "name":
                            company_name,

                        "industry":
                            row["industry"]
                            or "不明",

                        "startYear":
                            start_year

                    })


        # -------------------------------------------------
        # APIレスポンス用データへ変換
        # -------------------------------------------------

        careers = []


        for career in career_dict.values():

            # 内部処理用setはJSON化できないため削除
            career.pop(
                "_education_keys",
                None
            )

            career.pop(
                "_job_keys",
                None
            )

            career.pop(
                "_company_keys",
                None
            )


            # 職歴が存在するのに職種がNULLの場合
            if not career["profession"]:

                career["profession"] = "不明"


            careers.append(
                career
            )


        return JSONResponse(
            content={
                "careers":
                    careers
            }
        )


    except Exception as e:

        print(
            "Error fetching popular career stories:",
            e
        )

        raise HTTPException(
            status_code=500,
            detail="Database query failed"
        )


    finally:

        if cursor is not None:
            cursor.close()

        db.close()