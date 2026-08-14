import logging
import re
from collections import defaultdict
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse

from .register_user import get_db_connection
from .auth import get_current_user, User


logger = logging.getLogger(__name__)
router = APIRouter()


# =========================================================
# Settings
# =========================================================

MAX_RESULTS = 6


WEIGHTS = {

    # Career Path
    "company_each": 15,
    "company_max": 30,
    "same_sequence": 15,
    "institution": 8,

    # Current Position
    "job_category": 18,
    "industry": 12,

    # Career Values
    "career_type": 20,

    # Life Stage
    "age_2": 10,
    "age_5": 6,
    "age_8": 3,
}


MAX_THEORETICAL_SCORE = 113


# =========================================================
# Normalize
# =========================================================

def normalize_text(value):

    if value is None:
        return ""

    value = str(value).strip().lower()

    value = re.sub(
        r"[\s　]+",
        "",
        value
    )

    return value


def normalize_company_name(name):

    value = normalize_text(name)

    if not value:
        return ""

    keywords = [
        "株式会社",
        "有限会社",
        "合同会社",
        "合資会社",
        "合名会社",
        "㈱",
        "(株)",
        "（株）",
    ]

    for keyword in keywords:
        value = value.replace(
            keyword,
            ""
        )

    return value.strip()


def normalize_institution_name(name):

    value = normalize_text(name)

    if not value:
        return ""

    # 大学院 → 大学 の順で除去
    keywords = [
        "大学大学院",
        "大学院",
        "大學",
        "大学",
    ]

    for keyword in keywords:
        value = value.replace(
            keyword,
            ""
        )

    return value.strip()


# =========================================================
# Generic helpers
# =========================================================

def calculate_age(birthdate):

    if not birthdate:
        return None

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


def is_empty_end_date(value):

    if value is None:
        return True

    text = str(value)

    return (
        text == ""
        or text.startswith("0000-00-00")
    )


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


# =========================================================
# Latest job
# =========================================================

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


# =========================================================
# Latest role
# =========================================================

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


# =========================================================
# Current job information
# =========================================================

def get_current_job_info(
    jobs,
    roles_by_job
):

    """
    現在の職種・年収などは、
    最新のjob_experienceに紐づく最新Roleを優先する。

    Roleが存在しない場合、またはRole側の値が未設定の場合は、
    job_experiencesの値へフォールバックする。
    """

    latest_job = get_latest_job(
        jobs
    )

    if not latest_job:
        return {
            "job": {},
            "role": {},
            "job_category": None,
            "job_sub_category": None,
            "position": None,
            "salary": None,
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

    current_job_category = (
        latest_role.get(
            "job_category"
        )
        or latest_job.get(
            "job_category"
        )
    )

    current_job_sub_category = (
        latest_role.get(
            "job_sub_category"
        )
        or latest_job.get(
            "job_sub_category"
        )
    )

    current_position = (
        latest_role.get(
            "position"
        )
        or latest_job.get(
            "position"
        )
    )

    current_salary = (
        latest_role.get(
            "salary_range"
        )
        or latest_job.get(
            "salary"
        )
    )

    # 業界は会社単位の情報なのでjob_experiencesを使用する
    current_industry = (
        latest_job.get(
            "industry"
        )
    )

    return {
        "job":
            latest_job,

        "role":
            latest_role,

        "job_category":
            current_job_category,

        "job_sub_category":
            current_job_sub_category,

        "position":
            current_position,

        "salary":
            current_salary,

        "industry":
            current_industry,
    }


# =========================================================
# Public career path
# =========================================================

def get_public_company_path(jobs):

    """
    レコメンド判定では
    非公開会社を使用しない。
    """

    path = []

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

        if job.get("is_private"):
            continue

        company = normalize_company_name(
            job.get("company_name")
        )

        if not company:
            continue

        # 同一会社が連続していても
        # 1社として扱う
        if (
            not path
            or path[-1] != company
        ):
            path.append(company)

    return path


def get_public_institutions(
    education_rows
):

    institutions = []

    for row in education_rows:

        if row.get("hide_institution"):
            continue

        value = normalize_institution_name(
            row.get("institution")
        )

        if value:
            institutions.append(value)

    return list(
        dict.fromkeys(
            institutions
        )
    )


# =========================================================
# Longest Common Subsequence
# =========================================================

def longest_common_subsequence_length(
    path_a,
    path_b
):

    """
    共通企業を「同じ順序」で
    経験しているかを見る。

    例:
    A: 日立 → ベイカレント
    B: 日立 → ベイカレント
       => 2

    A: 日立 → ベイカレント
    B: ベイカレント → 日立
       => 1
    """

    if (
        not path_a
        or not path_b
    ):
        return 0

    rows = len(path_a) + 1
    cols = len(path_b) + 1

    dp = [
        [0] * cols
        for _ in range(rows)
    ]

    for i in range(
        1,
        rows
    ):

        for j in range(
            1,
            cols
        ):

            if (
                path_a[i - 1]
                ==
                path_b[j - 1]
            ):

                dp[i][j] = (
                    dp[i - 1][j - 1]
                    + 1
                )

            else:

                dp[i][j] = max(
                    dp[i - 1][j],
                    dp[i][j - 1]
                )

    return dp[-1][-1]


# =========================================================
# Match headline
# =========================================================

def build_similarity_headline(
    match_info
):

    company_count = (
        match_info[
            "company_match_count"
        ]
    )

    same_sequence = (
        match_info[
            "same_sequence"
        ]
    )

    same_school = (
        match_info[
            "same_institution"
        ]
    )

    same_job = (
        match_info[
            "same_job_category"
        ]
    )

    same_industry = (
        match_info[
            "same_industry"
        ]
    )

    same_values = (
        match_info[
            "same_career_type"
        ]
    )

    age_score = (
        match_info[
            "age_score"
        ]
    )


    # -----------------------------------------------------
    # Career Pathを最優先
    # -----------------------------------------------------

    if (
        same_sequence
        and company_count >= 2
    ):
        return (
            "歩んできたキャリアの経路が近い"
        )


    if company_count >= 2:
        return (
            f"共通する会社を"
            f"{company_count}社経験"
        )


    if (
        company_count >= 1
        and same_school
    ):
        return (
            "同じ学校・同じ会社を経験"
        )


    if (
        company_count >= 1
        and same_values
    ):
        return (
            "同じ会社経験があり、"
            "大切にしていることも近い"
        )


    if company_count >= 1:
        return (
            "同じ会社を経験したCareer Story"
        )


    # -----------------------------------------------------
    # Current + Values
    # -----------------------------------------------------

    if (
        same_job
        and same_values
    ):
        return (
            "同じ職種で、"
            "キャリア志向も近い"
        )


    if (
        same_job
        and same_industry
    ):
        return (
            "同じ職種・業界を歩んでいる"
        )


    if (
        same_school
        and same_job
    ):
        return (
            "同じ学校出身で、"
            "職種も近い"
        )


    if (
        same_values
        and age_score > 0
    ):
        return (
            "大切にしていることと"
            "年代が近い"
        )


    if same_values:
        return (
            "キャリアで大切にしている"
            "価値観が近い"
        )


    if (
        same_job
        and age_score > 0
    ):
        return (
            "同じ職種で、年代も近い"
        )


    if same_job:
        return (
            "同じ職種を経験している"
        )


    if same_industry:
        return (
            "同じ業界で歩んできた"
        )


    if same_school:
        return (
            "同じ学校を経験している"
        )


    if age_score > 0:
        return (
            "近い年代のCareer Story"
        )


    return (
        "あなたと共通点のあるCareer Story"
    )


# =========================================================
# Similarity
# =========================================================

def calculate_similarity(
    base,
    candidate
):

    raw_score = 0

    reasons = []

    match_info = {

        "company_match_count": 0,
        "same_sequence": False,
        "same_institution": False,
        "same_job_category": False,
        "same_industry": False,
        "same_career_type": False,
        "age_score": 0,
    }


    # =====================================================
    # 1. Career Path
    # =====================================================

    base_path = (
        base.get(
            "company_path"
        )
        or []
    )

    candidate_path = (
        candidate.get(
            "company_path"
        )
        or []
    )


    common_companies = list(
        set(base_path)
        &
        set(candidate_path)
    )


    company_match_count = min(
        len(common_companies),
        2
    )


    if company_match_count > 0:

        company_score = min(
            company_match_count
            *
            WEIGHTS[
                "company_each"
            ],

            WEIGHTS[
                "company_max"
            ]
        )

        raw_score += (
            company_score
        )

        match_info[
            "company_match_count"
        ] = company_match_count


        if company_match_count >= 2:

            reasons.append({
                "type":
                    "company",

                "label":
                    f"共通会社"
                    f"{company_match_count}社",

                "weight":
                    company_score,
            })

        else:

            reasons.append({
                "type":
                    "company",

                "label":
                    "同じ会社を経験",

                "weight":
                    company_score,
            })


    # =====================================================
    # 2. Same sequence
    # =====================================================

    lcs_length = (
        longest_common_subsequence_length(
            base_path,
            candidate_path
        )
    )


    if lcs_length >= 2:

        raw_score += (
            WEIGHTS[
                "same_sequence"
            ]
        )

        match_info[
            "same_sequence"
        ] = True

        reasons.append({
            "type":
                "career_path",

            "label":
                "キャリア経路が近い",

            "weight":
                WEIGHTS[
                    "same_sequence"
                ],
        })


    # =====================================================
    # 3. Institution
    # =====================================================

    base_institutions = set(
        base.get(
            "institutions"
        )
        or []
    )

    candidate_institutions = set(
        candidate.get(
            "institutions"
        )
        or []
    )


    if (
        base_institutions
        and
        candidate_institutions
        and
        base_institutions
        &
        candidate_institutions
    ):

        raw_score += (
            WEIGHTS[
                "institution"
            ]
        )

        match_info[
            "same_institution"
        ] = True

        reasons.append({
            "type":
                "institution",

            "label":
                "同じ学校",

            "weight":
                WEIGHTS[
                    "institution"
                ],
        })


    # =====================================================
    # 4. Current Job Category
    # =====================================================

    base_job = normalize_text(
        base.get(
            "job_category"
        )
    )

    candidate_job = normalize_text(
        candidate.get(
            "job_category"
        )
    )


    if (
        base_job
        and
        candidate_job
        and
        base_job
        ==
        candidate_job
    ):

        raw_score += (
            WEIGHTS[
                "job_category"
            ]
        )

        match_info[
            "same_job_category"
        ] = True

        reasons.append({
            "type":
                "job_category",

            "label":
                "同じ職種",

            "weight":
                WEIGHTS[
                    "job_category"
                ],
        })


    # =====================================================
    # 5. Current Industry
    # =====================================================

    base_industry = (
        normalize_text(
            base.get(
                "industry"
            )
        )
    )

    candidate_industry = (
        normalize_text(
            candidate.get(
                "industry"
            )
        )
    )


    if (
        base_industry
        and
        candidate_industry
        and
        base_industry
        ==
        candidate_industry
    ):

        raw_score += (
            WEIGHTS[
                "industry"
            ]
        )

        match_info[
            "same_industry"
        ] = True

        reasons.append({
            "type":
                "industry",

            "label":
                "同じ業界",

            "weight":
                WEIGHTS[
                    "industry"
                ],
        })


    # =====================================================
    # 6. Career Values
    # =====================================================

    base_career_type = (
        normalize_text(
            base.get(
                "career_type"
            )
        )
    )

    candidate_career_type = (
        normalize_text(
            candidate.get(
                "career_type"
            )
        )
    )


    if (
        base_career_type
        and
        candidate_career_type
        and
        base_career_type
        ==
        candidate_career_type
    ):

        raw_score += (
            WEIGHTS[
                "career_type"
            ]
        )

        match_info[
            "same_career_type"
        ] = True

        reasons.append({
            "type":
                "career_type",

            "label":
                "大切にしていることが近い",

            "weight":
                WEIGHTS[
                    "career_type"
                ],
        })


    # =====================================================
    # 7. Age
    # =====================================================

    base_age = base.get(
        "age"
    )

    candidate_age = (
        candidate.get(
            "age"
        )
    )


    age_score = 0
    age_label = None


    if (
        base_age is not None
        and
        candidate_age
        is not None
    ):

        age_diff = abs(
            base_age
            -
            candidate_age
        )


        if age_diff <= 2:

            age_score = (
                WEIGHTS[
                    "age_2"
                ]
            )

            age_label = (
                "年代がとても近い"
            )


        elif age_diff <= 5:

            age_score = (
                WEIGHTS[
                    "age_5"
                ]
            )

            age_label = (
                "年代が近い"
            )


        elif age_diff <= 8:

            age_score = (
                WEIGHTS[
                    "age_8"
                ]
            )

            age_label = (
                "近い世代"
            )


    if age_score > 0:

        raw_score += (
            age_score
        )

        match_info[
            "age_score"
        ] = age_score

        reasons.append({
            "type":
                "age",

            "label":
                age_label,

            "weight":
                age_score,
        })


    # =====================================================
    # Completeness
    # =====================================================

    completeness_fields = [

        candidate.get(
            "job_category"
        ),

        candidate.get(
            "industry"
        ),

        candidate.get(
            "career_type"
        ),

        candidate.get(
            "birthdate"
        ),

        candidate.get(
            "company_path"
        ),

        candidate.get(
            "institutions"
        ),
    ]


    completeness = sum(
        1
        for value
        in completeness_fields
        if value
    )


    normalized_score = round(
        min(
            100,
            (
                raw_score
                /
                MAX_THEORETICAL_SCORE
            )
            * 100
        ),
        1
    )


    headline = (
        build_similarity_headline(
            match_info
        )
    )


    reasons = sorted(
        reasons,
        key=lambda item:
            item["weight"],
        reverse=True
    )


    return {

        "raw_score":
            raw_score,

        "score":
            normalized_score,

        "headline":
            headline,

        "reasons":
            reasons,

        "match_info":
            match_info,

        "completeness":
            completeness,
    }


# =========================================================
# API
# =========================================================

@router.get(
    "/similar-career-stories/"
)
async def get_similar_users(

    target_user_id: int = Query(
        None
    ),

    current_user: User = Depends(
        get_current_user
    ),
):

    base_user_id = (
        target_user_id
        if target_user_id
        else current_user.id
    )


    db = get_db_connection()

    cursor = db.cursor(
        dictionary=True
    )


    try:

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

        user_rows = (
            cursor.fetchall()
        )


        users = {
            row["id"]: row
            for row in user_rows
        }


        if (
            base_user_id
            not in users
        ):

            raise HTTPException(
                status_code=404,
                detail=(
                    "対象ユーザーが"
                    "見つかりません"
                )
            )


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
                salary,
                work_start_period,
                work_end_period,
                satisfaction_level,
                is_private
            FROM job_experiences
            ORDER BY
                user_id,
                work_start_period ASC,
                id ASC
            """
        )


        all_job_rows = (
            cursor.fetchall()
        )


        jobs_by_user = (
            defaultdict(list)
        )


        for row in all_job_rows:

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
                salary_range,
                satisfaction_level,
                display_order
            FROM role_histories
            ORDER BY
                job_experience_id,
                display_order ASC,
                start_period ASC,
                id ASC
            """
        )


        all_role_rows = (
            cursor.fetchall()
        )


        roles_by_job = (
            defaultdict(list)
        )


        for row in all_role_rows:

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


        education_rows = (
            cursor.fetchall()
        )


        education_by_user = (
            defaultdict(list)
        )


        for row in education_rows:

            education_by_user[
                row["user_id"]
            ].append(row)


        # =================================================
        # CAREER ASPIRATIONS
        # =================================================

        cursor.execute(
            """
            SELECT
                user_id,
                type
            FROM career_aspirations
            """
        )


        aspiration_rows = (
            cursor.fetchall()
        )


        aspiration_by_user = {}


        for row in aspiration_rows:

            uid = row[
                "user_id"
            ]

            if uid not in (
                aspiration_by_user
            ):

                aspiration_by_user[
                    uid
                ] = (
                    row.get("type")
                )


        # =================================================
        # Build base profile
        # =================================================

        base_user = (
            users[
                base_user_id
            ]
        )


        base_jobs = (
            jobs_by_user.get(
                base_user_id,
                []
            )
        )


        base_current = (
            get_current_job_info(
                base_jobs,
                roles_by_job
            )
        )


        base_profile = {

            "birthdate":
                base_user.get(
                    "birthdate"
                ),

            "age":
                calculate_age(
                    base_user.get(
                        "birthdate"
                    )
                ),

            # 最新Roleを優先
            "job_category":
                base_current.get(
                    "job_category"
                ),

            # 業界は会社単位なので
            # job_experiencesを使用
            "industry":
                base_current.get(
                    "industry"
                ),

            "career_type":
                aspiration_by_user.get(
                    base_user_id
                ),

            "company_path":
                get_public_company_path(
                    base_jobs
                ),

            "institutions":
                get_public_institutions(
                    education_by_user.get(
                        base_user_id,
                        []
                    )
                ),
        }


        # =================================================
        # Score candidates
        # =================================================

        scored_candidates = []


        for uid, user in users.items():

            if uid == base_user_id:
                continue


            jobs = (
                jobs_by_user.get(
                    uid,
                    []
                )
            )


            current = (
                get_current_job_info(
                    jobs,
                    roles_by_job
                )
            )


            candidate_profile = {

                "birthdate":
                    user.get(
                        "birthdate"
                    ),

                "age":
                    calculate_age(
                        user.get(
                            "birthdate"
                        )
                    ),

                # 最新Roleを優先
                "job_category":
                    current.get(
                        "job_category"
                    ),

                # 業界は会社単位
                "industry":
                    current.get(
                        "industry"
                    ),

                "career_type":
                    aspiration_by_user.get(
                        uid
                    ),

                "company_path":
                    get_public_company_path(
                        jobs
                    ),

                "institutions":
                    get_public_institutions(
                        education_by_user.get(
                            uid,
                            []
                        )
                    ),
            }


            result = (
                calculate_similarity(
                    base_profile,
                    candidate_profile
                )
            )


            if (
                result[
                    "raw_score"
                ]
                <= 0
            ):
                continue


            scored_candidates.append({

                "user_id":
                    uid,

                "raw_score":
                    result[
                        "raw_score"
                    ],

                "score":
                    result[
                        "score"
                    ],

                "headline":
                    result[
                        "headline"
                    ],

                "reasons":
                    result[
                        "reasons"
                    ],

                "match_info":
                    result[
                        "match_info"
                    ],

                "completeness":
                    result[
                        "completeness"
                    ],
            })


        # =================================================
        # Ranking
        # =================================================

        scored_candidates.sort(

            key=lambda item: (

                item[
                    "raw_score"
                ],

                item[
                    "match_info"
                ][
                    "same_sequence"
                ],

                item[
                    "match_info"
                ][
                    "company_match_count"
                ],

                item[
                    "completeness"
                ],

            ),

            reverse=True
        )


        selected = (
            scored_candidates[
                :MAX_RESULTS
            ]
        )


        if not selected:

            return JSONResponse(
                content={

                    "careers":
                        [],

                    "baseProfileCompleteness":
                        calculate_base_profile_completeness(
                            base_profile
                        ),
                }
            )


        selected_ids = [
            item["user_id"]
            for item
            in selected
        ]


        result_map = {
            item["user_id"]: item
            for item
            in selected
        }


        # =================================================
        # PROFILE VIEWS
        # =================================================

        placeholders = ", ".join(
            ["%s"]
            *
            len(
                selected_ids
            )
        )


        cursor.execute(
            f"""
            SELECT
                user_id,
                view_count
            FROM profile_views
            WHERE user_id
            IN ({placeholders})
            """,
            tuple(
                selected_ids
            )
        )


        view_count_map = {
            row["user_id"]:
                row.get(
                    "view_count"
                )
                or 0
            for row
            in cursor.fetchall()
        }


        # =================================================
        # Build response
        # =================================================

        careers = []


        for uid in selected_ids:

            user = users[uid]

            jobs = sorted(
                jobs_by_user.get(
                    uid,
                    []
                ),
                key=lambda job:
                    date_sort_value(
                        job.get(
                            "work_start_period"
                        )
                    )
            )


            education = sorted(
                education_by_user.get(
                    uid,
                    []
                ),
                key=lambda row:
                    date_sort_value(
                        row.get(
                            "education_start"
                        )
                    )
            )


            current = (
                get_current_job_info(
                    jobs,
                    roles_by_job
                )
            )


            career_stages = []
            companies = []


            # ---------------------------------------------
            # Education display
            # ---------------------------------------------

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


                if (
                    institution
                    and
                    row.get(
                        "education_start"
                    )
                ):

                    career_stages.append({

                        "year":
                            safe_year(
                                row.get(
                                    "education_start"
                                )
                            ),

                        "stage":
                            f"{institution} 入学",
                    })


            # ---------------------------------------------
            # Job display
            # ---------------------------------------------

            for row in jobs:

                company_name = (
                    row.get(
                        "company_name"
                    )
                    if not row.get(
                        "is_private"
                    )
                    else "非公開"
                )


                if (
                    company_name
                    and
                    row.get(
                        "work_start_period"
                    )
                ):

                    career_stages.append({

                        "year":
                            safe_year(
                                row.get(
                                    "work_start_period"
                                )
                            ),

                        "stage":
                            f"{company_name} 入社",
                    })


                if company_name:

                    companies.append({

                        "name":
                            company_name,

                        "industry":
                            row.get(
                                "industry"
                            )
                            or "不明",

                        "startYear":
                            (
                                safe_year(
                                    row.get(
                                        "work_start_period"
                                    )
                                )
                                or
                                "不明"
                            ),
                    })


            career_stages.sort(

                key=lambda item:
                    (
                        item.get(
                            "year"
                        )
                        if isinstance(
                            item.get(
                                "year"
                            ),
                            int
                        )
                        else 9999
                    )
            )


            # ---------------------------------------------
            # 現在年収
            #
            # 最新Role.salary_rangeを優先。
            # Role側に値がない場合のみ
            # job_experiences.salaryへフォールバックする。
            #
            # Homeカードでは「現在年収」を表示するため、
            # 過去職歴の年収はincomeへ含めない。
            # ---------------------------------------------

            current_salary = (
                current.get(
                    "salary"
                )
            )


            incomes = []

            if current_salary:

                incomes.append({

                    "income":
                        current_salary
                })


            similarity = (
                result_map[
                    uid
                ]
            )


            careers.append({

                "id":
                    uid,

                "name":
                    user.get(
                        "username"
                    )
                    or "匿名",

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

                # 最新Role.job_categoryを優先
                "profession":
                    (
                        current.get(
                            "job_category"
                        )
                        or
                        "職種未設定"
                    ),

                # 現在年収のみ
                "income":
                    incomes,

                "careerStages":
                    career_stages,

                "companies":
                    companies,

                "view_count":
                    view_count_map.get(
                        uid,
                        0
                    ),

                "career_type":
                    aspiration_by_user.get(
                        uid
                    ),

                # -----------------------------------------
                # Recommendation
                # -----------------------------------------

                "similarity_score":
                    similarity[
                        "score"
                    ],

                "similarity_raw_score":
                    similarity[
                        "raw_score"
                    ],

                "similarity_headline":
                    similarity[
                        "headline"
                    ],

                "similarity_reasons": [
                    reason[
                        "label"
                    ]
                    for reason
                    in similarity[
                        "reasons"
                    ]
                ],
            })


        return JSONResponse(
            content={

                "careers":
                    careers,

                "baseProfileCompleteness":
                    calculate_base_profile_completeness(
                        base_profile
                    ),
            }
        )


    except HTTPException:
        raise


    except Exception as e:

        logger.exception(
            "Error on "
            "get_similar_career_stories: %s",
            e
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "類似ユーザー取得に"
                "失敗しました"
            )
        )


    finally:

        cursor.close()
        db.close()


# =========================================================
# Profile completeness
# =========================================================

def calculate_base_profile_completeness(
    profile
):

    fields = [

        profile.get(
            "birthdate"
        ),

        profile.get(
            "job_category"
        ),

        profile.get(
            "industry"
        ),

        profile.get(
            "career_type"
        ),

        profile.get(
            "company_path"
        ),

        profile.get(
            "institutions"
        ),
    ]


    registered = sum(
        1
        for value
        in fields
        if value
    )


    return round(
        registered
        /
        len(fields)
        *
        100
    )