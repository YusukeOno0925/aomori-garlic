(() => {
    'use strict';


    /* =========================================================
       CONFIG
       ========================================================= */

    const POPULAR_STORIES_API =
        '/popular-career-stories/';


    /*
     * HomeではPopularを主役にしない。
     *
     * Discovery用途として3件だけ表示。
     */
    const POPULAR_STORIES_LIMIT =
        3;


    /*
     * Home表示用。
     * DB / 詳細画面の本文は変更しない。
     */
    const POPULAR_EXCERPT_LIMIT =
        58;



    /* =========================================================
       INITIALIZE
       ========================================================= */

    document.addEventListener(
        'DOMContentLoaded',
        loadPopularStories
    );



    /* =========================================================
       LOAD
       ========================================================= */

    async function loadPopularStories() {

        const list =
            document.getElementById(
                'popular-stories-list'
            );


        const indicators =
            document.getElementById(
                'popular-stories-indicators'
            );


        if (!list) {
            return;
        }


        /*
         * 新HomeではCarouselにしない。
         *
         * 既存HTMLとの互換用に
         * indicator自体は残している。
         */
        if (indicators) {

            indicators.innerHTML =
                '';

            indicators.style.display =
                'none';

        }


        /*
         * Loading
         */
        renderMessage(
            list,
            'Career Storyを読み込んでいます。'
        );


        try {

            const response =
                await fetch(
                    POPULAR_STORIES_API,
                    {
                        method:
                            'GET',

                        credentials:
                            'include',

                        headers: {
                            Accept:
                                'application/json'
                        }
                    }
                );


            if (!response.ok) {

                throw new Error(
                    `Popular stories API error: ${response.status}`
                );

            }


            const data =
                await response.json();


            /*
             * APIレスポンス差異に対応。
             */
            const rawStories =
                Array.isArray(
                    data?.careers
                )

                    ? data.careers

                    : Array.isArray(
                        data
                    )

                        ? data

                        : [];


            const stories =
                rawStories

                    .map(
                        normalizePopularStory
                    )

                    .filter(
                        story =>
                            story.id !== null
                            &&
                            story.id !== undefined
                    )

                    .slice(
                        0,
                        POPULAR_STORIES_LIMIT
                    );


            renderPopularStories(
                stories,
                list
            );


        } catch (error) {

            console.error(
                '人気Career Story取得エラー:',
                error
            );


            renderMessage(
                list,
                'Career Storyを読み込めませんでした。'
            );

        }

    }



    /* =========================================================
       NORMALIZE
       ========================================================= */

    function normalizePopularStory(
        career
    ) {

        const decision =
            career?.decision
            ||
            {};


        return {

            id:
                career?.id
                ??
                career?.user_id
                ??
                null,


            name:
                firstNonEmpty(
                    career?.name,
                    career?.username,
                    career?.display_name,
                    '匿名'
                ),


            age:
                normalizeAge(
                    firstNonEmpty(
                        career?.age_group,
                        career?.ageGroup,
                        career?.age,
                        ''
                    )
                ),


            profession:
                firstNonEmpty(
                    career?.profession,
                    career?.job_category,
                    career?.jobCategory,
                    ''
                ),


            decision: {

                /*
                 * 詳細画面で
                 * 対象Decisionへ直接移動できる場合に使う。
                 */
                id:
                    decision?.id
                    ??
                    decision?.decision_id
                    ??
                    null,


                type:
                    firstNonEmpty(
                        decision?.decision_type,
                        decision?.type,
                        decision?.category,
                        ''
                    ),


                /*
                 * Homeで一番見せたい
                 * 「どんな迷い・選択だったか」
                 */
                hook:
                    firstNonEmpty(
                        decision?.dilemma_text,
                        decision?.title,
                        decision?.trigger_text,
                        decision?.decision_text,
                        ''
                    ),


                /*
                 * hookがない場合の補助として保持。
                 */
                result:
                    firstNonEmpty(
                        decision?.result_text,
                        decision?.result,
                        ''
                    )

            }

        };

    }



    /* =========================================================
       RENDER
       ========================================================= */

    function renderPopularStories(
        stories,
        list
    ) {

        list.innerHTML =
            '';


        if (!stories.length) {

            renderMessage(
                list,
                '現在、表示できるCareer Storyはありません。'
            );

            return;

        }


        stories.forEach(
            (
                story,
                index
            ) => {

                const item =
                    createPopularStoryItem(
                        story,
                        index
                    );


                list.appendChild(
                    item
                );

            }
        );

    }



    /* =========================================================
       CREATE COMPACT ITEM
       ========================================================= */

    function createPopularStoryItem(
        story,
        index
    ) {

        const item =
            document.createElement(
                'a'
            );


        item.className =
            'home-popular-item';


        item.href =
            createCareerDetailUrl(
                story.id,
                story.decision.id
            );


        /*
         * 表示タイトル
         *
         * 迷い / Decision titleがあれば優先。
         * なければ「その後」。
         * それもなければ人物のStoryへの一般導線。
         */
        const titleSource =
            story.decision.hook
            ||
            story.decision.result
            ||
            `${story.name}さんのCareer Story`;


        const title =
            createExcerpt(
                titleSource,
                POPULAR_EXCERPT_LIMIT
            );


        const meta =
            buildPopularMeta(
                story
            );


        item.setAttribute(
            'aria-label',
            `${story.name}さんのCareer Storyを見る`
        );


        item.innerHTML = `

            <div>

                ${
                    meta

                        ? `
                            <small>

                                ${escapeHTML(
                                    meta
                                )}

                            </small>
                        `

                        : ''
                }


                <strong>

                    ${escapeHTML(
                        title
                    )}

                </strong>

            </div>


            <span
                aria-hidden="true"
                class="home-popular-item__arrow"
            >

                →

            </span>

        `;


        item.addEventListener(
            'click',
            () => {

                trackPopularCareerStoryClick(
                    story.id,
                    index + 1
                );

            }
        );


        return item;

    }



    /* =========================================================
       META
       ========================================================= */

    function buildPopularMeta(
        story
    ) {

        const values =
            [];


        /*
         * まず「どんな選択か」
         */
        if (
            story.decision.type
        ) {

            values.push(
                story.decision.type
            );

        }


        /*
         * 年代
         */
        if (
            story.age
        ) {

            values.push(
                story.age
            );

        }


        /*
         * 職種
         */
        if (
            story.profession
            &&
            ![
                '職種未設定',
                '職種非公開'
            ].includes(
                story.profession
            )
        ) {

            values.push(
                story.profession
            );

        }


        return values

            .slice(
                0,
                3
            )

            .join(
                ' ・ '
            );

    }



    /* =========================================================
       DETAIL URL
       ========================================================= */

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


        return (
            'Career_detail.html?'
            +
            params.toString()
        );

    }



    /* =========================================================
       HOME EXCERPT
       ========================================================= */

    function createExcerpt(
        value,
        maxLength
    ) {

        const text =
            firstNonEmpty(
                value,
                ''
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
         * 可能なら句点で自然に切る。
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
         * あまり前で切れすぎる場合は
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



    /* =========================================================
       MESSAGE
       ========================================================= */

    function renderMessage(
        list,
        message
    ) {

        if (!list) {
            return;
        }


        list.innerHTML = `

            <p class="announcement-empty">

                ${escapeHTML(
                    message
                )}

            </p>

        `;

    }



    /* =========================================================
       AGE
       ========================================================= */

    function normalizeAge(
        value
    ) {

        if (
            value === null
            ||
            value === undefined
            ||
            value === ''
        ) {

            return '';

        }


        const text =
            String(
                value
            ).trim();


        if (!text) {
            return '';
        }


        /*
         * APIが既に
         * 20代 / 30代
         * のように返している場合。
         */
        if (
            text.includes(
                '代'
            )
        ) {

            return text;

        }


        /*
         * 数値年齢
         * 31 -> 30代
         */
        const numeric =
            Number(
                text
            );


        if (
            !Number.isFinite(
                numeric
            )
            ||
            numeric <= 0
        ) {

            return '';

        }


        if (
            numeric < 20
        ) {

            return '10代';

        }


        if (
            numeric >= 60
        ) {

            return '60代以上';

        }


        const decade =
            Math.floor(
                numeric / 10
            )
            *
            10;


        return `${decade}代`;

    }



    /* =========================================================
       ANALYTICS
       ========================================================= */

    function trackPopularCareerStoryClick(
        careerId,
        position
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
            'career_story_click',
            {

                career_id:
                    String(
                        careerId
                    ),

                section_name:
                    'popular',

                card_position:
                    position,

                page_type:
                    'career_home'

            }
        );

    }



    /* =========================================================
       VALUE HELPER
       ========================================================= */

    function firstNonEmpty(
        ...values
    ) {

        for (
            const value
            of values
        ) {

            if (
                value === null
                ||
                value === undefined
            ) {

                continue;

            }


            const text =
                String(
                    value
                ).trim();


            if (
                text
                &&
                ![
                    'null',
                    'undefined',
                    'none',
                    'n/a'
                ].includes(
                    text.toLowerCase()
                )
            ) {

                return text;

            }

        }


        return '';

    }



    /* =========================================================
       ESCAPE HTML
       ========================================================= */

    function escapeHTML(
        value
    ) {

        return String(
            value
            ??
            ''
        )

            .replace(
                /&/g,
                '&amp;'
            )

            .replace(
                /</g,
                '&lt;'
            )

            .replace(
                />/g,
                '&gt;'
            )

            .replace(
                /"/g,
                '&quot;'
            )

            .replace(
                /'/g,
                '&#039;'
            );

    }


})();