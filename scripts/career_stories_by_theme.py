from datetime import date as _date, datetime

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from .register_user import get_db_connection


router = APIRouter()


# =========================================================
# Theme definition
# =========================================================

THEME_DEFINITIONS = {

    "income": {
        "title": "収入を上げたい",
        "description":
            "収入について悩んだ人が、"
            "何を考え、どんな選択をしたのか。",
        "keywords": [
            "年収",
            "給与",
            "給料",
            "収入",
            "報酬",
            "待遇",
        ],
        "decision_types": [],
    },


    # =====================================================
    # 転職するか迷っている
    #
    # 重要：
    # 「転職した人」を探すのではなく、
    # 「転職するか、残るか、異動するかを迷った人」
    # を探すテーマとして扱う。
    # =====================================================

    "change": {
        "title": "転職するか迷っている",
        "description":
            "転職するか、今の環境に残るか。"
            "同じ分岐に立った人の選択を見る。",

        "keywords": [
            "転職",
            "会社を変える",
            "環境を変える",
            "他社",
            "今の会社",
            "現職",
            "残る",
            "続ける",
            "辞める",
            "退職",
            "異動",
            "社内異動",
        ],

        # changeテーマでは
        # decision_typeそのものを
        # メインのTheme判定には使わない。
        "decision_types": [],

        # ---------------------------------------------
        # 既存データ救済用
        #
        # dilemma_text等に「転職」という文字がなくても、
        # 現在の検証データのように
        # decision_type=転職 のStoryは弱く残す。
        #
        # あくまでFallback。
        # ---------------------------------------------
        "fallback_decision_types": [
            "転職",
        ],
    },


    "stay": {
        "title": "今の仕事を続けるか迷っている",
        "description":
            "今の場所に残るか、別の道へ進むか。"
            "同じように迷った人の選択を見る。",
        "keywords": [
            "今の仕事",
            "現職",
            "今の会社",
            "残る",
            "続ける",
            "辞める",
            "退職",
            "異動",
            "環境を変える",
        ],
        "decision_types": [],
    },


    "management": {
        "title": "管理職になるか迷っている",
        "description":
            "管理職へ進むか、専門性を深めるか。"
            "それぞれの選択を見る。",
        "keywords": [
            "管理職",
            "マネジメント",
            "マネージャー",
            "昇進",
            "昇格",
            "専門職",
            "スペシャリスト",
            "プレイヤー",
        ],
        "decision_types": [
            "昇進",
        ],
    },


    "independent": {
        "title": "独立・起業を考えている",
        "description":
            "会社員を続けるか、独立するか。"
            "その分岐を経験した人の選択を見る。",
        "keywords": [
            "独立",
            "起業",
            "フリーランス",
            "自営業",
            "会社を辞める",
            "事業",
        ],
        "decision_types": [
            "独立",
            "起業",
        ],
    },


    "workstyle": {
        "title": "働き方を変えたい",
        "description":
            "働く場所や時間、生活とのバランスを"
            "見直した人の選択を見る。",
        "keywords": [
            "働き方",
            "ワークライフバランス",
            "リモート",
            "在宅",
            "残業",
            "勤務時間",
            "労働時間",
            "育児",
            "子育て",
            "家庭",
            "家族",
        ],
        "decision_types": [],
    },
}


# =========================================================
# Helper
# =========================================================

def normalize_text(value):
    """
    Noneを空文字へ変換し、
    キーワード判定用の文字列にする。
    """

    if value is None:
        return ""

    return str(value).strip().lower()


def contains_keyword(
    value,
    keywords
):
    """
    指定文字列にテーマのキーワードが
    1つでも含まれているか。
    """

    text = normalize_text(
        value
    )

    if not text:
        return False

    return any(
        normalize_text(keyword) in text
        for keyword in keywords
    )


# =========================================================
# Decision Path
# =========================================================

def get_decision_path(
    decision_type
):
    """
    Career Decisionの種類を、
    Career Overview上の
    「実際に選んだ道」へ変換する。

    DBカラムは追加しない。
    decision_typeから都度生成する。

    転職
        → change / 転職した

    現職継続
        → stay / 残った

    異動
        → internal / 社内異動した
    """

    decision_type = (
        str(
            decision_type
            or ""
        )
        .strip()
    )


    # -----------------------------------------------------
    # 転職した
    # -----------------------------------------------------

    if decision_type == "転職":

        return {
            "key": "change",
            "label": "転職した",
        }


    # -----------------------------------------------------
    # 現職に残った
    #
    # 「現職継続」を正式値として想定する。
    #
    # その他は将来的な既存データ互換を考慮した
    # Fallback。
    # -----------------------------------------------------

    if decision_type in [
        "現職継続",
        "継続",
        "残留",
        "現職に残る",
    ]:

        return {
            "key": "stay",
            "label": "残った",
        }


    # -----------------------------------------------------
    # 社内異動した
    # -----------------------------------------------------

    if decision_type == "異動":

        return {
            "key": "internal",
            "label": "社内異動した",
        }


    # -----------------------------------------------------
    # その他
    # -----------------------------------------------------

    return {
        "key": "other",
        "label": (
            decision_type
            or
            "その他の道を選んだ"
        ),
    }


# =========================================================
# Theme Match
# =========================================================

def calculate_change_theme_match_score(
    decision,
    theme_definition
):
    """
    「転職するか迷っている」専用判定。

    重要：
    最終的に転職したかどうかではなく、

    「転職するか、残るか、異動するか」

    という分岐について
    迷っていたかを優先する。


    優先順位：

    dilemma_text
        何に迷っていたか
        +6

    trigger_text
        何がきっかけだったか
        +3

    title
        Decisionのタイトル
        +2

    priority_text
        何を重視したか
        +1


    既存互換：

    上記に何も一致しない場合だけ、
    decision_type=転職 を +1 で残す。
    """

    score = 0

    matched_reasons = []

    keywords = (
        theme_definition.get(
            "keywords",
            []
        )
    )


    # -----------------------------------------------------
    # 1. 何に迷ったか
    # -----------------------------------------------------

    if contains_keyword(
        decision.get(
            "dilemma_text"
        ),
        keywords
    ):

        score += 6

        matched_reasons.append(
            "dilemma_text"
        )


    # -----------------------------------------------------
    # 2. きっかけ
    # -----------------------------------------------------

    if contains_keyword(
        decision.get(
            "trigger_text"
        ),
        keywords
    ):

        score += 3

        matched_reasons.append(
            "trigger_text"
        )


    # -----------------------------------------------------
    # 3. タイトル
    # -----------------------------------------------------

    if contains_keyword(
        decision.get(
            "title"
        ),
        keywords
    ):

        score += 2

        matched_reasons.append(
            "title"
        )


    # -----------------------------------------------------
    # 4. 重視したこと
    # -----------------------------------------------------

    if contains_keyword(
        decision.get(
            "priority_text"
        ),
        keywords
    ):

        score += 1

        matched_reasons.append(
            "priority_text"
        )


    # -----------------------------------------------------
    # 5. 既存データ用Fallback
    #
    # 例：
    #
    # decision_type = 転職
    # dilemma_text = TEST2
    #
    # のような現在の検証データを
    # いきなり消さないため。
    # -----------------------------------------------------

    if score == 0:

        decision_type = normalize_text(
            decision.get(
                "decision_type"
            )
        )


        fallback_decision_types = [
            normalize_text(
                value
            )
            for value
            in theme_definition.get(
                "fallback_decision_types",
                []
            )
        ]


        if (
            decision_type
            and
            decision_type
            in fallback_decision_types
        ):

            score = 1

            matched_reasons.append(
                "decision_type_fallback"
            )


    return (
        score,
        matched_reasons
    )


def calculate_default_theme_match_score(
    decision,
    theme_definition
):
    """
    change以外のThemeについては
    既存仕様をそのまま維持する。

    decision_type : +5
    dilemma_text  : +3
    priority_text : +2
    trigger_text  : +1
    """

    score = 0

    matched_reasons = []


    decision_type = normalize_text(
        decision.get(
            "decision_type"
        )
    )


    theme_decision_types = [
        normalize_text(
            value
        )
        for value
        in theme_definition.get(
            "decision_types",
            []
        )
    ]


    keywords = (
        theme_definition.get(
            "keywords",
            []
        )
    )


    # -----------------------------------------------------
    # 1. Decision Type
    # -----------------------------------------------------

    if (
        decision_type
        and
        decision_type
        in theme_decision_types
    ):

        score += 5

        matched_reasons.append(
            "decision_type"
        )


    # -----------------------------------------------------
    # 2. Dilemma
    # -----------------------------------------------------

    if contains_keyword(
        decision.get(
            "dilemma_text"
        ),
        keywords
    ):

        score += 3

        matched_reasons.append(
            "dilemma_text"
        )


    # -----------------------------------------------------
    # 3. Priority
    # -----------------------------------------------------

    if contains_keyword(
        decision.get(
            "priority_text"
        ),
        keywords
    ):

        score += 2

        matched_reasons.append(
            "priority_text"
        )


    # -----------------------------------------------------
    # 4. Trigger
    # -----------------------------------------------------

    if contains_keyword(
        decision.get(
            "trigger_text"
        ),
        keywords
    ):

        score += 1

        matched_reasons.append(
            "trigger_text"
        )


    return (
        score,
        matched_reasons
    )


def calculate_theme_match_score(
    decision,
    theme_key,
    theme_definition
):
    """
    Themeに応じて
    適切な判定ロジックを使用する。
    """

    if theme_key == "change":

        return (
            calculate_change_theme_match_score(
                decision,
                theme_definition
            )
        )


    return (
        calculate_default_theme_match_score(
            decision,
            theme_definition
        )
    )


# =========================================================
# Date helpers
# =========================================================

def normalize_date(value):
    """
    DBの日付をソート用dateへ変換する。
    """

    if (
        value is None
        or
        value == ""
    ):
        return None


    if isinstance(
        value,
        datetime
    ):
        return value.date()


    if isinstance(
        value,
        _date
    ):
        return value


    try:

        return datetime.strptime(
            str(value),
            "%Y-%m-%d"
        ).date()


    except Exception:

        return None


def calculate_age(
    birthdate
):
    """
    生年月日から現在年齢を算出する。
    """

    value = normalize_date(
        birthdate
    )


    if value is None:
        return None


    today = _date.today()


    return (
        today.year
        - value.year
        - (
            (today.month, today.day)
            <
            (value.month, value.day)
        )
    )


def year_from_date(
    value
):
    """
    Career Journey表示用に
    年だけ返す。
    """

    normalized = normalize_date(
        value
    )


    if normalized is None:
        return None


    return normalized.year


def safe_label(
    value,
    is_private=False
):
    """
    非公開企業は企業名を出さない。
    """

    if is_private:
        return "非公開"


    return (
        str(value).strip()
        if value
        else ""
    )


# =========================================================
# Selection
# =========================================================

def select_decisions_for_response(
    ranked_decisions,
    theme_key,
    limit=12
):
    """
    APIで返すDecisionを選択する。


    通常Theme：
        関連度順で最大12件。


    change Theme：
        「転職した」
        「残った」
        「社内異動した」

        が存在する場合は、
        まず各ルートから1件ずつ採用する。

        残りを関連度順で埋める。


    目的：
        上位12件が全部
        「転職した人」になるのを防ぐ。
    """


    # -----------------------------------------------------
    # change以外は今まで通り
    # -----------------------------------------------------

    if theme_key != "change":

        return ranked_decisions[
            :limit
        ]


    selected = []

    selected_ids = set()


    # -----------------------------------------------------
    # まず3つのルートを1件ずつ確保
    # -----------------------------------------------------

    for path_key in [
        "change",
        "stay",
        "internal",
    ]:

        for decision in ranked_decisions:

            decision_path = (
                decision.get(
                    "decision_path"
                )
                or
                {}
            )


            if (
                decision_path.get(
                    "key"
                )
                !=
                path_key
            ):
                continue


            decision_id = (
                decision.get(
                    "id"
                )
            )


            if (
                decision_id
                in selected_ids
            ):
                continue


            selected.append(
                decision
            )


            selected_ids.add(
                decision_id
            )


            break


    # -----------------------------------------------------
    # 残りを関連度順で埋める
    # -----------------------------------------------------

    for decision in ranked_decisions:

        if (
            len(selected)
            >=
            limit
        ):
            break


        decision_id = (
            decision.get(
                "id"
            )
        )


        if (
            decision_id
            in selected_ids
        ):
            continue


        selected.append(
            decision
        )


        selected_ids.add(
            decision_id
        )


    return selected[
        :limit
    ]


# =========================================================
# API
# =========================================================

@router.get(
    "/career-stories-by-theme/"
)
async def get_career_stories_by_theme(
    theme: str
):

    # -----------------------------------------------------
    # Theme validation
    # -----------------------------------------------------

    theme_key = (
        theme
        or ""
    ).strip().lower()


    if (
        theme_key
        not in THEME_DEFINITIONS
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid theme"
        )


    theme_definition = (
        THEME_DEFINITIONS[
            theme_key
        ]
    )


    db = get_db_connection()

    cursor = None


    try:

        cursor = db.cursor(
            dictionary=True
        )


        # =================================================
        # 1. Career Decision取得
        #
        # Career Storyとして最低限、
        # 職歴を1件以上持つユーザーだけ対象。
        # =================================================

        cursor.execute(
            """
            SELECT
                cd.id,
                cd.user_id,
                cd.job_experience_id,
                cd.role_history_id,

                cd.title,
                cd.decision_type,
                cd.occurred_at,

                cd.trigger_text,
                cd.dilemma_text,
                cd.priority_text,
                cd.result_text

            FROM career_decisions AS cd

            WHERE EXISTS (
                SELECT 1
                FROM job_experiences AS je
                WHERE je.user_id = cd.user_id
                  AND je.company_name IS NOT NULL
                  AND je.company_name <> ''
            )

            ORDER BY
                cd.user_id ASC,

                CASE
                    WHEN cd.occurred_at IS NULL
                    THEN 1
                    ELSE 0
                END ASC,

                cd.occurred_at DESC,
                cd.id DESC
            """
        )


        all_decisions = (
            cursor.fetchall()
        )


        # =================================================
        # 2. Themeとの関連度を計算
        # =================================================

        matched_decisions = []


        for decision in all_decisions:

            (
                match_score,
                matched_reasons
            ) = calculate_theme_match_score(
                decision,
                theme_key,
                theme_definition
            )


            if match_score <= 0:
                continue


            # ---------------------------------------------
            # 実際に選んだ道
            #
            # DBへ保存せず、
            # decision_typeから生成する。
            # ---------------------------------------------

            decision_path = (
                get_decision_path(
                    decision.get(
                        "decision_type"
                    )
                )
            )


            # ---------------------------------------------
            # change Themeでは
            #
            # 現在のOverviewで比較する
            #
            # 転職
            # 現職継続
            # 異動
            #
            # の3ルートだけを対象にする。
            #
            # 「すべて」の件数と
            # 各タブの件数が合わなくなることを防ぐ。
            # ---------------------------------------------

            if (
                theme_key == "change"
                and
                decision_path[
                    "key"
                ]
                not in [
                    "change",
                    "stay",
                    "internal",
                ]
            ):

                continue


            decision[
                "theme_match_score"
            ] = (
                match_score
            )


            decision[
                "theme_match_reasons"
            ] = (
                matched_reasons
            )


            decision[
                "decision_path"
            ] = (
                decision_path
            )


            matched_decisions.append(
                decision
            )


        # =================================================
        # 3. ユーザーごとに
        # 最も関連度の高いDecisionを選ぶ
        #
        # 1人が大量に表示されるのを防ぐ。
        # =================================================

        best_decision_by_user = {}


        for decision in matched_decisions:

            user_id = (
                decision[
                    "user_id"
                ]
            )


            current = (
                best_decision_by_user.get(
                    user_id
                )
            )


            if current is None:

                best_decision_by_user[
                    user_id
                ] = (
                    decision
                )

                continue


            current_score = (
                current[
                    "theme_match_score"
                ]
            )


            new_score = (
                decision[
                    "theme_match_score"
                ]
            )


            # ---------------------------------------------
            # より関連度が高いDecisionを採用
            # ---------------------------------------------

            if (
                new_score
                >
                current_score
            ):

                best_decision_by_user[
                    user_id
                ] = (
                    decision
                )

                continue


            # ---------------------------------------------
            # 同点なら新しいDecisionを優先
            # ---------------------------------------------

            if (
                new_score
                ==
                current_score
            ):

                current_date = (
                    normalize_date(
                        current.get(
                            "occurred_at"
                        )
                    )
                    or
                    _date.min
                )


                new_date = (
                    normalize_date(
                        decision.get(
                            "occurred_at"
                        )
                    )
                    or
                    _date.min
                )


                if (
                    new_date
                    >
                    current_date
                ):

                    best_decision_by_user[
                        user_id
                    ] = (
                        decision
                    )


        # =================================================
        # 4. Story単位に並び替え
        # =================================================

        ranked_decisions = sorted(

            best_decision_by_user.values(),

            key=lambda item: (

                item.get(
                    "theme_match_score",
                    0
                ),

                normalize_date(
                    item.get(
                        "occurred_at"
                    )
                )
                or
                _date.min,

                item.get(
                    "id"
                )
                or
                0,

            ),

            reverse=True

        )


        # =================================================
        # 5. 最大12件
        #
        # changeでは、
        # 違う選択肢がある場合は
        # なるべく比較できるようにする。
        # =================================================

        selected_decisions = (
            select_decisions_for_response(
                ranked_decisions,
                theme_key,
                limit=12
            )
        )


        # =================================================
        # 6. 各ユーザーのCareer Story情報を取得
        # =================================================

        stories = []


        for decision in selected_decisions:

            user_id = (
                decision[
                    "user_id"
                ]
            )


            # ---------------------------------------------
            # User
            # ---------------------------------------------

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
                (
                    user_id,
                )
            )


            user = (
                cursor.fetchone()
            )


            if not user:
                continue


            # ---------------------------------------------
            # Education
            # ---------------------------------------------

            cursor.execute(
                """
                SELECT
                    institution,
                    education_start,
                    hide_institution

                FROM education

                WHERE user_id = %s

                ORDER BY
                    education_start ASC
                """,
                (
                    user_id,
                )
            )


            education_rows = (
                cursor.fetchall()
            )


            # ---------------------------------------------
            # Job Experience
            # ---------------------------------------------

            cursor.execute(
                """
                SELECT
                    id,
                    company_name,
                    industry,
                    position,
                    job_category,
                    job_sub_category,
                    work_start_period,
                    work_end_period,
                    is_private

                FROM job_experiences

                WHERE user_id = %s

                ORDER BY
                    work_start_period ASC,
                    id ASC
                """,
                (
                    user_id,
                )
            )


            jobs = (
                cursor.fetchall()
            )


            if not jobs:
                continue


            # ---------------------------------------------
            # Career Journey
            # ---------------------------------------------

            career_stages = []


            # ---------------------------------------------
            # Education
            # ---------------------------------------------

            for education in education_rows:

                institution = safe_label(
                    education.get(
                        "institution"
                    ),
                    bool(
                        education.get(
                            "hide_institution"
                        )
                    )
                )


                if institution:

                    career_stages.append({

                        "type":
                            "education",

                        "year":
                            year_from_date(
                                education.get(
                                    "education_start"
                                )
                            ),

                        "stage":
                            (
                                f"{institution} 入学"
                            )

                    })


            # ---------------------------------------------
            # Job Experience
            # ---------------------------------------------

            for job in jobs:

                company_name = safe_label(
                    job.get(
                        "company_name"
                    ),
                    bool(
                        job.get(
                            "is_private"
                        )
                    )
                )


                if company_name:

                    career_stages.append({

                        "type":
                            "company",

                        "year":
                            year_from_date(
                                job.get(
                                    "work_start_period"
                                )
                            ),

                        "stage":
                            (
                                f"{company_name} 入社"
                            )

                    })


            # ---------------------------------------------
            # 現在職
            #
            # 現在勤務中を優先。
            # なければ最新職歴。
            # ---------------------------------------------

            jobs_for_current = sorted(

                jobs,

                key=lambda job: (

                    normalize_date(
                        job.get(
                            "work_end_period"
                        )
                    )
                    is None,

                    normalize_date(
                        job.get(
                            "work_start_period"
                        )
                    )
                    or
                    _date.min,

                    job.get(
                        "id"
                    )
                    or
                    0,

                ),

                reverse=True

            )


            current_job = (
                jobs_for_current[
                    0
                ]
                if jobs_for_current
                else {}
            )


            profession = (
                current_job.get(
                    "job_category"
                )
                or
                current_job.get(
                    "position"
                )
                or
                ""
            )


            # ---------------------------------------------
            # Decision Path
            # ---------------------------------------------

            decision_path = (
                decision.get(
                    "decision_path"
                )
                or
                get_decision_path(
                    decision.get(
                        "decision_type"
                    )
                )
            )


            # ---------------------------------------------
            # Response
            # ---------------------------------------------

            stories.append({

                "id":
                    user[
                        "id"
                    ],


                "username":
                    (
                        user.get(
                            "username"
                        )
                        or
                        "Career GPS User"
                    ),


                "age":
                    calculate_age(
                        user.get(
                            "birthdate"
                        )
                    ),


                "profession":
                    profession,


                "careerStages":
                    career_stages,


                "decision": {

                    "id":
                        decision.get(
                            "id"
                        ),


                    "decision_type":
                        (
                            decision.get(
                                "decision_type"
                            )
                            or
                            ""
                        ),


                    # -------------------------------------
                    # Overview表示用の派生値
                    #
                    # DBカラムではない。
                    # -------------------------------------

                    "decision_path":
                        decision_path,


                    "title":
                        (
                            decision.get(
                                "title"
                            )
                            or
                            ""
                        ),


                    "trigger_text":
                        (
                            decision.get(
                                "trigger_text"
                            )
                            or
                            ""
                        ),


                    "dilemma_text":
                        (
                            decision.get(
                                "dilemma_text"
                            )
                            or
                            ""
                        ),


                    "priority_text":
                        (
                            decision.get(
                                "priority_text"
                            )
                            or
                            ""
                        ),
                    "result_text":
                        (
                            decision.get(
                                "result_text"
                            )
                            or
                            ""
                        ),

                },


                "theme_match_score":
                    (
                        decision.get(
                            "theme_match_score",
                            0
                        )
                    ),


                "theme_match_reasons":
                    (
                        decision.get(
                            "theme_match_reasons",
                            []
                        )
                    ),

            })


        # =================================================
        # 7. Response
        # =================================================

        return JSONResponse(
            content={

                "theme":
                    theme_key,


                "theme_title":
                    (
                        theme_definition[
                            "title"
                        ]
                    ),


                "theme_description":
                    (
                        theme_definition[
                            "description"
                        ]
                    ),


                "count":
                    len(
                        stories
                    ),


                "stories":
                    stories,

            }
        )


    except HTTPException:

        raise


    except Exception as error:

        print(
            "career-stories-by-theme error:",
            error
        )


        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to get "
                "career stories by theme"
            )
        )


    finally:

        if cursor is not None:
            cursor.close()

        db.close()  