from collections import defaultdict
from datetime import date, datetime

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from .register_user import get_db_connection
from .home_story_filters import get_consulting_status


router = APIRouter()


# =========================================================
# Settings
# =========================================================

MAX_RESULTS = 6


# =========================================================
# Helpers
# =========================================================

def calculate_age(birthdate):

    if not birthdate:
        return None

    if isinstance(birthdate, datetime):
        birthdate = birthdate.date()

    today = date.today()

    return (
        today.year
        - birthdate.year
        - (
            (today.month, today.day)
            <
            (birthdate.month, birthdate.day)
        )
    )


def safe_year(value):

    if not value:
        return None

    try:
        return value.year

    except AttributeError:
        return None


def date_sort_value(value):

    if not value:
        return date.min

    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    try:
        return datetime.strptime(
            str(value)[:10],
            "%Y-%m-%d"
        ).date()

    except Exception:
        return date.min


def is_empty_end_date(value):

    if value is None:
        return True

    text = str(value)

    return (
        text == ""
        or text.startswith("0000-00-00")
    )


def get_latest_job(jobs):

    if not jobs:
        return {}

    def sort_key(job):

        current_priority = (
            1
            if is_empty_end_date(
                job.get("work_end_period")
            )
            else 0
        )

        start = date_sort_value(
            job.get("work_start_period")
        )

        return (
            current_priority,
            start,
            job.get("id") or 0
        )

    return max(
        jobs,
        key=sort_key
    )


def get_latest_role(roles):

    if not roles:
        return {}

    def sort_key(role):

        current_priority = (
            1
            if is_empty_end_date(
                role.get("end_period")
            )
            else 0
        )

        display_order = (
            role.get("display_order")
            or 0
        )

        start = date_sort_value(
            role.get("start_period")
        )

        role_id = (
            role.get("id")
            or 0
        )

        return (
            current_priority,
            display_order,
            start,
            role_id
        )

    return max(
        roles,
        key=sort_key
    )


def get_current_job_info(
    jobs,
    roles_by_job
):

    latest_job = get_latest_job(
        jobs
    )

    if not latest_job:

        return {
            "job_category": None,
            "job_sub_category": None,
            "position": None,
            "industry": None,
        }

    job_id = latest_job.get(
        "id"
    )

    latest_role = get_latest_role(
        roles_by_job.get(
            job_id,
            []
        )
    )

    return {

        "job_category":
            (
                latest_role.get(
                    "job_category"
                )
                or latest_job.get(
                    "job_category"
                )
            ),

        "job_sub_category":
            (
                latest_role.get(
                    "job_sub_category"
                )
                or latest_job.get(
                    "job_sub_category"
                )
            ),

        "position":
            (
                latest_role.get(
                    "position"
                )
                or latest_job.get(
                    "position"
                )
            ),

        "industry":
            latest_job.get(
                "industry"
            ),
    }


# =========================================================
# Decision quality
# =========================================================

def calculate_decision_quality(decision):

    """
    HomeのPreviewとして、
    Career Decisionの内容がどれくらい充実しているかを評価する。

    Popularityではなく、
    Career GPSとして読めるStoryかどうかを優先する。
    """

    score = 0

    if decision.get("decision_type"):
        score += 2

    if decision.get("title"):
        score += 1

    if decision.get("trigger_text"):
        score += 2

    if decision.get("dilemma_text"):
        score += 3

    if decision.get("priority_text"):
        score += 3

    if decision.get("final_reason"):
        score += 2

    if decision.get("result_text"):
        score += 2

    if decision.get("learning_text"):
        score += 1

    return score


def get_best_decision(decisions):

    """
    1ユーザーに複数Decisionがある場合、
    Home Previewとして最も内容の充実したDecisionを選ぶ。
    """

    if not decisions:
        return None

    ranked = sorted(
        decisions,
        key=lambda decision: (
            calculate_decision_quality(
                decision
            ),
            date_sort_value(
                decision.get(
                    "occurred_at"
                )
            ),
            decision.get("id") or 0,
        ),
        reverse=True
    )

    return ranked[0]


# =========================================================
# Career Story Preview API
# =========================================================

@router.get("/career-story-previews/")
async def get_career_story_previews(
    prefer_consulting: bool = Query(False),
):

    db = get_db_connection()
    cursor = None

    try:

        cursor = db.cursor(
            dictionary=True
        )

        # =================================================
        # USERS
        # =================================================

        cursor.execute(
            """
            SELECT
                id,
                username,
                birthdate
            FROM users
            """
        )

        user_rows = cursor.fetchall()

        users = {
            row["id"]: row
            for row in user_rows
        }


        # =================================================
        # JOB EXPERIENCES
        # =================================================

        cursor.execute(
            """
            SELECT
                id,
                user_id,
                company_name,
                industry,
                position,
                job_category,
                job_sub_category,
                work_start_period,
                work_end_period,
                is_private
            FROM job_experiences
            ORDER BY
                user_id,
                work_start_period ASC,
                id ASC
            """
        )

        job_rows = cursor.fetchall()

        jobs_by_user = defaultdict(
            list
        )

        for row in job_rows:

            jobs_by_user[
                row["user_id"]
            ].append(row)


        # =================================================
        # ROLE HISTORIES
        # =================================================

        cursor.execute(
            """
            SELECT
                id,
                job_experience_id,
                department,
                position,
                job_category,
                job_sub_category,
                start_period,
                end_period,
                display_order
            FROM role_histories
            ORDER BY
                job_experience_id,
                display_order ASC,
                start_period ASC,
                id ASC
            """
        )

        role_rows = cursor.fetchall()

        roles_by_job = defaultdict(
            list
        )

        for row in role_rows:

            roles_by_job[
                row["job_experience_id"]
            ].append(row)


        # =================================================
        # EDUCATION
        # =================================================

        cursor.execute(
            """
            SELECT
                user_id,
                institution,
                education_start,
                hide_institution
            FROM education
            ORDER BY
                user_id,
                education_start ASC
            """
        )

        education_rows = cursor.fetchall()

        education_by_user = defaultdict(
            list
        )

        for row in education_rows:

            education_by_user[
                row["user_id"]
            ].append(row)


        # =================================================
        # CAREER DECISIONS
        # =================================================

        cursor.execute(
            """
            SELECT
                id,
                user_id,
                job_experience_id,
                role_history_id,

                title,
                decision_type,
                occurred_at,

                trigger_text,
                dilemma_text,
                priority_text,
                final_reason,

                result_text,
                unexpected_result,
                learning_text,

                same_choice_answer,
                same_choice_reason,
                advice_text

            FROM career_decisions

            WHERE
                decision_type IS NOT NULL
                AND decision_type <> ''

            ORDER BY
                user_id,
                occurred_at DESC,
                id DESC
            """
        )

        decision_rows = cursor.fetchall()

        decisions_by_user = defaultdict(
            list
        )

        for row in decision_rows:

            decisions_by_user[
                row["user_id"]
            ].append(row)


        # =================================================
        # Candidate Story
        # =================================================

        candidates = []


        for user_id, user in users.items():

            jobs = jobs_by_user.get(
                user_id,
                []
            )

            decisions = decisions_by_user.get(
                user_id,
                []
            )


            # ---------------------------------------------
            # Career Journeyがないユーザーは対象外
            # ---------------------------------------------

            if not jobs:
                continue


            # ---------------------------------------------
            # Career Decisionがないユーザーは対象外
            # ---------------------------------------------

            if not decisions:
                continue


            best_decision = get_best_decision(
                decisions
            )


            if not best_decision:
                continue


            # ---------------------------------------------
            # Decision Typeだけ登録されているStoryは
            # Previewとして弱いため除外
            #
            # 「迷い」「判断軸」「結果」の
            # いずれか1つ以上を必須とする。
            # ---------------------------------------------

            has_meaningful_content = any([
                best_decision.get(
                    "dilemma_text"
                ),
                best_decision.get(
                    "priority_text"
                ),
                best_decision.get(
                    "result_text"
                ),
            ])


            if not has_meaningful_content:
                continue


            current_jobs = jobs
            consulting_priority = 0

            if prefer_consulting:
                status = get_consulting_status(jobs)
                consulting_priority = status["priority"]
                current_job = status["current_job"]
                current_jobs = [current_job] if current_job is not None else []

            current = get_current_job_info(
                current_jobs,
                roles_by_job
            )


            # =================================================
            # Career Journey
            # =================================================

            career_stages = []


            education = sorted(
                education_by_user.get(
                    user_id,
                    []
                ),
                key=lambda row:
                    date_sort_value(
                        row.get(
                            "education_start"
                        )
                    )
            )


            for row in education:

                institution = (
                    row.get(
                        "institution"
                    )
                    if not row.get(
                        "hide_institution"
                    )
                    else "非公開"
                )


                if not institution:
                    continue


                career_stages.append({

                    "type":
                        "education",

                    "year":
                        safe_year(
                            row.get(
                                "education_start"
                            )
                        ),

                    "label":
                        institution,
                })


            sorted_jobs = sorted(
                jobs,
                key=lambda job:
                    date_sort_value(
                        job.get(
                            "work_start_period"
                        )
                    )
            )


            for job in sorted_jobs:

                company_name = (
                    job.get(
                        "company_name"
                    )
                    if not job.get(
                        "is_private"
                    )
                    else "非公開"
                )


                if not company_name:
                    continue


                career_stages.append({

                    "type":
                        "company",

                    "year":
                        safe_year(
                            job.get(
                                "work_start_period"
                            )
                        ),

                    "label":
                        company_name,
                })


            # ---------------------------------------------
            # Journeyが空なら対象外
            # ---------------------------------------------

            if not career_stages:
                continue


            decision_quality = (
                calculate_decision_quality(
                    best_decision
                )
            )


            candidates.append({

                "_consulting_priority": consulting_priority,

                "id":
                    user_id,

                "name":
                    user.get(
                        "username"
                    )
                    or "匿名",

                "age":
                    calculate_age(
                        user.get(
                            "birthdate"
                        )
                    ),

                "birthYear":
                    (
                        user[
                            "birthdate"
                        ].year
                        if user.get(
                            "birthdate"
                        )
                        else None
                    ),

                "profession":
                    (
                        current.get(
                            "job_category"
                        )
                        or "職種未設定"
                    ),

                "industry":
                    current.get(
                        "industry"
                    ),

                "careerStages":
                    career_stages,

                "decision": {

                    "id":
                        best_decision.get(
                            "id"
                        ),

                    "decision_type":
                        best_decision.get(
                            "decision_type"
                        ),

                    "title":
                        best_decision.get(
                            "title"
                        ),

                    "trigger_text":
                        best_decision.get(
                            "trigger_text"
                        ),

                    "dilemma_text":
                        best_decision.get(
                            "dilemma_text"
                        ),

                    "priority_text":
                        best_decision.get(
                            "priority_text"
                        ),
                },

                # 内部ランキング用
                "_decision_quality":
                    decision_quality,
            })


        # =================================================
        # Ranking
        #
        # 現時点ではPopularityではなく、
        # Career Decisionの情報量を優先する。
        #
        # 同点の場合はuser_idで安定化する。
        # =================================================

        candidates.sort(
            key=lambda item: (
                item[
                    "_decision_quality"
                ],
                -item["id"],
            ),
            reverse=True
        )


        # 現職コンサル → コンサル経験あり → その他の順に選ぶ。
        # 優先指定がなければ、従来どおり全候補を同じグループとして扱う。
        candidate_groups = [candidates]

        if prefer_consulting:
            candidate_groups = [
                [
                    item for item in candidates
                    if item["_consulting_priority"] == priority
                ]
                for priority in (2, 1, 0)
            ]

        selected = []
        selected_ids = set()
        used_decision_types = set()

        for group in candidate_groups:
            # 各グループ内で、まず異なる意思決定を選び、その後に不足分を補う。
            for require_unique_type in (True, False):
                for candidate in group:
                    if len(selected) >= MAX_RESULTS:
                        break

                    if candidate["id"] in selected_ids:
                        continue

                    decision_type = candidate["decision"].get("decision_type")

                    if (
                        require_unique_type
                        and decision_type in used_decision_types
                    ):
                        continue

                    selected.append(candidate)
                    selected_ids.add(candidate["id"])
                    used_decision_types.add(decision_type)

            if len(selected) >= MAX_RESULTS:
                break

        # 内部の選定用項目はレスポンスに含めない。
        for item in selected:
            item.pop("_decision_quality", None)
            item.pop("_consulting_priority", None)


        return JSONResponse(
            content={
                "careers":
                    selected
            }
        )


    except Exception as e:

        print(
            "Error fetching "
            "career story previews:",
            e
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Career Story Previewの"
                "取得に失敗しました"
            )
        )


    finally:

        if cursor is not None:
            cursor.close()

        db.close()