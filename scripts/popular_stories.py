from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from .register_user import get_db_connection

router = APIRouter()


# =========================================================
# Home Career Decision
# =========================================================

def get_home_career_decision(
    decisions
):

    if not decisions:
        return None


    def decision_quality(
        decision
    ):

        score = 0


        if decision.get(
            "decision_type"
        ):
            score += 2


        if decision.get(
            "dilemma_text"
        ):
            score += 3


        if decision.get(
            "priority_text"
        ):
            score += 3


        if decision.get(
            "title"
        ):
            score += 1


        if decision.get(
            "trigger_text"
        ):
            score += 2


        return score


    ranked = sorted(
        decisions,
        key=lambda decision: (
            decision_quality(
                decision
            ),
            decision.get(
                "occurred_at"
            )
            or "",
            decision.get(
                "id"
            )
            or 0,
        ),
        reverse=True
    )


    selected = ranked[0]


    if not (
        selected.get(
            "decision_type"
        )
        or
        selected.get(
            "dilemma_text"
        )
        or
        selected.get(
            "title"
        )
        or
        selected.get(
            "trigger_text"
        )
    ):

        return None


    return {

        "id":
            selected.get(
                "id"
            ),

        "decision_type":
            selected.get(
                "decision_type"
            )
            or "",

        "title":
            selected.get(
                "title"
            )
            or "",

        "trigger_text":
            selected.get(
                "trigger_text"
            )
            or "",

        "dilemma_text":
            selected.get(
                "dilemma_text"
            )
            or "",

        "priority_text":
            selected.get(
                "priority_text"
            )
            or "",
    }


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
        #
        # 現在年収・現在職種については、
        # 各 job_experience に紐づく最新Roleの値を優先する。
        #
        # Roleが存在しない既存データについては、
        # job_experiences の値へフォールバックする。
        # -------------------------------------------------

        query = """
            SELECT
                u.id,
                u.username,
                u.birthdate,

                e.institution,
                e.education_start,
                e.hide_institution,

                j.id AS job_experience_id,
                j.company_name,
                j.industry,
                j.job_category,
                j.job_sub_category,
                j.salary,
                j.work_start_period,
                j.work_end_period,
                j.is_private,

                COALESCE(
                    (
                        SELECT rh.salary_range
                        FROM role_histories AS rh
                        WHERE rh.job_experience_id = j.id
                        ORDER BY
                            CASE
                                WHEN rh.end_period IS NULL THEN 0
                                ELSE 1
                            END ASC,
                            rh.display_order DESC,
                            rh.start_period DESC,
                            rh.id DESC
                        LIMIT 1
                    ),
                    j.salary
                ) AS current_salary,

                COALESCE(
                    (
                        SELECT rh.job_category
                        FROM role_histories AS rh
                        WHERE rh.job_experience_id = j.id
                          AND rh.job_category IS NOT NULL
                          AND rh.job_category <> ''
                        ORDER BY
                            CASE
                                WHEN rh.end_period IS NULL THEN 0
                                ELSE 1
                            END ASC,
                            rh.display_order DESC,
                            rh.start_period DESC,
                            rh.id DESC
                        LIMIT 1
                    ),
                    j.job_category
                ) AS current_job_category,

                COALESCE(
                    (
                        SELECT rh.job_sub_category
                        FROM role_histories AS rh
                        WHERE rh.job_experience_id = j.id
                          AND rh.job_sub_category IS NOT NULL
                          AND rh.job_sub_category <> ''
                        ORDER BY
                            CASE
                                WHEN rh.end_period IS NULL THEN 0
                                ELSE 1
                            END ASC,
                            rh.display_order DESC,
                            rh.start_period DESC,
                            rh.id DESC
                        LIMIT 1
                    ),
                    j.job_sub_category
                ) AS current_job_sub_category,

                COALESCE(
                    (
                        SELECT rh.position
                        FROM role_histories AS rh
                        WHERE rh.job_experience_id = j.id
                          AND rh.position IS NOT NULL
                          AND rh.position <> ''
                        ORDER BY
                            CASE
                                WHEN rh.end_period IS NULL THEN 0
                                ELSE 1
                            END ASC,
                            rh.display_order DESC,
                            rh.start_period DESC,
                            rh.id DESC
                        LIMIT 1
                    ),
                    j.position
                ) AS current_position,

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
                j.work_start_period ASC,
                j.id ASC
        """

        cursor = db.cursor(
            dictionary=True
        )

        cursor.execute(query)

        popular_careers = cursor.fetchall()


        # -------------------------------------------------
        # Career Decision取得
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                user_id,
                title,
                decision_type,
                occurred_at,
                trigger_text,
                dilemma_text,
                priority_text
            FROM career_decisions
            ORDER BY
                user_id,
                occurred_at DESC,
                id DESC
            """
        )


        decision_rows = (
            cursor.fetchall()
        )


        decisions_by_user = {}


        for row in decision_rows:

            user_id = row[
                "user_id"
            ]


            if (
                user_id
                not in decisions_by_user
            ):

                decisions_by_user[
                    user_id
                ] = []


            decisions_by_user[
                user_id
            ].append(row)


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
                #
                # job_experience_id を使用することで、
                # 同じ会社・同じ開始年でも別職歴であれば
                # 正しく別データとして扱う。
                # ---------------------------------------------

                job_key = (
                    row["job_experience_id"],
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
                    # 毎回上書きすることで、
                    # 最終的に最新職歴の情報を保持する。
                    #
                    # 職種：
                    # 最新Roleの job_category を優先。
                    # Roleに値がない場合は
                    # job_experiences.job_category を使用。
                    #
                    # 年収：
                    # 最新Roleの salary_range を優先。
                    # Roleが存在しない場合は
                    # job_experiences.salary を使用。
                    # -----------------------------------------

                    career["profession"] = (
                        row["current_job_category"]
                        or career["profession"]
                        or "不明"
                    )


                    # 最新年収だけを保持
                    career["income"] = [{

                        "income":
                            row["current_salary"]
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
                    row["job_experience_id"],
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


            # ---------------------------------------------
            # Home表示用 Career Decision
            # ---------------------------------------------

            career[
                "decision"
            ] = (
                get_home_career_decision(
                    decisions_by_user.get(
                        career["id"],
                        []
                    )
                )
            )


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