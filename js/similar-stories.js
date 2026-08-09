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


        if (
            !list ||
            !description
        ) {

            return;

        }


        const isLoggedIn =
            await checkLoginStatus();


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
                '無料登録すると、あなたの年齢・職種・業界などに近いCareer Storyを見つけられます。';


            return;

        }


        /* -----------------------------------------
           Logged in
        ----------------------------------------- */

        if (benefits) {

            benefits.style.display =
                'none';

        }


        if (loginCTA) {

            loginCTA.style.display =
                'none';

        }


        description.textContent =
            'あなたのプロフィールに近い人のCareer Storyです。';


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


            if (!careers.length) {

                list.style.display =
                    'none';


                description.textContent =
                    'あなたに近いCareer Storyはまだ見つかりませんでした。プロフィールを充実させるとおすすめ精度が上がります。';


                if (benefits) {

                    benefits.style.display =
                        'grid';

                }


                return;

            }


            list.innerHTML =
                '';


            list.style.display =
                'grid';


            careers
                .slice(
                    0,
                    6
                )
                .forEach(
                    story => {

                        list.appendChild(
                            createSimilarStoryCard(
                                normalizeStory(
                                    story
                                )
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

                        ${
                            story.age !== null
                                ? `
                                    <span>
                                        ${story.age}歳
                                    </span>
                                `
                                : ''
                        }

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
                    WHY THIS STORY?
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
                                            ${escapeHTML(
                                                tag
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
                    詳しく見る
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

            companies,

            careerStages:
                normalizeStages(
                    story.careerStages
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

                const value =
                    stage?.is_private
                        ? '非公開'
                        : (
                            stage?.stage ||
                            ''
                        );


                const key =
                    `${
                        stage?.year ||
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
       Content
    ====================================================== */

    function buildStoryHeadline(
        story
    ) {

        if (
            story.careerType
        ) {

            return simplifyCareerType(
                story.careerType
            );

        }


        if (
            getUniqueCompanyCount(
                story.companies
            ) >=
            2
        ) {

            return 'あなたと近い背景から、新しい環境へ踏み出した人';

        }


        return 'あなたと近いキャリアを歩んでいる人';

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

            return '年収を上げたいという思いを持った人';

        }


        if (
            type.includes(
                'やりがい'
            )
        ) {

            return '仕事のやりがいを大切にしている人';

        }


        if (
            type.includes(
                'ワークライフバランス'
            )
        ) {

            return '働き方とのバランスを大切にしている人';

        }


        if (
            type.includes(
                '専門'
            )
        ) {

            return '専門性を高めたいと考えている人';

        }


        if (
            type.includes(
                'マネジメント'
            )
        ) {

            return 'マネジメントへの道を考えている人';

        }


        if (
            type.includes(
                '起業'
            )
        ) {

            return '独立・起業という道を考えている人';

        }


        return String(type)
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
            .trim()
            .slice(
                0,
                42
            );

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
            : 'あなたに近いCareer Story';

    }


    function buildStoryTags(
        story
    ) {

        const tags = [];


        const companyCount =
            getUniqueCompanyCount(
                story.companies
            );


        if (
            companyCount >=
            2
        ) {

            tags.push(
                '#転職経験あり'
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

            tags.push(
                `#${
                    Math.floor(
                        story.age /
                        10
                    ) * 10
                }代`
            );

        }


        return tags.slice(
            0,
            3
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


        const items =
            stages.length <=
            4
                ? stages
                : [
                    stages[0],
                    stages[
                        Math.floor(
                            stages.length /
                            2
                        )
                    ],
                    stages[
                        stages.length -
                        1
                    ]
                ];


        return `

            <div class="home-career-timeline">

                <div class="home-career-timeline__track">

                    ${items
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
                                            )
                                        )}
                                    </span>

                                    <span
                                        class="
                                            home-career-timeline__dot
                                            ${
                                                index ===
                                                items.length -
                                                1
                                                    ? 'is-current'
                                                    : ''
                                            }
                                        "
                                    ></span>

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
                        .join('')}

                </div>

            </div>

        `;

    }


    /* =====================================================
       Helpers
    ====================================================== */

    function simplifyStage(
        stage
    ) {

        const value =
            String(
                stage ||
                ''
            )
                .replace(
                    /\s+/g,
                    ' '
                )
                .trim();


        return value.length >
            17
                ? `${value.slice(
                    0,
                    17
                )}…`
                : value;

    }


    function calculateAge(
        birthYear
    ) {

        const year =
            Number(
                birthYear
            );


        return year
            ? (
                new Date().getFullYear()
                -
                year
            )
            : null;

    }


    function getLatestIncome(
        incomes
    ) {

        if (
            !Array.isArray(incomes)
            ||
            !incomes.length
        ) {

            return '未設定';

        }


        return (
            incomes[
                incomes.length -
                1
            ]?.income
            ||
            '未設定'
        );

    }


    function getUniqueCompanyCount(
        companies
    ) {

        return new Set(

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
                .filter(Boolean)

        ).size;

    }


    function calculateCareerYears(
        companies
    ) {

        const years = (

            Array.isArray(
                companies
            )
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
                Number.isFinite
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


    function getInitial(
        name
    ) {

        return String(
            name ||
            '?'
        )
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