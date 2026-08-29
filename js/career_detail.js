// ============================================================
// Career Detail / Career GPS
// career_detail.js
// ============================================================


// ============================================================
// 0. Global State
// ============================================================

let careerDetailIsLoggedIn = false;
let careerOutcomeChart = null;


// ============================================================
// 1. Initialize
// ============================================================

document.addEventListener(
    'DOMContentLoaded',
    initializeCareerDetail
);


async function initializeCareerDetail() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const careerId =
        params.get('id');


    if (!careerId) {

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
                `/career-detail/${encodeURIComponent(careerId)}`,
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
            Array.isArray(data.companies)
                ? data.companies
                : [];


        const decisions =
            Array.isArray(data.career_decisions)
                ? sortDecisionsNewestFirst(
                    data.career_decisions
                )
                : [];


        // ========================================================
        // Career Story View
        // 実際にCareer Storyが存在する場合のみ記録
        // ========================================================

        const hasCareerStory =
            companies.length > 0
            ||
            decisions.length > 0;


        if (hasCareerStory) {

            // ----------------------------------------------------
            // Profile View Count
            // ----------------------------------------------------

            incrementCareerStoryView(
                careerId
            );


            // ----------------------------------------------------
            // GA4: Career Story Detail View
            // ----------------------------------------------------

            if (typeof gtag === 'function') {

                gtag(
                    'event',
                    'career_story_view',
                    {
                        career_id:
                            careerId,

                        login_status:
                            careerDetailIsLoggedIn
                                ? 'logged_in'
                                : 'guest'
                    }
                );
            }
        }


        renderPersonSnapshot(
            data,
            companies,
            decisions
        );


        renderCareerJourney(
            companies
        );


        renderTurningPoints(
            decisions
        );


        renderCareerCompass(
            decisions
        );


        renderCareerOutcome(
            companies
        );


        renderCareerMessage(
            decisions
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
// 2. Login Status
// ============================================================

async function checkCareerDetailLoginStatus() {

    try {

        const response =
            await fetch(
                '/check-login-status/',
                {
                    method: 'GET',

                    headers: {
                        Accept: 'application/json'
                    },

                    credentials: 'include'
                }
            );


        return response.ok;


    } catch (error) {

        return false;
    }
}


// ============================================================
// 3. PERSON / CURRENT SNAPSHOT
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
        normalizeText(
            data.profession
        );


    const careerYears =
        calculateCareerYears(
            companies
        );


    const rawName =
        normalizeText(
            data.name
        );


    const displayName =
        getCareerDisplayName(
            rawName,
            ageDecade,
            profession
        );


    if (avatar) {

        const avatarSource =
            rawName
            || profession
            || '?';


        avatar.textContent =
            avatarSource
                .charAt(0)
                .toUpperCase();
    }


    if (title) {

        title.textContent =
            displayName;
    }


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


    if (tags) {

        const tagValues = [];


        if (profession) {

            tagValues.push(
                `#${profession}`
            );
        }


        if (companies.length > 0) {

            tagValues.push(
                `#経験${companies.length}社`
            );
        }


        if (decisions.length > 0) {

            tagValues.push(
                `#転機${decisions.length}件`
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


    if (!snapshot) {
        return;
    }


    const snapshotItems = [];


    if (profession) {

        snapshotItems.push({
            label: '現在の職種',
            value: profession
        });
    }


    if (
        latestCompany
        &&
        normalizeText(
            latestCompany.name
        )
    ) {

        snapshotItems.push({
            label: '現在の勤務先',
            value:
                latestCompany.name
        });
    }


    if (companies.length > 0) {

        snapshotItems.push({
            label: '経験社数',
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
            label: '年収レンジ',
            value:
                latestCareerPoint.salary
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
            label: '仕事満足度',
            value:
                formatSatisfaction(
                    latestCareerPoint.satisfaction_level
                )
        });
    }


    if (careerYears !== null) {

        snapshotItems.push({
            label: 'キャリア歴',

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
// 4. PERSON Helpers
// ============================================================

function getCareerDisplayName(
    rawName,
    ageDecade,
    profession
) {

    if (
        rawName
        &&
        !looksLikeEmail(rawName)
    ) {

        return rawName;
    }


    const parts = [];


    if (ageDecade) {
        parts.push(ageDecade);
    }


    if (profession) {
        parts.push(profession);
    }


    return (
        parts.join('｜')
        ||
        rawName
        ||
        'キャリアストーリー'
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


    if (companies.length > 0) {

        pieces.push(
            `${companies.length}社`
        );
    }


    if (careerYears !== null) {

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
        normalizeText(
            latestCompany.name
        )
    ) {

        return (
            `${prefix}`
            +
            `${normalizeText(latestCompany.name)}でキャリアを歩んできた人。`
        );
    }


    if (ageDecade) {

        return (
            `${ageDecade}のキャリアストーリー。`
        );
    }


    return 'これまでのキャリアと意思決定を振り返ります。';
}


// ============================================================
// 5. CAREER JOURNEY
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
        !Array.isArray(companies)
        ||
        companies.length === 0
    ) {

        container.innerHTML = `
            <p class="career-empty-message">
                キャリア情報はまだ登録されていません。
            </p>
        `;

        return;
    }


    const journeyNodes =
        createJourneyNodes(
            companies
        );


    if (journeyNodes.length === 0) {

        if (section) {
            section.hidden = true;
        }

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
                                ${escapeHTML(
                                    node.startYear
                                        ? String(node.startYear)
                                        : ''
                                )}
                            </span>

                            <div class="journey-node__marker"></div>

                            <h3 class="journey-node__company">
                                ${escapeHTML(
                                    node.company
                                )}
                            </h3>

                            ${
                                node.role
                                    ? `
                                        <p class="journey-node__role">
                                            ${escapeHTML(
                                                node.role
                                            )}
                                        </p>
                                    `
                                    : ''
                            }

                            ${
                                node.department
                                    ? `
                                        <p class="journey-node__department">
                                            ${escapeHTML(
                                                node.department
                                            )}
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
        section.hidden = false;
    }
}


// ============================================================
// 6. Journey Node Generation
// ============================================================

function createJourneyNodes(
    companies
) {

    const nodes = [];


    companies.forEach(
        company => {

            const companyName =
                normalizeText(
                    company.name
                )
                || '勤務先';


            const roles =
                Array.isArray(company.roles)
                    ? company.roles
                    : [];


            if (roles.length > 0) {

                roles.forEach(
                    role => {

                        nodes.push({

                            company:
                                companyName,

                            role:
                                normalizeText(
                                    role.position
                                )
                                ||
                                normalizeText(
                                    role.job_category
                                ),

                            department:
                                normalizeText(
                                    role.department
                                ),

                            start:
                                role.start_period,

                            end:
                                role.end_period,

                            startYear:
                                getYearFromDate(
                                    role.start_period
                                )
                                ||
                                company.startYear,

                            endYear:
                                getYearFromDate(
                                    role.end_period
                                )
                                ||
                                company.endYear
                        });
                    }
                );
            }

            else {

                nodes.push({

                    company:
                        companyName,

                    role:
                        normalizeText(
                            company.position
                        )
                        ||
                        normalizeText(
                            company.job_category
                        ),

                    department:
                        normalizeText(
                            company.department
                        ),

                    start:
                        company.work_start_period
                        || null,

                    end:
                        company.work_end_period
                        || null,

                    startYear:
                        company.startYear,

                    endYear:
                        company.endYear
                });
            }
        }
    );


    const deduped = [];


    nodes.forEach(
        node => {

            const sameBaseIndex =
                deduped.findIndex(
                    existing =>
                        normalizeComparable(
                            existing.company
                        )
                        ===
                        normalizeComparable(
                            node.company
                        )

                        &&

                        String(
                            existing.startYear || ''
                        )
                        ===
                        String(
                            node.startYear || ''
                        )
                );


            if (sameBaseIndex === -1) {

                deduped.push(node);

                return;
            }


            const existing =
                deduped[sameBaseIndex];


            if (
                !normalizeText(
                    existing.role
                )
                &&
                normalizeText(
                    node.role
                )
            ) {

                deduped[sameBaseIndex] =
                    node;

                return;
            }


            if (
                normalizeComparable(
                    existing.role
                )
                !==
                normalizeComparable(
                    node.role
                )
                &&
                normalizeText(
                    node.role
                )
            ) {

                deduped.push(node);
            }
        }
    );


    deduped.sort(
        (a, b) => {

            const yearDifference =
                getSortableYear(
                    a.startYear
                )
                -
                getSortableYear(
                    b.startYear
                );


            if (yearDifference !== 0) {

                return yearDifference;
            }


            return (
                getSortableDate(
                    a.start
                )
                -
                getSortableDate(
                    b.start
                )
            );
        }
    );


    return deduped;
}


// ============================================================
// 7. TURNING POINTS
// ============================================================

function renderTurningPoints(
    decisions
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


    if (
        !Array.isArray(decisions)
        ||
        decisions.length === 0
    ) {

        section.hidden = true;
        container.innerHTML = '';

        return;
    }


    container.innerHTML =
        decisions
            .map(
                (decision, index) =>
                    createTurningPointCard(
                        decision,
                        index,
                        {
                            isLoggedIn:
                                careerDetailIsLoggedIn,

                            isPrimaryPreview:
                                index === 0
                        }
                    )
            )
            .join('');


    section.hidden = false;
}


// ============================================================
// 8. Turning Point Card
// ============================================================

function createTurningPointCard(
    decision,
    index,
    options = {}
) {

    const {
        isLoggedIn = false,
        isPrimaryPreview = false
    } = options;


    const type =
        normalizeText(
            decision.decision_type
        )
        ||
        'キャリアの選択';


    const title =
        normalizeText(
            decision.title
        )
        ||
        `${type}の振り返り`;


    const date =
        formatDecisionDate(
            decision.occurred_at
        );


    const relatedCareer =
        [
            decision.company_name,
            decision.department,
            decision.position
        ]
        .map(normalizeText)
        .filter(Boolean)
        .join(' / ');


    if (
        !isLoggedIn
        &&
        !isPrimaryPreview
    ) {

        return `
            <article
                class="
                    turning-point-card
                    turning-point-card--preview
                "
            >

                <div class="turning-point-card__header">

                    <div class="turning-point-card__number">
                        ${String(index + 1).padStart(2, '0')}
                    </div>

                    <div class="turning-point-card__meta">

                        <span class="turning-point-card__type">
                            ${escapeHTML(type)}
                        </span>

                        <h3 class="turning-point-card__title">
                            ${escapeHTML(title)}
                        </h3>

                    </div>

                    ${
                        date
                            ? `
                                <time class="turning-point-card__date">
                                    ${escapeHTML(date)}
                                </time>
                            `
                            : ''
                    }

                </div>

                ${
                    relatedCareer
                        ? `
                            <div class="turning-point-card__career">
                                ${escapeHTML(relatedCareer)}
                            </div>
                        `
                        : ''
                }

                <div class="turning-point-card__locked-note">

                    <span>🔒</span>

                    <span>
                        この転機の詳細は無料登録後に読めます
                    </span>

                </div>

            </article>
        `;
    }


    const storySteps = [

        {
            step: '01',
            key: 'why',
            icon: '💡',
            shortLabel: 'きっかけ',
            label: 'なぜ、この選択を考えた？',
            value: decision.trigger_text,
            public: true
        },

        {
            step: '02',
            key: 'consideration',
            icon: '◐',
            shortLabel: '葛藤',
            label: '何に迷った？',
            value: decision.dilemma_text,
            public: true
        },

        {
            step: '03',
            key: 'priority',
            icon: '◆',
            shortLabel: '判断軸',
            label: '何を大切にした？',
            value: decision.priority_text,
            public: true
        },

        {
            step: '04',
            key: 'decision',
            icon: '◎',
            shortLabel: '決断',
            label: '最後の決め手は？',
            value: decision.final_reason,
            public: false
        },

        {
            step: '05',
            key: 'outcome',
            icon: '↗',
            shortLabel: '結果',
            label: '結果どうだった？',
            value: decision.result_text,
            public: false
        },

        {
            step: '06',
            key: 'learning',
            icon: '✦',
            shortLabel: '学び',
            label: 'そこから何を学んだ？',
            value: decision.learning_text,
            public: false
        }

    ]
    .filter(
        step =>
            normalizeText(
                step.value
            )
    )
    .filter(
        step =>
            isLoggedIn
            ||
            step.public
    );


    const storyHtml =
        storySteps
            .map(
                step => `
                    <div
                        class="
                            turning-story-step
                            turning-story-step--${step.key}
                        "
                    >

                        <div class="turning-story-step__rail">

                            <span class="turning-story-step__number">
                                ${step.step}
                            </span>

                            <span class="turning-story-step__line">
                            </span>

                        </div>

                        <div class="turning-story-step__body">

                            <div class="turning-story-step__heading">

                                <span class="turning-story-step__icon">
                                    ${step.icon}
                                </span>

                                <div class="turning-story-step__heading-text">

                                    <span class="turning-story-step__phase">
                                        ${escapeHTML(
                                            step.shortLabel
                                        )}
                                    </span>

                                    <h4 class="turning-story-step__question">
                                        ${escapeHTML(
                                            step.label
                                        )}
                                    </h4>

                                </div>

                            </div>

                            <p class="turning-story-step__answer">${escapeHTML(normalizeText(step.value))}</p>

                        </div>

                    </div>
                `
            )
            .join('');


    const supplementaryHtml =
        isLoggedIn
            ? createTurningPointSupplementary(
                decision
            )
            : '';


    const sameChoiceHtml =
        (
            isLoggedIn
            &&
            isAvailableValue(
                decision.same_choice_answer
            )
        )
            ? `
                <div class="turning-point-card__same-choice">

                    <span>
                        今なら同じ選択をする？
                    </span>

                    <strong>
                        ${escapeHTML(
                            String(
                                decision.same_choice_answer
                            )
                        )}
                    </strong>

                </div>
            `
            : '';


    return `
        <article class="turning-point-card">

            <div class="turning-point-card__header">

                <div class="turning-point-card__number">
                    ${String(index + 1).padStart(2, '0')}
                </div>

                <div class="turning-point-card__meta">

                    <span class="turning-point-card__type">
                        ${escapeHTML(type)}
                    </span>

                    <h3 class="turning-point-card__title">
                        ${escapeHTML(title)}
                    </h3>

                </div>

                ${
                    date
                        ? `
                            <time class="turning-point-card__date">
                                ${escapeHTML(date)}
                            </time>
                        `
                        : ''
                }

            </div>

            ${
                relatedCareer
                    ? `
                        <div class="turning-point-card__career">
                            ${escapeHTML(relatedCareer)}
                        </div>
                    `
                    : ''
            }

            ${
                storyHtml
                    ? `
                        <div class="turning-story">
                            ${storyHtml}
                        </div>
                    `
                    : ''
            }

            ${supplementaryHtml}

            ${sameChoiceHtml}

        </article>
    `;
}


// ============================================================
// 9. Turning Supplementary
// ============================================================

function createTurningPointSupplementary(
    decision
) {

    const items = [];


    if (
        normalizeText(
            decision.unexpected_result
        )
    ) {

        items.push({
            icon: '!',
            label: '想定外だったこと',
            value:
                decision.unexpected_result
        });
    }


    if (
        normalizeText(
            decision.same_choice_reason
        )
    ) {

        items.push({
            icon: '↺',
            label: '今振り返って、そう思う理由',
            value:
                decision.same_choice_reason
        });
    }


    if (items.length === 0) {

        return '';
    }


    return `
        <div class="turning-supplementary">

            ${
                items
                    .map(
                        item => `
                            <div class="turning-supplementary__item">

                                <div class="turning-supplementary__heading">

                                    <span class="turning-supplementary__icon">
                                        ${item.icon}
                                    </span>

                                    <strong>
                                        ${escapeHTML(
                                            item.label
                                        )}
                                    </strong>

                                </div>

                                <p>
                                    ${escapeHTML(
                                        normalizeText(
                                            item.value
                                        )
                                    )}
                                </p>

                            </div>
                        `
                    )
                    .join('')
            }

        </div>
    `;
}


// ============================================================
// 10. CAREER COMPASS
// ============================================================

function renderCareerCompass(
    decisions
) {

    const section =
        getElement(
            'career-compass-section'
        );


    const valuesContainer =
        getElement(
            'career-compass-values'
        );


    const keywordContainer =
        getElement(
            'career-compass-keywords'
        );


    if (
        !section
        ||
        !valuesContainer
        ||
        !keywordContainer
    ) {
        return;
    }


    const values = [];


    decisions.forEach(
        decision => {

            const value =
                normalizeText(
                    decision.priority_text
                );


            if (
                value
                &&
                !values.includes(value)
            ) {

                values.push(value);
            }
        }
    );


    if (values.length === 0) {

        section.hidden = true;

        return;
    }


    const visibleValues =
        careerDetailIsLoggedIn
            ? values.slice(0, 3)
            : values.slice(0, 1);


    valuesContainer.innerHTML =
        visibleValues
            .map(
                (value, index) => `
                    <div class="compass-value">

                        <span class="compass-value__rank">
                            ${String(index + 1).padStart(2, '0')}
                        </span>

                        <span class="compass-value__text">
                            ${escapeHTML(
                                truncateText(
                                    value,
                                    110
                                )
                            )}
                        </span>

                    </div>
                `
            )
            .join('');


    const decisionTypes =
        [
            ...new Set(
                decisions
                    .map(
                        decision =>
                            normalizeText(
                                decision.decision_type
                            )
                    )
                    .filter(Boolean)
            )
        ]
        .slice(
            0,
            careerDetailIsLoggedIn
                ? 5
                : 3
        );


    keywordContainer.innerHTML =
        decisionTypes
            .map(
                type => `
                    <span class="compass-keyword">
                        #${escapeHTML(type)}
                    </span>
                `
            )
            .join('');


    section.hidden = false;
}


// ============================================================
// 11. CAREER OUTCOME
// ============================================================

function renderCareerOutcome(
    companies
) {

    const section =
        getElement(
            'career-outcome-section'
        );


    const kpis =
        getElement(
            'career-outcome-kpis'
        );


    const chartWrapper =
        getElement(
            'career-outcome-chart-wrapper'
        );


    const lock =
        getElement(
            'career-outcome-lock'
        );


    if (
        !section
        ||
        !kpis
    ) {
        return;
    }


    const careerPoints =
        createCareerOutcomePoints(
            companies
        );


    if (careerPoints.length === 0) {

        section.hidden = true;

        return;
    }


    const latestCareerPoint =
        getLatestCareerPointFromPoints(
            careerPoints
        );


    const kpiItems = [];


    if (
        latestCareerPoint
        &&
        isAvailableValue(
            latestCareerPoint.salary
        )
    ) {

        kpiItems.push({
            label: '現在の年収レンジ',
            value:
                latestCareerPoint.salary
        });
    }


    if (
        latestCareerPoint
        &&
        isAvailableValue(
            latestCareerPoint.satisfaction_level
        )
    ) {

        kpiItems.push({
            label: '現在の仕事満足度',
            value:
                formatSatisfaction(
                    latestCareerPoint.satisfaction_level
                )
        });
    }


    kpis.innerHTML =
        kpiItems
            .map(
                item => `
                    <div class="outcome-kpi">

                        <span class="outcome-kpi__label">
                            ${escapeHTML(
                                item.label
                            )}
                        </span>

                        <strong class="outcome-kpi__value">
                            ${escapeHTML(
                                String(
                                    item.value
                                )
                            )}
                        </strong>

                    </div>
                `
            )
            .join('');


    const trendPoints =
        careerPoints.filter(
            point =>
                isAvailableValue(
                    point.salary
                )
                ||
                isAvailableValue(
                    point.satisfaction_level
                )
        );


    if (
        trendPoints.length < 2
    ) {

        destroyCareerOutcomeChart();


        if (chartWrapper) {

            chartWrapper.hidden = false;

            chartWrapper.classList.remove(
                'is-locked'
            );


            chartWrapper.innerHTML = `
                <div class="career-outcome-empty">

                    <p class="career-outcome-empty__label">
                        CURRENT STATUS
                    </p>

                    <p class="career-outcome-empty__text">
                        現在は比較できるキャリア履歴が1件のため、
                        年収・仕事満足度の推移はまだ表示されません。
                    </p>

                    <p class="career-outcome-empty__sub">
                        過去の役割履歴が増えると、
                        キャリアの変化を時系列で確認できます。
                    </p>

                </div>
            `;
        }


        if (lock) {
            lock.hidden = true;
        }


        section.hidden = false;

        return;
    }


    if (!careerDetailIsLoggedIn) {

        destroyCareerOutcomeChart();


        if (chartWrapper) {

            chartWrapper.hidden = false;

            chartWrapper.classList.remove(
                'is-locked'
            );


            chartWrapper.innerHTML = `
                <div class="career-outcome-guest">

                    <div class="career-outcome-guest__icon">
                        🔒
                    </div>

                    <p class="career-outcome-guest__title">
                        年収・満足度の変化を見る
                    </p>

                    <p class="career-outcome-guest__text">
                        この人がキャリアの選択を重ねる中で、
                        年収や仕事満足度がどう変化してきたのかを確認できます。
                    </p>

                    <a
                        href="/Register.html"
                        class="career-outcome-guest__cta"
                    >
                        無料で続きを見る
                    </a>

                </div>
            `;
        }


        if (lock) {
            lock.hidden = true;
        }


        section.hidden = false;

        return;
    }


    restoreCareerOutcomeCanvas();


    renderCareerOutcomeChart(
        trendPoints
    );


    if (lock) {
        lock.hidden = true;
    }


    section.hidden = false;
}


// ============================================================
// 12. Career Outcome Point Generation
// ============================================================

function createCareerOutcomePoints(
    companies
) {

    if (!Array.isArray(companies)) {
        return [];
    }


    const points = [];


    companies.forEach(
        company => {

            const roles =
                Array.isArray(company.roles)
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


            if (validRoles.length > 0) {

                validRoles.forEach(
                    (role, roleIndex) => {

                        points.push({

                            type:
                                'role',

                            companyId:
                                company.id,

                            company:
                                normalizeText(
                                    company.name
                                )
                                || '勤務先',

                            roleId:
                                role.id,

                            role:
                                normalizeText(
                                    role.position
                                )
                                ||
                                normalizeText(
                                    role.job_category
                                )
                                ||
                                `役割${roleIndex + 1}`,

                            department:
                                normalizeText(
                                    role.department
                                ),

                            start:
                                role.start_period,

                            end:
                                role.end_period,

                            startYear:
                                getYearFromDate(
                                    role.start_period
                                )
                                ||
                                company.startYear,

                            endYear:
                                getYearFromDate(
                                    role.end_period
                                )
                                ||
                                company.endYear,

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
                        normalizeText(
                            company.name
                        )
                        || '勤務先',

                    roleId:
                        null,

                    role:
                        normalizeText(
                            company.position
                        )
                        ||
                        normalizeText(
                            company.job_category
                        ),

                    department:
                        '',

                    start:
                        null,

                    end:
                        null,

                    startYear:
                        company.startYear,

                    endYear:
                        company.endYear,

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


function compareCareerOutcomePoints(
    a,
    b
) {

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

        return aDate - bDate;
    }


    const aYear =
        getSortableYear(
            a.startYear
        );


    const bYear =
        getSortableYear(
            b.startYear
        );


    if (aYear !== bYear) {

        return aYear - bYear;
    }


    const aCompany =
        Number(
            a.companyId || 0
        );


    const bCompany =
        Number(
            b.companyId || 0
        );


    if (aCompany !== bCompany) {

        return aCompany - bCompany;
    }


    const aOrder =
        Number.isFinite(
            a.displayOrder
        )
            ? a.displayOrder
            : 9999;


    const bOrder =
        Number.isFinite(
            b.displayOrder
        )
            ? b.displayOrder
            : 9999;


    if (aOrder !== bOrder) {

        return aOrder - bOrder;
    }


    return (
        Number(a.roleId || 0)
        -
        Number(b.roleId || 0)
    );
}


function getLatestCareerPoint(
    companies
) {

    const points =
        createCareerOutcomePoints(
            companies
        );


    return getLatestCareerPointFromPoints(
        points
    );
}


function getLatestCareerPointFromPoints(
    points
) {

    if (
        !Array.isArray(points)
        ||
        points.length === 0
    ) {

        return null;
    }


    const currentPoints =
        points.filter(
            point =>
                isCurrentCareerPoint(
                    point
                )
        );


    if (currentPoints.length > 0) {

        return currentPoints[
            currentPoints.length - 1
        ];
    }


    return points[
        points.length - 1
    ];
}


function isCurrentCareerPoint(
    point
) {

    const end =
        normalizeText(
            point.end
        )
        .toLowerCase();


    const endYear =
        normalizeText(
            point.endYear
        )
        .toLowerCase();


    return (
        !end
        ||
        endYear === '現時点'
        ||
        endYear === '現在'
        ||
        endYear === 'present'
    );
}


// ============================================================
// 13. Outcome Chart
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
            wrapper.hidden = true;
        }

        return;
    }


    const validPoints =
        points.filter(
            point =>
                isAvailableValue(
                    point.salary
                )
                ||
                isAvailableValue(
                    point.satisfaction_level
                )
        );


    if (validPoints.length < 2) {

        destroyCareerOutcomeChart();

        return;
    }


    const labels =
        validPoints.map(
            point =>
                createOutcomePointLabel(
                    point
                )
        );


    const salaryValues =
        validPoints.map(
            point =>
                salaryToNumber(
                    point.salary
                )
        );


    const satisfactionValues =
        validPoints.map(
            point =>
                parseSatisfaction(
                    point.satisfaction_level
                )
        );


    const salaryOriginalLabels =
        validPoints.map(
            point =>
                normalizeText(
                    point.salary
                )
        );


    const satisfactionOriginalLabels =
        validPoints.map(
            point =>
                formatSatisfaction(
                    point.satisfaction_level
                )
        );


    destroyCareerOutcomeChart();


    careerOutcomeChart =
        new Chart(
            canvas,
            {

                type: 'line',


                data: {

                    labels,

                    datasets: [

                        {
                            label: '年収',

                            data:
                                salaryValues,

                            yAxisID:
                                'salary',

                            borderColor:
                                '#59483a',

                            backgroundColor:
                                '#59483a',

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
                                '#40382f',

                            spanGaps:
                                true,

                            tension:
                                0
                        },

                        {
                            label:
                                '仕事満足度',

                            data:
                                satisfactionValues,

                            yAxisID:
                                'satisfaction',

                            borderColor:
                                '#75824f',

                            backgroundColor:
                                '#75824f',

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
                                '#748542',

                            spanGaps:
                                true,

                            tension:
                                0
                        }

                    ]
                },


                options: {

                    responsive: true,

                    maintainAspectRatio: false,


                    interaction: {

                        mode: 'index',

                        intersect: false
                    },


                    layout: {

                        padding: {

                            top: 28,

                            right: 12,

                            bottom: 8,

                            left: 4
                        }
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

                                boxWidth: 8,

                                boxHeight: 8,

                                padding: 20,

                                color:
                                    '#66615c',

                                font: {

                                    size: 11,

                                    weight:
                                        '600'
                                }
                            }
                        },


                        tooltip: {

                            enabled: true,


                            callbacks: {

                                title(context) {

                                    const index =
                                        context[0]
                                            ?.dataIndex;


                                    const point =
                                        validPoints[index];


                                    if (!point) {
                                        return '';
                                    }


                                    const parts = [
                                        point.company,
                                        point.role
                                    ]
                                    .filter(Boolean);


                                    return parts.join(
                                        ' / '
                                    );
                                },


                                label(context) {

                                    if (
                                        context.datasetIndex === 0
                                    ) {

                                        return (
                                            `年収：`
                                            +
                                            (
                                                salaryOriginalLabels[
                                                    context.dataIndex
                                                ]
                                                ||
                                                '-'
                                            )
                                        );
                                    }


                                    return (
                                        `満足度：`
                                        +
                                        (
                                            satisfactionOriginalLabels[
                                                context.dataIndex
                                            ]
                                            ||
                                            '-'
                                        )
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
                                    '#817b74',

                                font: {

                                    size: 10
                                },

                                maxRotation: 0,

                                minRotation: 0,

                                autoSkip: false
                            }
                        },


                        salary: {

                            type:
                                'linear',

                            position:
                                'left',

                            beginAtZero:
                                false,


                            grid: {

                                color:
                                    'rgba(41,39,34,0.06)'
                            },


                            border: {

                                display:
                                    false
                            },


                            ticks: {

                                color:
                                    '#969089',

                                font: {

                                    size: 10
                                },


                                callback(value) {

                                    return `${value}万`;
                                }
                            }
                        },


                        satisfaction: {

                            type:
                                'linear',

                            position:
                                'right',

                            min: 0,

                            max: 5.5,


                            grid: {

                                drawOnChartArea:
                                    false
                            },


                            border: {

                                display:
                                    false
                            },


                            ticks: {

                                stepSize:
                                    1,

                                color:
                                    '#969089',

                                font: {

                                    size: 10
                                },


                                callback(value) {

                                    return `${value}`;
                                }
                            }
                        }
                    }
                }
            }
        );


    if (wrapper) {

        wrapper.hidden = false;
    }
}


// ============================================================
// 14. Outcome Helpers
// ============================================================

function destroyCareerOutcomeChart() {

    if (careerOutcomeChart) {

        careerOutcomeChart.destroy();

        careerOutcomeChart = null;
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

        wrapper.hidden = false;

        return;
    }


    wrapper.innerHTML = `
        <canvas id="career-outcome-chart"></canvas>
    `;


    wrapper.hidden = false;
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
                    ? String(point.startYear)
                    : ''
            );


    const role =
        normalizeText(
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


    if (start) {
        return start;
    }


    if (role) {
        return role;
    }


    return (
        normalizeText(
            point.company
        )
        ||
        'Career'
    );
}


function salaryToNumber(
    value
) {

    if (
        !isAvailableValue(
            value
        )
    ) {

        return null;
    }


    const text =
        String(value)
            .replace(/,/g, '')
            .replace(/万円/g, '')
            .replace(/万/g, '')
            .replace(/円/g, '')
            .trim();


    const numbers =
        text.match(
            /\d+(?:\.\d+)?/g
        );


    if (
        !numbers
        ||
        numbers.length === 0
    ) {

        return null;
    }


    const parsed =
        numbers
            .map(Number)
            .filter(
                Number.isFinite
            );


    if (parsed.length === 0) {

        return null;
    }


    if (parsed.length === 1) {

        return parsed[0];
    }


    return Math.round(
        (
            parsed[0]
            +
            parsed[1]
        )
        /
        2
    );
}


// ============================================================
// 15. MESSAGE
// ============================================================

function renderCareerMessage(
    decisions
) {

    const section =
        getElement(
            'career-message-section'
        );


    const message =
        getElement(
            'career-message'
        );


    if (
        !section
        ||
        !message
    ) {

        return;
    }


    if (
        !Array.isArray(decisions)
        ||
        decisions.length === 0
    ) {

        section.hidden = true;

        return;
    }


    const target =
        decisions.find(
            decision =>
                normalizeText(
                    decision.advice_text
                )
        );


    if (!target) {

        section.hidden = true;
        message.innerHTML = '';

        return;
    }


    const fullText =
        normalizeText(
            target.advice_text
        );


    const displayText =
        careerDetailIsLoggedIn
            ? fullText
            : createMessagePreview(
                fullText
            );


    message.innerHTML = `
        <p>${escapeHTML(displayText)}</p>
    `;


    section.hidden = false;
}


// ============================================================
// 16. Access UI
// ============================================================

function updateCareerAccessUI() {

    updateCareerValueWall();

    updateOutcomeAccess();

    updateMessageAccess();
}


// ============================================================
// 17. Turning Point Value Wall
// ============================================================

function updateCareerValueWall() {

    const wall =
        getElement(
            'career-value-wall'
        );


    if (!wall) {
        return;
    }


    wall.hidden =
        careerDetailIsLoggedIn;
}


// ============================================================
// 18. Outcome Access
// ============================================================

function updateOutcomeAccess() {

    const wrapper =
        getElement(
            'career-outcome-chart-wrapper'
        );


    const lock =
        getElement(
            'career-outcome-lock'
        );


    if (!wrapper) {
        return;
    }


    const emptyState =
        wrapper.querySelector(
            '.career-outcome-empty'
        );


    const guestState =
        wrapper.querySelector(
            '.career-outcome-guest'
        );


    if (
        emptyState
        ||
        guestState
    ) {

        wrapper.classList.remove(
            'is-locked'
        );


        if (lock) {
            lock.hidden = true;
        }


        return;
    }


    if (careerDetailIsLoggedIn) {

        wrapper.classList.remove(
            'is-locked'
        );


        if (lock) {
            lock.hidden = true;
        }
    }

    else {

        wrapper.classList.add(
            'is-locked'
        );


        if (lock) {
            lock.hidden = false;
        }
    }
}


// ============================================================
// 19. Message Access
// ============================================================

function updateMessageAccess() {

    const section =
        getElement(
            'career-message-section'
        );


    const message =
        getElement(
            'career-message'
        );


    const lock =
        getElement(
            'career-message-lock'
        );


    if (
        !section
        ||
        !message
    ) {

        return;
    }


    if (careerDetailIsLoggedIn) {

        section.classList.remove(
            'is-locked'
        );


        message.classList.remove(
            'is-locked'
        );


        if (lock) {
            lock.hidden = true;
        }
    }

    else {

        section.classList.add(
            'is-locked'
        );


        message.classList.add(
            'is-locked'
        );


        if (lock) {
            lock.hidden = false;
        }
    }
}


// ============================================================
// 20. Sorting
// ============================================================

function sortDecisionsNewestFirst(
    decisions
) {

    return [
        ...decisions
    ]
    .sort(
        (a, b) => {

            const aDate =
                getSortableDate(
                    a.occurred_at
                );


            const bDate =
                getSortableDate(
                    b.occurred_at
                );


            if (
                aDate !== bDate
            ) {

                return (
                    bDate - aDate
                );
            }


            return (
                Number(
                    b.id || 0
                )
                -
                Number(
                    a.id || 0
                )
            );
        }
    );
}


function sortCompaniesChronologically(
    companies
) {

    return [
        ...companies
    ]
    .sort(
        (a, b) => {

            const aYear =
                getSortableYear(
                    a.startYear
                );


            const bYear =
                getSortableYear(
                    b.startYear
                );


            return (
                aYear - bYear
            );
        }
    );
}


// ============================================================
// 21. Company Helpers
// ============================================================

function getLatestCompany(
    companies
) {

    if (
        !Array.isArray(companies)
        ||
        companies.length === 0
    ) {

        return null;
    }


    const current =
        companies.find(
            company =>
                isCurrentCareer(
                    company
                )
        );


    if (current) {

        return current;
    }


    const sorted =
        sortCompaniesChronologically(
            companies
        );


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

    const end =
        normalizeText(
            company.endYear
        )
        .toLowerCase();


    return (
        !end
        ||
        end === '現時点'
        ||
        end === '現在'
        ||
        end === 'present'
    );
}


function calculateCareerYears(
    companies
) {

    if (
        !Array.isArray(companies)
        ||
        companies.length === 0
    ) {

        return null;
    }


    const years =
        companies
            .map(
                company =>
                    Number(
                        company.startYear
                    )
            )
            .filter(
                Number.isFinite
            );


    if (years.length === 0) {

        return null;
    }


    const firstYear =
        Math.min(
            ...years
        );


    const currentYear =
        new Date()
            .getFullYear();


    return Math.max(
        0,
        currentYear - firstYear
    );
}


// ============================================================
// 22. Date Helpers
// ============================================================

function formatCompanyPeriodFromNode(
    node
) {

    const start =
        node.startYear
            ? String(
                node.startYear
            )
            : '';


    const end =
        node.endYear
            ? String(
                node.endYear
            )
            : '';


    if (
        start
        &&
        end
    ) {

        return `${start} – ${end}`;
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


    return new Intl.DateTimeFormat(
        'ja-JP',
        {
            year: 'numeric',
            month: 'long'
        }
    )
    .format(
        date
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

    const number =
        Number(
            value
        );


    return (
        Number.isFinite(number)
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

    if (!value) {
        return null;
    }


    const text =
        String(value)
            .slice(
                0,
                10
            );


    const date =
        new Date(
            `${text}T00:00:00`
        );


    return (
        Number.isNaN(
            date.getTime()
        )
            ? null
            : date
    );
}


// ============================================================
// 23. Satisfaction Helpers
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
        String(value)
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


    return (
        Number.isFinite(number)
            ? number
            : null
    );
}


function formatSatisfaction(
    value
) {

    const number =
        parseSatisfaction(
            value
        );


    if (number === null) {

        return normalizeText(
            value
        );
    }


    return `${number} / 5`;
}


// ============================================================
// 24. Text / UI Helpers
// ============================================================

function getElement(
    ...ids
) {

    for (const id of ids) {

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


function getAgeDecade(
    age
) {

    const number =
        Number(
            age
        );


    if (
        !Number.isFinite(number)
        ||
        number <= 0
    ) {

        return '';
    }


    return (
        `${Math.floor(number / 10) * 10}代`
    );
}


function looksLikeEmail(
    value
) {

    return (
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    )
    .test(
        normalizeText(
            value
        )
    );
}


function normalizeComparable(
    value
) {

    return normalizeText(
        value
    )
    .toLowerCase()
    .replace(
        /\s+/g,
        ''
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


    return String(value)
        .trim();
}


function isAvailableValue(
    value
) {

    const text =
        normalizeText(
            value
        );


    if (!text) {
        return false;
    }


    return ![
        'n/a',
        'null',
        'undefined',
        'none'
    ]
    .includes(
        text.toLowerCase()
    );
}


function truncateText(
    value,
    maxLength
) {

    const text =
        normalizeText(
            value
        );


    if (
        text.length
        <=
        maxLength
    ) {

        return text;
    }


    return (
        `${text.slice(
            0,
            maxLength
        )}…`
    );
}


function createMessagePreview(
    value
) {

    const text =
        normalizeText(
            value
        );


    if (!text) {
        return '';
    }


    if (
        text.length <= 28
    ) {

        return `${text}…`;
    }


    return (
        `${text.slice(
            0,
            28
        )}…`
    );
}


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


    return String(value)
        .replace(
            /[&'`"<>]/g,
            match => ({
                '&': '&amp;',
                "'": '&#x27;',
                '`': '&#x60;',
                '"': '&quot;',
                '<': '&lt;',
                '>': '&gt;'
            })[match]
        );
}


// ============================================================
// 25. GA4 Tracking
// ============================================================

document.addEventListener(
    'click',
    function (event) {

        const registerLink =
            event.target.closest(
                'a[href*="Register.html"]'
            );


        if (!registerLink) {
            return;
        }


        if (typeof gtag !== 'function') {
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
        }

        else if (
            registerLink.classList.contains(
                'career-value-wall__cta'
            )
        ) {

            ctaLocation =
                'career_detail_value_wall';
        }

        else if (
            registerLink.classList.contains(
                'career-outcome-guest__cta'
            )
        ) {

            ctaLocation =
                'career_detail_outcome';
        }

        else if (
            registerLink.closest(
                '.career-outcome-lock'
            )
        ) {

            ctaLocation =
                'career_detail_outcome_lock';
        }

        else if (
            registerLink.closest(
                '.career-message-lock'
            )
        ) {

            ctaLocation =
                'career_detail_message';
        }


        const params =
            new URLSearchParams(
                window.location.search
            );


        gtag(
            'event',
            'signup_cta_click',
            {
                page_type:
                    'career_detail',

                cta_location:
                    ctaLocation,

                career_id:
                    params.get('id') || ''
            }
        );
    }
);


// ============================================================
// 26. Career Story View Count
// ============================================================

function incrementCareerStoryView(
    careerId
) {

    if (!careerId) {
        return;
    }


    fetch(
        `/increment-profile-view/${encodeURIComponent(
            careerId
        )}`,
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

            if (!response.ok) {

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
// 27. Error
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