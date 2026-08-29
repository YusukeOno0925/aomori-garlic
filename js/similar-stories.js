(() => {

    document.addEventListener(
        'DOMContentLoaded',
        initializeSimilarStories
    );


    async function initializeSimilarStories() {

        const list =
            document.getElementById(
                'similar-stories-list'
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

        const loginCTA =
            document.querySelector(
                '.home-login-cta'
            );


        if (!list || !description) {
            return;
        }


        const isLoggedIn =
            await checkLoginStatus();


        /* =================================================
           Not logged in
        ================================================= */

        if (!isLoggedIn) {

            list.style.display =
                'none';
        
        
            if (loginCTA) {
        
                loginCTA.style.display =
                    'inline-flex';
        
            }
        
        
            description.textContent =
                'まずは、実際にどんな道を歩み、どんな分岐で選択した人がいるのか見てみましょう。';
        
        
            if (
                previewArea
                &&
                previewList
            ) {
        
                await loadGuestPreviews(
                    previewArea,
                    previewList
                );
        
            }
        
        
            return;
        }


        /* =================================================
           Logged in
        ================================================= */

        if (previewArea) {

            previewArea.style.display =
                'none';
        
        }


        if (loginCTA) {

            loginCTA.style.display =
                'none';

        }


        description.textContent =
            'あなたのこれまでのキャリアや大切にしていることから、次の選択を考えるヒントになりそうな経験を選びました。';


        try {

            const response =
                await fetch(
                    '/similar-career-stories/',
                    {
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


            const careers =
                Array.isArray(
                    data.careers
                )
                    ? data.careers
                    : [];


            /* =============================================
               Empty
            ============================================= */

            if (!careers.length) {

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
                        'まだ十分な共通点を見つけられませんでした。Career GPSを充実させると、歩んできた道や価値観が近いStoryを見つけやすくなります。';

                } else {

                    description.textContent =
                        'あなたに近いCareer Storyはまだ見つかりませんでした。Storyが増えると、より近い経験を持つ人をご紹介できるようになります。';

                }


                return;
            }


            /* =============================================
               Render
            ============================================= */

            list.innerHTML =
                '';

            list.style.display =
                'grid';


            careers
                .slice(0, 6)
                .forEach(
                    rawStory => {

                        const story =
                            normalizeStory(
                                rawStory
                            );


                        list.appendChild(
                            createSimilarStoryCard(
                                story
                            )
                        );

                    }
                );


        } catch (error) {

            console.error(
                'Similar Career Stories error:',
                error
            );


            list.style.display =
                'none';


            description.textContent =
                'おすすめCareer Storyを読み込めませんでした。';


        }

    }


    /* =====================================================
    Guest Career Story Preview
    ====================================================== */

    async function loadGuestPreviews(
        previewArea,
        previewList
    ) {

        try {

            const response =
                await fetch(
                    '/career-story-previews/'
                );


            if (!response.ok) {

                throw new Error(
                    `HTTP ${response.status}`
                );

            }


            const data =
                await response.json();


            const careers =
                Array.isArray(
                    data.careers
                )
                    ? data.careers
                    : [];


            if (!careers.length) {

                previewArea.style.display =
                    'none';

                return;
            }


            previewList.innerHTML =
                '';


            careers
                .slice(0, 3)
                .forEach(
                    rawStory => {

                        previewList.appendChild(
                            createGuestPreviewCard(
                                normalizeGuestPreview(
                                    rawStory
                                )
                            )
                        );

                    }
                );


            previewArea.style.display =
                'block';


        } catch (error) {

            console.error(
                'Career Story Preview error:',
                error
            );


            previewArea.style.display =
                'none';

        }

    }

    function normalizeGuestPreview(
        story
    ) {
    
        const decision =
            story?.decision
            ||
            {};
    
    
        return {
    
            id:
                story.id,
    
    
            name:
                story.name
                ||
                '匿名',
    
    
            age:
                Number.isFinite(
                    Number(
                        story.age
                    )
                )
                    ? Number(
                        story.age
                    )
                    : null,
    
    
            profession:
                story.profession
                ||
                '職種未設定',
    
    
            industry:
                story.industry
                ||
                '',
    
    
            careerStages:
                normalizePreviewStages(
                    story.careerStages
                ),
    
    
            decision: {
    
                type:
                    decision.decision_type
                    ||
                    '',
    
                title:
                    decision.title
                    ||
                    '',
    
                trigger:
                    decision.trigger_text
                    ||
                    '',
    
                dilemma:
                    decision.dilemma_text
                    ||
                    '',
    
                priority:
                    decision.priority_text
                    ||
                    ''
    
            }
    
        };
    
    }


    function normalizePreviewStages(
        stages
    ) {
    
        if (!Array.isArray(stages)) {
    
            return [];
    
        }
    
    
        return stages
            .filter(
                stage =>
                    stage
                    &&
                    stage.label
            )
            .map(
                stage => ({
    
                    type:
                        stage.type
                        ||
                        '',
    
                    year:
                        stage.year
                        ||
                        '',
    
                    label:
                        stage.label
    
                })
            );
    
    }


    function createGuestPreviewCard(
        story
    ) {
    
        const card =
            document.createElement(
                'article'
            );
    
    
        card.className =
            'home-career-card home-career-card--preview';
    
    
        card.tabIndex =
            0;
    
    
        card.setAttribute(
            'role',
            'link'
        );
    
    
        const decisionHook =
            story.decision.dilemma
            ||
            story.decision.title
            ||
            story.decision.trigger
            ||
            'この人がどんな選択をしたのかを見る';
    
    
        card.innerHTML = `
    
            <div class="home-career-card__top">
    
                <div class="home-career-avatar">
    
                    ${escapeHTML(
                        getInitial(
                            story.name
                        )
                    )}
    
                </div>
    
    
                <div class="home-career-person">
    
                    <p class="home-career-person__meta">
    
                        ${
                            story.age !== null
    
                            ? `
                                <span>
                                    ${escapeHTML(
                                        getAgeGroup(
                                            story.age
                                        )
                                    )}
                                </span>
                            `
    
                            : ''
                        }
    
    
                        ${
                            story.profession
                            &&
                            story.profession !==
                            '職種未設定'
    
                            ? `
                                <span>
                                    ${escapeHTML(
                                        story.profession
                                    )}
                                </span>
                            `
    
                            : ''
                        }
    
                    </p>
    
    
                    <h3>
                        ${escapeHTML(
                            story.name
                        )}
                    </h3>
    
                </div>
    
            </div>
    
    
            ${buildGuestTimelineHTML(
                story.careerStages
            )}
    
    
            <div class="career-preview-decision">
    
                <div class="career-preview-decision__heading">
    
                    <span>
                        CAREER DECISION
                    </span>
    
                    ${
                        story.decision.type
    
                        ? `
                            <strong>
                                ${escapeHTML(
                                    story.decision.type
                                )}
                            </strong>
                        `
    
                        : ''
                    }
    
                </div>
    
    
                <p class="career-preview-decision__hook">
    
                    ${escapeHTML(
                        decisionHook
                    )}
    
                </p>
    
    
                ${
                    story.decision.priority
    
                    ? `
                        <div class="career-preview-priority">
    
                            <span>
                                重視したこと
                            </span>
    
                            <p>
                                ${escapeHTML(
                                    story.decision.priority
                                )}
                            </p>
    
                        </div>
                    `
    
                    : ''
                }
    
            </div>
    
    
            <div class="home-career-card__footer">
    
                <span class="home-career-card__link">
    
                    選択の背景と、その後を見る
    
                    <span aria-hidden="true">
                        →
                    </span>
    
                </span>
    
            </div>
    
        `;
    
    
        const navigate =
            () => {
    
                trackCareerStoryClick(
                    story.id,
                    'guest_preview'
                );
    
    
                incrementViewCount(
                    story.id
                );
    
    
                window.location.href =
                    `Career_detail.html?id=${
                        encodeURIComponent(
                            story.id
                        )
                    }`;
    
            };
    
    
        card.addEventListener(
            'click',
            navigate
        );
    
    
        card.addEventListener(
            'keydown',
            event => {
    
                if (
                    event.key === 'Enter'
                    ||
                    event.key === ' '
                ) {
    
                    event.preventDefault();
    
                    navigate();
    
                }
    
            }
        );
    
    
        return card;
    
    }


    function buildGuestTimelineHTML(
        stages
    ) {
    
        if (!stages.length) {
    
            return '';
    
        }
    
    
        const displayStages =
            reduceGuestStages(
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
                            displayStages
                                .map(
                                    (
                                        stage,
                                        index
                                    ) => `
    
                                        <div
                                            class="
                                                home-career-timeline__item
                                            "
                                        >
    
                                            <span
                                                class="
                                                    home-career-timeline__year
                                                "
                                            >
                                                ${escapeHTML(
                                                    String(
                                                        stage.year
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
                                                        displayStages.length - 1
    
                                                        ? 'is-current'
    
                                                        : ''
                                                    }
                                                "
                                            >
                                            </span>
    
    
                                            <span
                                                class="
                                                    home-career-timeline__stage
                                                "
                                            >
    
                                                ${escapeHTML(
                                                    simplifyStage(
                                                        buildGuestStageLabel(
                                                            stage
                                                        )
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


    function buildGuestStageLabel(
        stage
    ) {
    
        const label =
            String(
                stage?.label
                ||
                ''
            )
                .trim();
    
    
        if (!label) {
            return '';
        }
    
    
        if (
            stage.type ===
            'education'
        ) {
    
            return `${label} 入学`;
    
        }
    
    
        if (
            stage.type ===
            'company'
        ) {
    
            return `${label} 入社`;
    
        }
    
    
        return label;
    
    }
    
    
    function reduceGuestStages(
        stages
    ) {
    
        if (stages.length <= 4) {
    
            return stages;
    
        }
    
    
        return [
    
            stages[0],
    
            stages[
                Math.floor(
                    stages.length / 3
                )
            ],
    
            stages[
                Math.floor(
                    stages.length * 2 / 3
                )
            ],
    
            stages[
                stages.length - 1
            ]
    
        ];
    
    }



    /* =====================================================
       Login
    ====================================================== */

    async function checkLoginStatus() {

        try {

            const response =
                await fetch(
                    '/check-login-status/',
                    {
                        credentials:
                            'include'
                    }
                );


            return response.ok;


        } catch (error) {

            return false;

        }

    }


    /* =====================================================
       Card
    ====================================================== */

    function createSimilarStoryCard(
        story
    ) {
    
        const card =
            document.createElement(
                'article'
            );
    
    
        card.className =
            'home-career-card';
    
    
        card.tabIndex =
            0;
    
    
        card.setAttribute(
            'role',
            'link'
        );
    
    
        const reasons =
            story
                .similarityReasons
                .slice(
                    0,
                    3
                );
    
    
        const decisionHook =
            story.decision.dilemma
            ||
            story.decision.title
            ||
            story.decision.trigger
            ||
            '';
    
    
        card.innerHTML = `
    
            <div class="home-career-card__top">
    
                <div class="home-career-avatar">
    
                    ${escapeHTML(
                        getInitial(
                            story.name
                        )
                    )}
    
                </div>
    
    
                <div class="home-career-person">
    
                    <p class="home-career-person__meta">
    
                        ${
                            story.age !== null
    
                            ? `
                                <span>
                                    ${escapeHTML(
                                        getAgeGroup(
                                            story.age
                                        )
                                    )}
                                </span>
                            `
    
                            : ''
                        }
    
    
                        ${
                            story.profession
                            &&
                            story.profession !==
                            '職種未設定'
    
                            ? `
                                <span>
                                    ${escapeHTML(
                                        story.profession
                                    )}
                                </span>
                            `
    
                            : ''
                        }
    
                    </p>
    
    
                    <h3>
                        ${escapeHTML(
                            story.name
                        )}
                    </h3>
    
                </div>
    
            </div>
    
    
            ${
                reasons.length
    
                ? `
                    <div class="home-career-card__story">
    
                        <p class="home-career-card__label">
                            あなたとの共通点
                        </p>
    
    
                        <div class="home-career-tags">
    
                            ${reasons
                                .map(
                                    reason => `
    
                                        <span>
                                            ${escapeHTML(
                                                reason
                                            )}
                                        </span>
    
                                    `
                                )
                                .join('')}
    
                        </div>
    
                    </div>
                `
    
                : ''
            }
    
    
            ${buildSimilarJourneyHTML(
                story.careerStages
            )}
    
    
            ${
                decisionHook
                ||
                story.decision.type
                ||
                story.decision.priority
    
                ? `
                    <div class="career-preview-decision">
    
                        <div class="career-preview-decision__heading">
    
                            <span>
                                CAREER DECISION
                            </span>
    
    
                            ${
                                story.decision.type
    
                                ? `
                                    <strong>
                                        ${escapeHTML(
                                            story.decision.type
                                        )}
                                    </strong>
                                `
    
                                : ''
                            }
    
                        </div>
    
    
                        ${
                            decisionHook
    
                            ? `
                                <p class="career-preview-decision__hook">
    
                                    ${escapeHTML(
                                        decisionHook
                                    )}
    
                                </p>
                            `
    
                            : ''
                        }
    
    
                        ${
                            story.decision.priority
    
                            ? `
                                <div class="career-preview-priority">
    
                                    <span>
                                        重視したこと
                                    </span>
    
                                    <p>
                                        ${escapeHTML(
                                            story.decision.priority
                                        )}
                                    </p>
    
                                </div>
                            `
    
                            : ''
                        }
    
                    </div>
                `
    
                : ''
            }
    
    
            <div class="home-career-card__footer">
    
                <span class="home-career-card__link">
    
                    選択の背景と、その後を見る
    
                    <span aria-hidden="true">
                        →
                    </span>
    
                </span>
    
            </div>
    
        `;
    
    
        const navigate =
            () => {
    
                trackCareerStoryClick(
                    story.id,
                    'similar'
                );
    
    
                incrementViewCount(
                    story.id
                );
    
    
                window.location.href =
                    `Career_detail.html?id=${
                        encodeURIComponent(
                            story.id
                        )
                    }`;
    
            };
    
    
        card.addEventListener(
            'click',
            navigate
        );
    
    
        card.addEventListener(
            'keydown',
            event => {
    
                if (
                    event.key === 'Enter'
                    ||
                    event.key === ' '
                ) {
    
                    event.preventDefault();
    
                    navigate();
    
                }
    
            }
        );
    
    
        return card;
    
    }


    /* =====================================================
       Normalize
    ====================================================== */

    function normalizeStory(
        story
    ) {

        const decision =
            story?.decision
            ||
            {};

        const companies =
            Array.isArray(
                story.companies
            )
                ? story.companies
                : [];


        const similarityReasons =
            Array.isArray(
                story.similarity_reasons
            )
                ? story
                    .similarity_reasons
                    .filter(Boolean)
                : [];


        return {

            id:
                story.id,


            name:
                story.name
                ||
                '匿名',


            age:
                calculateAge(
                    story.birthYear
                ),


            profession:
                story.profession
                ||
                '職種未設定',


            income:
                getLatestIncome(
                    story.income
                ),


            careerType:
                story.career_type
                ||
                '',


            similarityScore:
                Number(
                    story.similarity_score
                )
                || 0,


            similarityHeadline:
                story.similarity_headline
                ||
                '',


            similarityReasons,


            companies,


            careerStages:
                normalizeStages(
                    story.careerStages
                ),


            decision: {

                type:
                    decision.decision_type
                    ||
                    '',

                title:
                    decision.title
                    ||
                    '',

                trigger:
                    decision.trigger_text
                    ||
                    '',

                dilemma:
                    decision.dilemma_text
                    ||
                    '',

                priority:
                    decision.priority_text
                    ||
                    ''

            }

        };

    }


    /* =====================================================
       WHY THIS STORY
    ====================================================== */

    function buildStoryHeadline(
        story
    ) {

        /*
         * Python側で
         * Career GPSとして意味のある
         * 推薦理由を生成する。
         *
         * JS側では基本的に
         * その文言をそのまま使う。
         */

        if (
            story.similarityHeadline
        ) {

            return (
                story.similarityHeadline
            );

        }


        if (
            story.similarityReasons
            .length >= 2
        ) {

            return (
                `${
                    story
                        .similarityReasons[0]
                }、${
                    story
                        .similarityReasons[1]
                }`
            );

        }


        if (
            story.similarityReasons
            .length === 1
        ) {

            return (
                story
                    .similarityReasons[0]
            );

        }


        return (
            'あなたと共通点のあるCareer Story'
        );

    }


    /* =====================================================
       Normalize stages
    ====================================================== */

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

                const value =
                    stage?.stage
                    ||
                    '';


                if (!value) {
                    return;
                }


                const key =
                    `${
                        stage?.year
                        ||
                        ''
                    }-${value}`;


                if (
                    used.has(key)
                ) {
                    return;
                }


                used.add(key);


                result.push({

                    year:
                        stage?.year
                        ||
                        '',

                    stage:
                        value

                });

            }
        );


        return result;

    }


    /* =====================================================
       Career summary
    ====================================================== */

    function buildCareerSummary(
        story
    ) {

        const values =
            [];


        const companyCount =
            getUniqueCompanyCount(
                story.companies
            );


        if (companyCount) {

            values.push(
                `${companyCount}社経験`
            );

        }


        const careerYears =
            calculateCareerYears(
                story.companies
            );


        if (
            careerYears !== null
        ) {

            values.push(
                `キャリア約${careerYears}年`
            );

        }


        return (
            values.length

            ? values.join('・')

            : 'Career Story'
        );

    }


    function buildSimilarJourneyHTML(
        stages
    ) {
    
        if (!stages.length) {
    
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


    /* =====================================================
       Timeline
    ====================================================== */

    function buildTimelineHTML(
        stages
    ) {

        if (
            !stages.length
        ) {

            return `

                <div
                    class="
                        home-career-timeline
                        home-career-timeline--empty
                    "
                >

                    キャリア履歴は
                    まだ登録されていません

                </div>

            `;

        }


        const items =
            selectTimelineItems(
                stages
            );


        return `

            <div
                class="
                    home-career-timeline
                "
            >

                <div
                    class="
                        home-career-timeline__track
                    "
                >

                    ${
                        items
                            .map(
                                (
                                    item,
                                    index
                                ) => `

                                    <div
                                        class="
                                            home-career-timeline__item
                                        "
                                    >

                                        <span
                                            class="
                                                home-career-timeline__year
                                            "
                                        >

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
                                        >
                                        </span>


                                        <span
                                            class="
                                                home-career-timeline__stage
                                            "
                                        >

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

        `;

    }


    function selectTimelineItems(
        stages
    ) {

        if (
            stages.length <= 4
        ) {

            return stages;

        }


        /*
         * 最初 / 中間 / 最新
         *
         * Career Storyカード上で
         * 経路が分かりやすい3点を表示。
         */

        return [

            stages[0],

            stages[
                Math.floor(
                    stages.length
                    /
                    2
                )
            ],

            stages[
                stages.length - 1
            ]

        ];

    }


    /* =====================================================
       Helpers
    ====================================================== */

    function simplifyStage(
        stage
    ) {

        const value =
            String(
                stage
                ||
                ''
            )
                .replace(
                    /\s+/g,
                    ' '
                )
                .trim();


        return (
            value.length > 17

            ? `${
                value.slice(
                    0,
                    17
                )
              }…`

            : value
        );

    }


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
            year <= 0
        ) {

            return null;

        }


        return (
            new Date()
                .getFullYear()
            -
            year
        );

    }


    function getLatestIncome(
        incomes
    ) {

        if (
            !Array.isArray(
                incomes
            )
            ||
            !incomes.length
        ) {

            return (
                '未設定'
            );

        }


        const latest =
            incomes[
                incomes.length - 1
            ];


        return (
            latest?.income
            ??
            '未設定'
        );

    }


    function getUniqueCompanyCount(
        companies
    ) {

        const names =
            (
                Array.isArray(
                    companies
                )
                    ? companies
                    : []
            )
                .map(
                    company =>
                        company?.name
                )
                .filter(
                    name =>
                        name
                        &&
                        name
                        !==
                        '非公開'
                );


        return (
            new Set(
                names
            ).size
        );

    }


    function calculateCareerYears(
        companies
    ) {

        const years =
            (
                Array.isArray(
                    companies
                )
                    ? companies
                    : []
            )
                .map(
                    company =>
                        Number(
                            company
                                ?.startYear
                        )
                )
                .filter(
                    year =>
                        Number.isFinite(
                            year
                        )
                        &&
                        year > 1900
                );


        if (
            !years.length
        ) {

            return null;

        }


        return Math.max(

            1,

            new Date()
                .getFullYear()
            -
            Math.min(
                ...years
            )

        );

    }

    function getAgeGroup(
        age
    ) {
    
        const value =
            Number(
                age
            );
    
    
        if (!Number.isFinite(value)) {
            return '';
        }
    
    
        if (value < 20) {
            return '10代';
        }
    
    
        if (value >= 60) {
            return '60代以上';
        }
    
    
        return `${
            Math.floor(value / 10) * 10
        }代`;
    
    }
    
    
    function trackCareerStoryClick(
        storyId,
        sectionName
    ) {
    
        if (
            typeof gtag
            !== 'function'
        ) {
            return;
        }
    
    
        gtag(
            'event',
            'career_story_click',
            {
                career_id:
                    storyId,
    
                section_name:
                    sectionName
            }
        );
    
    }


    function getInitial(
        name
    ) {

        return String(
            name
            ||
            '?'
        )
            .trim()
            .charAt(0)
            .toUpperCase();

    }


    function incrementViewCount(
        id
    ) {

        if (!id) {
            return;
        }


        fetch(
            `/increment-profile-view/${
                encodeURIComponent(
                    id
                )
            }`,
            {

                method:
                    'POST',

                credentials:
                    'include'

            }
        )
            .catch(
                () => {}
            );

    }


    function escapeHTML(
        value
    ) {

        return String(
            value
            ??
            ''
        )
            .replaceAll(
                '&',
                '&amp;'
            )
            .replaceAll(
                '<',
                '&lt;'
            )
            .replaceAll(
                '>',
                '&gt;'
            )
            .replaceAll(
                '"',
                '&quot;'
            )
            .replaceAll(
                "'",
                '&#039;'
            );

    }

})();