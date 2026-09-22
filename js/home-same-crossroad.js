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


    const CRITERIA_SECTION_ID =
        'home-decision-criteria';


    const CRITERIA_LIST_ID =
        'home-decision-criteria-list';


    const YOUR_DECISION_ID =
        'home-your-decision';


    const THEME =
        'change';


    const MIN_ROUTE_COUNT =
        2;


    const ROUTE_ORDER = [
        'change',
        'stay',
        'internal'
    ];


    /*
     * PC表示用
     */
    const EXCERPT_LIMITS = {

        dilemma:
            88,

        priority:
            72,

        result:
            88

    };


    /*
     * Smartphone表示用
     *
     * PCより短くする。
     */
    const MOBILE_EXCERPT_LIMITS = {

        dilemma:
            56,

        priority:
            48,

        result:
            56

    };



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


        const criteriaSection =
            document.getElementById(
                CRITERIA_SECTION_ID
            );


        const criteriaList =
            document.getElementById(
                CRITERIA_LIST_ID
            );


        if (
            !section
            ||
            !list
        ) {
            return;
        }


        /*
         * 初期状態
         */
        section.hidden =
            true;


        list.innerHTML =
            '';


        if (criteriaSection) {

            criteriaSection.hidden =
                true;

        }


        if (criteriaList) {

            criteriaList.innerHTML =
                '';

        }


        /*
         * 判断軸比較が出ない場合に備え、
         * YOUR DECISIONは一旦02にしておく。
         *
         * 判断軸比較が表示された場合だけ03へ変更する。
         */
        updateYourDecisionStep(
            false
        );


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
                        },

                        credentials:
                            'include'
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


            /*
             * Storyなし
             */
            if (
                stories.length
                ===
                0
            ) {

                renderUnavailableState(
                    section,
                    list,
                    '比較できるCareer Storyは、まだありません。'
                );

                bindAllLinkAnalytics();

                return;

            }


            /*
             * 各ルートの代表Story選定
             */
            const representatives =
                selectRouteRepresentatives(
                    stories
                );


            /*
             * 異なる選択が2種類未満
             */
            if (
                representatives.length
                <
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


            /*
             * 比較表示
             */
            renderDecisionCompare(
                list,
                representatives
            );


            /*
             * 判断軸比較
             */
            renderDecisionCriteria(
                criteriaSection,
                criteriaList,
                representatives
            );


            section.hidden =
                false;


            /*
             * Analytics
             */
            bindAnalytics(
                section
            );


            bindAllLinkAnalytics();


            trackCompareView(
                representatives
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
       REPRESENTATIVE STORIES

       各ルートから、
       Home比較に向いているStoryを1件選ぶ。
       ===================================================== */

    function selectRouteRepresentatives(
        stories
    ) {

        const routeMap =
            new Map();


        stories.forEach(
            (
                story,
                index
            ) => {

                if (
                    !story
                    ||
                    !story.decision
                ) {
                    return;
                }


                /*
                 * Career IDが無いStoryは
                 * 詳細へ遷移できないため除外。
                 */
                if (
                    story.id === null
                    ||
                    story.id === undefined
                    ||
                    String(
                        story.id
                    ).trim() === ''
                ) {
                    return;
                }


                const decision =
                    story.decision;


                const route =
                    getDecisionPathFromStory(
                        decision
                    );


                /*
                 * 今回比較する3ルート以外は除外
                 */
                if (
                    !ROUTE_ORDER.includes(
                        route.key
                    )
                ) {
                    return;
                }


                /*
                 * Homeでは全項目入力を必須にしない。
                 *
                 * ・迷い
                 * ・大切にしたこと
                 * ・その後
                 *
                 * のうち1項目でも登録されていれば
                 * 比較候補にする。
                 */
                if (
                    getDecisionCompleteness(
                        decision
                    )
                    ===
                    0
                ) {
                    return;
                }


                const candidate = {

                    story,

                    route,

                    index,

                    score:
                        scoreRepresentativeStory(
                            story
                        )

                };


                const current =
                    routeMap.get(
                        route.key
                    );


                /*
                 * 同一ルート内では、
                 * 情報が充実しているStoryを優先。
                 */
                if (
                    !current
                    ||
                    candidate.score
                    >
                    current.score
                ) {

                    routeMap.set(
                        route.key,
                        candidate
                    );

                }

            }
        );


        /*
         * 転職 → 残留 → 異動
         * の順番は固定。
         */
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
       COMPLETENESS
       ===================================================== */

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
       REPRESENTATIVE SCORE
       ===================================================== */

    function scoreRepresentativeStory(
        story
    ) {

        const decision =
            story.decision
            ||
            {};


        let score =
            0;


        /*
         * 迷い
         */
        if (
            getDilemmaText(
                decision
            )
        ) {

            score +=
                5;

        }


        /*
         * 判断軸
         */
        if (
            getPriorityText(
                decision
            )
        ) {

            score +=
                4;

        }


        /*
         * その後
         */
        if (
            getResultText(
                decision
            )
        ) {

            score +=
                5;

        }


        /*
         * decision_idあり
         */
        if (
            decision.id !== null
            &&
            decision.id !== undefined
            &&
            String(
                decision.id
            ).trim()
        ) {

            score +=
                2;

        }


        /*
         * 職種あり
         */
        if (
            normalizeDisplayText(
                story.profession
            )
        ) {

            score +=
                1;

        }


        /*
         * 年代あり
         */
        if (
            getAgeGroup(
                story.age
            )
        ) {

            score +=
                1;

        }


        return score;

    }



    /* =====================================================
       DECISION PATH
       ===================================================== */

    function getDecisionPathFromStory(
        decision
    ) {

        const backendPath =
            decision?.decision_path;


        /*
         * APIがobjectで返すケース
         */
        const backendObjectKey =
            normalizeDisplayText(
                backendPath?.key
            );


        if (
            backendObjectKey
            &&
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


        /*
         * APIがstringで返すケースも一応対応
         */
        const backendStringKey =
            typeof backendPath
            ===
            'string'

                ? normalizeDisplayText(
                    backendPath
                )

                : '';


        if (
            backendStringKey
            &&
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


        /*
         * 旧API互換
         */
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


        /*
         * 転職
         */
        if (
            type ===
            '転職'
        ) {

            return {

                key:
                    'change',

                label:
                    '転職した'

            };

        }


        /*
         * 現職継続
         */
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


        /*
         * 社内異動
         */
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
       DECISION COMPARE
       ===================================================== */

    function renderDecisionCompare(
        list,
        representatives
    ) {

        const routeCount =
            representatives.length;


        /*
         * 2ルートなら2列、
         * 3ルートなら3列にする。
         */
        const gridStyle =
            `grid-template-columns: 150px repeat(${routeCount}, minmax(0, 1fr));`;


        list.innerHTML = `

            <!-- =====================================
                 Desktop
            ====================================== -->

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



            <!-- =====================================
                 Smartphone
            ====================================== -->

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



    /* =====================================================
       DESKTOP HEADER
       ===================================================== */

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



    /* =====================================================
       DESKTOP ROW
       ===================================================== */

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



    /* =====================================================
       DESKTOP DETAIL ROW
       ===================================================== */

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
                                    story.decision
                                    ||
                                    {};


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
                                                decision.id
                                                ||
                                                ''
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
       MOBILE CARD
       ===================================================== */

    function createMobileDecisionCard(
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
                    decision.id
                    ||
                    ''
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
                            decision.id
                            ||
                            ''
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



    /* =====================================================
       MOBILE ROW
       ===================================================== */

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
       WHAT MATTERED

       本人が登録したpriority_textのみ使用。

       AIで
       「この人はこれが理由だった」
       と推測しない。
       ===================================================== */

    function renderDecisionCriteria(
        criteriaSection,
        criteriaList,
        representatives
    ) {

        if (
            !criteriaSection
            ||
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
         * 2人以上の判断軸がないと
         * 「違い」を比較できない。
         */
        if (
            items.length
            <
            2
        ) {

            criteriaSection.hidden =
                true;


            criteriaList.innerHTML =
                '';


            /*
             * 02 WHY CHOICES DIFFERを飛ばすので、
             * YOUR DECISIONを02へ繰り上げ。
             */
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
                            item
                                .representative;


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


        /*
         * 01 Compare
         * 02 What mattered
         * 03 Your decision
         */
        updateYourDecisionStep(
            true
        );

    }



    /* =====================================================
       YOUR DECISION STEP
       ===================================================== */

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
       EMPTY / ERROR
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


        /*
         * 判断軸比較なし
         */
        updateYourDecisionStep(
            false
        );

    }



    /* =====================================================
       DECISION TEXT
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



    /* =====================================================
       HOME EXCERPT

       DBは変更しない。

       Homeだけ短く表示する。

       Career_detailでは
       元データ全文を利用する。
       ===================================================== */

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
            characters.length
            <=
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


        /*
         * 可能なら文章の区切りで止める。
         */
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


        /*
         * 切る位置が前過ぎる場合は
         * 文字数で切る。
         */
        if (
            bestIndex
            >=
            Math.floor(
                maxLength
                *
                0.58
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
       PERSON
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



    /* =====================================================
       AGE
       ===================================================== */

    function getAgeGroup(
        age
    ) {

        if (
            age === null
            ||
            age === undefined
            ||
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


        /*
         * APIが
         * 20代 / 30代
         * のように返している場合
         */
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


        if (
            number < 20
        ) {

            return '10代';

        }


        if (
            number >= 60
        ) {

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
       ANALYTICS
       Detail links
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
                    detailLink
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

            }
        );

    }



    /* =====================================================
       ANALYTICS
       "このテーマの経験を探す"
       ===================================================== */

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
                            typeof gtag
                            !==
                            'function'
                        ) {

                            return;

                        }


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
                );

            }
        );

    }



    /* =====================================================
       VIEW ANALYTICS
       ===================================================== */

    function trackCompareView(
        representatives
    ) {

        if (
            typeof gtag
            !==
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