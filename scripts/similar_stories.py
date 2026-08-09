import logging
import re
from collections import defaultdict
from datetime import date

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


# 「近さ」の重み
WEIGHTS = {
    "job_category": 30,
    "industry": 25,
    "career_type": 20,
    "age": 15,
    "company": 6,
    "institution": 4,
}


# =========================================================
# Normalize helpers
# =========================================================

def normalize_text(value):
    """
    比較用の基本正規化。
    表示用データそのものは変更しない。
    """
    if not value:
        return ""

    value = str(value).strip().lower()

    # 全角スペース・通常スペースを除去
    value = re.sub(r"[\s　]+", "", value)

    return value


def normalize_company_name(name):
    """
    会社名比較用。
    株式会社などの法人格を除外する。
    """
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
        value = value.replace(keyword, "")

    return value.strip()


def normalize_institution_name(name):
    """
    学校名比較用。

    「大学院」を先に除去することが重要。
    「大学」を先に消すと「○○大学院」→「○○院」になるため。
    """
    value = normalize_text(name)

    if not value:
        return ""

    keywords = [
        "大学大学院",
        "大学院",
        "大學",
        "大学",
    ]

    for keyword in keywords:
        value = value.replace(keyword, "")

    return value.strip()


def calculate_age(birthdate):
    if not birthdate:
        return None

    today = date.today()

    return (
        today.year
        - birthdate.year
        - (
            (today.month, today.day)
            < (birthdate.month, birthdate.day)
        )
    )


def safe_year(value):
    if not value:
        return None

    try:
        return value.year
    except AttributeError:
        return None


# =========================================================
# Similarity
# =========================================================

def calculate_similarity(base, candidate):
    """
    Career GPS用の類似度計算。

    ポイント:
    ・未設定同士は一致扱いしない
    ・職種/業界/志向を重視
    ・年齢は段階評価
    ・会社/学校は補助的
    ・一致理由を返す
    """

    score = 0
    reasons = []
    strong_match_count = 0

    # -----------------------------------------------------
    # 1. 職種
    # -----------------------------------------------------

    base_job = normalize_text(base.get("job_category"))
    candidate_job = normalize_text(candidate.get("job_category"))

    if (
        base_job
        and candidate_job
        and base_job == candidate_job
    ):
        score += WEIGHTS["job_category"]
        strong_match_count += 1

        reasons.append({
            "type": "job_category",
            "label": "同じ職種",
            "weight": WEIGHTS["job_category"],
        })

    # -----------------------------------------------------
    # 2. 業界
    # -----------------------------------------------------

    base_industry = normalize_text(base.get("industry"))
    candidate_industry = normalize_text(candidate.get("industry"))

    if (
        base_industry
        and candidate_industry
        and base_industry == candidate_industry
    ):
        score += WEIGHTS["industry"]
        strong_match_count += 1

        reasons.append({
            "type": "industry",
            "label": "同じ業界",
            "weight": WEIGHTS["industry"],
        })

    # -----------------------------------------------------
    # 3. キャリア志向
    # -----------------------------------------------------

    base_career_type = normalize_text(base.get("career_type"))
    candidate_career_type = normalize_text(candidate.get("career_type"))

    if (
        base_career_type
        and candidate_career_type
        and base_career_type == candidate_career_type
    ):
        score += WEIGHTS["career_type"]
        strong_match_count += 1

        reasons.append({
            "type": "career_type",
            "label": "大切にしていることが近い",
            "weight": WEIGHTS["career_type"],
        })

    # -----------------------------------------------------
    # 4. 年齢
    # -----------------------------------------------------

    base_age = base.get("age")
    candidate_age = candidate.get("age")

    if (
        base_age is not None
        and candidate_age is not None
    ):
        age_diff = abs(base_age - candidate_age)

        if age_diff <= 2:
            age_score = 15
            age_label = "年代がとても近い"

        elif age_diff <= 5:
            age_score = 10
            age_label = "年代が近い"

        elif age_diff <= 8:
            age_score = 5
            age_label = "近い世代"

        else:
            age_score = 0
            age_label = None

        if age_score:
            score += age_score

            reasons.append({
                "type": "age",
                "label": age_label,
                "weight": age_score,
            })

    # -----------------------------------------------------
    # 5. 現在 / 最新会社
    # -----------------------------------------------------

    base_company = normalize_company_name(
        base.get("company")
    )

    candidate_company = normalize_company_name(
        candidate.get("company")
    )

    if (
        base_company
        and candidate_company
        and base_company == candidate_company
    ):
        score += WEIGHTS["company"]

        reasons.append({
            "type": "company",
            "label": "同じ会社・組織の経験",
            "weight": WEIGHTS["company"],
        })

    # -----------------------------------------------------
    # 6. 学校
    # -----------------------------------------------------

    base_institution = normalize_institution_name(
        base.get("institution")
    )

    candidate_institution = normalize_institution_name(
        candidate.get("institution")
    )

    if (
        base_institution
        and candidate_institution
        and base_institution == candidate_institution
    ):
        score += WEIGHTS["institution"]

        reasons.append({
            "type": "institution",
            "label": "近い学歴・学校背景",
            "weight": WEIGHTS["institution"],
        })

    # -----------------------------------------------------
    # 情報量
    # -----------------------------------------------------

    completeness_fields = [
        candidate.get("job_category"),
        candidate.get("industry"),
        candidate.get("career_type"),
        candidate.get("birthdate"),
        candidate.get("company"),
        candidate.get("institution"),
    ]

    completeness = sum(
        1
        for value in completeness_fields
        if value
    )

    # -----------------------------------------------------
    # 弱すぎる候補を少し抑制
    # -----------------------------------------------------
    #
    # 職種・業界・志向のどれも一致せず、
    # 年齢/学校/会社だけ近い人は
    # 「Career Storyとして近い」とは言いにくい。
    #

    if strong_match_count == 0:
        score *= 0.55

    return {
        "score": round(score, 2),
        "reasons": sorted(
            reasons,
            key=lambda item: item["weight"],
            reverse=True,
        ),
        "strong_match_count": strong_match_count,
        "completeness": completeness,
    }


# =========================================================
# API
# =========================================================

@router.get("/similar-career-stories/")
async def get_similar_users(
    target_user_id: int = Query(None),
    current_user: User = Depends(get_current_user),
):
    """
    Career GPS:
    「あなたに近いCareer Story」を取得する。

    target_user_id が指定されていればそのユーザー、
    指定されなければログインユーザーを基準にする。
    """

    base_user_id = (
        target_user_id
        if target_user_id
        else current_user.id
    )

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    try:

        # =================================================
        # 1. 基準ユーザー
        # =================================================

        cursor.execute(
            """
            SELECT
                id,
                username,
                birthdate
            FROM users
            WHERE id = %s
            LIMIT 1
            """,
            (base_user_id,),
        )

        base_user_row = cursor.fetchone()

        if not base_user_row:
            raise HTTPException(
                status_code=404,
                detail="対象ユーザーが見つかりません",
            )

        # -------------------------------------------------
        # 最新職歴
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                company_name,
                industry,
                job_category,
                work_start_period
            FROM job_experiences
            WHERE user_id = %s
            ORDER BY
                CASE
                    WHEN work_end_period IS NULL THEN 0
                    ELSE 1
                END,
                work_start_period DESC
            LIMIT 1
            """,
            (base_user_id,),
        )

        base_job = cursor.fetchone() or {}

        # -------------------------------------------------
        # 学歴
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                institution
            FROM education
            WHERE user_id = %s
            ORDER BY education_start ASC
            LIMIT 1
            """,
            (base_user_id,),
        )

        base_education = cursor.fetchone() or {}

        # -------------------------------------------------
        # キャリア志向
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                type
            FROM career_aspirations
            WHERE user_id = %s
            LIMIT 1
            """,
            (base_user_id,),
        )

        base_aspiration = cursor.fetchone() or {}

        base_profile = {
            "id": base_user_id,
            "birthdate": base_user_row.get("birthdate"),
            "age": calculate_age(
                base_user_row.get("birthdate")
            ),
            "company": base_job.get("company_name"),
            "industry": base_job.get("industry"),
            "job_category": base_job.get("job_category"),
            "institution": base_education.get("institution"),
            "career_type": base_aspiration.get("type"),
        }

        # =================================================
        # 2. 候補ユーザー
        # =================================================
        #
        # SQLでは複雑なスコア計算をしない。
        # 最新職歴など必要情報だけ取得して、
        # Python側で明示的に評価する。
        #

        cursor.execute(
            """
            SELECT
                u.id,
                u.username,
                u.birthdate,

                (
                    SELECT j.company_name
                    FROM job_experiences j
                    WHERE j.user_id = u.id
                    ORDER BY
                        CASE
                            WHEN j.work_end_period IS NULL THEN 0
                            ELSE 1
                        END,
                        j.work_start_period DESC
                    LIMIT 1
                ) AS company_name,

                (
                    SELECT j.industry
                    FROM job_experiences j
                    WHERE j.user_id = u.id
                    ORDER BY
                        CASE
                            WHEN j.work_end_period IS NULL THEN 0
                            ELSE 1
                        END,
                        j.work_start_period DESC
                    LIMIT 1
                ) AS industry,

                (
                    SELECT j.job_category
                    FROM job_experiences j
                    WHERE j.user_id = u.id
                    ORDER BY
                        CASE
                            WHEN j.work_end_period IS NULL THEN 0
                            ELSE 1
                        END,
                        j.work_start_period DESC
                    LIMIT 1
                ) AS job_category,

                (
                    SELECT e.institution
                    FROM education e
                    WHERE e.user_id = u.id
                    ORDER BY e.education_start ASC
                    LIMIT 1
                ) AS institution,

                (
                    SELECT ca.type
                    FROM career_aspirations ca
                    WHERE ca.user_id = u.id
                    LIMIT 1
                ) AS career_type

            FROM users u
            WHERE u.id != %s
            """,
            (base_user_id,),
        )

        candidate_rows = cursor.fetchall()

        # =================================================
        # 3. Pythonで類似度計算
        # =================================================

        scored_candidates = []

        for row in candidate_rows:

            candidate_profile = {
                "id": row["id"],
                "birthdate": row.get("birthdate"),
                "age": calculate_age(
                    row.get("birthdate")
                ),
                "company": row.get("company_name"),
                "industry": row.get("industry"),
                "job_category": row.get("job_category"),
                "institution": row.get("institution"),
                "career_type": row.get("career_type"),
            }

            result = calculate_similarity(
                base_profile,
                candidate_profile,
            )

            if result["score"] <= 0:
                continue

            scored_candidates.append({
                "user_id": row["id"],
                "score": result["score"],
                "reasons": result["reasons"],
                "strong_match_count": result["strong_match_count"],
                "completeness": result["completeness"],
            })

        # -------------------------------------------------
        # スコア
        # → 強い一致数
        # → 情報充実度
        # の順
        # -------------------------------------------------

        scored_candidates.sort(
            key=lambda item: (
                item["score"],
                item["strong_match_count"],
                item["completeness"],
            ),
            reverse=True,
        )

        scored_candidates = scored_candidates[
            :MAX_RESULTS
        ]

        if not scored_candidates:
            return JSONResponse(
                content={
                    "careers": [],
                    "baseProfileCompleteness": (
                        calculate_base_profile_completeness(
                            base_profile
                        )
                    ),
                }
            )

        user_ids = [
            item["user_id"]
            for item in scored_candidates
        ]

        score_map = {
            item["user_id"]: item
            for item in scored_candidates
        }

        # =================================================
        # 4. ユーザー基本情報
        # =================================================

        placeholders = ", ".join(
            ["%s"] * len(user_ids)
        )

        cursor.execute(
            f"""
            SELECT
                id,
                username,
                birthdate
            FROM users
            WHERE id IN ({placeholders})
            """,
            tuple(user_ids),
        )

        user_rows = cursor.fetchall()

        career_dict = {}

        for row in user_rows:

            uid = row["id"]

            career_dict[uid] = {
                "id": uid,
                "name": row.get("username") or "匿名",
                "birthYear": (
                    row["birthdate"].year
                    if row.get("birthdate")
                    else None
                ),
                "profession": None,
                "income": [],
                "careerStages": [],
                "companies": [],
                "view_count": 0,
                "career_type": None,

                # 新規
                "similarity_score": (
                    score_map[uid]["score"]
                ),
                "similarity_reasons": [
                    reason["label"]
                    for reason
                    in score_map[uid]["reasons"]
                ],
            }

        # =================================================
        # 5. 学歴
        # =================================================

        cursor.execute(
            f"""
            SELECT
                user_id,
                institution,
                education_start,
                hide_institution
            FROM education
            WHERE user_id IN ({placeholders})
            ORDER BY
                user_id,
                education_start ASC
            """,
            tuple(user_ids),
        )

        education_rows = cursor.fetchall()

        for row in education_rows:

            uid = row["user_id"]

            if uid not in career_dict:
                continue

            institution = (
                row.get("institution")
                if row.get("hide_institution") == 0
                else "非公開"
            )

            if (
                row.get("education_start")
                and institution
            ):
                career_dict[uid][
                    "careerStages"
                ].append({
                    "year": safe_year(
                        row["education_start"]
                    ),
                    "stage": f"{institution} 入学",
                })

        # =================================================
        # 6. 職歴
        # =================================================

        cursor.execute(
            f"""
            SELECT
                user_id,
                company_name,
                industry,
                job_category,
                salary,
                work_start_period,
                work_end_period,
                is_private
            FROM job_experiences
            WHERE user_id IN ({placeholders})
            ORDER BY
                user_id,
                work_start_period ASC
            """,
            tuple(user_ids),
        )

        job_rows = cursor.fetchall()

        latest_job_map = {}

        for row in job_rows:

            uid = row["user_id"]

            if uid not in career_dict:
                continue

            company_name = (
                row.get("company_name")
                if row.get("is_private") == 0
                else "非公開"
            )

            # ---------------------------------------------
            # Career Stage
            # ---------------------------------------------

            if (
                row.get("work_start_period")
                and company_name
            ):
                career_dict[uid][
                    "careerStages"
                ].append({
                    "year": safe_year(
                        row["work_start_period"]
                    ),
                    "stage": f"{company_name} 入社",
                })

            # ---------------------------------------------
            # Company
            # ---------------------------------------------

            if company_name:

                career_dict[uid][
                    "companies"
                ].append({
                    "name": company_name,
                    "industry": (
                        row.get("industry")
                        or "不明"
                    ),
                    "startYear": (
                        safe_year(
                            row.get(
                                "work_start_period"
                            )
                        )
                        or "不明"
                    ),
                })

            # ---------------------------------------------
            # Income
            # ---------------------------------------------

            if row.get("salary") is not None:

                career_dict[uid][
                    "income"
                ].append({
                    "income": row["salary"]
                })

            # ---------------------------------------------
            # 最新職歴判定
            # ---------------------------------------------

            current_priority = (
                1
                if row.get("work_end_period") is None
                else 0
            )

            start_value = (
                row.get("work_start_period")
                or date.min
            )

            existing = latest_job_map.get(uid)

            if (
                existing is None
                or (
                    current_priority,
                    start_value,
                )
                >
                (
                    existing["priority"],
                    existing["start"],
                )
            ):
                latest_job_map[uid] = {
                    "priority": current_priority,
                    "start": start_value,
                    "job_category": (
                        row.get("job_category")
                        or "職種未設定"
                    ),
                }

        for uid, latest in latest_job_map.items():

            if uid in career_dict:
                career_dict[uid][
                    "profession"
                ] = latest["job_category"]

        # =================================================
        # 7. Career aspiration
        # =================================================

        cursor.execute(
            f"""
            SELECT
                user_id,
                type
            FROM career_aspirations
            WHERE user_id IN ({placeholders})
            """,
            tuple(user_ids),
        )

        aspiration_rows = cursor.fetchall()

        for row in aspiration_rows:

            uid = row["user_id"]

            if (
                uid in career_dict
                and not career_dict[uid][
                    "career_type"
                ]
            ):
                career_dict[uid][
                    "career_type"
                ] = row.get("type")

        # =================================================
        # 8. View count
        # =================================================

        cursor.execute(
            f"""
            SELECT
                user_id,
                view_count
            FROM profile_views
            WHERE user_id IN ({placeholders})
            """,
            tuple(user_ids),
        )

        view_rows = cursor.fetchall()

        for row in view_rows:

            uid = row["user_id"]

            if uid in career_dict:
                career_dict[uid][
                    "view_count"
                ] = row.get(
                    "view_count"
                ) or 0

        # =================================================
        # 9. Timeline sort
        # =================================================

        for career in career_dict.values():

            career["careerStages"].sort(
                key=lambda item: (
                    item.get("year")
                    if isinstance(
                        item.get("year"),
                        int,
                    )
                    else 9999
                )
            )

            if not career["profession"]:
                career["profession"] = (
                    "職種未設定"
                )

        # =================================================
        # 10. 類似順を維持
        # =================================================

        careers_list = [
            career_dict[uid]
            for uid in user_ids
            if uid in career_dict
        ]

        return JSONResponse(
            content={
                "careers": careers_list,
                "baseProfileCompleteness": (
                    calculate_base_profile_completeness(
                        base_profile
                    )
                ),
            }
        )

    except HTTPException:
        raise

    except Exception as e:

        logger.exception(
            "Error on get_similar_career_stories: %s",
            e,
        )

        raise HTTPException(
            status_code=500,
            detail="類似ユーザー取得に失敗しました",
        )

    finally:

        cursor.close()
        db.close()


# =========================================================
# Profile completeness
# =========================================================

def calculate_base_profile_completeness(profile):

    fields = [
        profile.get("birthdate"),
        profile.get("job_category"),
        profile.get("industry"),
        profile.get("career_type"),
        profile.get("company"),
        profile.get("institution"),
    ]

    registered = sum(
        1
        for value in fields
        if value
    )

    return round(
        registered / len(fields) * 100
    )