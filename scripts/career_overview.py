from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from .register_user import get_db_connection


router = APIRouter()


def get_overview_career_decision(decisions):
    """
    Career Overviewカードに表示する
    最新のCareer Decisionを1件取得する。
    """

    if not decisions:
        return None

    # 完全に中身がないDecisionは除外
    meaningful_decisions = [
        decision
        for decision in decisions
        if (
            decision.get("decision_type")
            or decision.get("dilemma_text")
            or decision.get("title")
            or decision.get("trigger_text")
        )
    ]

    if not meaningful_decisions:
        return None

    # 最新のDecisionを先頭にする
    meaningful_decisions.sort(
        key=lambda decision: (
            decision.get("occurred_at").toordinal()
            if decision.get("occurred_at")
            else 0,
            decision.get("id") or 0
        ),
        reverse=True
    )

    selected = meaningful_decisions[0]

    return {
        "id": selected.get("id"),
        "decision_type": (
            selected.get("decision_type")
            or ""
        ),
        "title": (
            selected.get("title")
            or ""
        ),
        "trigger_text": (
            selected.get("trigger_text")
            or ""
        ),
        "dilemma_text": (
            selected.get("dilemma_text")
            or ""
        ),
        "priority_text": (
            selected.get("priority_text")
            or ""
        )
    }


@router.get("/career-overview/")
async def get_career_overview():

    db = get_db_connection()

    try:

        # =========================
        # Career Overview
        # =========================
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

            FROM users u

            LEFT JOIN education e
                ON u.id = e.user_id

            LEFT JOIN job_experiences j
                ON u.id = j.user_id

            LEFT JOIN profile_views pv
                ON u.id = pv.user_id

            LEFT JOIN career_aspirations ca
                ON u.id = ca.user_id

            ORDER BY
                u.id ASC,
                e.education_start ASC,
                j.work_start_period ASC
        """

        cursor = db.cursor(
            dictionary=True
        )

        cursor.execute(query)

        result = cursor.fetchall()


        # =========================
        # Career Decisions
        # =========================
        decision_query = """
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
                user_id ASC,
                occurred_at DESC,
                id DESC
        """

        cursor.execute(
            decision_query
        )

        decision_rows = (
            cursor.fetchall()
        )


        # user_idごとにDecisionをまとめる
        decisions_by_user = {}

        for decision in decision_rows:

            user_id = (
                decision["user_id"]
            )

            if (
                user_id
                not in decisions_by_user
            ):
                decisions_by_user[
                    user_id
                ] = []

            decisions_by_user[
                user_id
            ].append(
                decision
            )


        # =========================
        # Career data
        # =========================
        career_dict = {}

        for row in result:

            user_id = row["id"]

            if (
                user_id
                not in career_dict
            ):

                career_dict[user_id] = {
                    "id": user_id,
                    "name": (
                        row["username"]
                    ),
                    "birthYear": (
                        row["birthdate"].year
                        if row["birthdate"]
                        else None
                    ),
                    "profession": None,
                    "income": [],
                    "careerStages": [],
                    "companies": [],
                    "view_count": (
                        row["view_count"]
                    ),
                    "career_type": (
                        row["career_type"]
                        or ""
                    )
                }

            career = (
                career_dict[user_id]
            )


            # =========================
            # Education
            # =========================
            if row["institution"]:

                institution_name = (
                    row["institution"]
                    if (
                        row[
                            "hide_institution"
                        ] == 0
                    )
                    else "非公開"
                )

                education_stage = {
                    "year": (
                        row[
                            "education_start"
                        ].year
                        if row[
                            "education_start"
                        ]
                        else "不明"
                    ),
                    "stage": (
                        f"{institution_name} 入学"
                    )
                }

                if (
                    education_stage
                    not in career[
                        "careerStages"
                    ]
                ):
                    career[
                        "careerStages"
                    ].append(
                        education_stage
                    )


            # =========================
            # Job experience
            # =========================
            if row["company_name"]:

                company_name = (
                    row["company_name"]
                    if (
                        row["is_private"]
                        == 0
                    )
                    else "非公開"
                )

                start_year = (
                    row[
                        "work_start_period"
                    ].year
                    if row[
                        "work_start_period"
                    ]
                    else "不明"
                )

                company_item = {
                    "name": company_name,
                    "industry": (
                        row["industry"]
                        or "不明"
                    ),
                    "startYear": (
                        start_year
                    )
                }

                if (
                    company_item
                    not in career[
                        "companies"
                    ]
                ):
                    career[
                        "companies"
                    ].append(
                        company_item
                    )

                job_stage = {
                    "year": start_year,
                    "stage": (
                        f"{company_name} 入社"
                    )
                }

                if (
                    job_stage
                    not in career[
                        "careerStages"
                    ]
                ):
                    career[
                        "careerStages"
                    ].append(
                        job_stage
                    )

                # ORDER BY
                # work_start_period ASC
                # 最後に処理された職歴を
                # 現在職扱い
                career["profession"] = (
                    row["job_category"]
                    or career[
                        "profession"
                    ]
                    or "不明"
                )

                career["income"] = [
                    {
                        "income": (
                            row["salary"]
                            or "不明"
                        )
                    }
                ]


        # =========================
        # Response
        # =========================
        careers = list(
            career_dict.values()
        )

        # 各ユーザーに最新Decisionを追加
        for career in careers:

            career["decision"] = (
                get_overview_career_decision(
                    decisions_by_user.get(
                        career["id"],
                        []
                    )
                )
            )


        return JSONResponse(
            content={
                "careers": careers
            }
        )


    except Exception as e:

        print(
            "Error fetching career data:",
            e
        )

        raise HTTPException(
            status_code=500,
            detail="Database query failed"
        )


    finally:

        db.close()