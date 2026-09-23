from datetime import date as _date, datetime

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from .register_user import get_db_connection


router = APIRouter()


# =========================================================
# Common
# =========================================================

CHANGE_ROUTE_ORDER = [
    "change",
    "stay",
    "internal",
]


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
    # 「転職した人」ではなく、
    # 「転職するか、残るか、異動するかを迷った人」
    # を扱う。
    # =====================================================

    "change": {
        "title": "転職するか迷っている",

        "description":
            "転職するか、今の環境に残るか。"
            "同じ分岐に立った人の選択を見る。",

        # -----------------------------------------------------
        # 実際のテーマ判定では
        # strong / context / alternative を使用する。
        #
        # keywordsは互換・参照用として残す。
        # -----------------------------------------------------
        "keywords": [
            "転職",
            "他社",
            "会社を変える",
            "職場を変える",
            "退職",
            "辞める",
            "今の会社",
            "現職",
            "今の仕事",
            "今の環境",
            "残る",
            "続ける",
            "異動",
            "社内異動",
        ],

        "decision_types": [],

        # -----------------------------------------------------
        # 強い転職検討Evidence。
        #
        # これらは単独でも
        # changeテーマとの関連性が高い。
        # -----------------------------------------------------
        "strong_keywords": [
            "転職",
            "他社",
            "会社を変える",
            "職場を変える",
            "退職",
            "辞める",
        ],

        # -----------------------------------------------------
        # 現職側の文脈。
        #
        # これ単独ではchange扱いしない。
        # -----------------------------------------------------
        "context_keywords": [
            "今の会社",
            "現職",
            "今の仕事",
            "今の環境",
        ],

        # -----------------------------------------------------
        # 現職文脈と組み合わさった場合に
        # 転職・残留・異動の分岐として扱う語。
        # -----------------------------------------------------
        "alternative_keywords": [
            "残る",
            "続ける",
            "異動",
            "社内異動",
            "環境を変える",
        ],

        # -----------------------------------------------------
        # 現行検証データ救済。
        #
        # 本文にテーマEvidenceがない場合だけ、
        # decision_type=転職 を弱いFallbackとして残す。
        # -----------------------------------------------------
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
# Change dilemma groups
#
# DBへは保存しない。
# Career Decision本文からその都度派生する。
#
# 1Decisionが複数Groupに属してもよい。
# =========================================================

CHANGE_DILEMMA_GROUPS = {

    "growth": {
        "label": "成長機会",
        "keywords": [
            "成長",
            "成長機会",
            "スキルアップ",
            "スキル",
            "市場価値",
            "キャリアアップ",
            "挑戦",
            "経験を積",
            "専門性",
        ],
    },


    "income": {
        "label": "年収・待遇",
        "keywords": [
            "年収",
            "給与",
            "給料",
            "収入",
            "報酬",
            "待遇",
            "昇給",
        ],
    },


    "workstyle": {
        "label": "働き方・生活",
        "keywords": [
            "働き方",
            "ワークライフバランス",
            "wlb",
            "残業",
            "リモート",
            "在宅",
            "勤務時間",
            "労働時間",
            "育児",
            "子育て",
            "家庭",
            "家族",
            "通勤",
            "勤務地",
            "転勤",
        ],
    },


    "role": {
        "label": "仕事内容・役割",
        "keywords": [
            "仕事内容",
            "やりたいこと",
            "業務内容",
            "役割",
            "職種",
            "業界",
            "配属",
            "異動",
            "専門職",
            "マネジメント",
            "キャリアチェンジ",
        ],
    },


    "relationship": {
        "label": "人間関係・組織",
        "keywords": [
            "上司",
            "人間関係",
            "チーム",
            "組織",
            "社風",
            "文化",
            "評価",
            "職場環境",
        ],
    },


    "stability": {
        "label": "安定・将来不安",
        "keywords": [
            "安定",
            "福利厚生",
            "雇用",
            "将来性",
            "会社の将来",
            "経営",
            "不安定",
            "倒産",
        ],
    },

}


# =========================================================
# Text helper
# =========================================================

def normalize_text(value):
    """
    None -> ""。
    判定用にtrim + lowercase。
    """

    if value is None:
        return ""

    return (
        str(value)
        .strip()
        .lower()
    )


def contains_keyword(
    value,
    keywords
):
    """
    keywordが1つでも含まれるか。
    """

    text = normalize_text(
        value
    )

    if not text:
        return False

    return any(
        normalize_text(keyword)
        in text
        for keyword
        in keywords
    )


# =========================================================
# Decision Path
# =========================================================

def get_decision_path(
    decision_type
):
    """
    DBへカラム追加せず、
    decision_typeから表示用Routeを生成。
    """

    decision_type = (
        str(
            decision_type
            or ""
        )
        .strip()
    )


    if decision_type == "転職":

        return {
            "key": "change",
            "label": "転職した",
        }


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


    if decision_type in [
        "異動",
        "社内異動",
    ]:

        return {
            "key": "internal",
            "label": "社内異動した",
        }


    return {
        "key": "other",
        "label": (
            decision_type
            or
            "その他の道を選んだ"
        ),
    }


# =========================================================
# Change theme evidence
# =========================================================

def calculate_change_field_score(
    value,
    theme_definition,
    strong_score,
    context_score
):
    """
    changeテーマ判定。

    1.
    転職 / 他社 / 退職 等の
    強いEvidenceがあればstrong_score。

    2.
    「現職」という単語だけでは不足。

    「今の会社」＋「残る」
    「現職」＋「異動」

    のように、
    context + alternative が同じ文章にある場合のみ
    弱いchange Evidenceとして扱う。
    """

    strong_keywords = (
        theme_definition.get(
            "strong_keywords",
            []
        )
    )

    context_keywords = (
        theme_definition.get(
            "context_keywords",
            []
        )
    )

    alternative_keywords = (
        theme_definition.get(
            "alternative_keywords",
            []
        )
    )


    if contains_keyword(
        value,
        strong_keywords
    ):

        return (
            strong_score,
            "strong"
        )


    has_context = (
        contains_keyword(
            value,
            context_keywords
        )
    )

    has_alternative = (
        contains_keyword(
            value,
            alternative_keywords
        )
    )


    if (
        has_context
        and
        has_alternative
    ):

        return (
            context_score,
            "context_pair"
        )


    return (
        0,
        None
    )


# =========================================================
# Change theme match
# =========================================================

def calculate_change_theme_match_score(
    decision,
    theme_definition
):
    """
    「転職するか迷っている」専用。

    最終結果ではなく、
    転職 / 残留 / 異動という分岐を
    本当に検討していたかを見る。

    dilemma_textを最優先。
    """

    score = 0

    matched_reasons = []


    field_settings = [

        (
            "dilemma_text",
            8,
            5
        ),

        (
            "trigger_text",
            4,
            2
        ),

        (
            "title",
            3,
            2
        ),

        (
            "priority_text",
            1,
            1
        ),

    ]


    for (
        field_name,
        strong_score,
        context_score
    ) in field_settings:

        field_score, evidence_type = (
            calculate_change_field_score(
                decision.get(
                    field_name
                ),
                theme_definition,
                strong_score,
                context_score
            )
        )


        if field_score <= 0:
            continue


        score += field_score

        matched_reasons.append(
            (
                f"{field_name}:"
                f"{evidence_type}"
            )
        )


    # -----------------------------------------------------
    # Existing-data fallback
    # -----------------------------------------------------

    if score == 0:

        decision_type = normalize_text(
            decision.get(
                "decision_type"
            )
        )


        fallback_types = [
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
            in fallback_types
        ):

            score = 1

            matched_reasons.append(
                "decision_type_fallback"
            )


    return (
        score,
        matched_reasons
    )


# =========================================================
# Default theme match
# =========================================================

def calculate_default_theme_match_score(
    decision,
    theme_definition
):
    """
    change以外は既存仕様を維持。
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
    Theme別の判定ロジック。
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
# Change dilemma group
# =========================================================

def calculate_change_dilemma_groups(
    decision
):
    """
    changeテーマ内を、

    growth
    income
    workstyle
    role
    relationship
    stability

    へ分類。

    DB保存はしない。

    1Decisionが複数Groupに入ってもよい。

    dilemma_textを最重要にする。
    """

    field_weights = [

        (
            "dilemma_text",
            5
        ),

        (
            "trigger_text",
            3
        ),

        (
            "title",
            2
        ),

        (
            "priority_text",
            1
        ),

    ]


    matched_groups = []


    for (
        group_key,
        group_definition
    ) in CHANGE_DILEMMA_GROUPS.items():

        group_score = 0

        matched_fields = []


        keywords = (
            group_definition.get(
                "keywords",
                []
            )
        )


        for (
            field_name,
            weight
        ) in field_weights:

            if contains_keyword(
                decision.get(
                    field_name
                ),
                keywords
            ):

                group_score += weight

                matched_fields.append(
                    field_name
                )


        if group_score <= 0:
            continue


        matched_groups.append({

            "key":
                group_key,

            "label":
                group_definition[
                    "label"
                ],

            "score":
                group_score,

            "matched_fields":
                matched_fields,

        })


    group_order = {
        key: index
        for index, key
        in enumerate(
            CHANGE_DILEMMA_GROUPS.keys()
        )
    }


    matched_groups.sort(
        key=lambda item: (
            item[
                "score"
            ],
            -group_order.get(
                item[
                    "key"
                ],
                999
            ),
        ),
        reverse=True
    )


    return matched_groups


def get_group_score(
    decision,
    group_key
):
    """
    Decisionの特定group score。
    """

    for group in (
        decision.get(
            "dilemma_groups",
            []
        )
        or
        []
    ):

        if (
            group.get(
                "key"
            )
            ==
            group_key
        ):

            return (
                group.get(
                    "score",
                    0
                )
                or
                0
            )


    return 0


# =========================================================
# Date helper
# =========================================================

def normalize_date(value):

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

    if is_private:
        return "非公開"


    return (
        str(value).strip()
        if value
        else ""
    )


# =========================================================
# Ranking helpers
# =========================================================

def decision_rank_key(
    decision
):
    """
    通常Themeの並び。
    """

    return (

        decision.get(
            "theme_match_score",
            0
        ),

        normalize_date(
            decision.get(
                "occurred_at"
            )
        )
        or
        _date.min,

        decision.get(
            "id"
        )
        or
        0,

    )


def decision_group_rank_key(
    decision,
    group_key
):
    """
    同一Dilemma Group内での優先順位。

    まずDilemma Groupとの近さ。
    次にchangeテーマとの近さ。
    """

    return (

        get_group_score(
            decision,
            group_key
        ),

        decision.get(
            "theme_match_score",
            0
        ),

        normalize_date(
            decision.get(
                "occurred_at"
            )
        )
        or
        _date.min,

        decision.get(
            "id"
        )
        or
        0,

    )


# =========================================================
# Choose comparison group
# =========================================================

def choose_change_comparison_group(
    ranked_decisions
):
    """
    changeテーマ内で、

    同じDilemma Group
    ×
    異なるRoute

    が最も成立しているGroupを探す。


    優先：

    1. Route種類数
       3ルート > 2ルート

    2. 各Route代表の
       Dilemma Group Score合計

    3. Groupに属するDecision数
    """

    candidates = []


    group_order = {
        key: index
        for index, key
        in enumerate(
            CHANGE_DILEMMA_GROUPS.keys()
        )
    }


    for (
        group_key,
        group_definition
    ) in CHANGE_DILEMMA_GROUPS.items():

        group_decisions = [

            decision

            for decision
            in ranked_decisions

            if (
                get_group_score(
                    decision,
                    group_key
                )
                >
                0
            )

        ]


        if not group_decisions:
            continue


        route_best = {}


        for route_key in CHANGE_ROUTE_ORDER:

            route_candidates = [

                decision

                for decision
                in group_decisions

                if (
                    (
                        decision.get(
                            "decision_path"
                        )
                        or
                        {}
                    ).get(
                        "key"
                    )
                    ==
                    route_key
                )

            ]


            if not route_candidates:
                continue


            route_candidates.sort(
                key=lambda item:
                    decision_group_rank_key(
                        item,
                        group_key
                    ),
                reverse=True
            )


            route_best[
                route_key
            ] = (
                route_candidates[
                    0
                ]
            )


        route_count = len(
            route_best
        )


        # 2つ以上の異なる選択がないと
        # 「比較」にならない。
        if route_count < 2:
            continue


        representative_group_score = sum(

            get_group_score(
                decision,
                group_key
            )

            for decision
            in route_best.values()

        )


        candidates.append({

            "key":
                group_key,

            "label":
                group_definition[
                    "label"
                ],

            "route_count":
                route_count,

            "decision_count":
                len(
                    group_decisions
                ),

            "representative_group_score":
                representative_group_score,

            "route_best":
                route_best,

            "group_decisions":
                group_decisions,

            "group_order":
                group_order[
                    group_key
                ],

        })


    if not candidates:
        return None


    candidates.sort(

        key=lambda item: (

            item[
                "route_count"
            ],

            item[
                "representative_group_score"
            ],

            item[
                "decision_count"
            ],

            -item[
                "group_order"
            ],

        ),

        reverse=True

    )


    return candidates[
        0
    ]


# =========================================================
# Selection
# =========================================================

def select_decisions_for_response(
    ranked_decisions,
    theme_key,
    limit=12
):
    """
    Response対象を選ぶ。


    通常Theme
    ----------
    関連度順で最大limit件。


    change
    ------
    1.
    同じDilemma Groupで
    異なるRouteが2つ以上揃うGroupを探す。

    2.
    そのGroupの
    転職 / 残留 / 異動代表を先頭へ。

    3.
    同Groupの残りを優先。

    4.
    最後にTheme全体の関連度順で補完。


    Group比較が成立しない場合
    ----------------------------
    現行ロジックへFallback。

    転職 / 残留 / 異動から
    1件ずつ確保してから残りを埋める。
    """

    if theme_key != "change":

        return (
            ranked_decisions[
                :limit
            ],
            None
        )


    comparison_group = (
        choose_change_comparison_group(
            ranked_decisions
        )
    )


    selected = []

    selected_ids = set()


    def append_decision(
        decision
    ):

        if (
            decision is None
            or
            len(selected) >= limit
        ):
            return


        decision_id = (
            decision.get(
                "id"
            )
        )


        if (
            decision_id
            in selected_ids
        ):
            return


        selected.append(
            decision
        )

        selected_ids.add(
            decision_id
        )


    # =====================================================
    # A. Same Dilemma Group comparison
    # =====================================================

    if comparison_group:

        route_best = (
            comparison_group[
                "route_best"
            ]
        )


        # ---------------------------------------------
        # まず各Route代表
        # ---------------------------------------------

        for route_key in CHANGE_ROUTE_ORDER:

            append_decision(
                route_best.get(
                    route_key
                )
            )


        # ---------------------------------------------
        # 次に同じDilemma Groupの残り
        # ---------------------------------------------

        same_group_decisions = list(
            comparison_group[
                "group_decisions"
            ]
        )


        same_group_decisions.sort(
            key=lambda item:
                decision_group_rank_key(
                    item,
                    comparison_group[
                        "key"
                    ]
                ),
            reverse=True
        )


        for decision in same_group_decisions:

            append_decision(
                decision
            )


        # ---------------------------------------------
        # 最後にTheme全体から補完
        # ---------------------------------------------

        for decision in ranked_decisions:

            append_decision(
                decision
            )


        comparison_response = {

            "key":
                comparison_group[
                    "key"
                ],

            "label":
                comparison_group[
                    "label"
                ],

            "route_count":
                comparison_group[
                    "route_count"
                ],

        }


        return (
            selected[
                :limit
            ],
            comparison_response
        )


    # =====================================================
    # B. Fallback
    #
    # 同じDilemma GroupでRoute比較できない場合は
    # 現在の挙動を維持。
    # =====================================================

    for path_key in CHANGE_ROUTE_ORDER:

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


            append_decision(
                decision
            )

            break


    for decision in ranked_decisions:

        append_decision(
            decision
        )


    return (
        selected[
            :limit
        ],
        None
    )


# =========================================================
# API
# =========================================================

@router.get(
    "/career-stories-by-theme/"
)
async def get_career_stories_by_theme(
    theme: str,

    view: str = Query(
        "home"
    ),

    limit: int = Query(
        12,
        ge=1,
        le=300
    )
):

    theme_key = (
        theme
        or ""
    ).strip().lower()

    view_mode = (
        view
        or
        "home"
    ).strip().lower()


    if (
        view_mode
        not in [
            "home",
            "overview",
        ]
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid view"
        )


    if (
        theme_key
        not in
        THEME_DEFINITIONS
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
        # 2. Theme関連度
        # =================================================

        matched_decisions = []


        for decision in all_decisions:

            (
                match_score,
                matched_reasons
            ) = (
                calculate_theme_match_score(
                    decision,
                    theme_key,
                    theme_definition
                )
            )


            if match_score <= 0:
                continue


            decision_path = (
                get_decision_path(
                    decision.get(
                        "decision_type"
                    )
                )
            )


            # changeでは比較可能な3Routeのみ。
            if (
                theme_key == "change"
                and
                decision_path[
                    "key"
                ]
                not in
                CHANGE_ROUTE_ORDER
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


            # ---------------------------------------------
            # change専用Dilemma Group
            # ---------------------------------------------

            if theme_key == "change":

                dilemma_groups = (
                    calculate_change_dilemma_groups(
                        decision
                    )
                )


                decision[
                    "dilemma_groups"
                ] = (
                    dilemma_groups
                )


                decision[
                    "primary_dilemma_group"
                ] = (
                    dilemma_groups[
                        0
                    ]
                    if dilemma_groups
                    else None
                )


            else:

                decision[
                    "dilemma_groups"
                ] = []


                decision[
                    "primary_dilemma_group"
                ] = None


            matched_decisions.append(
                decision
            )


        # =================================================
        # 3. Userごとに最も関連するDecision
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
        # 4. Theme relevance ranking
        # =================================================

        ranked_decisions = sorted(

            best_decision_by_user.values(),

            key=
                decision_rank_key,

            reverse=True

        )


        # =================================================
        # 5. Response対象Selection
        # =================================================

        if view_mode == "overview":

            selected_decisions = (
                ranked_decisions[
                    :limit
                ]
            )


            comparison_group = None


            if theme_key == "change":

                best_group = (
                    choose_change_comparison_group(
                        ranked_decisions
                    )
                )


                if best_group:

                    comparison_group = {

                        "key":
                            best_group[
                                "key"
                            ],

                        "label":
                            best_group[
                                "label"
                            ],

                        "route_count":
                            best_group[
                                "route_count"
                            ],

                    }


        else:

            (
                selected_decisions,
                comparison_group
            ) = (
                select_decisions_for_response(
                    ranked_decisions,
                    theme_key,
                    limit=limit
                )
            )


        # =================================================
        # 6. User / Career情報
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


            for education in education_rows:

                institution = (
                    safe_label(
                        education.get(
                            "institution"
                        ),
                        bool(
                            education.get(
                                "hide_institution"
                            )
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
                            ),

                    })


            for job in jobs:

                company_name = (
                    safe_label(
                        job.get(
                            "company_name"
                        ),
                        bool(
                            job.get(
                                "is_private"
                            )
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
                            ),

                    })


            # ---------------------------------------------
            # Current Job
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
            # Response Story
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


                    # -------------------------------------
                    # Derived comparison metadata
                    #
                    # DBカラムではない。
                    # -------------------------------------

                    "dilemma_groups":
                        (
                            decision.get(
                                "dilemma_groups",
                                []
                            )
                        ),


                    "primary_dilemma_group":
                        (
                            decision.get(
                                "primary_dilemma_group"
                            )
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


                "view":
                    view_mode,


                "theme_title":
                    theme_definition[
                        "title"
                    ],


                "theme_description":
                    theme_definition[
                        "description"
                    ],


                # ---------------------------------------------
                # Homeの比較で採用した
                # 「同じ迷い」のグループ。
                # ---------------------------------------------
                "comparison_group":
                    comparison_group,


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