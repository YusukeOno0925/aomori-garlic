(() => {
    'use strict';


    /* =====================================================
       CONFIG
       ===================================================== */

    const API_URL =
        '/career-stories-by-theme/?theme=change';

    const SECTION_ID =
        'home-same-crossroad';

    const LIST_ID =
        'home-same-crossroad-list';

    const THEME =
        'change';

    const MIN_ROUTE_COUNT =
        2;

    const ROUTE_ORDER = [
        'change',
        'stay',
        'internal'
    ];


    /* =====================================================
       INITIALIZE
       ===================================================== */

    document.addEventListener(
        'DOMContentLoaded',
        initializeSameCrossroad
    );


    async function initializeSameCrossroad() {
        const section =
            document.getElementById(
                SECTION_ID
            );

        const list =
            document.getElementById(
                LIST_ID
            );


        if (!section || !list) {
            return;
        }


        /*
         * API取得前・エラー時に
         * 空のセクションを表示しない。
         */
        section.hidden = true;
        list.innerHTML = '';


        try {
            const response =
                await fetch(
                    API_URL,
                    {
                        method: 'GET',
                        headers: {
                            Accept:
                                'application/json'
                        },
                        credentials: 'include'
                    }
                );


            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}`
                );
            }


            const data =
                await response.json();


            const stories =
                Array.isArray(
                    data.stories
                )
                    ? data.stories
                    : [];


            if (stories.length === 0) {
                return;
            }


            const representatives =
                selectRouteRepresentatives(
                    stories
                );


            /*
             * SAME CROSSROADは
             * 異なる選択を比較するための場所。
             *
             * 1ルートしかない場合は表示しない。
             */
            if (
                representatives.length
                <
                MIN_ROUTE_COUNT
            ) {
                return;
            }


            list.innerHTML =
                representatives
                    .map(
                        createStoryCardHTML
                    )
                    .join('');


            section.hidden = false;


            /*
             * 既存GA4計測を維持。
             */
            bindAnalytics(
                section
            );

        } catch (error) {
            console.error(
                'Same Crossroad error:',
                error
            );

            /*
             * SAME CROSSROADの取得失敗で
             * Home全体を壊さない。
             */
            section.hidden = true;
            list.innerHTML = '';
        }
    }


    /* =====================================================
       REPRESENTATIVE STORIES
       ===================================================== */

    function selectRouteRepresentatives(
        stories
    ) {
        const routeMap =
            new Map();


        stories.forEach(
            story => {

                if (
                    !story
                    ||
                    !story.decision
                ) {
                    return;
                }


                const decision =
                    story.decision;


                /*
                 * Backendが返すdecision_pathを優先。
                 *
                 * 古いAPIレスポンスとの互換のため、
                 * 無い場合のみdecision_typeからFallbackする。
                 */
                const route =
                    getDecisionPathFromStory(
                        decision
                    );


                if (
                    !ROUTE_ORDER.includes(
                        route.key
                    )
                ) {
                    return;
                }


                /*
                 * APIの並び順を維持し、
                 * 各ルート最初のStoryを代表とする。
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


    /* =====================================================
       DECISION PATH
       ===================================================== */

    function getDecisionPathFromStory(
        decision
    ) {
        const backendPath =
            decision.decision_path;


        if (
            backendPath
            &&
            ROUTE_ORDER.includes(
                normalizeDisplayText(
                    backendPath.key
                )
            )
        ) {
            return {
                key:
                    normalizeDisplayText(
                        backendPath.key
                    ),

                label:
                    normalizeDisplayText(
                        backendPath.label
                    )
                    ||
                    getFallbackRouteLabel(
                        backendPath.key
                    )
            };
        }


        /*
         * 旧API互換用Fallback。
         */
        return getDecisionPathFallback(
            decision.decision_type
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
                key: 'change',
                label: '転職した'
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
                key: 'stay',
                label: '残った'
            };
        }


        if (type === '異動') {
            return {
                key: 'internal',
                label: '社内異動した'
            };
        }


        return {
            key: 'other',
            label:
                type
                ||
                'その他'
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
       CARD
       ===================================================== */

    function createStoryCardHTML(
        representative
    ) {
        const story =
            representative.story;

        const route =
            representative.route;

        const decision =
            story.decision
            ||
            {};


        const username =
            normalizeDisplayText(
                story.username
            )
            ||
            'Career GPS User';


        const ageText =
            getAgeGroup(
                story.age
            )
            ||
            '年代非公開';


        const profession =
            normalizeDisplayText(
                story.profession
            )
            ||
            '職種非公開';


        /*
         * 当時の迷い
         *
         * dilemma_textを最優先。
         */
        const dilemma =
            normalizeDisplayText(
                decision.dilemma_text
            )
            ||
            normalizeDisplayText(
                decision.trigger_text
            )
            ||
            normalizeDisplayText(
                decision.title
            );


        /*
         * 判断するときに
         * 大切にしたこと。
         */
        const priority =
            normalizeDisplayText(
                decision.priority_text
            );


        /*
         * 選択した後の結果。
         *
         * career_stories_by_theme.pyで
         * result_textを追加済み。
         */
        const result =
            normalizeDisplayText(
                decision.result_text
            );


        const detailUrl =
            createCareerDetailUrl(
                story.id,
                decision.id
            );


        return `
            <a
                href="${escapeHTML(detailUrl)}"
                class="
                    home-same-crossroad-card
                    home-same-crossroad-card--${escapeHTML(route.key)}
                "
                data-same-crossroad-route="${escapeHTML(route.key)}"
                data-career-id="${escapeHTML(story.id)}"
                data-decision-id="${escapeHTML(decision.id || '')}"
                aria-label="${escapeHTML(
                    `${username}さんの「${route.label}」という選択を見る`
                )}"
            >

                <!-- =====================================
                     Selected Route
                ====================================== -->

                <div class="home-same-crossroad-card__route">

                    <span class="home-same-crossroad-card__route-label">
                        選んだ道
                    </span>

                    <strong>
                        ${escapeHTML(route.label)}
                    </strong>

                </div>


                <!-- =====================================
                     Person
                ====================================== -->

                <div class="home-same-crossroad-card__person-header">

                    <div
                        class="home-same-crossroad-card__avatar"
                        aria-hidden="true"
                    >
                        ${escapeHTML(
                            getInitial(
                                username
                            )
                        )}
                    </div>

                    <div class="home-same-crossroad-card__person-info">

                        <strong>
                            ${escapeHTML(username)}
                        </strong>

                        <p>
                            ${escapeHTML(ageText)}
                            <span aria-hidden="true">
                                ・
                            </span>
                            ${escapeHTML(profession)}
                        </p>

                    </div>

                </div>


                <!-- =====================================
                     Career GPS Path
                ====================================== -->

                <div class="home-same-crossroad-card__path">

                    ${createPathItem(
                        '01',
                        '当時の迷い',
                        dilemma,
                        'この選択で何に迷っていたかは、まだ記録されていません。'
                    )}

                    ${createPathItem(
                        '02',
                        '大切にしたこと',
                        priority,
                        '何を大切にして決めたかは、まだ記録されていません。'
                    )}

                    ${createPathItem(
                        '03',
                        'その後',
                        result,
                        '選択後の結果は、まだ記録されていません。'
                    )}

                </div>


                <!-- =====================================
                     CTA
                ====================================== -->

                <div class="home-same-crossroad-card__cta">

                    <span>
                        選択の背景と、その後を見る
                    </span>

                    <span aria-hidden="true">
                        →
                    </span>

                </div>

            </a>
        `;
    }


    /* =====================================================
       CAREER GPS PATH ITEM
       ===================================================== */

    function createPathItem(
        number,
        label,
        value,
        emptyMessage
    ) {
        const text =
            normalizeDisplayText(
                value
            );


        const emptyClass =
            text
                ? ''
                : ' home-same-crossroad-card__path-item--empty';


        return `
            <div
                class="
                    home-same-crossroad-card__path-item
                    ${emptyClass}
                "
            >

                <div class="home-same-crossroad-card__path-heading">

                    <span class="home-same-crossroad-card__path-number">
                        ${escapeHTML(number)}
                    </span>

                    <span class="home-same-crossroad-card__path-label">
                        ${escapeHTML(label)}
                    </span>

                </div>

                <p>
                    ${escapeHTML(
                        text
                        ||
                        emptyMessage
                    )}
                </p>

            </div>
        `;
    }


    /* =====================================================
       DETAIL URL
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
       AGE
       ===================================================== */

    function getAgeGroup(
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


        const decade =
            Math.floor(
                number / 10
            )
            *
            10;


        return `${decade}代`;
    }


    /* =====================================================
       AVATAR
       ===================================================== */

    function getInitial(
        value
    ) {
        const text =
            normalizeDisplayText(
                value
            );


        if (!text) {
            return 'C';
        }


        return Array
            .from(
                text
            )[0]
            .toUpperCase();
    }


    /* =====================================================
       ANALYTICS
       ===================================================== */

    function bindAnalytics(
        section
    ) {
        /*
         * 二重登録防止。
         */
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

                /*
                 * Storyクリック
                 */
                const storyCard =
                    event.target.closest(
                        '.home-same-crossroad-card'
                    );


                if (
                    storyCard
                    &&
                    typeof gtag
                    ===
                    'function'
                ) {
                    gtag(
                        'event',
                        'same_crossroad_story_click',
                        {
                            page_type:
                                'career_home',

                            theme:
                                THEME,

                            decision_path:
                                storyCard.dataset
                                    .sameCrossroadRoute
                                ||
                                '',

                            career_id:
                                storyCard.dataset
                                    .careerId
                                ||
                                '',

                            decision_id:
                                storyCard.dataset
                                    .decisionId
                                ||
                                ''
                        }
                    );
                }


                /*
                 * 「すべての選択を比較する」
                 */
                const allLink =
                    event.target.closest(
                        '.home-same-crossroad-all-link'
                    );


                if (
                    allLink
                    &&
                    typeof gtag
                    ===
                    'function'
                ) {
                    gtag(
                        'event',
                        'same_crossroad_compare_click',
                        {
                            page_type:
                                'career_home',

                            theme:
                                THEME
                        }
                    );
                }

            }
        );
    }


    /* =====================================================
       TEXT HELPERS
       ===================================================== */

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


    /* =====================================================
       ESCAPE HTML
       ===================================================== */

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