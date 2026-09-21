// ============================================================
// Career Detail / Career GPS
// career_detail.js
// ============================================================

let careerDetailIsLoggedIn = false;
let careerOutcomeChart = null;
let careerDetailCareerId = '';
let careerDetailDecisionId = '';
let careerDetailTheme = '';
let careerDetailPrimaryDecision = null;


document.addEventListener(
    'DOMContentLoaded',
    initializeCareerDetail
);


// ============================================================
// 1. Initialize
// ============================================================

async function initializeCareerDetail() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    careerDetailCareerId =
        normalizeText(
            params.get('id')
        );


    careerDetailDecisionId =
        normalizeText(
            params.get('decision_id')
        );


    careerDetailTheme =
        normalizeText(
            params.get('theme')
        )
        .toLowerCase();


    if (!careerDetailCareerId) {

        showPageError(
            '表示するキャリアが指定されていません。'
        );

        return;
    }


    try {

        careerDetailIsLoggedIn =
            await checkCareerDetailLoginStatus();


        const response =
            await fetch(
                `/career-detail/${encodeURIComponent(careerDetailCareerId)}`,
                {
                    method: 'GET',

                    headers: {
                        Accept: 'application/json'
                    },

                    credentials: 'include'
                }
            );


        if (!response.ok) {

            throw new Error(
                'キャリア情報を取得できませんでした。'
            );
        }


        const data =
            await response.json();


        const companies =
            Array.isArray(
                data.companies
            )
                ? sortCompaniesChronologically(
                    data.companies
                )
                : [];


        const decisions =
            Array.isArray(
                data.career_decisions
            )
                ? sortDecisionsNewestFirst(
                    data.career_decisions
                )
                : [];


        careerDetailPrimaryDecision =
            selectPrimaryDecision(
                decisions,
                careerDetailDecisionId
            );


        // ====================================================
        // Career Story View
        // ====================================================

        const hasCareerStory =
            companies.length > 0
            ||
            decisions.length > 0;


        if (hasCareerStory) {

            incrementCareerStoryView(
                careerDetailCareerId
            );


            if (
                typeof gtag
                ===
                'function'
            ) {

                gtag(
                    'event',
                    'career_story_view',
                    {
                        career_id:
                            careerDetailCareerId,

                        decision_id:
                            careerDetailPrimaryDecision?.id
                            || '',

                        theme:
                            careerDetailTheme
                            || '',

                        login_status:
                            careerDetailIsLoggedIn
                                ? 'logged_in'
                                : 'guest'
                    }
                );
            }
        }


        // ====================================================
        // Render
        // ====================================================

        configureCareerDetailNavigation();


        renderPersonSnapshot(
            data,
            companies,
            decisions
        );


        renderDecisionHero(
            careerDetailPrimaryDecision
        );


        renderDecisionProcess(
            careerDetailPrimaryDecision
        );


        renderAfterChoice(
            careerDetailPrimaryDecision,
            companies
        );


        renderLookingBack(
            careerDetailPrimaryDecision
        );


        renderCareerJourney(
            companies
        );


        renderOtherDecisions(
            decisions,
            careerDetailPrimaryDecision
        );


        updateCareerAccessUI();


    } catch (error) {

        console.error(
            'Career Detail initialization error:',
            error
        );


        showPageError(
            'キャリア情報の読み込みに失敗しました。'
        );
    }
}


// ============================================================
// 2. Login
// ============================================================

async function checkCareerDetailLoginStatus() {

    try {

        const response =
            await fetch(
                '/check-login-status/',
                {
                    method:
                        'GET',

                    headers: {
                        Accept:
                            'application/json'
                    },

                    credentials:
                        'include'
                }
            );


        return response.ok;


    } catch (error) {

        return false;
    }
}


// ============================================================
// 3. Decision Selection
// ============================================================

function selectPrimaryDecision(
    decisions,
    requestedDecisionId
) {

    if (
        !Array.isArray(
            decisions
        )
        ||
        decisions.length === 0
    ) {

        return null;
    }


    if (requestedDecisionId) {

        const requested =
            decisions.find(
                decision =>
                    String(
                        decision.id
                    )
                    ===
                    String(
                        requestedDecisionId
                    )
            );


        if (requested) {
            return requested;
        }
    }


    // decision_id がない既存URLとの互換
    return decisions[0];
}


// ============================================================
// 4. Decision Path
// ============================================================

function getDecisionPath(
    decisionType
) {

    const type =
        normalizeDisplayText(
            decisionType
        );


    if (
        type
        ===
        '転職'
    ) {

        return {
            key:
                'change',

            label:
                '転職した'
        };
    }


    if (
        type === '現職継続'
        ||
        type === '継続'
        ||
        type === '残留'
        ||
        type === '現職に残る'
    ) {

        return {
            key:
                'stay',

            label:
                '残った'
        };
    }


    if (
        type
        ===
        '異動'
    ) {

        return {
            key:
                'internal',

            label:
                '社内異動した'
        };
    }


    return {
        key:
            'other',

        label:
            type
            ||
            'その他'
    };
}


// ============================================================
// 5. Hero Title
// ============================================================

function createDecisionHeroTitle(
    decision
) {

    if (!decision) {

        return (
            'キャリアの意思決定'
        );
    }


    // --------------------------------------------------------
    // まずユーザーが入力したタイトル
    // --------------------------------------------------------

    const title =
        normalizeDisplayText(
            decision.title
        );


    if (title) {

        return truncateText(
            title,
            54
        );
    }


    // --------------------------------------------------------
    // タイトル未入力の場合
    // --------------------------------------------------------

    const type =
        normalizeDisplayText(
            decision.decision_type
        );


    const path =
        getDecisionPath(
            type
        );


    if (
        path.key
        ===
        'change'
    ) {

        return (
            '転職という選択'
        );
    }


    if (
        path.key
        ===
        'stay'
    ) {

        return (
            '今の会社に残るという選択'
        );
    }


    if (
        path.key
        ===
        'internal'
    ) {

        return (
            '社内で新しい道を選んだ'
        );
    }


    // 「その他という選択」は表示しない
    const genericTypes = [
        'その他',
        'other',
        'others'
    ];


    if (
        type
        &&
        !genericTypes.includes(
            type.toLowerCase()
        )
    ) {

        return truncateText(
            `${type}という選択`,
            54
        );
    }


    return (
        'キャリアの意思決定'
    );
}


// ============================================================
// 6. Navigation
// ============================================================

function configureCareerDetailNavigation() {

    const backLink =
        getElement(
            'career-detail-back-link'
        );


    const backLabel =
        getElement(
            'career-detail-back-label'
        );


    const nextLink =
        getElement(
            'career-next-story-link'
        );


    // theme は推測しない。
    // Overviewから渡されたthemeだけを引き継ぐ。

    const overviewUrl =
        careerDetailTheme
            ? (
                `Career_overview.html`
                +
                `?theme=${encodeURIComponent(careerDetailTheme)}`
            )
            : 'Career_overview.html';


    if (backLink) {

        backLink.href =
            overviewUrl;
    }


    if (nextLink) {

        nextLink.href =
            overviewUrl;
    }


    if (backLabel) {

        backLabel.textContent =
            careerDetailTheme === 'change'
                ? '「転職するか迷っている」に戻る'
                : 'キャリアストーリーに戻る';
    }
}


// ============================================================
// 7. Person / Current Snapshot
// ============================================================

function renderPersonSnapshot(
    data,
    companies,
    decisions
) {

    const avatar =
        getElement(
            'career-avatar'
        );


    const title =
        getElement(
            'career-person-title',
            'career-username'
        );


    const headline =
        getElement(
            'career-person-headline',
            'career-tagline'
        );


    const tags =
        getElement(
            'career-person-tags',
            'career-tags'
        );


    const snapshot =
        getElement(
            'career-current-snapshot',
            'career-snapshot-list'
        );


    const latestCompany =
        getLatestCompany(
            companies
        );


    const latestCareerPoint =
        getLatestCareerPoint(
            companies
        );


    const ageDecade =
        getAgeDecade(
            data.age
        );


    const profession =
        normalizeDisplayText(
            data.profession
        );


    const careerYears =
        calculateCareerYears(
            companies
        );


    const rawName =
        normalizeDisplayText(
            data.name
        );


    const displayName =
        getCareerDisplayName(
            rawName,
            ageDecade,
            profession
        );


    // --------------------------------------------------------
    // Avatar
    // --------------------------------------------------------

    if (avatar) {

        const avatarSource =
            rawName
            ||
            profession
            ||
            '?';


        avatar.textContent =
            avatarSource
                .charAt(0)
                .toUpperCase();
    }


    // --------------------------------------------------------
    // Name
    // --------------------------------------------------------

    if (title) {

        title.textContent =
            displayName;
    }


    // --------------------------------------------------------
    // Headline
    // --------------------------------------------------------

    if (headline) {

        headline.textContent =
            createCareerHeadline({
                ageDecade,
                profession,
                companies,
                careerYears,
                latestCompany
            });
    }


    // --------------------------------------------------------
    // Tags
    // --------------------------------------------------------

    if (tags) {

        const tagValues = [];


        if (profession) {

            tagValues.push(
                `#${profession}`
            );
        }


        if (
            companies.length
            >
            0
        ) {

            tagValues.push(
                `#経験${companies.length}社`
            );
        }


        if (
            decisions.length
            >
            0
        ) {

            tagValues.push(
                `#意思決定${decisions.length}件`
            );
        }


        tags.innerHTML =
            tagValues
                .map(
                    tag => `

                        <span class="tag-pill">
                            ${escapeHTML(tag)}
                        </span>

                    `
                )
                .join('');
    }


    // --------------------------------------------------------
    // Current Snapshot
    // --------------------------------------------------------

    if (!snapshot) {
        return;
    }


    const snapshotItems = [];


    if (profession) {

        snapshotItems.push({
            label:
                '現在の職種',

            value:
                profession
        });
    }


    if (
        latestCompany
        &&
        normalizeDisplayText(
            latestCompany.name
        )
    ) {

        snapshotItems.push({
            label:
                '現在の勤務先',

            value:
                normalizeDisplayText(
                    latestCompany.name
                )
        });
    }


    if (
        companies.length
        >
        0
    ) {

        snapshotItems.push({
            label:
                '経験社数',

            value:
                `${companies.length}社`
        });
    }


    if (
        latestCareerPoint
        &&
        isAvailableValue(
            latestCareerPoint.salary
        )
    ) {

        snapshotItems.push({
            label:
                '年収レンジ',

            value:
                normalizeDisplayText(
                    latestCareerPoint.salary
                )
        });
    }


    if (
        latestCareerPoint
        &&
        isAvailableValue(
            latestCareerPoint.satisfaction_level
        )
    ) {

        snapshotItems.push({
            label:
                '仕事満足度',

            value:
                formatSatisfaction(
                    latestCareerPoint.satisfaction_level
                )
        });
    }


    if (
        careerYears
        !==
        null
    ) {

        snapshotItems.push({
            label:
                'キャリア歴',

            value:
                careerYears === 0
                    ? '1年未満'
                    : `約${careerYears}年`
        });
    }


    snapshot.innerHTML =
        snapshotItems
            .map(
                item => `

                    <div class="snapshot-item">

                        <span class="snapshot-item__label">
                            ${escapeHTML(item.label)}
                        </span>

                        <strong class="snapshot-item__value">
                            ${escapeHTML(
                                String(item.value)
                            )}
                        </strong>

                    </div>

                `
            )
            .join('');
}


// ============================================================
// 8. Person Helpers
// ============================================================

function getCareerDisplayName(
    rawName,
    ageDecade,
    profession
) {

    if (
        rawName
        &&
        !looksLikeEmail(
            rawName
        )
    ) {

        return rawName;
    }


    const parts = [];


    if (ageDecade) {

        parts.push(
            ageDecade
        );
    }


    if (profession) {

        parts.push(
            profession
        );
    }


    return (
        parts.join('｜')
        ||
        rawName
        ||
        'Career Story'
    );
}


function createCareerHeadline({
    ageDecade,
    profession,
    companies,
    careerYears,
    latestCompany
}) {

    const pieces = [];


    if (ageDecade) {

        pieces.push(
            ageDecade
        );
    }


    if (
        companies.length
        >
        0
    ) {

        pieces.push(
            `${companies.length}社`
        );
    }


    if (
        careerYears
        !==
        null
    ) {

        pieces.push(
            careerYears === 0
                ? '1年未満'
                : `約${careerYears}年`
        );
    }


    const prefix =
        pieces.length > 0
            ? `${pieces.join('・')}。`
            : '';


    if (profession) {

        return (
            `${prefix}`
            +
            `${profession}領域を中心にキャリアを歩んできた人。`
        );
    }


    if (
        latestCompany
        &&
        normalizeDisplayText(
            latestCompany.name
        )
    ) {

        return (
            `${prefix}`
            +
            `${normalizeDisplayText(latestCompany.name)}で`
            +
            'キャリアを歩んできた人。'
        );
    }


    return (
        prefix
        ||
        'これまでのキャリアと意思決定を振り返ります。'
    );
}


// ============================================================
// 9. Decision Hero
// ============================================================

function renderDecisionHero(
    decision
) {

    const title =
        getElement(
            'career-decision-hero-title'
        );


    const dilemmaWrapper =
        getElement(
            'career-decision-dilemma-wrapper'
        );


    const dilemmaElement =
        getElement(
            'career-decision-dilemma'
        );


    const pathValue =
        getElement(
            'career-decision-path'
        );


    const dateElement =
        getElement(
            'career-decision-date'
        );


    const relatedCareer =
        getElement(
            'career-decision-related-career'
        );


    const legacyLead =
        getElement(
            'career-decision-hero-lead'
        );


    if (!decision) {

        if (title) {

            title.textContent =
                'この人のCareer Story';
        }


        if (dilemmaWrapper) {

            dilemmaWrapper.hidden =
                true;
        }


        if (pathValue) {

            pathValue.textContent =
                '-';
        }


        if (dateElement) {

            dateElement.textContent =
                '';
        }


        if (relatedCareer) {

            relatedCareer.textContent =
                '';
        }


        return;
    }


    const path =
        getDecisionPath(
            decision.decision_type
        );


    const dilemma =
        normalizeDisplayText(
            decision.dilemma_text
        );


    // --------------------------------------------------------
    // Title
    // --------------------------------------------------------

    if (title) {

        title.textContent =
            createDecisionHeroTitle(
                decision
            );
    }


    // --------------------------------------------------------
    // Dilemma
    //
    // Heroでは全文ではなく概要だけ。
    // 詳細全文はDecision Process 02で表示。
    // --------------------------------------------------------

    if (
        dilemmaWrapper
        &&
        dilemmaElement
    ) {

        if (dilemma) {

            dilemmaElement.textContent =
                truncateText(
                    dilemma,
                    96
                );


            dilemmaWrapper.hidden =
                false;

        } else {

            dilemmaElement.textContent =
                '';


            dilemmaWrapper.hidden =
                true;
        }
    }


    // --------------------------------------------------------
    // Selected path
    // --------------------------------------------------------

    if (pathValue) {

        pathValue.textContent =
            path.label;


        pathValue.dataset.path =
            path.key;
    }


    // --------------------------------------------------------
    // Legacy
    // --------------------------------------------------------

    if (legacyLead) {

        legacyLead.textContent =
            '';
    }


    // --------------------------------------------------------
    // Decision Date
    // --------------------------------------------------------

    if (dateElement) {

        dateElement.textContent =
            formatDecisionDate(
                decision.occurred_at
            );
    }


    // --------------------------------------------------------
    // Company / Department / Position
    // --------------------------------------------------------

    if (relatedCareer) {

        const related =
            [
                decision.company_name,
                decision.department,
                decision.position
            ]
            .map(
                normalizeDisplayText
            )
            .filter(Boolean)
            .join(' / ');


        relatedCareer.textContent =
            related;
    }
}


// ============================================================
// 10. Decision Process
//
// 01 きっかけ
// 02 迷い
// 03 判断軸
// 04 最後の決め手
//
// Result / Unexpected / Learning はここには置かない。
// ============================================================

function renderDecisionProcess(
    decision
) {

    const section =
        getElement(
            'career-turning-section'
        );


    const container =
        getElement(
            'career-turning-list'
        );


    if (
        !section
        ||
        !container
    ) {

        return;
    }


    if (!decision) {

        section.hidden =
            true;


        container.innerHTML =
            '';


        return;
    }


    const steps = [

        {
            step:
                '01',

            key:
                'trigger',

            phase:
                'きっかけ',

            question:
                'なぜ、この選択を考えた？',

            value:
                decision.trigger_text,

            public:
                true
        },


        {
            step:
                '02',

            key:
                'dilemma',

            phase:
                '迷い',

            question:
                '何に迷った？',

            value:
                decision.dilemma_text,

            public:
                true
        },


        {
            step:
                '03',

            key:
                'priority',

            phase:
                '判断軸',

            question:
                '何を大切にした？',

            value:
                decision.priority_text,

            public:
                true
        },


        {
            step:
                '04',

            key:
                'decision',

            phase:
                '決断',

            question:
                '最後の決め手は？',

            value:
                decision.final_reason,

            public:
                false
        }

    ];


    const availableSteps =
        steps.filter(
            step =>
                isAvailableValue(
                    step.value
                )
        );


    if (
        availableSteps.length
        ===
        0
    ) {

        section.hidden =
            true;


        container.innerHTML =
            '';


        return;
    }


    const visibleSteps =
        availableSteps.filter(
            step =>
                careerDetailIsLoggedIn
                ||
                step.public
        );


    if (
        visibleSteps.length
        ===
        0
    ) {

        section.hidden =
            true;


        container.innerHTML =
            '';


        return;
    }


    container.innerHTML = `

        <article class="career-decision-story-card">

            ${
                visibleSteps
                    .map(
                        step => `

                            <article
                                class="
                                    career-decision-step
                                    career-decision-step--${step.key}
                                "
                            >

                                <div class="career-decision-step__rail">

                                    <span class="career-decision-step__number">
                                        ${step.step}
                                    </span>

                                    <span class="career-decision-step__line">
                                    </span>

                                </div>


                                <div class="career-decision-step__body">

                                    <p class="career-decision-step__phase">
                                        ${escapeHTML(step.phase)}
                                    </p>


                                    <h3 class="career-decision-step__question">
                                        ${escapeHTML(step.question)}
                                    </h3>


                                    <p class="career-decision-step__answer">
                                        ${
                                            escapeHTML(
                                                normalizeDisplayText(
                                                    step.value
                                                )
                                            )
                                        }
                                    </p>

                                </div>

                            </article>

                        `
                    )
                    .join('')
            }

        </article>

    `;


    section.hidden =
        false;
}


// ============================================================
// 11. After the Choice
// ============================================================

function renderAfterChoice(
    decision,
    companies
) {

    const section =
        getElement(
            'career-outcome-section'
        );


    if (!section) {

        return;
    }


    const hasStory =
        renderAfterChoiceStory(
            decision
        );


    const hasOutcome =
        renderCareerOutcomeData(
            companies,
            decision
        );


    section.hidden =
        !(
            hasStory
            ||
            hasOutcome
        );
}


// ============================================================
// 12. After the Choice - Story
// ============================================================

function renderAfterChoiceStory(
    decision
) {

    const story =
        getElement(
            'career-after-choice-story'
        );


    const resultWrapper =
        getElement(
            'career-after-choice-result-wrapper'
        );


    const result =
        getElement(
            'career-after-choice-result'
        );


    const unexpectedWrapper =
        getElement(
            'career-after-choice-unexpected-wrapper'
        );


    const unexpected =
        getElement(
            'career-after-choice-unexpected'
        );


    const learningWrapper =
        getElement(
            'career-after-choice-learning-wrapper'
        );


    const learning =
        getElement(
            'career-after-choice-learning'
        );


    if (!story) {

        return false;
    }


    // Result / Unexpected / Learning は
    // 登録後の価値として扱う。

    if (
        !decision
        ||
        !careerDetailIsLoggedIn
    ) {

        story.hidden =
            true;


        return false;
    }


    const resultText =
        normalizeDisplayText(
            decision.result_text
        );


    const unexpectedText =
        normalizeDisplayText(
            decision.unexpected_result
        );


    const learningText =
        normalizeDisplayText(
            decision.learning_text
        );


    const hasResult =
        Boolean(
            resultText
        );


    const hasUnexpected =
        Boolean(
            unexpectedText
        );


    const hasLearning =
        Boolean(
            learningText
        );


    setTextBlock(
        resultWrapper,
        result,
        resultText
    );


    setTextBlock(
        unexpectedWrapper,
        unexpected,
        unexpectedText
    );


    setTextBlock(
        learningWrapper,
        learning,
        learningText
    );


    const hasStory =
        hasResult
        ||
        hasUnexpected
        ||
        hasLearning;


    story.hidden =
        !hasStory;


    return hasStory;
}


// ============================================================
// 13. Career Outcome Data
// ============================================================

function renderCareerOutcomeData(
    companies,
    decision
) {

    const kpis =
        getElement(
            'career-outcome-kpis'
        );


    const comparison =
        getElement(
            'career-outcome-comparison'
        );


    const chartWrapper =
        getElement(
            'career-outcome-chart-wrapper'
        );


    const lock =
        getElement(
            'career-outcome-lock'
        );


    if (!kpis) {

        return false;
    }


    const points =
        createCareerOutcomePoints(
            companies
        );


    if (
        points.length
        ===
        0
    ) {

        kpis.innerHTML =
            '';


        if (comparison) {

            comparison.hidden =
                true;


            comparison.innerHTML =
                '';
        }


        if (chartWrapper) {

            chartWrapper.hidden =
                true;
        }


        if (lock) {

            lock.hidden =
                true;
        }


        destroyCareerOutcomeChart();


        return false;
    }


    const latestPoint =
        getLatestCareerPointFromPoints(
            points
        );


    const kpiItems = [];


    if (
        latestPoint
        &&
        isAvailableValue(
            latestPoint.salary
        )
    ) {

        kpiItems.push({
            label:
                '現在の年収レンジ',

            value:
                normalizeDisplayText(
                    latestPoint.salary
                )
        });
    }


    if (
        latestPoint
        &&
        isAvailableValue(
            latestPoint.satisfaction_level
        )
    ) {

        kpiItems.push({
            label:
                '現在の仕事満足度',

            value:
                formatSatisfaction(
                    latestPoint.satisfaction_level
                )
        });
    }


    kpis.innerHTML =
        kpiItems
            .map(
                item => `

                    <div class="outcome-kpi">

                        <span class="outcome-kpi__label">
                            ${escapeHTML(item.label)}
                        </span>

                        <strong class="outcome-kpi__value">
                            ${
                                escapeHTML(
                                    String(item.value)
                                )
                            }
                        </strong>

                    </div>

                `
            )
            .join('');


    renderOutcomeComparison(
        comparison,
        points,
        decision
    );


    renderOutcomeTrend(
        chartWrapper,
        points
    );


    if (lock) {

        lock.hidden =
            true;
    }


    return true;
}


// ============================================================
// 14. Before / After
// ============================================================

function renderOutcomeComparison(
    container,
    points,
    decision
) {

    if (!container) {

        return;
    }


    const pair =
        getBeforeAfterPoints(
            points,
            decision
        );


    if (
        !pair.before
        ||
        !pair.after
    ) {

        container.hidden =
            true;


        container.innerHTML =
            '';


        return;
    }


    container.innerHTML = `

        <div class="career-outcome-comparison__column">

            <p class="career-outcome-comparison__eyebrow">
                BEFORE
            </p>

            <h3 class="career-outcome-comparison__title">
                選択前
            </h3>

            ${
                createOutcomeComparisonValue(
                    '年収',
                    pair.before.salary
                )
            }

            ${
                createOutcomeComparisonValue(
                    '仕事満足度',

                    isAvailableValue(
                        pair.before.satisfaction_level
                    )
                        ? formatSatisfaction(
                            pair.before.satisfaction_level
                        )
                        : ''
                )
            }

        </div>


        <div class="career-outcome-comparison__arrow">
            →
        </div>


        <div
            class="
                career-outcome-comparison__column
                career-outcome-comparison__column--after
            "
        >

            <p class="career-outcome-comparison__eyebrow">
                AFTER
            </p>

            <h3 class="career-outcome-comparison__title">
                選択後
            </h3>

            ${
                createOutcomeComparisonValue(
                    '年収',
                    pair.after.salary
                )
            }

            ${
                createOutcomeComparisonValue(
                    '仕事満足度',

                    isAvailableValue(
                        pair.after.satisfaction_level
                    )
                        ? formatSatisfaction(
                            pair.after.satisfaction_level
                        )
                        : ''
                )
            }

        </div>

    `;


    container.hidden =
        false;
}


function createOutcomeComparisonValue(
    label,
    value
) {

    if (
        !isAvailableValue(
            value
        )
    ) {

        return '';
    }


    return `

        <div class="career-outcome-comparison__value">

            <span>
                ${escapeHTML(label)}
            </span>

            <strong>
                ${
                    escapeHTML(
                        normalizeDisplayText(
                            value
                        )
                    )
                }
            </strong>

        </div>

    `;
}


// ============================================================
// 15. Before / After Point Selection
// ============================================================

function getBeforeAfterPoints(
    points,
    decision
) {

    if (
        !Array.isArray(
            points
        )
        ||
        points.length < 2
    ) {

        return {
            before:
                null,

            after:
                null
        };
    }


    const decisionDate =
        getSortableDate(
            decision?.occurred_at
        );


    if (
        decisionDate
        >
        0
    ) {

        const beforeCandidates =
            points.filter(
                point => {

                    const pointDate =
                        getPointSortableDate(
                            point
                        );


                    return (
                        pointDate > 0
                        &&
                        pointDate <= decisionDate
                    );
                }
            );


        const afterCandidates =
            points.filter(
                point =>
                    getPointSortableDate(
                        point
                    )
                    >
                    decisionDate
            );


        const before =
            beforeCandidates.length > 0
                ? beforeCandidates[
                    beforeCandidates.length - 1
                ]
                : null;


        const after =
            afterCandidates.length > 0
                ? afterCandidates[0]
                : null;


        if (
            before
            &&
            after
        ) {

            return {
                before,
                after
            };
        }
    }


    // Decision日時との紐付けが取れない場合のFallback

    return {
        before:
            points[0],

        after:
            points[
                points.length - 1
            ]
    };
}


// ============================================================
// 16. Outcome Trend
// ============================================================

function renderOutcomeTrend(
    chartWrapper,
    points
) {

    if (!chartWrapper) {

        return;
    }


    const satisfactionPoints =
        points.filter(
            point =>
                parseSatisfaction(
                    point.satisfaction_level
                )
                !==
                null
        );


    // ========================================================
    // 比較できる履歴が不足
    // ========================================================

    if (
        satisfactionPoints.length
        <
        2
    ) {

        destroyCareerOutcomeChart();


        setOutcomeWrapperCompact(
            chartWrapper
        );


        chartWrapper.innerHTML = `

            <div class="career-outcome-empty">

                <p class="career-outcome-empty__label">
                    CURRENT STATUS
                </p>

                <p class="career-outcome-empty__text">
                    現在は比較できる仕事満足度の履歴が十分ではありません。
                </p>

                <p class="career-outcome-empty__sub">
                    過去の役割履歴が増えると、
                    変化を時系列で確認できます。
                </p>

            </div>

        `;


        chartWrapper.hidden =
            false;


        return;
    }


    // ========================================================
    // Guest
    // ========================================================

    if (
        !careerDetailIsLoggedIn
    ) {

        destroyCareerOutcomeChart();


        setOutcomeWrapperCompact(
            chartWrapper
        );


        chartWrapper.innerHTML = `

            <div class="career-outcome-guest">

                <div class="career-outcome-guest__icon">
                    🔒
                </div>

                <p class="career-outcome-guest__title">
                    選択後の変化を詳しく見る
                </p>

                <p class="career-outcome-guest__text">
                    仕事満足度がキャリアの変化とともに
                    どう動いたのかを確認できます。
                </p>

                <a
                    href="/Register.html"
                    class="career-outcome-guest__cta"
                >
                    無料で続きを見る
                </a>

            </div>

        `;


        chartWrapper.hidden =
            false;


        return;
    }


    // ========================================================
    // Logged in
    // ========================================================

    restoreCareerOutcomeCanvas();


    resetOutcomeWrapperForChart(
        chartWrapper
    );


    renderCareerOutcomeChart(
        satisfactionPoints
    );
}


// ============================================================
// 17. Outcome Wrapper
// ============================================================

function setOutcomeWrapperCompact(
    wrapper
) {

    wrapper.classList.add(
        'is-compact'
    );


    wrapper.style.height =
        'auto';


    wrapper.style.minHeight =
        '0';
}


function resetOutcomeWrapperForChart(
    wrapper
) {

    wrapper.classList.remove(
        'is-compact'
    );


    wrapper.style.height =
        '';


    wrapper.style.minHeight =
        '';
}


// ============================================================
// 18. Career Outcome Points
// ============================================================

function createCareerOutcomePoints(
    companies
) {

    if (
        !Array.isArray(
            companies
        )
    ) {

        return [];
    }


    const points = [];


    companies.forEach(
        company => {

            const roles =
                Array.isArray(
                    company.roles
                )
                    ? company.roles
                    : [];


            const validRoles =
                roles.filter(
                    role =>
                        isAvailableValue(
                            role.salary
                        )
                        ||
                        isAvailableValue(
                            role.satisfaction_level
                        )
                );


            // ------------------------------------------------
            // Role履歴がある場合
            // ------------------------------------------------

            if (
                validRoles.length
                >
                0
            ) {

                validRoles.forEach(
                    (
                        role,
                        roleIndex
                    ) => {

                        points.push({

                            type:
                                'role',

                            companyId:
                                company.id,

                            company:
                                normalizeDisplayText(
                                    company.name
                                )
                                ||
                                '勤務先',

                            roleId:
                                role.id,

                            role:
                                normalizeDisplayText(
                                    role.position
                                )
                                ||
                                normalizeDisplayText(
                                    role.job_category
                                )
                                ||
                                `役割${roleIndex + 1}`,

                            department:
                                normalizeDisplayText(
                                    role.department
                                ),

                            start:
                                normalizeDateValue(
                                    role.start_period
                                ),

                            end:
                                normalizeDateValue(
                                    role.end_period
                                ),

                            startYear:
                                getYearFromDate(
                                    role.start_period
                                )
                                ||
                                normalizeYearValue(
                                    company.startYear
                                ),

                            endYear:
                                getYearFromDate(
                                    role.end_period
                                )
                                ||
                                normalizeYearValue(
                                    company.endYear
                                ),

                            salary:
                                role.salary,

                            satisfaction_level:
                                role.satisfaction_level,

                            displayOrder:
                                Number(
                                    role.display_order
                                )

                        });
                    }
                );


                return;
            }


            // ------------------------------------------------
            // Role履歴がない場合はCompany値
            // ------------------------------------------------

            if (
                isAvailableValue(
                    company.salary
                )
                ||
                isAvailableValue(
                    company.satisfaction_level
                )
            ) {

                points.push({

                    type:
                        'company',

                    companyId:
                        company.id,

                    company:
                        normalizeDisplayText(
                            company.name
                        )
                        ||
                        '勤務先',

                    roleId:
                        null,

                    role:
                        normalizeDisplayText(
                            company.position
                        )
                        ||
                        normalizeDisplayText(
                            company.job_category
                        ),

                    department:
                        normalizeDisplayText(
                            company.department
                        ),

                    start:
                        normalizeDateValue(
                            company.work_start_period
                        ),

                    end:
                        normalizeDateValue(
                            company.work_end_period
                        ),

                    startYear:
                        normalizeYearValue(
                            company.startYear
                        ),

                    endYear:
                        normalizeYearValue(
                            company.endYear
                        ),

                    salary:
                        company.salary,

                    satisfaction_level:
                        company.satisfaction_level,

                    displayOrder:
                        0

                });
            }
        }
    );


    points.sort(
        compareCareerOutcomePoints
    );


    return points;
}


// ============================================================
// 19. Outcome Point Sorting
// ============================================================

function compareCareerOutcomePoints(
    a,
    b
) {

    const aDate =
        getPointSortableDate(
            a
        );


    const bDate =
        getPointSortableDate(
            b
        );


    if (
        aDate > 0
        &&
        bDate > 0
        &&
        aDate !== bDate
    ) {

        return (
            aDate
            -
            bDate
        );
    }


    return (
        Number(
            a.companyId
            ||
            0
        )
        -
        Number(
            b.companyId
            ||
            0
        )
    );
}


function getPointSortableDate(
    point
) {

    const date =
        getSortableDate(
            point?.start
        );


    if (
        date
        >
        0
    ) {

        return date;
    }


    const year =
        Number(
            point?.startYear
        );


    if (
        Number.isFinite(
            year
        )
    ) {

        return (
            new Date(
                year,
                0,
                1
            )
            .getTime()
        );
    }


    return 0;
}


// ============================================================
// 20. Latest Career Point
// ============================================================

function getLatestCareerPoint(
    companies
) {

    return (
        getLatestCareerPointFromPoints(
            createCareerOutcomePoints(
                companies
            )
        )
    );
}


function getLatestCareerPointFromPoints(
    points
) {

    if (
        !Array.isArray(
            points
        )
        ||
        points.length === 0
    ) {

        return null;
    }


    const currentPoints =
        points.filter(
            isCurrentCareerPoint
        );


    if (
        currentPoints.length
        >
        0
    ) {

        return (
            currentPoints[
                currentPoints.length - 1
            ]
        );
    }


    return (
        points[
            points.length - 1
        ]
    );
}


function isCurrentCareerPoint(
    point
) {

    const end =
        normalizeDisplayText(
            point?.end
        )
        .toLowerCase();


    const endYear =
        normalizeDisplayText(
            point?.endYear
        )
        .toLowerCase();


    if (
        [
            '現時点',
            '現在',
            'present'
        ]
        .includes(
            endYear
        )
    ) {

        return true;
    }


    if (
        end
        ||
        /^\d{4}$/.test(
            endYear
        )
    ) {

        return false;
    }


    return true;
}


// ============================================================
// 21. Satisfaction Chart
// ============================================================

function renderCareerOutcomeChart(
    points
) {

    const canvas =
        getElement(
            'career-outcome-chart'
        );


    const wrapper =
        getElement(
            'career-outcome-chart-wrapper'
        );


    if (
        !canvas
        ||
        typeof Chart === 'undefined'
    ) {

        if (wrapper) {

            wrapper.hidden =
                true;
        }


        return;
    }


    const validPoints =
        points.filter(
            point =>
                parseSatisfaction(
                    point.satisfaction_level
                )
                !==
                null
        );


    if (
        validPoints.length
        <
        2
    ) {

        destroyCareerOutcomeChart();

        return;
    }


    const labels =
        validPoints.map(
            createOutcomePointLabel
        );


    const satisfactionValues =
        validPoints.map(
            point =>
                parseSatisfaction(
                    point.satisfaction_level
                )
        );


    destroyCareerOutcomeChart();


    careerOutcomeChart =
        new Chart(
            canvas,
            {

                type:
                    'line',


                data: {

                    labels,


                    datasets: [

                        {
                            label:
                                '仕事満足度',

                            data:
                                satisfactionValues,

                            borderColor:
                                '#1d5f9e',

                            backgroundColor:
                                '#1d5f9e',

                            borderWidth:
                                2.4,

                            pointRadius:
                                5,

                            pointHoverRadius:
                                6,

                            pointBorderWidth:
                                2,

                            pointBackgroundColor:
                                '#ffffff',

                            pointBorderColor:
                                '#1d5f9e',

                            spanGaps:
                                true,

                            tension:
                                0
                        }

                    ]
                },


                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,


                    interaction: {

                        mode:
                            'index',

                        intersect:
                            false
                    },


                    plugins: {

                        legend: {

                            position:
                                'top',

                            align:
                                'start',


                            labels: {

                                usePointStyle:
                                    true,

                                pointStyle:
                                    'circle',

                                boxWidth:
                                    8,

                                boxHeight:
                                    8,

                                padding:
                                    20,

                                color:
                                    '#637386',

                                font: {

                                    size:
                                        11,

                                    weight:
                                        '600'
                                }
                            }
                        },


                        tooltip: {

                            enabled:
                                true,


                            callbacks: {

                                title(context) {

                                    const index =
                                        context[0]
                                            ?.dataIndex;


                                    const point =
                                        validPoints[
                                            index
                                        ];


                                    if (!point) {

                                        return '';
                                    }


                                    return [
                                        point.company,
                                        point.role
                                    ]
                                    .filter(Boolean)
                                    .join(' / ');
                                },


                                label(context) {

                                    return (
                                        `満足度：`
                                        +
                                        `${context.parsed.y} / 5`
                                    );
                                }
                            }
                        }
                    },


                    scales: {

                        x: {

                            grid: {

                                display:
                                    false
                            },


                            border: {

                                display:
                                    false
                            },


                            ticks: {

                                color:
                                    '#637386',

                                font: {

                                    size:
                                        10
                                },

                                maxRotation:
                                    0,

                                minRotation:
                                    0,

                                autoSkip:
                                    false
                            }
                        },


                        y: {

                            min:
                                0,

                            max:
                                5.5,


                            grid: {

                                color:
                                    'rgba(13,39,68,0.07)'
                            },


                            border: {

                                display:
                                    false
                            },


                            ticks: {

                                stepSize:
                                    1,

                                color:
                                    '#8997a6',

                                font: {

                                    size:
                                        10
                                }
                            }
                        }
                    }
                }
            }
        );


    if (wrapper) {

        wrapper.hidden =
            false;
    }
}


function destroyCareerOutcomeChart() {

    if (careerOutcomeChart) {

        careerOutcomeChart.destroy();

        careerOutcomeChart =
            null;
    }
}


function restoreCareerOutcomeCanvas() {

    const wrapper =
        getElement(
            'career-outcome-chart-wrapper'
        );


    if (!wrapper) {

        return;
    }


    const existingCanvas =
        document.getElementById(
            'career-outcome-chart'
        );


    if (existingCanvas) {

        wrapper.hidden =
            false;


        return;
    }


    wrapper.innerHTML = `
        <canvas id="career-outcome-chart"></canvas>
    `;


    wrapper.hidden =
        false;
}


function createOutcomePointLabel(
    point
) {

    const start =
        point.start
            ? formatYearMonth(
                point.start
            )
            : (
                point.startYear
                    ? String(
                        point.startYear
                    )
                    : ''
            );


    const role =
        normalizeDisplayText(
            point.role
        );


    if (
        start
        &&
        role
    ) {

        return [
            start,
            role
        ];
    }


    return (
        start
        ||
        role
        ||
        normalizeDisplayText(
            point.company
        )
        ||
        'Career'
    );
}


// ============================================================
// 22. Looking Back
// ============================================================

function renderLookingBack(
    decision
) {

    const section =
        getElement(
            'career-looking-back-section'
        );


    const answerWrapper =
        getElement(
            'career-looking-back-answer-wrapper'
        );


    const answer =
        getElement(
            'career-looking-back-answer'
        );


    const reasonWrapper =
        getElement(
            'career-looking-back-reason-wrapper'
        );


    const reason =
        getElement(
            'career-looking-back-reason'
        );


    const messageSection =
        getElement(
            'career-message-section'
        );


    const message =
        getElement(
            'career-message'
        );


    const messageLock =
        getElement(
            'career-message-lock'
        );


    if (!section) {

        return;
    }


    // Looking Back自体を登録後の価値にする

    if (
        !decision
        ||
        !careerDetailIsLoggedIn
    ) {

        section.hidden =
            true;


        return;
    }


    const answerText =
        normalizeDisplayText(
            decision.same_choice_answer
        );


    const reasonText =
        normalizeDisplayText(
            decision.same_choice_reason
        );


    const adviceText =
        normalizeDisplayText(
            decision.advice_text
        );


    // --------------------------------------------------------
    // Same choice?
    // --------------------------------------------------------

    setTextBlock(
        answerWrapper,
        answer,
        answerText
    );


    // --------------------------------------------------------
    // Reason
    // --------------------------------------------------------

    setTextBlock(
        reasonWrapper,
        reason,
        reasonText
    );


    // --------------------------------------------------------
    // Advice to past self
    // --------------------------------------------------------

    if (
        messageSection
        &&
        message
    ) {

        if (adviceText) {

            message.innerHTML = `

                <p>
                    ${escapeHTML(adviceText)}
                </p>

            `;


            messageSection.hidden =
                false;

        } else {

            message.innerHTML =
                '';


            messageSection.hidden =
                true;
        }
    }


    if (messageLock) {

        messageLock.hidden =
            true;
    }


    const hasContent =
        Boolean(
            answerText
            ||
            reasonText
            ||
            adviceText
        );


    section.hidden =
        !hasContent;
}


// ============================================================
// 23. Career Context / Journey
// ============================================================

function renderCareerJourney(
    companies
) {

    const section =
        getElement(
            'career-journey-section'
        );


    const container =
        getElement(
            'career-journey-timeline'
        );


    if (!container) {

        return;
    }


    if (
        !Array.isArray(
            companies
        )
        ||
        companies.length === 0
    ) {

        if (section) {

            section.hidden =
                true;
        }


        container.innerHTML =
            '';


        return;
    }


    const journeyNodes =
        createJourneyNodes(
            companies
        );


    if (
        journeyNodes.length
        ===
        0
    ) {

        if (section) {

            section.hidden =
                true;
        }


        container.innerHTML =
            '';


        return;
    }


    const nodesHtml =
        journeyNodes
            .map(
                node => {

                    const period =
                        node.start
                            ? formatCareerPeriod(
                                node.start,
                                node.end
                            )
                            : formatCompanyPeriodFromNode(
                                node
                            );


                    return `

                        <article class="journey-node">

                            <span class="journey-node__year">
                                ${
                                    escapeHTML(
                                        node.startYear
                                            ? String(node.startYear)
                                            : ''
                                    )
                                }
                            </span>


                            <div class="journey-node__marker">
                            </div>


                            <h3 class="journey-node__company">
                                ${escapeHTML(node.company)}
                            </h3>


                            ${
                                node.role
                                    ? `

                                        <p class="journey-node__role">
                                            ${escapeHTML(node.role)}
                                        </p>

                                    `
                                    : ''
                            }


                            ${
                                node.department
                                    ? `

                                        <p class="journey-node__department">
                                            ${escapeHTML(node.department)}
                                        </p>

                                    `
                                    : ''
                            }


                            ${
                                period
                                    ? `

                                        <span class="journey-node__period">
                                            ${escapeHTML(period)}
                                        </span>

                                    `
                                    : ''
                            }

                        </article>

                    `;
                }
            )
            .join('');


    container.innerHTML = `

        <div
            class="journey-track"
            style="--journey-count: ${journeyNodes.length};"
        >

            ${nodesHtml}

        </div>

    `;


    if (section) {

        section.hidden =
            false;
    }
}


// ============================================================
// 24. Journey Nodes
// ============================================================

function createJourneyNodes(
    companies
) {

    const nodes = [];


    companies.forEach(
        company => {

            const companyName =
                normalizeDisplayText(
                    company.name
                )
                ||
                '勤務先';


            const roles =
                Array.isArray(
                    company.roles
                )
                    ? company.roles
                    : [];


            if (
                roles.length
                >
                0
            ) {

                roles.forEach(
                    role => {

                        nodes.push({

                            company:
                                companyName,

                            role:
                                normalizeDisplayText(
                                    role.position
                                )
                                ||
                                normalizeDisplayText(
                                    role.job_category
                                ),

                            department:
                                normalizeDisplayText(
                                    role.department
                                ),

                            start:
                                normalizeDateValue(
                                    role.start_period
                                ),

                            end:
                                normalizeDateValue(
                                    role.end_period
                                ),

                            startYear:
                                getYearFromDate(
                                    role.start_period
                                )
                                ||
                                normalizeYearValue(
                                    company.startYear
                                ),

                            endYear:
                                getYearFromDate(
                                    role.end_period
                                )
                                ||
                                normalizeYearValue(
                                    company.endYear
                                )

                        });
                    }
                );


                return;
            }


            nodes.push({

                company:
                    companyName,

                role:
                    normalizeDisplayText(
                        company.position
                    )
                    ||
                    normalizeDisplayText(
                        company.job_category
                    ),

                department:
                    normalizeDisplayText(
                        company.department
                    ),

                start:
                    normalizeDateValue(
                        company.work_start_period
                    ),

                end:
                    normalizeDateValue(
                        company.work_end_period
                    ),

                startYear:
                    normalizeYearValue(
                        company.startYear
                    ),

                endYear:
                    normalizeYearValue(
                        company.endYear
                    )

            });
        }
    );


    // --------------------------------------------------------
    // Duplicate removal
    // --------------------------------------------------------

    const deduped = [];


    nodes.forEach(
        node => {

            const duplicate =
                deduped.some(
                    existing =>
                        (
                            normalizeComparable(
                                existing.company
                            )
                            ===
                            normalizeComparable(
                                node.company
                            )
                        )
                        &&
                        (
                            normalizeComparable(
                                existing.role
                            )
                            ===
                            normalizeComparable(
                                node.role
                            )
                        )
                        &&
                        (
                            String(
                                existing.startYear
                                ||
                                ''
                            )
                            ===
                            String(
                                node.startYear
                                ||
                                ''
                            )
                        )
                );


            if (!duplicate) {

                deduped.push(
                    node
                );
            }
        }
    );


    // --------------------------------------------------------
    // Chronological
    // --------------------------------------------------------

    deduped.sort(
        (
            a,
            b
        ) => {

            const aDate =
                getSortableDate(
                    a.start
                );


            const bDate =
                getSortableDate(
                    b.start
                );


            if (
                aDate > 0
                &&
                bDate > 0
                &&
                aDate !== bDate
            ) {

                return (
                    aDate
                    -
                    bDate
                );
            }


            return (
                getSortableYear(
                    a.startYear
                )
                -
                getSortableYear(
                    b.startYear
                )
            );
        }
    );


    return deduped;
}


// ============================================================
// 25. Other Decisions
// ============================================================

function renderOtherDecisions(
    decisions,
    primaryDecision
) {

    const section =
        getElement(
            'career-other-decisions-section'
        );


    const container =
        getElement(
            'career-other-decisions-list'
        );


    if (
        !section
        ||
        !container
    ) {

        return;
    }


    const others =
        Array.isArray(
            decisions
        )
            ? decisions.filter(
                decision =>
                    String(
                        decision.id
                    )
                    !==
                    String(
                        primaryDecision?.id
                        ||
                        ''
                    )
            )
            : [];


    if (
        others.length
        ===
        0
    ) {

        section.hidden =
            true;


        container.innerHTML =
            '';


        return;
    }


    container.innerHTML =
        others
            .slice(
                0,
                4
            )
            .map(
                decision => {

                    const path =
                        getDecisionPath(
                            decision.decision_type
                        );


                    const title =
                        normalizeDisplayText(
                            decision.title
                        )
                        ||
                        normalizeDisplayText(
                            decision.dilemma_text
                        )
                        ||
                        createDecisionHeroTitle(
                            decision
                        );


                    const url =
                        createCareerDetailUrl(
                            careerDetailCareerId,
                            decision.id,
                            careerDetailTheme
                        );


                    return `

                        <a
                            class="career-other-decision-card"
                            href="${escapeHTML(url)}"
                        >

                            <div class="career-other-decision-card__meta">

                                <span class="career-other-decision-card__path">
                                    ${escapeHTML(path.label)}
                                </span>


                                <span class="career-other-decision-card__date">
                                    ${
                                        escapeHTML(
                                            formatDecisionDate(
                                                decision.occurred_at
                                            )
                                        )
                                    }
                                </span>

                            </div>


                            <h3 class="career-other-decision-card__title">
                                ${
                                    escapeHTML(
                                        truncateText(
                                            title,
                                            80
                                        )
                                    )
                                }
                            </h3>


                            <span class="career-other-decision-card__link">
                                この選択を見る →
                            </span>

                        </a>

                    `;
                }
            )
            .join('');


    section.hidden =
        false;
}


// ============================================================
// 26. Career Detail URL
// ============================================================

function createCareerDetailUrl(
    careerId,
    decisionId,
    theme
) {

    const params =
        new URLSearchParams();


    params.set(
        'id',
        String(
            careerId
        )
    );


    if (decisionId) {

        params.set(
            'decision_id',
            String(
                decisionId
            )
        );
    }


    if (theme) {

        params.set(
            'theme',
            theme
        );
    }


    return (
        `Career_detail.html?`
        +
        params.toString()
    );
}


// ============================================================
// 27. Access UI
// ============================================================

function updateCareerAccessUI() {

    updateCareerValueWall();
}


function updateCareerValueWall() {

    const wall =
        getElement(
            'career-value-wall'
        );


    if (!wall) {

        return;
    }


    const decision =
        careerDetailPrimaryDecision;


    const hasLockedContent =
        decision
        &&
        [
            decision.final_reason,
            decision.result_text,
            decision.unexpected_result,
            decision.learning_text,
            decision.same_choice_answer,
            decision.same_choice_reason,
            decision.advice_text
        ]
        .some(
            isAvailableValue
        );


    wall.hidden =
        careerDetailIsLoggedIn
        ||
        !hasLockedContent;
}


// ============================================================
// 28. Decision Sorting
// ============================================================

function sortDecisionsNewestFirst(
    decisions
) {

    return [
        ...decisions
    ]
    .sort(
        (
            a,
            b
        ) => {

            const aDate =
                getSortableDate(
                    a.occurred_at
                );


            const bDate =
                getSortableDate(
                    b.occurred_at
                );


            if (
                aDate
                !==
                bDate
            ) {

                return (
                    bDate
                    -
                    aDate
                );
            }


            return (
                Number(
                    b.id
                    ||
                    0
                )
                -
                Number(
                    a.id
                    ||
                    0
                )
            );
        }
    );
}


// ============================================================
// 29. Company Sorting
// ============================================================

function sortCompaniesChronologically(
    companies
) {

    return [
        ...companies
    ]
    .sort(
        (
            a,
            b
        ) => {

            const aDate =
                getSortableDate(
                    a.work_start_period
                );


            const bDate =
                getSortableDate(
                    b.work_start_period
                );


            if (
                aDate > 0
                &&
                bDate > 0
                &&
                aDate !== bDate
            ) {

                return (
                    aDate
                    -
                    bDate
                );
            }


            const aYear =
                getSortableYear(
                    a.startYear
                );


            const bYear =
                getSortableYear(
                    b.startYear
                );


            if (
                aYear
                !==
                bYear
            ) {

                return (
                    aYear
                    -
                    bYear
                );
            }


            return (
                Number(
                    a.id
                    ||
                    0
                )
                -
                Number(
                    b.id
                    ||
                    0
                )
            );
        }
    );
}


// ============================================================
// 30. Latest Company
// ============================================================

function getLatestCompany(
    companies
) {

    if (
        !Array.isArray(
            companies
        )
        ||
        companies.length === 0
    ) {

        return null;
    }


    const sorted =
        sortCompaniesChronologically(
            companies
        );


    // 現職扱いの会社が複数ある場合は、
    // その中で最も新しい会社を採用する
    const currentCompanies =
        sorted.filter(
            isCurrentCareer
        );


    if (
        currentCompanies.length
        >
        0
    ) {

        return (
            currentCompanies[
                currentCompanies.length - 1
            ]
        );
    }


    // 現職がない場合は
    // 最も新しい職歴を返す
    return (
        sorted[
            sorted.length - 1
        ]
        ||
        null
    );
}


function isCurrentCareer(
    company
) {

    const rawEnd =
        normalizeDisplayText(
            company?.work_end_period
        );


    const endYear =
        normalizeDisplayText(
            company?.endYear
        )
        .toLowerCase();


    if (
        [
            '現時点',
            '現在',
            'present'
        ]
        .includes(
            endYear
        )
    ) {

        return true;
    }


    if (
        rawEnd
        ||
        /^\d{4}$/.test(
            endYear
        )
    ) {

        return false;
    }


    return true;
}


// ============================================================
// 31. Career Years
// ============================================================

function calculateCareerYears(
    companies
) {

    if (
        !Array.isArray(
            companies
        )
        ||
        companies.length === 0
    ) {

        return null;
    }


    const dates = [];


    companies.forEach(
        company => {

            const companyDate =
                parseDateOnly(
                    company.work_start_period
                );


            if (companyDate) {

                dates.push(
                    companyDate
                );
            }


            const roles =
                Array.isArray(
                    company.roles
                )
                    ? company.roles
                    : [];


            roles.forEach(
                role => {

                    const roleDate =
                        parseDateOnly(
                            role.start_period
                        );


                    if (roleDate) {

                        dates.push(
                            roleDate
                        );
                    }
                }
            );
        }
    );


    let firstDate =
        null;


    if (
        dates.length
        >
        0
    ) {

        firstDate =
            new Date(
                Math.min(
                    ...dates.map(
                        date =>
                            date.getTime()
                    )
                )
            );

    } else {

        const years =
            companies
                .map(
                    company =>
                        Number(
                            normalizeYearValue(
                                company.startYear
                            )
                        )
                )
                .filter(
                    year =>
                        Number.isFinite(
                            year
                        )
                        &&
                        year > 0
                );


        if (
            years.length
            ===
            0
        ) {

            return null;
        }


        firstDate =
            new Date(
                Math.min(
                    ...years
                ),
                0,
                1
            );
    }


    const today =
        new Date();


    let years =
        today.getFullYear()
        -
        firstDate.getFullYear();


    const anniversaryPassed =
        (
            today.getMonth()
            >
            firstDate.getMonth()
        )
        ||
        (
            today.getMonth()
            ===
            firstDate.getMonth()
            &&
            today.getDate()
            >=
            firstDate.getDate()
        );


    if (
        !anniversaryPassed
    ) {

        years -= 1;
    }


    return Math.max(
        0,
        years
    );
}


// ============================================================
// 32. Date Helpers
// ============================================================

function formatCompanyPeriodFromNode(
    node
) {

    const start =
        normalizeYearValue(
            node.startYear
        );


    const end =
        normalizeYearValue(
            node.endYear
        );


    if (
        start
        &&
        end
    ) {

        return (
            `${start} – ${end}`
        );
    }


    return (
        start
        ||
        end
        ||
        ''
    );
}


function formatCareerPeriod(
    start,
    end
) {

    const startText =
        formatYearMonth(
            start
        );


    if (!startText) {

        return '';
    }


    const endText =
        end
            ? formatYearMonth(
                end
            )
            : '現在';


    return (
        `${startText} – ${endText}`
    );
}


function formatDecisionDate(
    value
) {

    const date =
        parseDateOnly(
            value
        );


    if (!date) {

        return '';
    }


    return (
        new Intl.DateTimeFormat(
            'ja-JP',
            {
                year:
                    'numeric',

                month:
                    'long'
            }
        )
        .format(
            date
        )
    );
}


function formatYearMonth(
    value
) {

    const date =
        parseDateOnly(
            value
        );


    if (!date) {

        return '';
    }


    return (
        `${date.getFullYear()}年`
        +
        `${date.getMonth() + 1}月`
    );
}


function getYearFromDate(
    value
) {

    const date =
        parseDateOnly(
            value
        );


    return (
        date
            ? date.getFullYear()
            : null
    );
}


function getSortableYear(
    value
) {

    const normalized =
        normalizeYearValue(
            value
        );


    const number =
        Number(
            normalized
        );


    return (
        Number.isFinite(
            number
        )
            ? number
            : 9999
    );
}


function getSortableDate(
    value
) {

    const date =
        parseDateOnly(
            value
        );


    return (
        date
            ? date.getTime()
            : 0
    );
}


function parseDateOnly(
    value
) {

    if (
        !isAvailableValue(
            value
        )
    ) {

        return null;
    }


    const raw =
        String(
            value
        )
        .trim();


    const match =
        raw.match(
            /^(\d{4})-(\d{1,2})-(\d{1,2})/
        );


    if (match) {

        const year =
            Number(
                match[1]
            );


        const month =
            Number(
                match[2]
            );


        const day =
            Number(
                match[3]
            );


        const date =
            new Date(
                year,
                month - 1,
                day
            );


        return (
            Number.isNaN(
                date.getTime()
            )
                ? null
                : date
        );
    }


    const date =
        new Date(
            raw
        );


    return (
        Number.isNaN(
            date.getTime()
        )
            ? null
            : date
    );
}


function normalizeDateValue(
    value
) {

    return (
        isAvailableValue(
            value
        )
            ? String(value)
            : null
    );
}


function normalizeYearValue(
    value
) {

    if (
        !isAvailableValue(
            value
        )
    ) {

        return '';
    }


    const text =
        normalizeDisplayText(
            value
        );


    if (
        text === '現在'
        ||
        text === '現時点'
        ||
        text.toLowerCase()
        ===
        'present'
    ) {

        return text;
    }


    const match =
        text.match(
            /\d{4}/
        );


    return (
        match
            ? match[0]
            : ''
    );
}


// ============================================================
// 33. Satisfaction Helpers
// ============================================================

function parseSatisfaction(
    value
) {

    if (
        !isAvailableValue(
            value
        )
    ) {

        return null;
    }


    const match =
        String(
            value
        )
        .match(
            /\d+(?:\.\d+)?/
        );


    if (!match) {

        return null;
    }


    const number =
        Number(
            match[0]
        );


    if (
        !Number.isFinite(
            number
        )
        ||
        number < 0
        ||
        number > 5
    ) {

        return null;
    }


    return number;
}


function formatSatisfaction(
    value
) {

    const number =
        parseSatisfaction(
            value
        );


    if (
        number
        ===
        null
    ) {

        return (
            normalizeDisplayText(
                value
            )
        );
    }


    return (
        `${number} / 5`
    );
}


// ============================================================
// 34. Generic DOM Helpers
// ============================================================

function getElement(
    ...ids
) {

    for (
        const id
        of
        ids
    ) {

        const element =
            document.getElementById(
                id
            );


        if (element) {

            return element;
        }
    }


    return null;
}


function setTextBlock(
    wrapper,
    textElement,
    value
) {

    if (
        !wrapper
        ||
        !textElement
    ) {

        return;
    }


    const text =
        normalizeDisplayText(
            value
        );


    if (text) {

        textElement.textContent =
            text;


        wrapper.hidden =
            false;

    } else {

        textElement.textContent =
            '';


        wrapper.hidden =
            true;
    }
}


// ============================================================
// 35. Generic Data Helpers
// ============================================================

function getAgeDecade(
    age
) {

    const number =
        Number(
            age
        );


    if (
        !Number.isFinite(
            number
        )
        ||
        number <= 0
    ) {

        return '';
    }


    return (
        `${Math.floor(
            number / 10
        ) * 10}代`
    );
}


function looksLikeEmail(
    value
) {

    return (
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    )
    .test(
        normalizeDisplayText(
            value
        )
    );
}


function normalizeComparable(
    value
) {

    return (
        normalizeDisplayText(
            value
        )
        .toLowerCase()
        .replace(
            /\s+/g,
            ''
        )
    );
}


function normalizeText(
    value
) {

    if (
        value === null
        ||
        value === undefined
    ) {

        return '';
    }


    return (
        String(
            value
        )
        .trim()
    );
}


// ============================================================
// 36. Display Text
//
// DB/APIから
// null / "null" / "undefined" / "N/A"
// が来ても画面には表示しない。
// ============================================================

function normalizeDisplayText(
    value
) {

    const text =
        normalizeText(
            value
        );


    if (
        !text
        ||
        [
            'n/a',
            'null',
            'undefined',
            'none'
        ]
        .includes(
            text.toLowerCase()
        )
    ) {

        return '';
    }


    return text;
}


function isAvailableValue(
    value
) {

    return Boolean(
        normalizeDisplayText(
            value
        )
    );
}


function truncateText(
    value,
    maxLength
) {

    const text =
        normalizeDisplayText(
            value
        );


    if (!text) {

        return '';
    }


    if (
        text.length
        <=
        maxLength
    ) {

        return text;
    }


    return (
        `${text
            .slice(
                0,
                maxLength
            )
            .trim()}…`
    );
}


// ============================================================
// 37. Escape HTML
// ============================================================

function escapeHTML(
    value
) {

    if (
        value === null
        ||
        value === undefined
    ) {

        return '';
    }


    return (
        String(
            value
        )
        .replace(
            /[&'`"<>]/g,

            match => ({

                '&':
                    '&amp;',

                "'":
                    '&#x27;',

                '`':
                    '&#x60;',

                '"':
                    '&quot;',

                '<':
                    '&lt;',

                '>':
                    '&gt;'

            })[match]
        )
    );
}


// ============================================================
// 38. GA4 CTA Tracking
// ============================================================

document.addEventListener(
    'click',

    function (
        event
    ) {

        const registerLink =
            event.target.closest(
                'a[href*="Register.html"]'
            );


        if (
            !registerLink
            ||
            typeof gtag
            !==
            'function'
        ) {

            return;
        }


        let ctaLocation =
            'career_detail_unknown';


        if (
            registerLink.classList.contains(
                'header-register-btn'
            )
        ) {

            ctaLocation =
                'career_detail_header';

        } else if (
            registerLink.classList.contains(
                'career-value-wall__cta'
            )
        ) {

            ctaLocation =
                'career_detail_value_wall';

        } else if (
            registerLink.classList.contains(
                'career-outcome-guest__cta'
            )
        ) {

            ctaLocation =
                'career_detail_outcome';

        } else if (
            registerLink.closest(
                '.career-message-lock'
            )
        ) {

            ctaLocation =
                'career_detail_message';
        }


        gtag(
            'event',
            'signup_cta_click',
            {
                page_type:
                    'career_detail',

                cta_location:
                    ctaLocation,

                career_id:
                    careerDetailCareerId,

                decision_id:
                    careerDetailPrimaryDecision?.id
                    ||
                    ''
            }
        );
    }
);


// ============================================================
// 39. Career Story View Count
// ============================================================

function incrementCareerStoryView(
    careerId
) {

    if (!careerId) {

        return;
    }


    fetch(
        `/increment-profile-view/${encodeURIComponent(careerId)}`,
        {
            method:
                'POST',

            headers: {
                Accept:
                    'application/json'
            },

            keepalive:
                true
        }
    )
    .then(
        response => {

            if (
                !response.ok
            ) {

                throw new Error(
                    'Career Story view count update failed.'
                );
            }
        }
    )
    .catch(
        error => {

            console.error(
                'Career Story view count error:',
                error
            );
        }
    );
}


// ============================================================
// 40. Error
// ============================================================

function showPageError(
    message
) {

    const main =
        document.querySelector(
            '.career-detail-page'
        );


    if (!main) {

        return;
    }


    main.innerHTML = `

        <section class="career-gps-section">

            <p class="career-empty-message">
                ${escapeHTML(message)}
            </p>

        </section>

    `;
}