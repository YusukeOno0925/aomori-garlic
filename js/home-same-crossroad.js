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


    /*
     * SAME CROSSROADとして成立させるため、
     * 異なる選択肢が最低2つ必要。
     */
    const MIN_ROUTE_COUNT =
        2;


    /*
     * Homeでは最大3ルート。
     *
     * 転職した
     * 残った
     * 社内異動した
     */
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


        if (
            !section
            ||
            !list
        ) {

            return;
        }


        /*
         * 読み込み前は必ず非表示。
         *
         * API失敗時にも空のセクションを
         * Homeに残さない。
         */
        section.hidden =
            true;


        list.innerHTML =
            '';


        try {

            const response =
                await fetch(
                    API_URL,
                    {
                        method:
                            'GET',

                        headers: {
                            Accept:
                                'application/json'
                        }
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


            if (
                stories.length
                ===
                0
            ) {

                return;
            }


            /*
             * API側はテーマとの関連度が高い順で
             * Storyを返している。
             *
             * その順序を維持したまま、
             * 各ルート最初の1件を代表Storyにする。
             */
            const representatives =
                selectRouteRepresentatives(
                    stories
                );


            /*
             * 1種類しかなければ
             * SAME CROSSROADとして比較にならない。
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


            section.hidden =
                false;


            bindAnalytics(
                section
            );


        } catch (error) {

            console.error(
                'Same Crossroad error:',
                error
            );


            /*
             * Home本体の表示を壊さない。
             */
            section.hidden =
                true;


            list.innerHTML =
                '';
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


                const route =
                    getDecisionPath(
                        story.decision
                            .decision_type
                    );


                /*
                 * Home SAME CROSSROADでは
                 * 想定している3ルートのみ表示。
                 */
                if (
                    !ROUTE_ORDER.includes(
                        route.key
                    )
                ) {

                    return;
                }


                /*
                 * 同じルートでは
                 * API順で最初のStoryを代表にする。
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

    function getDecisionPath(
        decisionType
    ) {

        const type =
            normalizeDisplayText(
                decisionType
            );


        /* -----------------------------------------
           転職した
        ----------------------------------------- */

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


        /* -----------------------------------------
           残った
        ----------------------------------------- */

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


        /* -----------------------------------------
           社内異動した
        ----------------------------------------- */

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


        const ageText =
            getAgeGroup(
                story.age
            );


        const profession =
            normalizeDisplayText(
                story.profession
            );


        const dilemma =
            getDecisionHook(
                decision
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

                <div class="home-same-crossroad-card__person">

                    ${
                        ageText
                            ? `
                                <span>
                                    ${escapeHTML(ageText)}
                                </span>
                            `
                            : ''
                    }


                    ${
                        profession
                        &&
                        profession !==
                        '職種未設定'

                            ? `
                                <span>
                                    ${escapeHTML(profession)}
                                </span>
                            `

                            : ''
                    }

                </div>



                <!-- =====================================
                     Dilemma
                ====================================== -->

                <div class="home-same-crossroad-card__decision">

                    <p class="home-same-crossroad-card__label">
                        SAME DILEMMA
                    </p>


                    <h3>
                        ${escapeHTML(dilemma)}
                    </h3>

                </div>



                <!-- =====================================
                     CTA
                ====================================== -->

                <div class="home-same-crossroad-card__cta">

                    <span>
                        選んだ理由とその後を見る
                    </span>


                    <span aria-hidden="true">
                        →
                    </span>

                </div>


            </a>

        `;
    }



    /* =====================================================
       DECISION HOOK
       ===================================================== */

    function getDecisionHook(
        decision
    ) {

        const dilemma =
            normalizeDisplayText(
                decision.dilemma_text
            );


        if (dilemma) {

            return truncateText(
                dilemma,
                78
            );
        }


        const title =
            normalizeDisplayText(
                decision.title
            );


        if (title) {

            return truncateText(
                title,
                78
            );
        }


        const trigger =
            normalizeDisplayText(
                decision.trigger_text
            );


        if (trigger) {

            return truncateText(
                trigger,
                78
            );
        }


        return (
            '転職するか、今の会社に残るか迷った'
        );
    }



    /* =====================================================
       DETAIL URL

       Career Detailへ
       decision_id / theme を確実に引き継ぐ。
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
            )
            .trim()
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
            `Career_detail.html?`
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


        return (
            `${decade}代`
        );
    }



    /* =====================================================
       ANALYTICS
       ===================================================== */

    function bindAnalytics(
        section
    ) {

        /*
         * 二重登録防止
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


        return (
            String(
                value
            )
            .trim()
        );
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
            ]
            .includes(
                text.toLowerCase()
            )
        ) {

            return '';
        }


        return text;
    }


    function truncateText(
        value,
        maxLength
    ) {

        const text =
            normalizeDisplayText(
                value
            );


        if (
            !text
            ||
            text.length
            <=
            maxLength
        ) {

            return text;
        }


        return (
            text
                .slice(
                    0,
                    maxLength
                )
                .trim()
            +
            '…'
        );
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