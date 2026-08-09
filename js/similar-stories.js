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

        const benefits =
            document.getElementById(
                'similar-story-benefits'
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


            if (benefits) {
                benefits.style.display =
                    'grid';
            }


            if (loginCTA) {
                loginCTA.style.display =
                    'inline-flex';
            }


            description.textContent =
                '無料登録すると、あなたの年代・職種・業界・キャリア志向などから、参考になりそうなCareer Storyを見つけられます。';


            return;
        }


        /* =================================================
           Logged in
        ================================================= */

        if (benefits) {
            benefits.style.display =
                'none';
        }


        if (loginCTA) {
            loginCTA.style.display =
                'none';
        }


        description.textContent =
            'あなたのプロフィールと共通点のあるCareer Storyを選びました。';


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
               No recommendation
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
                        'まだ十分な共通点を見つけられませんでした。プロフィールを充実させると、あなたに近いCareer Storyを見つけやすくなります。';

                } else {

                    description.textContent =
                        'あなたに近いCareer Storyはまだ見つかりませんでした。Career Storyが増えると、より近い経験を持つ人をご紹介できるようになります。';

                }


                if (benefits) {
                    benefits.style.display =
                        'grid';
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


            if (benefits) {
                benefits.style.display =
                    'grid';
            }

        }

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

    function createSimilarStoryCard(story) {

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


        const headline =
            buildStoryHeadline(
                story
            );


        const reasons =
            story.similarityReasons
                .slice(0, 3);


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
                                        ${story.age}歳
                                    </span>
                                `
                                : ''
                        }

                        ${
                            story.profession &&
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
                    WHY THIS STORY?
                </p>


                <h4>
                    ${escapeHTML(
                        headline
                    )}
                </h4>

            </div>


            ${
                reasons.length
                    ? `
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

                </div>


                <span class="home-career-card__link">

                    Storyを見る

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

    function normalizeStory(story) {

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
                ? story.similarity_reasons
                    .filter(Boolean)
                : [];


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

            similarityScore:
                Number(
                    story.similarity_score
                ) || 0,

            similarityReasons,

            companies,

            careerStages:
                normalizeStages(
                    story.careerStages
                )

        };

    }


    function normalizeStages(stages) {

        if (!Array.isArray(stages)) {
            return [];
        }


        const result = [];
        const used = new Set();


        stages.forEach(
            stage => {

                const value =
                    stage?.stage ||
                    '';


                if (!value) {
                    return;
                }


                const key =
                    `${
                        stage?.year || ''
                    }-${value}`;


                if (used.has(key)) {
                    return;
                }


                used.add(key);


                result.push({

                    year:
                        stage?.year ||
                        '',

                    stage:
                        value

                });

            }
        );


        return result;

    }


    /* =====================================================
       Headline
    ====================================================== */

    function buildStoryHeadline(story) {

        const reasons =
            story.similarityReasons;


        /*
         * 「なぜこのStoryなのか」を
         * recommendation理由から作る。
         */

        if (reasons.length >= 2) {

            return `${
                reasons[0]
            }、${
                reasons[1]
            }Career Story`;

        }


        if (reasons.length === 1) {

            return `${
                reasons[0]
            }Career Story`;

        }


        if (story.careerType) {

            return simplifyCareerType(
                story.careerType
            );

        }


        return 'あなたと共通点のあるCareer Story';

    }


    function simplifyCareerType(type) {

        const value =
            String(
                type || ''
            );


        if (
            value.includes('給与')
            ||
            value.includes('収入')
        ) {

            return '年収を大切に考えたCareer Story';

        }


        if (
            value.includes('やりがい')
        ) {

            return '仕事のやりがいを大切にしたCareer Story';

        }


        if (
            value.includes(
                'ワークライフバランス'
            )
        ) {

            return '働き方とのバランスを考えたCareer Story';

        }


        if (
            value.includes('専門')
        ) {

            return '専門性を高める道を考えたCareer Story';

        }


        if (
            value.includes(
                'マネジメント'
            )
        ) {

            return 'マネジメントへの道を考えたCareer Story';

        }


        if (
            value.includes('起業')
        ) {

            return '独立・起業という道を考えたCareer Story';

        }


        return 'あなたと共通点のあるCareer Story';

    }


    /* =====================================================
       Summary
    ====================================================== */

    function buildCareerSummary(story) {

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
            : 'Career Story';

    }


    /* =====================================================
       Timeline
    ====================================================== */

    function buildTimelineHTML(stages) {

        if (!stages.length) {

            return `
                <div
                    class="
                        home-career-timeline
                        home-career-timeline--empty
                    "
                >
                    キャリア履歴はまだ登録されていません
                </div>
            `;

        }


        const items =
            selectTimelineItems(
                stages
            );


        return `

            <div class="home-career-timeline">

                <div class="home-career-timeline__track">

                    ${items
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
                                                item.year ||
                                                ''
                                            )
                                        )}
                                    </span>


                                    <span
                                        class="
                                            home-career-timeline__dot
                                            ${
                                                index ===
                                                items.length - 1
                                                    ? 'is-current'
                                                    : ''
                                            }
                                        "
                                    ></span>


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
                        .join('')}

                </div>

            </div>

        `;

    }


    function selectTimelineItems(stages) {

        if (stages.length <= 4) {
            return stages;
        }


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


    /* =====================================================
       Helpers
    ====================================================== */

    function simplifyStage(stage) {

        const value =
            String(
                stage || ''
            )
                .replace(
                    /\s+/g,
                    ' '
                )
                .trim();


        return value.length > 17
            ? `${value.slice(0, 17)}…`
            : value;

    }


    function calculateAge(birthYear) {

        const year =
            Number(
                birthYear
            );


        if (
            !Number.isFinite(year)
            ||
            year <= 0
        ) {

            return null;

        }


        return (
            new Date().getFullYear()
            -
            year
        );

    }


    function getLatestIncome(incomes) {

        if (
            !Array.isArray(incomes)
            ||
            !incomes.length
        ) {

            return '未設定';

        }


        const latest =
            incomes[
                incomes.length - 1
            ];


        return (
            latest?.income ??
            '未設定'
        );

    }


    function getUniqueCompanyCount(companies) {

        const names =
            (
                Array.isArray(companies)
                    ? companies
                    : []
            )
                .map(
                    company =>
                        company?.name
                )
                .filter(
                    name =>
                        name &&
                        name !== '非公開'
                );


        return new Set(
            names
        ).size;

    }


    function calculateCareerYears(companies) {

        const years =
            (
                Array.isArray(companies)
                    ? companies
                    : []
            )
                .map(
                    company =>
                        Number(
                            company?.startYear
                        )
                )
                .filter(
                    year =>
                        Number.isFinite(year)
                        &&
                        year > 1900
                );


        if (!years.length) {
            return null;
        }


        return Math.max(
            1,
            new Date().getFullYear()
            -
            Math.min(...years)
        );

    }


    function getInitial(name) {

        return String(
            name || '?'
        )
            .trim()
            .charAt(0)
            .toUpperCase();

    }


    function incrementViewCount(id) {

        if (!id) {
            return;
        }


        fetch(
            `/increment-profile-view/${
                encodeURIComponent(id)
            }`,
            {
                method:
                    'POST',

                credentials:
                    'include'
            }
        ).catch(
            () => {}
        );

    }


    function escapeHTML(value) {

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