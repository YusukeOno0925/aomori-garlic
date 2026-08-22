(() => {

    const CONTAINER_ID =
        'popular-stories-list';

    const MAX_STORIES =
        6;


    document.addEventListener(
        'DOMContentLoaded',
        initializePopularStories
    );


    async function initializePopularStories() {

        const container =
            document.getElementById(
                CONTAINER_ID
            );

        if (!container) {
            return;
        }


        try {

            const response =
                await fetch(
                    '/popular-career-stories/'
                );


            if (!response.ok) {

                throw new Error(
                    `HTTP ${response.status}`
                );

            }


            const data =
                await response.json();


            const careers =
                Array.isArray(data.careers)
                    ? data.careers
                    : [];


            if (!careers.length) {

                renderEmptyState(
                    container
                );

                return;
            }


            container.innerHTML = '';


            careers
                .slice(
                    0,
                    MAX_STORIES
                )
                .forEach(
                    (story, index) => {
                
                        container.appendChild(
                            createPopularStoryCard(
                                normalizeStory(
                                    story
                                ),
                                index + 1
                            )
                        );
                
                    }
                );


        } catch (error) {

            console.error(
                'Popular Career Stories error:',
                error
            );


            renderEmptyState(
                container
            );

        }

    }


    /* =====================================================
       Card
    ====================================================== */

    function createPopularStoryCard(
        story,
        position
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


        card.setAttribute(
            'aria-label',
            `${story.name}さんのCareer Storyを見る`
        );


        const ageText =
            story.age !== null
                ? `${story.age}歳`
                : '年齢非公開';


        const headline =
            buildStoryHeadline(
                story
            );


        const tags =
            buildStoryTags(
                story
            );


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

                        <span>
                            ${escapeHTML(
                                ageText
                            )}
                        </span>

                        <span>
                            ${escapeHTML(
                                story.profession
                            )}
                        </span>

                    </p>


                    <h3>
                        ${escapeHTML(
                            story.name
                        )}
                    </h3>


                    <p class="home-career-person__summary">
                        ${escapeHTML(
                            buildCareerSummary(
                                story
                            )
                        )}
                    </p>

                </div>

            </div>


            <div class="home-career-card__story">

                <p class="home-career-card__label">
                    CAREER STORY
                </p>

                <h4>
                    ${escapeHTML(
                        headline
                    )}
                </h4>

            </div>


            ${
                tags.length
                    ? `
                        <div class="home-career-tags">

                            ${tags
                                .map(
                                    tag => `
                                        <span>
                                            ${escapeHTML(tag)}
                                        </span>
                                    `
                                )
                                .join('')}

                        </div>
                    `
                    : ''
            }


            ${buildTimelineHTML(
                story.careerStages
            )}


            <div class="home-career-card__footer">

                <div class="home-career-card__facts">

                    ${
                        story.income !==
                        '未設定'
                            ? `
                                <span>
                                    年収
                                    ${escapeHTML(
                                        story.income
                                    )}
                                </span>
                            `
                            : ''
                    }

                    ${
                        story.transferCount >
                        0
                            ? `
                                <span>
                                    転職
                                    ${story.transferCount}回
                                </span>
                            `
                            : ''
                    }

                </div>


                <span class="home-career-card__link">
                    Career Storyを見る
                    <span aria-hidden="true">
                        →
                    </span>
                </span>

            </div>

        `;


        const navigate =
            () => {

                incrementViewCount(
                    story.id
                );


                // GA4：Career Storyクリック計測
                if (
                    typeof window.gtag ===
                    'function'
                ) {

                    window.gtag(
                        'event',
                        'career_story_click',
                        {

                            story_user_id:
                                String(
                                    story.id
                                ),

                            section_name:
                                'popular',

                            card_position:
                                position,

                            story_title:
                                headline

                        }
                    );

                }


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
                    event.key ===
                        'Enter'
                    ||
                    event.key ===
                        ' '
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

        const companies =
            Array.isArray(
                story.companies
            )
                ? story.companies
                : [];


        const stages =
            normalizeStages(
                story.careerStages
            );


        return {

            id:
                story.id,

            name:
                story.name ||
                '匿名',

            age:
                calculateAge(
                    story.birthYear
                ),

            profession:
                story.profession ||
                '職種未設定',

            income:
                getLatestIncome(
                    story.income
                ),

            careerType:
                story.career_type ||
                '',

            careerStages:
                stages,

            companies,

            transferCount:
                Math.max(
                    0,
                    getUniqueCompanyCount(
                        companies
                    ) - 1
                )

        };

    }


    function normalizeStages(
        stages
    ) {

        if (
            !Array.isArray(stages)
        ) {
            return [];
        }


        const result = [];
        const used = new Set();


        stages.forEach(
            stage => {

                if (!stage) {
                    return;
                }


                const safeStage =
                    stage.is_private
                        ? '非公開'
                        : (
                            stage.stage ||
                            ''
                        );


                const key =
                    `${
                        stage.year ||
                        ''
                    }-${safeStage}`;


                if (
                    used.has(key)
                ) {
                    return;
                }


                used.add(key);


                result.push({

                    year:
                        stage.year ||
                        '',

                    stage:
                        safeStage

                });

            }
        );


        return result;

    }


    /* =====================================================
       Story Text
    ====================================================== */

    function buildStoryHeadline(
        story
    ) {

        const type =
            String(
                story.careerType ||
                ''
            ).trim();


        if (type) {

            return simplifyCareerType(
                type
            );

        }


        if (
            story.transferCount >
            0
        ) {

            return '新しい環境へ踏み出したキャリア';

        }


        if (
            story.profession &&
            story.profession !==
                '職種未設定'
        ) {

            return `${story.profession}として歩んできたキャリア`;

        }


        return '自分らしい道を模索してきたキャリア';

    }


    function simplifyCareerType(
        type
    ) {

        if (
            type.includes(
                '給与'
            )
            ||
            type.includes(
                '収入'
            )
        ) {

            return '年収を上げることを大切にしたキャリア';

        }


        if (
            type.includes(
                'ワークライフバランス'
            )
        ) {

            return '仕事と生活のバランスを大切にしたキャリア';

        }


        if (
            type.includes(
                '専門'
            )
        ) {

            return '専門性を高める道を選んだキャリア';

        }


        if (
            type.includes(
                'マネジメント'
            )
        ) {

            return 'マネジメントへ進む道を考えたキャリア';

        }


        if (
            type.includes(
                '起業'
            )
        ) {

            return '独立・起業という道を考えたキャリア';

        }


        if (
            type.includes(
                'やりがい'
            )
        ) {

            return 'やりがいを大切にしてきたキャリア';

        }


        const cleaned =
            type
                .replace(
                    /軸/g,
                    ''
                )
                .replace(
                    /[()（）]/g,
                    ' '
                )
                .replace(
                    /\s+/g,
                    ' '
                )
                .trim();


        return cleaned.length >
            42
                ? `${cleaned.slice(
                    0,
                    42
                )}…`
                : cleaned;

    }


    function buildCareerSummary(
        story
    ) {

        const values = [];


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


        return values.length
            ? values.join('・')
            : 'Career GPS User';

    }


    /* =====================================================
       Tags
    ====================================================== */

    function buildStoryTags(
        story
    ) {

        const tags = [];


        if (
            story.transferCount >
            0
        ) {

            tags.push(
                '#キャリアチェンジ'
            );

        }


        const type =
            story.careerType;


        if (
            type.includes(
                '給与'
            )
            ||
            type.includes(
                '収入'
            )
        ) {

            tags.push(
                '#年収UP'
            );

        }


        if (
            type.includes(
                'やりがい'
            )
        ) {

            tags.push(
                '#やりがい'
            );

        }


        if (
            type.includes(
                '起業'
            )
        ) {

            tags.push(
                '#独立・起業'
            );

        }


        if (
            story.profession &&
            story.profession !==
                '職種未設定'
        ) {

            tags.push(
                `#${story.profession}`
            );

        }


        if (
            story.age !== null
        ) {

            const decade =
                Math.floor(
                    story.age / 10
                ) * 10;


            tags.push(
                `#${decade}代`
            );

        }


        return [
            ...new Set(tags)
        ].slice(
            0,
            4
        );

    }


    /* =====================================================
       Timeline
    ====================================================== */

    function buildTimelineHTML(
        stages
    ) {

        if (!stages.length) {

            return `
                <div class="home-career-timeline home-career-timeline--empty">
                    キャリア履歴はまだ登録されていません
                </div>
            `;

        }


        const displayStages =
            reduceStages(
                stages
            );


        return `

            <div class="home-career-timeline">

                <div class="home-career-timeline__track">

                    ${displayStages
                        .map(
                            (
                                stage,
                                index
                            ) => `

                                <div class="home-career-timeline__item">

                                    <span class="home-career-timeline__year">
                                        ${escapeHTML(
                                            String(
                                                stage.year
                                            )
                                        )}
                                    </span>


                                    <span
                                        class="
                                            home-career-timeline__dot
                                            ${
                                                index ===
                                                displayStages.length -
                                                1
                                                    ? 'is-current'
                                                    : ''
                                            }
                                        "
                                    ></span>


                                    <span class="home-career-timeline__stage">
                                        ${escapeHTML(
                                            simplifyStage(
                                                stage.stage
                                            )
                                        )}
                                    </span>

                                </div>

                            `
                        )
                        .join('')}

                </div>

            </div>

        `;

    }


    function reduceStages(
        stages
    ) {

        if (
            stages.length <=
            4
        ) {

            return stages;

        }


        return [

            stages[0],

            stages[
                Math.floor(
                    stages.length /
                    3
                )
            ],

            stages[
                Math.floor(
                    stages.length *
                    2 /
                    3
                )
            ],

            stages[
                stages.length -
                1
            ]

        ];

    }


    function simplifyStage(
        stage
    ) {

        const text =
            String(
                stage ||
                ''
            )
                .replace(
                    /\s+/g,
                    ' '
                )
                .trim();


        return text.length >
            17
                ? `${text.slice(
                    0,
                    17
                )}…`
                : text;

    }


    /* =====================================================
       Utilities
    ====================================================== */

    function calculateAge(
        birthYear
    ) {

        const year =
            Number(
                birthYear
            );


        if (!year) {
            return null;
        }


        return (
            new Date().getFullYear()
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

            return '未設定';

        }


        const latest =
            incomes[
                incomes.length -
                1
            ];


        return (
            latest?.income ||
            '未設定'
        );

    }


    function getUniqueCompanyCount(
        companies
    ) {

        if (
            !Array.isArray(
                companies
            )
        ) {

            return 0;

        }


        return new Set(

            companies
                .map(
                    company =>
                        company?.name
                )
                .filter(Boolean)

        ).size;

    }


    function calculateCareerYears(
        companies
    ) {

        if (
            !Array.isArray(
                companies
            )
        ) {

            return null;

        }


        const years =
            companies
                .map(
                    company =>
                        Number(
                            company?.startYear
                        )
                )
                .filter(
                    year =>
                        Number.isFinite(
                            year
                        )
                );


        if (!years.length) {
            return null;
        }


        const firstYear =
            Math.min(
                ...years
            );


        return Math.max(
            1,
            new Date().getFullYear()
            -
            firstYear
        );

    }


    function getInitial(
        name
    ) {

        if (!name) {
            return '?';
        }


        return String(name)
            .trim()
            .charAt(0)
            .toUpperCase();

    }


    function incrementViewCount(
        id
    ) {

        fetch(
            `/increment-profile-view/${encodeURIComponent(
                id
            )}`,
            {
                method:
                    'POST'
            }
        ).catch(
            () => {}
        );

    }


    function renderEmptyState(
        container
    ) {

        container.innerHTML = `
            <div class="home-story-empty">
                まだ表示できるCareer Storyがありません。
            </div>
        `;

    }


    function escapeHTML(
        value
    ) {

        return String(
            value ?? ''
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