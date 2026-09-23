(() => {
    'use strict';


    /* =========================================================
       CONFIG
       ========================================================= */

    const SIMILAR_API =
        '/similar-career-stories/';

    const GUEST_PREVIEW_API =
        '/career-story-previews/';

    const LOGIN_STATUS_API =
        '/check-login-status/';


    /*
     * Homeでは大量に並べない。
     *
     * People Like Youは第2主役だが、
     * Career Overviewの代わりにはしない。
     */
    const SIMILAR_LIMIT =
        3;

    const GUEST_LIMIT =
        3;


    /*
     * Home表示専用の文字数。
     *
     * DB / 詳細画面の元データは変更しない。
     */
    const EXCERPT_LIMITS = {

        dilemma:
            66,

        priority:
            52,

        result:
            60

    };


    /* =========================================================
       INITIALIZE
       ========================================================= */

    document.addEventListener(
        'DOMContentLoaded',
        initializeSimilarStories
    );


    async function initializeSimilarStories() {

        const section =
            document.getElementById(
                'similar-stories'
            );

        const list =
            document.getElementById(
                'similar-stories-list'
            );

        const eyebrow =
            document.getElementById(
                'similar-stories-eyebrow'
            );

        const title =
            document.getElementById(
                'similar-stories-title'
            );

        const description =
            document.getElementById(
                'similar-stories-description'
            );

        const previewArea =
            document.getElementById(
                'career-story-preview-area'
            );

        const previewList =
            document.getElementById(
                'career-story-preview-list'
            );

        const indicators =
            document.getElementById(
                'similar-stories-indicators'
            );

        const previewIndicators =
            document.getElementById(
                'career-story-preview-indicators'
            );


        if (
            !section
            ||
            !list
            ||
            !description
        ) {
            return;
        }


        /*
         * 今回のHomeでは3件表示なので、
         * SimilarのCarousel indicatorは基本不要。
         */
        if (indicators) {

            indicators.innerHTML =
                '';

            indicators.style.display =
                'none';

        }


        const isLoggedIn =
            await checkLoginStatus();


        if (!isLoggedIn) {

            await initializeGuestView({
                list,
                eyebrow,
                title,
                description,
                previewArea,
                previewList,
                previewIndicators
            });

            return;

        }


        await initializeLoggedInView({
            list,
            eyebrow,
            title,
            description,
            previewArea,
            indicators
        });

    }


    /* =========================================================
       GUEST
       ========================================================= */

    async function initializeGuestView({
        list,
        eyebrow,
        title,
        description,
        previewArea,
        previewList,
        previewIndicators
    }) {

        list.innerHTML =
            '';

        list.style.display =
            'none';


        if (eyebrow) {

            eyebrow.textContent =
                'CAREER STORIES';

        }


        if (title) {

            title.textContent =
                'こんな迷いを経験した人がいます。';

        }


        description.textContent =
            'まずは公開されている経験から。登録すると、あなたの経歴や大切にしていることに近い人から探せます。';


        if (
            !previewArea
            ||
            !previewList
        ) {
            return;
        }


        await loadGuestPreviews(
            previewArea,
            previewList,
            description,
            previewIndicators
        );

    }


    /* =========================================================
       LOGGED IN
       ========================================================= */

    async function initializeLoggedInView({
        list,
        eyebrow,
        title,
        description,
        previewArea
    }) {

        if (previewArea) {

            previewArea.style.display =
                'none';

        }


        if (eyebrow) {

            eyebrow.textContent =
                'PEOPLE LIKE YOU';

        }


        if (title) {

            title.textContent =
                'あなたと近い人の経験を見る。';

        }


        description.textContent =
            'あなたのこれまでのキャリアや大切にしていることから、次の選択を考える参考になりそうな経験を選びました。';


        try {

            const response =
                await fetch(
                    SIMILAR_API,
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
                    `HTTP ${response.status}`
                );

            }


            const data =
                await response.json();


            const rawCareers =
                Array.isArray(
                    data.careers
                )
                    ? data.careers
                    : [];


            const careers =
                rawCareers

                    .map(
                        normalizeStory
                    )

                    .filter(
                        story =>
                            story.id !== null
                            &&
                            story.id !== undefined
                    );


            if (!careers.length) {

                list.innerHTML =
                    '';

                list.style.display =
                    'none';


                const completeness =
                    Number(
                        data.baseProfileCompleteness
                    );


                if (
                    Number.isFinite(
                        completeness
                    )
                    &&
                    completeness < 70
                ) {

                    description.textContent =
                        'まだ十分な共通点を見つけられませんでした。My Career GPSを充実させると、歩んできた道や大切にしていることが近い人を見つけやすくなります。';

                } else {

                    description.textContent =
                        'あなたに近いCareer Storyはまだ見つかりませんでした。Storyが増えると、より近い経験を持つ人をご紹介できるようになります。';

                }


                return;

            }


            renderSimilarStories(
                list,
                careers.slice(
                    0,
                    SIMILAR_LIMIT
                )
            );

            setupStoryCarouselIndicators(
                list,
                indicators
            );


        } catch (error) {

            console.error(
                'Similar Career Stories error:',
                error
            );


            list.innerHTML =
                '';

            list.style.display =
                'none';


            description.textContent =
                'おすすめCareer Storyを読み込めませんでした。';

        }

    }


    /* =========================================================
       RENDER SIMILAR
       ========================================================= */

    function renderSimilarStories(
        list,
        stories
    ) {

        list.innerHTML =
            '';


        /*
         * CSS側に
         * PC grid / Mobile horizontal scroll
         * を任せる。
         */
        list.style.removeProperty(
            'display'
        );


        stories.forEach(
            story => {

                list.appendChild(
                    createSimilarStoryCard(
                        story
                    )
                );

            }
        );

    }


    /* =========================================================
       GUEST PREVIEW LOAD
       ========================================================= */

    async function loadGuestPreviews(
        previewArea,
        previewList,
        description,
        previewIndicators
    ) {

        try {

            const response =
                await fetch(
                    GUEST_PREVIEW_API,
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
                    `HTTP ${response.status}`
                );

            }


            const data =
                await response.json();


            const rawCareers =
                Array.isArray(
                    data.careers
                )
                    ? data.careers
                    : [];


            const careers =
                rawCareers

                    .map(
                        normalizeGuestPreview
                    )

                    .filter(
                        story =>
                            story.id !== null
                            &&
                            story.id !== undefined
                    )

                    .slice(
                        0,
                        GUEST_LIMIT
                    );


            if (!careers.length) {

                previewList.innerHTML =
                    '';

                previewArea.style.display =
                    'none';


                if (description) {

                    description.textContent =
                        '公開されているCareer Storyは、現在準備中です。';

                }


                return;

            }


            previewList.innerHTML =
                '';


            careers.forEach(
                story => {

                    previewList.appendChild(
                        createGuestPreviewCard(
                            story
                        )
                    );

                }
            );


            previewArea.style.display =
                'block';

            setupStoryCarouselIndicators(
                previewList,
                previewIndicators
            );


        } catch (error) {

            console.error(
                'Career Story Preview error:',
                error
            );


            previewList.innerHTML =
                '';

            previewArea.style.display =
                'none';


            if (description) {

                description.textContent =
                    'Career Storyを読み込めませんでした。';

            }

        }

    }


    /* =========================================================
       GUEST NORMALIZE
       ========================================================= */

    function normalizeGuestPreview(
        story
    ) {

        const decision =
            story?.decision
            ||
            {};


        return {

            id:
                story?.id
                ??
                null,


            name:
                normalizeDisplayText(
                    story?.name
                    ??
                    story?.username
                )
                ||
                '匿名',


            ageText:
                normalizeAgeText(
                    story?.age_group
                    ??
                    story?.age
                ),


            profession:
                normalizeDisplayText(
                    story?.profession
                ),


            industry:
                normalizeDisplayText(
                    story?.industry
                ),


            careerStages:
                normalizePreviewStages(
                    story?.careerStages
                    ??
                    story?.career_stages
                    ??
                    []
                ),


            decision: {

                /*
                 * 現行Guest normalizeでは
                 * 落ちていたIDを保持する。
                 */
                id:
                    decision?.id
                    ??
                    null,


                type:
                    normalizeDisplayText(
                        decision?.decision_type
                        ??
                        decision?.type
                    ),


                title:
                    normalizeDisplayText(
                        decision?.title
                    ),


                trigger:
                    normalizeDisplayText(
                        decision?.trigger_text
                    ),


                dilemma:
                    normalizeDisplayText(
                        decision?.dilemma_text
                    ),


                priority:
                    normalizeDisplayText(
                        decision?.priority_text
                    ),


                /*
                 * 「その後」も保持する。
                 */
                result:
                    normalizeDisplayText(
                        decision?.result_text
                    )

            }

        };

    }


    /* =========================================================
       LOGGED-IN NORMALIZE
       ========================================================= */

    function normalizeStory(
        story
    ) {

        const decision =
            story?.decision
            ||
            {};


        const similarityReasons =
            normalizeSimilarityReasons(
                story?.similarity_reasons
            );


        const similarityHeadline =
            normalizeDisplayText(
                story?.similarity_headline
            );


        /*
         * reasonsが無くHeadlineだけある場合、
         * HomeではHeadlineを1つの共通理由として使用する。
         */
        const reasons =
            similarityReasons.length

                ? similarityReasons

                : (
                    similarityHeadline
                        ? [
                            similarityHeadline
                        ]
                        : []
                );


        return {

            id:
                story?.id
                ??
                null,


            name:
                normalizeDisplayText(
                    story?.name
                    ??
                    story?.username
                )
                ||
                '匿名',


            ageText:
                normalizeAgeText(
                    story?.age_group
                    ??
                    story?.age
                    ??
                    calculateAge(
                        story?.birthYear
                        ??
                        story?.birth_year
                    )
                ),


            profession:
                normalizeDisplayText(
                    story?.profession
                ),


            similarityReasons:
                reasons,


            careerStages:
                normalizeStages(
                    story?.careerStages
                    ??
                    story?.career_stages
                    ??
                    []
                ),


            decision: {

                id:
                    decision?.id
                    ??
                    null,


                type:
                    normalizeDisplayText(
                        decision?.decision_type
                        ??
                        decision?.type
                    ),


                title:
                    normalizeDisplayText(
                        decision?.title
                    ),


                trigger:
                    normalizeDisplayText(
                        decision?.trigger_text
                    ),


                dilemma:
                    normalizeDisplayText(
                        decision?.dilemma_text
                    ),


                priority:
                    normalizeDisplayText(
                        decision?.priority_text
                    ),


                result:
                    normalizeDisplayText(
                        decision?.result_text
                    )

            }

        };

    }


    /* =========================================================
       CREATE LOGGED-IN CARD
       ========================================================= */

    function createSimilarStoryCard(
        story
    ) {

        const detailUrl =
            createCareerDetailUrl(
                story.id,
                story.decision.id
            );


        const card =
            document.createElement(
                'a'
            );


        card.className =
            'home-career-card';


        card.href =
            detailUrl;


        card.setAttribute(
            'aria-label',
            `${story.name}さんのCareer Storyを見る`
        );


        const reasons =
            story.similarityReasons
                .slice(
                    0,
                    3
                );


        card.innerHTML = `

            <!-- =====================================
                 Person
            ====================================== -->

            <div class="home-career-card__top">

                <div
                    class="home-career-avatar"
                    aria-hidden="true"
                >

                    ${escapeHTML(
                        getInitial(
                            story.name
                        )
                    )}

                </div>


                <div class="home-career-person">

                    ${
                        createPersonMetaHTML(
                            story
                        )
                    }


                    <h3>

                        ${escapeHTML(
                            story.name
                        )}

                    </h3>

                </div>

            </div>


            <!-- =====================================
                 Why this person
            ====================================== -->

            ${
                reasons.length

                    ? `
                        <div class="home-career-card__story">

                            <p class="home-career-card__label">

                                あなたとの共通点

                            </p>


                            <div class="home-career-tags">

                                ${
                                    reasons

                                        .map(
                                            reason => `

                                                <span>

                                                    ${escapeHTML(
                                                        createExcerpt(
                                                            reason,
                                                            28
                                                        )
                                                    )}

                                                </span>

                                            `
                                        )

                                        .join('')
                                }

                            </div>

                        </div>
                    `

                    : ''
            }


            <!-- =====================================
                 Career Journey
            ====================================== -->

            ${buildJourneyHTML(
                story.careerStages
            )}


            <!-- =====================================
                 Decision
            ====================================== -->

            ${buildDecisionHTML(
                story.decision
            )}


            <!-- =====================================
                 Footer
            ====================================== -->

            <div class="home-career-card__footer">

                <span class="home-career-card__link">

                    この人の選択と、その後を見る

                    <span aria-hidden="true">

                        →

                    </span>

                </span>

            </div>

        `;


        card.addEventListener(
            'click',
            () => {

                trackCareerStoryClick(
                    story.id,
                    'similar'
                );

            }
        );


        return card;

    }


    /* =========================================================
       CREATE GUEST CARD
       ========================================================= */

    function createGuestPreviewCard(
        story
    ) {

        const detailUrl =
            createCareerDetailUrl(
                story.id,
                story.decision.id
            );


        const card =
            document.createElement(
                'a'
            );


        card.className =
            'home-career-card home-career-card--preview';


        card.href =
            detailUrl;


        card.setAttribute(
            'aria-label',
            `${story.name}さんのCareer Storyを見る`
        );


        card.innerHTML = `

            <!-- =====================================
                 Person
            ====================================== -->

            <div class="home-career-card__top">

                <div
                    class="home-career-avatar"
                    aria-hidden="true"
                >

                    ${escapeHTML(
                        getInitial(
                            story.name
                        )
                    )}

                </div>


                <div class="home-career-person">

                    ${
                        createPersonMetaHTML(
                            story
                        )
                    }


                    <h3>

                        ${escapeHTML(
                            story.name
                        )}

                    </h3>

                </div>

            </div>


            <!-- =====================================
                 Journey
            ====================================== -->

            ${buildJourneyHTML(
                story.careerStages
            )}


            <!-- =====================================
                 Decision
            ====================================== -->

            ${buildDecisionHTML(
                story.decision
            )}


            <!-- =====================================
                 Footer
            ====================================== -->

            <div class="home-career-card__footer">

                <span class="home-career-card__link">

                    この人の選択と、その後を見る

                    <span aria-hidden="true">

                        →

                    </span>

                </span>

            </div>

        `;


        card.addEventListener(
            'click',
            () => {

                trackCareerStoryClick(
                    story.id,
                    'guest_preview'
                );

            }
        );


        return card;

    }


    /* =========================================================
       PERSON META
       ========================================================= */

    function createPersonMetaHTML(
        story
    ) {

        const values =
            [];


        if (
            normalizeDisplayText(
                story.ageText
            )
        ) {

            values.push(
                story.ageText
            );

        }


        if (
            normalizeDisplayText(
                story.profession
            )
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


        if (!values.length) {

            return '';

        }


        return `

            <p class="home-career-person__meta">

                ${
                    values

                        .map(
                            value => `

                                <span>

                                    ${escapeHTML(
                                        value
                                    )}

                                </span>

                            `
                        )

                        .join('')
                }

            </p>

        `;

    }


    /* =========================================================
       DECISION HTML
       ========================================================= */

    function buildDecisionHTML(
        decision
    ) {

        if (!decision) {
            return '';
        }


        const dilemma =
            createExcerpt(
                (
                    decision.dilemma
                    ||
                    decision.title
                    ||
                    decision.trigger
                ),
                EXCERPT_LIMITS.dilemma
            );


        const priority =
            createExcerpt(
                decision.priority,
                EXCERPT_LIMITS.priority
            );


        const result =
            createExcerpt(
                decision.result,
                EXCERPT_LIMITS.result
            );


        /*
         * Decision情報が全く無いなら、
         * 空の枠は作らない。
         */
        if (
            !decision.type
            &&
            !dilemma
            &&
            !priority
            &&
            !result
        ) {

            return '';

        }


        return `

            <div class="career-preview-decision">

                <!-- =================================
                     Heading
                ================================== -->

                <div class="career-preview-decision__heading">

                    <span>

                        CAREER DECISION

                    </span>


                    ${
                        decision.type

                            ? `
                                <strong>

                                    ${escapeHTML(
                                        decision.type
                                    )}

                                </strong>
                            `

                            : ''
                    }

                </div>


                <!-- =================================
                     Dilemma
                ================================== -->

                ${
                    dilemma

                        ? `
                            <div class="career-preview-decision__dilemma">

                                <span class="career-preview-decision__sub-label">

                                    当時の迷い

                                </span>


                                <p class="career-preview-decision__hook">

                                    ${escapeHTML(
                                        dilemma
                                    )}

                                </p>

                            </div>
                        `

                        : ''
                }


                <!-- =================================
                     Priority
                ================================== -->

                ${
                    priority

                        ? `
                            <div class="career-preview-priority">

                                <span>

                                    大切にしたこと

                                </span>


                                <p>

                                    ${escapeHTML(
                                        priority
                                    )}

                                </p>

                            </div>
                        `

                        : ''
                }


                <!-- =================================
                     Result
                ================================== -->

                ${
                    result

                        ? `
                            <div
                                class="
                                    career-preview-priority
                                    career-preview-result
                                "
                            >

                                <span>

                                    その後

                                </span>


                                <p>

                                    ${escapeHTML(
                                        result
                                    )}

                                </p>

                            </div>
                        `

                        : ''
                }

            </div>

        `;

    }


    /* =========================================================
       JOURNEY
       ========================================================= */

    function buildJourneyHTML(
        stages
    ) {

        if (
            !Array.isArray(
                stages
            )
            ||
            !stages.length
        ) {

            return '';

        }


        const items =
            selectTimelineItems(
                stages
            );


        return `

            <div class="career-preview-journey">

                <p class="career-preview-journey__label">

                    CAREER JOURNEY

                </p>


                <div class="home-career-timeline">

                    <div class="home-career-timeline__track">

                        ${
                            items

                                .map(
                                    (
                                        item,
                                        index
                                    ) => `

                                        <div class="home-career-timeline__item">

                                            <span class="home-career-timeline__year">

                                                ${escapeHTML(
                                                    String(
                                                        item.year
                                                        ||
                                                        ''
                                                    )
                                                )}

                                            </span>


                                            <span
                                                class="
                                                    home-career-timeline__dot
                                                    ${
                                                        index
                                                        ===
                                                        items.length - 1

                                                            ? 'is-current'

                                                            : ''
                                                    }
                                                "
                                                aria-hidden="true"
                                            >
                                            </span>


                                            <span class="home-career-timeline__stage">

                                                ${escapeHTML(
                                                    simplifyStage(
                                                        item.stage
                                                    )
                                                )}

                                            </span>

                                        </div>

                                    `
                                )

                                .join('')
                        }

                    </div>

                </div>

            </div>

        `;

    }


    /* =========================================================
       TIMELINE ITEMS
       ========================================================= */

    function selectTimelineItems(
        stages
    ) {

        if (
            stages.length <= 3
        ) {

            return stages;

        }


        /*
         * Homeでは最大3点。
         *
         * 最初
         * 中間
         * 最新
         */
        return [

            stages[0],

            stages[
                Math.floor(
                    stages.length / 2
                )
            ],

            stages[
                stages.length - 1
            ]

        ];

    }


    /* =========================================================
       NORMALIZE LOGGED-IN STAGES
       ========================================================= */

    function normalizeStages(
        stages
    ) {

        if (
            !Array.isArray(
                stages
            )
        ) {

            return [];

        }


        const result =
            [];

        const used =
            new Set();


        stages.forEach(
            stage => {

                if (!stage) {
                    return;
                }


                /*
                 * 非公開は内容を出さない。
                 */
                const value =
                    stage?.is_private

                        ? '非公開'

                        : normalizeDisplayText(
                            stage?.stage
                            ??
                            stage?.label
                            ??
                            stage?.name
                        );


                if (!value) {
                    return;
                }


                const year =
                    normalizeDisplayText(
                        stage?.year
                        ??
                        stage?.startYear
                        ??
                        stage?.start_year
                    );


                const key =
                    `${year}__${value}`;


                if (
                    used.has(
                        key
                    )
                ) {
                    return;
                }


                used.add(
                    key
                );


                result.push({

                    year,

                    stage:
                        value

                });

            }
        );


        return result;

    }


    /* =========================================================
       NORMALIZE GUEST STAGES
       ========================================================= */

    function normalizePreviewStages(
        stages
    ) {

        if (
            !Array.isArray(
                stages
            )
        ) {

            return [];

        }


        const result =
            [];

        const used =
            new Set();


        stages.forEach(
            stage => {

                if (!stage) {
                    return;
                }


                const value =
                    stage?.is_private

                        ? '非公開'

                        : normalizeDisplayText(
                            stage?.label
                            ??
                            stage?.stage
                            ??
                            stage?.name
                        );


                if (!value) {
                    return;
                }


                const year =
                    normalizeDisplayText(
                        stage?.year
                        ??
                        stage?.startYear
                        ??
                        stage?.start_year
                    );


                const key =
                    `${year}__${value}`;


                if (
                    used.has(
                        key
                    )
                ) {
                    return;
                }


                used.add(
                    key
                );


                result.push({

                    year,

                    stage:
                        buildGuestStageLabel({
                            type:
                                stage?.type
                                ??
                                '',

                            value
                        })

                });

            }
        );


        return result;

    }


    /* =========================================================
       GUEST STAGE LABEL
       ========================================================= */

    function buildGuestStageLabel({
        type,
        value
    }) {

        if (!value) {
            return '';
        }


        /*
         * 非公開には
         * 入学 / 入社を付けない。
         */
        if (
            value ===
            '非公開'
        ) {

            return value;

        }


        if (
            type ===
            'education'
        ) {

            return `${value} 入学`;

        }


        if (
            type ===
            'company'
        ) {

            return `${value} 入社`;

        }


        return value;

    }


    /* =========================================================
       SIMILARITY REASONS
       ========================================================= */

    function normalizeSimilarityReasons(
        values
    ) {

        if (
            !Array.isArray(
                values
            )
        ) {

            return [];

        }


        const result =
            [];

        const used =
            new Set();


        values.forEach(
            value => {

                const text =
                    normalizeDisplayText(
                        value
                    );


                if (
                    !text
                    ||
                    used.has(
                        text
                    )
                ) {

                    return;

                }


                used.add(
                    text
                );


                result.push(
                    text
                );

            }
        );


        return result;

    }


    /* =========================================================
       HOME EXCERPT

       詳細画面の本文は変更しない。
       ========================================================= */

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
         * 可能なら句点などで自然に切る。
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
       LOGIN
       ========================================================= */

    async function checkLoginStatus() {

        try {

            const response =
                await fetch(
                    LOGIN_STATUS_API,
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


            /*
             * 現行仕様：
             * 未ログインは401、
             * ログイン済みは2xx。
             */
            return response.ok;


        } catch (error) {

            return false;

        }

    }


    /* =========================================================
       AGE
       ========================================================= */

    function normalizeAgeText(
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
         * 30代
         * のように返している。
         */
        if (
            text.includes(
                '代'
            )
        ) {

            return text;

        }


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
       CALCULATE AGE
       ========================================================= */

    function calculateAge(
        birthYear
    ) {

        const year =
            Number(
                birthYear
            );


        if (
            !Number.isFinite(
                year
            )
            ||
            year <= 1900
        ) {

            return null;

        }


        const currentYear =
            new Date()
                .getFullYear();


        const age =
            currentYear
            -
            year;


        return (
            age > 0
                ? age
                : null
        );

    }


    /* =========================================================
       STAGE DISPLAY
       ========================================================= */

    function simplifyStage(
        stage
    ) {

        const text =
            normalizeDisplayText(
                stage
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
            17
        ) {

            return text;

        }


        return (
            characters

                .slice(
                    0,
                    17
                )

                .join('')

            +
            '…'
        );

    }


    /* =========================================================
       ANALYTICS
       ========================================================= */

    function trackCareerStoryClick(
        storyId,
        sectionName
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
                        storyId
                    ),

                section_name:
                    sectionName,

                page_type:
                    'career_home'

            }
        );

    }


    /* =========================================================
       INITIAL
       ========================================================= */

    function getInitial(
        name
    ) {

        const value =
            normalizeDisplayText(
                name
            );


        if (!value) {
            return '人';
        }


        const first =
            Array.from(
                value
            )[0];


        if (
            /^[a-zA-Z]$/.test(
                first
            )
        ) {

            return first.toUpperCase();

        }


        return first;

    }


    /* =========================================================
       TEXT
       ========================================================= */

    function normalizeDisplayText(
        value
    ) {

        if (
            value === null
            ||
            value === undefined
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


    /* =========================================================
   MOBILE STORY CAROUSEL INDICATORS
   ========================================================= */

function setupStoryCarouselIndicators(
    list,
    indicators
) {

    if (
        !list
        ||
        !indicators
    ) {

        return;

    }


    const mobileMedia =
        window.matchMedia(
            '(max-width: 700px)'
        );


    function getCards() {

        return Array.from(
            list.querySelectorAll(
                '.home-career-card'
            )
        );

    }


    function updateActiveIndicator() {

        if (
            !mobileMedia.matches
        ) {

            return;

        }


        const cards =
            getCards();


        const buttons =
            Array.from(
                indicators.querySelectorAll(
                    'button'
                )
            );


        if (
            !cards.length
            ||
            !buttons.length
        ) {

            return;

        }


        const listRect =
            list.getBoundingClientRect();


        let activeIndex =
            0;


        let smallestDistance =
            Number.POSITIVE_INFINITY;


        cards.forEach(
            (
                card,
                index
            ) => {

                const cardRect =
                    card.getBoundingClientRect();


                const distance =
                    Math.abs(
                        cardRect.left
                        -
                        listRect.left
                    );


                if (
                    distance
                    <
                    smallestDistance
                ) {

                    smallestDistance =
                        distance;


                    activeIndex =
                        index;

                }

            }
        );


        buttons.forEach(
            (
                button,
                index
            ) => {

                button.classList.toggle(
                    'active',
                    index ===
                    activeIndex
                );


                button.setAttribute(
                    'aria-current',
                    index === activeIndex
                        ? 'true'
                        : 'false'
                );

            }
        );

    }


    function renderIndicators() {

        const cards =
            getCards();


        indicators.innerHTML =
            '';


        /*
         * PCでは非表示。
         * 1件しかない場合も不要。
         */
        if (
            !mobileMedia.matches
            ||
            cards.length <= 1
        ) {

            indicators.style.display =
                'none';


            return;

        }


        indicators.style.display =
            'flex';


        cards.forEach(
            (
                card,
                index
            ) => {

                const button =
                    document.createElement(
                        'button'
                    );


                button.type =
                    'button';


                button.setAttribute(
                    'aria-label',
                    `${index + 1}件目のCareer Storyへ`
                );


                if (
                    index === 0
                ) {

                    button.classList.add(
                        'active'
                    );


                    button.setAttribute(
                        'aria-current',
                        'true'
                    );

                }


                button.addEventListener(
                    'click',
                    () => {

                        const listRect =
                            list.getBoundingClientRect();


                        const cardRect =
                            card.getBoundingClientRect();


                        const targetLeft =
                            list.scrollLeft
                            +
                            (
                                cardRect.left
                                -
                                listRect.left
                            );


                        list.scrollTo({

                            left:
                                targetLeft,

                            behavior:
                                'smooth'

                        });

                    }
                );


                indicators.appendChild(
                    button
                );

            }
        );


        updateActiveIndicator();

    }


    let ticking =
        false;


    list.addEventListener(
        'scroll',
        () => {

            if (
                ticking
            ) {

                return;

            }


            ticking =
                true;


            window.requestAnimationFrame(
                () => {

                    updateActiveIndicator();


                    ticking =
                        false;

                }
            );

        },
        {
            passive:
                true
        }
    );


    if (
        typeof mobileMedia.addEventListener ===
        'function'
    ) {

        mobileMedia.addEventListener(
            'change',
            renderIndicators
        );

    }


    renderIndicators();

}


})();