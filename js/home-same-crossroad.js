(() => {
    'use strict';

    const API_URL = '/career-stories-by-theme/?theme=change';
    const SECTION_ID = 'home-same-crossroad';
    const LIST_ID = 'home-same-crossroad-list';
    const CRITERIA_SECTION_ID = 'home-decision-criteria';
    const CRITERIA_LIST_ID = 'home-decision-criteria-list';
    const YOUR_DECISION_ID = 'home-your-decision';
    const THEME = 'change';
    const MIN_ROUTE_COUNT = 2;
    const ROUTE_ORDER = ['change', 'stay', 'internal'];

    const EXCERPT_LIMITS = {
        dilemma: 88,
        priority: 72,
        result: 88
    };

    const MOBILE_EXCERPT_LIMITS = {
        dilemma: 56,
        priority: 48,
        result: 56
    };

    document.addEventListener('DOMContentLoaded', initializeSameCrossroad);

    async function initializeSameCrossroad() {
        const section = document.getElementById(SECTION_ID);
        const list = document.getElementById(LIST_ID);
        const criteriaSection = document.getElementById(CRITERIA_SECTION_ID);
        const criteriaList = document.getElementById(CRITERIA_LIST_ID);

        if (!section || !list) return;

        section.hidden = true;
        list.innerHTML = '';

        if (criteriaSection) criteriaSection.hidden = true;
        if (criteriaList) criteriaList.innerHTML = '';

        updateYourDecisionStep(false);

        try {
            const response = await fetch(API_URL, {
                method: 'GET',
                headers: { Accept: 'application/json' },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            const stories = Array.isArray(data.stories)
                ? data.stories
                : [];

            const comparisonGroup =
                normalizeComparisonGroup(
                    data.comparison_group
                );

            if (stories.length === 0) {
                renderUnavailableState(
                    section,
                    list,
                    '比較できるCareer Storyは、まだありません。'
                );

                bindAllLinkAnalytics();

                return;
            }

            const representatives =
                selectRouteRepresentatives(
                    stories,
                    comparisonGroup
                );

            if (
                representatives.length <
                MIN_ROUTE_COUNT
            ) {
                renderUnavailableState(
                    section,
                    list,
                    'いまは比較できる異なる選択が十分にそろっていません。'
                );

                bindAllLinkAnalytics();

                return;
            }

            renderDecisionCompare(
                list,
                representatives
            );

            updateCompareSubheading(
                section,
                comparisonGroup
            );

            updateComparisonGroupDataset(
                section,
                comparisonGroup
            );

            renderDecisionCriteria(
                criteriaSection,
                criteriaList,
                representatives
            );

            section.hidden = false;

            bindAnalytics(section);

            bindAllLinkAnalytics();

            trackCompareView(
                representatives,
                comparisonGroup
            );

        } catch (error) {
            console.error(
                'Same Crossroad error:',
                error
            );

            renderUnavailableState(
                section,
                list,
                '比較データを読み込めませんでした。時間をおいてもう一度お試しください。'
            );

            bindAllLinkAnalytics();
        }
    }


    /* =====================================================
       comparison_group
       ===================================================== */

    function normalizeComparisonGroup(
        value
    ) {
        if (
            !value ||
            typeof value !== 'object'
        ) {
            return null;
        }

        const key =
            normalizeDisplayText(
                value.key
            );

        const label =
            normalizeDisplayText(
                value.label
            );

        const routeCountNumber =
            Number(
                value.route_count
            );

        if (!key || !label) {
            return null;
        }

        return {
            key,
            label,

            routeCount:
                Number.isFinite(
                    routeCountNumber
                )
                    ? routeCountNumber
                    : null
        };
    }


    /* =====================================================
       Representative stories

       Frontendでは再採点しない。
       Backendが返した順番を尊重する。
       ===================================================== */

    function selectRouteRepresentatives(
        stories,
        comparisonGroup
    ) {
        if (comparisonGroup?.key) {

            const sameGroupStories =
                stories.filter(
                    story =>
                        storyBelongsToComparisonGroup(
                            story,
                            comparisonGroup.key
                        )
                );

            const sameGroupRepresentatives =
                selectFirstStoryPerRoute(
                    sameGroupStories
                );

            if (
                sameGroupRepresentatives.length >=
                MIN_ROUTE_COUNT
            ) {
                return sameGroupRepresentatives;
            }
        }

        return selectFirstStoryPerRoute(
            stories
        );
    }


    function selectFirstStoryPerRoute(
        stories
    ) {
        const routeMap =
            new Map();

        stories.forEach(
            story => {

                if (
                    !isUsableRepresentativeStory(
                        story
                    )
                ) {
                    return;
                }

                const route =
                    getDecisionPathFromStory(
                        story.decision
                    );

                if (
                    !ROUTE_ORDER.includes(
                        route.key
                    )
                ) {
                    return;
                }

                /*
                 * API順を尊重。
                 * 同一Routeでは最初のStoryを採用。
                 */
                if (
                    routeMap.has(
                        route.key
                    )
                ) {
                    return;
                }

                routeMap.set(
                    route.key,
                    {
                        story,
                        route
                    }
                );
            }
        );

        return ROUTE_ORDER

            .filter(
                routeKey =>
                    routeMap.has(
                        routeKey
                    )
            )

            .map(
                routeKey =>
                    routeMap.get(
                        routeKey
                    )
            );
    }


    function isUsableRepresentativeStory(
        story
    ) {
        if (
            !story ||
            !story.decision
        ) {
            return false;
        }

        if (
            story.id === null ||
            story.id === undefined ||
            String(
                story.id
            ).trim() === ''
        ) {
            return false;
        }

        return (
            getDecisionCompleteness(
                story.decision
            )
            >
            0
        );
    }


    function storyBelongsToComparisonGroup(
        story,
        groupKey
    ) {
        const normalizedGroupKey =
            normalizeDisplayText(
                groupKey
            );

        if (!normalizedGroupKey) {
            return false;
        }

        const decision =
            story?.decision || {};

        const groups =
            Array.isArray(
                decision.dilemma_groups
            )
                ? decision.dilemma_groups
                : [];

        const matched =
            groups.some(
                group =>
                    normalizeDisplayText(
                        group?.key
                    )
                    ===
                    normalizedGroupKey
            );

        if (matched) {
            return true;
        }

        return (
            normalizeDisplayText(
                decision
                    ?.primary_dilemma_group
                    ?.key
            )
            ===
            normalizedGroupKey
        );
    }


    function getDecisionCompleteness(
        decision
    ) {
        return [
            getDilemmaText(
                decision
            ),

            getPriorityText(
                decision
            ),

            getResultText(
                decision
            )
        ]

            .filter(
                Boolean
            )

            .length;
    }


    /* =====================================================
       Compare heading
       ===================================================== */

    function updateCompareSubheading(
        section,
        comparisonGroup
    ) {
        if (
            !section ||
            !comparisonGroup?.label
        ) {
            return;
        }

        const title =
            section.querySelector(
                '.home-decision-compare-area .home-decision-subheading strong'
            );

        if (!title) {
            return;
        }

        title.textContent =
            `「${comparisonGroup.label}」で迷った人の選択を比べる`;
    }


    function updateComparisonGroupDataset(
        section,
        comparisonGroup
    ) {
        if (!section) {
            return;
        }

        section.dataset
            .comparisonGroupKey =
                comparisonGroup?.key || '';

        section.dataset
            .comparisonGroupLabel =
                comparisonGroup?.label || '';
    }


    /* =====================================================
       Decision path
       ===================================================== */

    function getDecisionPathFromStory(
        decision
    ) {
        const backendPath =
            decision?.decision_path;

        const backendObjectKey =
            normalizeDisplayText(
                backendPath?.key
            );

        if (
            backendObjectKey &&
            ROUTE_ORDER.includes(
                backendObjectKey
            )
        ) {
            return {
                key:
                    backendObjectKey,

                label:
                    normalizeDisplayText(
                        backendPath?.label
                    )
                    ||
                    getFallbackRouteLabel(
                        backendObjectKey
                    )
            };
        }

        const backendStringKey =
            typeof backendPath === 'string'

                ? normalizeDisplayText(
                    backendPath
                )

                : '';

        if (
            backendStringKey &&
            ROUTE_ORDER.includes(
                backendStringKey
            )
        ) {
            return {
                key:
                    backendStringKey,

                label:
                    getFallbackRouteLabel(
                        backendStringKey
                    )
            };
        }

        return getDecisionPathFallback(
            decision?.decision_type
        );
    }


    function getDecisionPathFallback(
        decisionType
    ) {
        const type =
            normalizeDisplayText(
                decisionType
            );

        if (type === '転職') {
            return {
                key:
                    'change',

                label:
                    '転職した'
            };
        }

        if (
            [
                '現職継続',
                '継続',
                '残留',
                '現職に残る'
            ].includes(
                type
            )
        ) {
            return {
                key:
                    'stay',

                label:
                    '残った'
            };
        }

        if (
            [
                '異動',
                '社内異動'
            ].includes(
                type
            )
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
                type || 'その他'
        };
    }


    function getFallbackRouteLabel(
        routeKey
    ) {
        const labels = {
            change:
                '転職した',

            stay:
                '残った',

            internal:
                '社内異動した'
        };

        return (
            labels[
                normalizeDisplayText(
                    routeKey
                )
            ]
            ||
            '選択'
        );
    }


    /* =====================================================
       Decision compare
       ===================================================== */

    function renderDecisionCompare(
        list,
        representatives
    ) {
        const routeCount =
            representatives.length;

        const gridStyle =
            `grid-template-columns: 150px repeat(${routeCount}, minmax(0, 1fr));`;

        list.innerHTML = `

            <div class="decision-compare-desktop">

                <div
                    class="decision-matrix"
                    data-route-count="${escapeHTML(
                        routeCount
                    )}"
                >

                    ${createMatrixHeader(
                        representatives,
                        gridStyle
                    )}


                    ${createMatrixRow(
                        '当時の迷い',

                        representatives,

                        representative =>
                            createExcerpt(
                                getDilemmaText(
                                    representative
                                        .story
                                        .decision
                                ),

                                EXCERPT_LIMITS
                                    .dilemma
                            ),

                        'まだ記録されていません。',

                        gridStyle
                    )}


                    ${createMatrixRow(
                        '大切にしたこと',

                        representatives,

                        representative =>
                            createExcerpt(
                                getPriorityText(
                                    representative
                                        .story
                                        .decision
                                ),

                                EXCERPT_LIMITS
                                    .priority
                            ),

                        'まだ記録されていません。',

                        gridStyle
                    )}


                    ${createMatrixRow(
                        'その後',

                        representatives,

                        representative =>
                            createExcerpt(
                                getResultText(
                                    representative
                                        .story
                                        .decision
                                ),

                                EXCERPT_LIMITS
                                    .result
                            ),

                        'まだ記録されていません。',

                        gridStyle
                    )}


                    ${createDetailLinkRow(
                        representatives,
                        gridStyle
                    )}

                </div>

            </div>


            <div class="decision-compare-mobile">

                ${
                    representatives

                        .map(
                            createMobileDecisionCard
                        )

                        .join('')
                }

            </div>

        `;
    }


    function createMatrixHeader(
        representatives,
        gridStyle
    ) {
        return `

            <div
                class="decision-matrix__header"
                style="${escapeHTML(
                    gridStyle
                )}"
            >

                <div class="decision-matrix__label">

                    選んだ道

                </div>


                ${
                    representatives

                        .map(
                            representative => {

                                const story =
                                    representative
                                        .story;

                                const meta =
                                    getPersonMeta(
                                        story
                                    );

                                return `

                                    <div class="decision-matrix__cell">

                                        <span
                                            class="
                                                decision-route
                                                decision-route--${escapeHTML(
                                                    representative
                                                        .route
                                                        .key
                                                )}
                                            "
                                        >

                                            ${escapeHTML(
                                                representative
                                                    .route
                                                    .label
                                            )}

                                        </span>


                                        <div class="decision-person">

                                            <strong>

                                                ${escapeHTML(
                                                    getUsername(
                                                        story
                                                    )
                                                )}

                                            </strong>


                                            ${
                                                meta

                                                    ? `
                                                        <p>

                                                            ${escapeHTML(
                                                                meta
                                                            )}

                                                        </p>
                                                    `

                                                    : ''
                                            }

                                        </div>

                                    </div>

                                `;
                            }
                        )

                        .join('')
                }

            </div>

        `;
    }


    function createMatrixRow(
        label,
        representatives,
        valueGetter,
        emptyMessage,
        gridStyle
    ) {
        return `

            <div
                class="decision-matrix__row"
                style="${escapeHTML(
                    gridStyle
                )}"
            >

                <div class="decision-matrix__label">

                    ${escapeHTML(
                        label
                    )}

                </div>


                ${
                    representatives

                        .map(
                            representative => {

                                const value =
                                    normalizeDisplayText(
                                        valueGetter(
                                            representative
                                        )
                                    );

                                return `

                                    <div
                                        class="
                                            decision-matrix__cell
                                            ${
                                                value
                                                    ? ''
                                                    : 'decision-matrix__cell--empty'
                                            }
                                        "
                                    >

                                        ${escapeHTML(
                                            value
                                            ||
                                            emptyMessage
                                        )}

                                    </div>

                                `;
                            }
                        )

                        .join('')
                }

            </div>

        `;
    }


    function createDetailLinkRow(
        representatives,
        gridStyle
    ) {
        return `

            <div
                class="decision-matrix__row"
                style="${escapeHTML(
                    gridStyle
                )}"
            >

                <div class="decision-matrix__label">

                    詳細

                </div>


                ${
                    representatives

                        .map(
                            representative => {

                                const story =
                                    representative
                                        .story;

                                const decision =
                                    story.decision || {};

                                const detailUrl =
                                    createCareerDetailUrl(
                                        story.id,
                                        decision.id
                                    );

                                return `

                                    <div class="decision-matrix__cell">

                                        <a
                                            href="${escapeHTML(
                                                detailUrl
                                            )}"

                                            class="decision-detail-link"

                                            data-same-crossroad-route="${escapeHTML(
                                                representative
                                                    .route
                                                    .key
                                            )}"

                                            data-career-id="${escapeHTML(
                                                story.id
                                            )}"

                                            data-decision-id="${escapeHTML(
                                                decision.id || ''
                                            )}"
                                        >

                                            この人の経験を読む

                                            <span aria-hidden="true">

                                                →

                                            </span>

                                        </a>

                                    </div>

                                `;
                            }
                        )

                        .join('')
                }

            </div>

        `;
    }


    /* =====================================================
       Mobile cards
       ===================================================== */

    function createMobileDecisionCard(
        representative
    ) {
        const story =
            representative.story;

        const route =
            representative.route;

        const decision =
            story.decision || {};

        const meta =
            getPersonMeta(
                story
            );

        const detailUrl =
            createCareerDetailUrl(
                story.id,
                decision.id
            );

        return `

            <article
                class="decision-mobile-card"

                data-same-crossroad-route="${escapeHTML(
                    route.key
                )}"

                data-career-id="${escapeHTML(
                    story.id
                )}"

                data-decision-id="${escapeHTML(
                    decision.id || ''
                )}"
            >

                <div class="decision-mobile-card__header">

                    <span
                        class="
                            decision-route
                            decision-route--${escapeHTML(
                                route.key
                            )}
                        "
                    >

                        ${escapeHTML(
                            route.label
                        )}

                    </span>


                    <p class="decision-mobile-card__person">

                        <strong>

                            ${escapeHTML(
                                getUsername(
                                    story
                                )
                            )}

                        </strong>


                        ${
                            meta

                                ? `・${escapeHTML(
                                    meta
                                )}`

                                : ''
                        }

                    </p>

                </div>


                ${createMobileRow(
                    '当時の迷い',

                    createExcerpt(
                        getDilemmaText(
                            decision
                        ),

                        MOBILE_EXCERPT_LIMITS
                            .dilemma
                    )
                )}


                ${createMobileRow(
                    '大切にしたこと',

                    createExcerpt(
                        getPriorityText(
                            decision
                        ),

                        MOBILE_EXCERPT_LIMITS
                            .priority
                    )
                )}


                ${createMobileRow(
                    'その後',

                    createExcerpt(
                        getResultText(
                            decision
                        ),

                        MOBILE_EXCERPT_LIMITS
                            .result
                    )
                )}


                <div class="decision-mobile-card__footer">

                    <a
                        href="${escapeHTML(
                            detailUrl
                        )}"

                        class="decision-detail-link"

                        data-same-crossroad-route="${escapeHTML(
                            route.key
                        )}"

                        data-career-id="${escapeHTML(
                            story.id
                        )}"

                        data-decision-id="${escapeHTML(
                            decision.id || ''
                        )}"
                    >

                        この人の経験を読む

                        <span aria-hidden="true">

                            →

                        </span>

                    </a>

                </div>

            </article>

        `;
    }


    function createMobileRow(
        label,
        value
    ) {
        const text =
            normalizeDisplayText(
                value
            );

        return `

            <div class="decision-mobile-card__row">

                <div class="decision-mobile-card__label">

                    ${escapeHTML(
                        label
                    )}

                </div>


                <div class="decision-mobile-card__value">

                    ${escapeHTML(
                        text
                        ||
                        'まだ記録されていません。'
                    )}

                </div>

            </div>

        `;
    }


    /* =====================================================
       What mattered
       ===================================================== */

    function renderDecisionCriteria(
        criteriaSection,
        criteriaList,
        representatives
    ) {
        if (
            !criteriaSection ||
            !criteriaList
        ) {
            updateYourDecisionStep(
                false
            );

            return;
        }

        const items =
            representatives

                .map(
                    representative => ({
                        representative,

                        priority:
                            getPriorityText(
                                representative
                                    .story
                                    .decision
                            )
                    })
                )

                .filter(
                    item =>
                        item.priority
                );

        /*
         * 2人以上のpriorityがないと
         * 判断軸比較にならない。
         */
        if (
            items.length <
            2
        ) {
            criteriaSection.hidden =
                true;

            criteriaList.innerHTML =
                '';

            updateYourDecisionStep(
                false
            );

            return;
        }

        criteriaList.innerHTML =

            items

                .map(
                    item => {

                        const representative =
                            item.representative;

                        return `

                            <article class="decision-criteria-card">

                                <span class="decision-criteria-card__route">

                                    ${escapeHTML(
                                        representative
                                            .route
                                            .label
                                    )}

                                </span>


                                <strong>

                                    ${escapeHTML(
                                        getUsername(
                                            representative
                                                .story
                                        )
                                    )}さんが大切にしたこと

                                </strong>


                                <p>

                                    ${escapeHTML(
                                        createExcerpt(
                                            item.priority,
                                            90
                                        )
                                    )}

                                </p>

                            </article>

                        `;
                    }
                )

                .join('');

        criteriaSection.hidden =
            false;

        updateYourDecisionStep(
            true
        );
    }


    function updateYourDecisionStep(
        criteriaVisible
    ) {
        const yourDecision =
            document.getElementById(
                YOUR_DECISION_ID
            );

        if (!yourDecision) {
            return;
        }

        const step =
            yourDecision.querySelector(
                '.home-decision-subheading > span'
            );

        if (!step) {
            return;
        }

        step.textContent =
            criteriaVisible
                ? '03'
                : '02';
    }


    /* =====================================================
       Empty / error
       ===================================================== */

    function renderUnavailableState(
        section,
        list,
        message
    ) {
        list.innerHTML = `

            <div
                class="
                    decision-matrix__cell
                    decision-matrix__cell--empty
                "

                style="
                    border: 1px solid #dce5ee;
                    border-radius: 12px;
                "
            >

                ${escapeHTML(
                    message
                )}

            </div>

        `;

        section.hidden =
            false;

        updateYourDecisionStep(
            false
        );
    }


    /* =====================================================
       Decision text
       ===================================================== */

    function getDilemmaText(
        decision
    ) {
        return (
            normalizeDisplayText(
                decision?.dilemma_text
            )

            ||

            normalizeDisplayText(
                decision?.trigger_text
            )

            ||

            normalizeDisplayText(
                decision?.title
            )
        );
    }


    function getPriorityText(
        decision
    ) {
        return normalizeDisplayText(
            decision?.priority_text
        );
    }


    function getResultText(
        decision
    ) {
        return normalizeDisplayText(
            decision?.result_text
        );
    }


    function createExcerpt(
        value,
        maxLength
    ) {
        const text =
            normalizeDisplayText(
                value
            )

                .replace(
                    /\s+/g,
                    ' '
                )

                .trim();

        if (!text) {
            return '';
        }

        const characters =
            Array.from(
                text
            );

        if (
            characters.length <=
            maxLength
        ) {
            return text;
        }

        const sliced =
            characters

                .slice(
                    0,
                    maxLength
                )

                .join('');

        let bestIndex =
            -1;

        [
            '。',
            '！',
            '？',
            '!',
            '?'
        ]

            .forEach(
                mark => {

                    bestIndex =
                        Math.max(
                            bestIndex,

                            sliced.lastIndexOf(
                                mark
                            )
                        );
                }
            );

        if (
            bestIndex >=
            Math.floor(
                maxLength * 0.58
            )
        ) {
            return sliced

                .slice(
                    0,
                    bestIndex + 1
                )

                .trim();
        }

        return (
            sliced.trim()
            +
            '…'
        );
    }


    /* =====================================================
       Person
       ===================================================== */

    function getUsername(
        story
    ) {
        return (
            normalizeDisplayText(
                story?.username
            )

            ||

            normalizeDisplayText(
                story?.name
            )

            ||

            'Career GPS User'
        );
    }


    function getPersonMeta(
        story
    ) {
        const values =
            [];

        const ageText =
            getAgeGroup(
                story?.age
            );

        const profession =
            normalizeDisplayText(
                story?.profession
            );

        if (ageText) {
            values.push(
                ageText
            );
        }

        if (
            profession
            &&
            ![
                '職種非公開',
                '職種未設定'
            ].includes(
                profession
            )
        ) {
            values.push(
                profession
            );
        }

        return values.join(
            '・'
        );
    }


    function getAgeGroup(
        age
    ) {
        if (
            age === null ||
            age === undefined ||
            age === ''
        ) {
            return '';
        }

        const text =
            String(
                age
            ).trim();

        if (!text) {
            return '';
        }

        if (
            text.includes(
                '代'
            )
        ) {
            return text;
        }

        const number =
            Number(
                text
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

        if (number < 20) {
            return '10代';
        }

        if (number >= 60) {
            return '60代以上';
        }

        return `${
            Math.floor(
                number / 10
            )
            *
            10
        }代`;
    }


    /* =====================================================
       Detail URL
       ===================================================== */

    function createCareerDetailUrl(
        careerId,
        decisionId
    ) {
        const params =
            new URLSearchParams();

        params.set(
            'id',
            String(
                careerId
            )
        );

        if (
            decisionId !== null
            &&
            decisionId !== undefined
            &&
            String(
                decisionId
            ).trim()
        ) {
            params.set(
                'decision_id',
                String(
                    decisionId
                )
            );
        }

        params.set(
            'theme',
            THEME
        );

        return (
            'Career_detail.html?'
            +
            params.toString()
        );
    }


    /* =====================================================
       Analytics
       ===================================================== */

    function bindAnalytics(
        section
    ) {
        if (
            section.dataset
                .analyticsBound
            ===
            'true'
        ) {
            return;
        }

        section.dataset
            .analyticsBound =
                'true';

        section.addEventListener(
            'click',
            event => {

                const detailLink =
                    event.target.closest(
                        '.decision-detail-link'
                    );

                if (
                    !detailLink
                    ||
                    typeof gtag !==
                    'function'
                ) {
                    return;
                }

                gtag(
                    'event',
                    'same_crossroad_story_click',
                    {
                        page_type:
                            'career_home',

                        theme:
                            THEME,

                        comparison_group:
                            section
                                .dataset
                                .comparisonGroupKey
                            ||
                            '',

                        comparison_group_label:
                            section
                                .dataset
                                .comparisonGroupLabel
                            ||
                            '',

                        decision_path:
                            detailLink
                                .dataset
                                .sameCrossroadRoute
                            ||
                            '',

                        career_id:
                            detailLink
                                .dataset
                                .careerId
                            ||
                            '',

                        decision_id:
                            detailLink
                                .dataset
                                .decisionId
                            ||
                            ''
                    }
                );
            }
        );
    }


    function bindAllLinkAnalytics() {
        const links =
            document.querySelectorAll(
                '.home-same-crossroad-all-link'
            );

        links.forEach(
            link => {

                if (
                    link.dataset
                        .analyticsBound
                    ===
                    'true'
                ) {
                    return;
                }

                link.dataset
                    .analyticsBound =
                        'true';

                link.addEventListener(
                    'click',
                    () => {

                        if (
                            typeof gtag !==
                            'function'
                        ) {
                            return;
                        }

                        const section =
                            document.getElementById(
                                SECTION_ID
                            );

                        gtag(
                            'event',
                            'same_crossroad_compare_click',
                            {
                                page_type:
                                    'career_home',

                                theme:
                                    THEME,

                                comparison_group:
                                    section
                                        ?.dataset
                                        ?.comparisonGroupKey
                                    ||
                                    '',

                                comparison_group_label:
                                    section
                                        ?.dataset
                                        ?.comparisonGroupLabel
                                    ||
                                    ''
                            }
                        );
                    }
                );
            }
        );
    }


    function trackCompareView(
        representatives,
        comparisonGroup
    ) {
        if (
            typeof gtag !==
            'function'
        ) {
            return;
        }

        gtag(
            'event',
            'same_crossroad_view',
            {
                page_type:
                    'career_home',

                theme:
                    THEME,

                comparison_group:
                    comparisonGroup?.key
                    ||
                    '',

                comparison_group_label:
                    comparisonGroup?.label
                    ||
                    '',

                route_count:
                    representatives.length,

                decision_paths:
                    representatives

                        .map(
                            representative =>
                                representative
                                    .route
                                    .key
                        )

                        .join(',')
            }
        );
    }


    /* =====================================================
       Text helpers
       ===================================================== */

    function normalizeText(
        value
    ) {
        if (
            value === null ||
            value === undefined
        ) {
            return '';
        }

        return String(
            value
        ).trim();
    }


    function normalizeDisplayText(
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
            [
                'null',
                'undefined',
                'none',
                'n/a'
            ].includes(
                text.toLowerCase()
            )
        ) {
            return '';
        }

        return text;
    }


    function escapeHTML(
        value
    ) {
        if (
            value === null ||
            value === undefined
        ) {
            return '';
        }

        return String(
            value
        )

            .replace(
                /[&'`"<>]/g,

                character => ({
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
                })[
                    character
                ]
            );
    }

})();