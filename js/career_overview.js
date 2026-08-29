document.addEventListener('DOMContentLoaded', () => {

    const API_URL = '/career-overview/';
    const THEME_API_URL = '/career-stories-by-theme/';

    const ITEMS_PER_PAGE = 12;

    const urlParams =
        new URLSearchParams(
            window.location.search
        );

    const pageTheme =
        (
            urlParams.get('theme') ||
            ''
        )
            .trim()
            .toLowerCase();

    const isThemeMode =
        Boolean(pageTheme);

    let allCareers = [];
    let filteredCareers = [];

    let currentPage = 1;
    let selectedTheme = '';


    /* ========================================
       DOM
    ======================================== */

    const searchInput =
        document.getElementById('search');

    const industryFilter =
        document.getElementById('filter-industry');

    const ageFilter =
        document.getElementById('filter-age');

    const incomeFilter =
        document.getElementById('filter-income');

    const resetButton =
        document.getElementById('reset-career-filter');

    const careerList =
        document.getElementById('career-list');

    const resultCount =
        document.getElementById('career-result-count');

    const emptyState =
        document.getElementById('career-empty-state');

    const paginationContainer =
        document.getElementById('pagination-container');

    const themeButtons =
        document.querySelectorAll('.career-theme-chip');

    const overviewEyebrow =
        document.getElementById(
            'career-overview-eyebrow'
        );

    const overviewTitle =
        document.getElementById(
            'career-overview-title'
        );

    const overviewLead =
        document.getElementById(
            'career-overview-lead'
        );

    const storySectionEyebrow =
        document.getElementById(
            'career-story-section-eyebrow'
        );

    const storySectionTitle =
        document.getElementById(
            'career-story-section-title'
        );

    const storySectionLead =
        document.getElementById(
            'career-story-section-lead'
        );


    /* ========================================
       INITIAL LOAD
    ======================================== */

    if (isThemeMode) {

        loadThemeCareers();

    } else {

        loadCareers();

    }


    /* ========================================
       LOAD THEME CAREERS
    ======================================== */

    async function loadThemeCareers() {

        try {

            const response =
                await fetch(
                    `${THEME_API_URL}?theme=${
                        encodeURIComponent(
                            pageTheme
                        )
                    }`
                );

            if (!response.ok) {

                throw new Error(
                    `HTTP error: ${response.status}`
                );

            }


            const data =
                await response.json();


            /* ==============================
               Theme mode heading
            ============================== */

            if (overviewEyebrow) {

                overviewEyebrow.textContent =
                    'CAREER DECISIONS';

            }


            if (overviewTitle) {

                overviewTitle.textContent =
                    data.theme_title ||
                    '今の悩みからCareer Storyを探す';

            }


            if (overviewLead) {

                overviewLead.textContent =
                    data.theme_description ||
                    '同じような分岐に立った人の選択を見てみましょう。';

            }


            if (storySectionEyebrow) {

                storySectionEyebrow.textContent =
                    'STORIES FROM THE SAME DILEMMA';

            }


            if (storySectionTitle) {

                storySectionTitle.textContent =
                    '同じ悩みを経験したCareer Story';

            }


            if (storySectionLead) {

                storySectionLead.textContent =
                    '同じような分岐に立った人が、何を考え、何を選んだのか。';

            }


            /* ==============================
               API → Overview data
            ============================== */

            const stories =
                Array.isArray(data.stories)
                    ? data.stories
                    : [];


            allCareers =
                stories.map(
                    normalizeThemeCareer
                );


            populateIndustryOptions();

            applyFilters();


        } catch (error) {

            console.error(
                '悩み別Career Story取得エラー:',
                error
            );


            careerList.innerHTML = '';

            emptyState.hidden = false;

            emptyState.querySelector(
                '.career-empty-state__title'
            ).textContent =
                'Career Storyを取得できませんでした';

        }

    }


    /* ========================================
       LOAD NORMAL CAREERS
    ======================================== */

    async function loadCareers() {

        try {

            const response =
                await fetch(API_URL);

            if (!response.ok) {

                throw new Error(
                    `HTTP error: ${response.status}`
                );

            }


            const data =
                await response.json();


            allCareers =
                Array.isArray(data.careers)
                    ? data.careers
                    : [];


            allCareers =
                allCareers.map(
                    normalizeCareer
                );


            populateIndustryOptions();

            applyFilters();


        } catch (error) {

            console.error(
                'キャリア情報取得エラー:',
                error
            );


            careerList.innerHTML = '';

            emptyState.hidden = false;

            emptyState.querySelector(
                '.career-empty-state__title'
            ).textContent =
                'キャリア情報を取得できませんでした';

        }

    }


    /* ========================================
       NORMALIZE THEME CAREER
    ======================================== */

    function normalizeThemeCareer(story) {

        const stages =
            Array.isArray(story.careerStages)
                ? story.careerStages
                : [];


        const uniqueStages = [];

        const stageKeys =
            new Set();


        stages.forEach(stage => {

            const key =
                `${stage.year}-${stage.stage}`;

            if (!stageKeys.has(key)) {

                stageKeys.add(key);

                uniqueStages.push(stage);

            }

        });


        uniqueStages.sort(
            (a, b) => {

                const yearA =
                    Number(a.year) || 9999;

                const yearB =
                    Number(b.year) || 9999;

                return yearA - yearB;

            }
        );


        return {

            id:
                story.id,

            name:
                story.username ||
                'Anonymous',

            profession:
                story.profession ||
                '職種未設定',

            age:
                story.age || null,

            birthYear:
                story.age
                    ? new Date().getFullYear()
                        - story.age
                    : null,

            income:
                '未設定',

            careerStages:
                uniqueStages,

            companies:
                buildCompaniesFromStages(
                    uniqueStages
                ),

            career_type:
                '',

            decision:
                story.decision || null,

            theme_match_score:
                story.theme_match_score || 0,

            theme_match_reasons:
                Array.isArray(
                    story.theme_match_reasons
                )
                    ? story.theme_match_reasons
                    : [],

            isThemeStory:
                true

        };

    }


    function buildCompaniesFromStages(stages) {

        return stages
            .filter(
                stage =>
                    stage.type === 'company'
            )
            .map(stage => ({

                name:
                    String(
                        stage.stage || ''
                    )
                        .replace(
                            /\s*入社$/,
                            ''
                        ),

                industry:
                    '不明',

                startYear:
                    stage.year

            }));

    }


    /* ========================================
       NORMALIZE NORMAL CAREER
    ======================================== */

    function normalizeCareer(career) {

        const stages =
            Array.isArray(career.careerStages)
                ? career.careerStages
                : [];


        const uniqueStages = [];

        const stageKeys =
            new Set();


        stages.forEach(stage => {

            const key =
                `${stage.year}-${stage.stage}`;

            if (!stageKeys.has(key)) {

                stageKeys.add(key);

                uniqueStages.push(stage);

            }

        });


        uniqueStages.sort(
            (a, b) => {

                const yearA =
                    Number(a.year) || 9999;

                const yearB =
                    Number(b.year) || 9999;

                return yearA - yearB;

            }
        );


        return {

            ...career,

            name:
                career.name ||
                'Anonymous',

            profession:
                career.profession ||
                '職種未設定',

            income:
                normalizeIncome(
                    career.income
                ),

            careerStages:
                uniqueStages,

            companies:
                Array.isArray(
                    career.companies
                )
                    ? career.companies
                    : [],

            career_type:
                career.career_type || '',

            age:
                calculateAge(
                    career.birthYear
                ),

            decision:
                career.decision || null,

            isThemeStory:
                false

        };

    }


    function normalizeIncome(income) {

        if (!Array.isArray(income)) {
            return '未設定';
        }

        if (
            !income.length ||
            !income[0] ||
            !income[0].income
        ) {
            return '未設定';
        }

        return income[0].income;

    }


    function calculateAge(birthYear) {

        const year =
            Number(birthYear);

        if (!year) {
            return null;
        }


        const currentYear =
            new Date().getFullYear();


        return currentYear - year;

    }


    /* ========================================
       INDUSTRY OPTIONS
    ======================================== */

    function populateIndustryOptions() {

        const industries =
            new Set();


        allCareers.forEach(career => {

            career.companies.forEach(company => {

                if (
                    company.industry &&
                    company.industry !== '不明'
                ) {

                    industries.add(
                        company.industry
                    );

                }

            });

        });


        [...industries]
            .sort(
                (a, b) =>
                    a.localeCompare(
                        b,
                        'ja'
                    )
            )
            .forEach(industry => {

                const option =
                    document.createElement(
                        'option'
                    );

                option.value =
                    industry;

                option.textContent =
                    industry;

                industryFilter.appendChild(
                    option
                );

            });

    }


    /* ========================================
       FILTERS
    ======================================== */

    function applyFilters() {

        const keyword =
            searchInput.value
                .trim()
                .toLowerCase();


        const selectedIndustry =
            industryFilter.value;

        const selectedAge =
            ageFilter.value;

        const selectedIncome =
            incomeFilter.value;


        filteredCareers =
            allCareers.filter(career => {

                return (
                    matchesKeyword(
                        career,
                        keyword
                    ) &&
                    matchesIndustry(
                        career,
                        selectedIndustry
                    ) &&
                    matchesAge(
                        career,
                        selectedAge
                    ) &&
                    matchesIncome(
                        career,
                        selectedIncome
                    ) &&
                    matchesTheme(
                        career,
                        selectedTheme
                    )
                );

            });


        currentPage = 1;

        render();

    }


    function matchesKeyword(
        career,
        keyword
    ) {

        if (!keyword) {
            return true;
        }


        const companyNames =
            career.companies
                .map(company =>
                    company.name || ''
                )
                .join(' ');


        const industries =
            career.companies
                .map(company =>
                    company.industry || ''
                )
                .join(' ');


        const stages =
            career.careerStages
                .map(stage =>
                    stage.stage || ''
                )
                .join(' ');


        const decision =
            career.decision || {};


        const decisionText = `
            ${decision.decision_type || ''}
            ${decision.title || ''}
            ${decision.trigger_text || ''}
            ${decision.dilemma_text || ''}
            ${decision.priority_text || ''}
        `;


        const searchableText = `
            ${career.name}
            ${career.profession}
            ${career.career_type}
            ${companyNames}
            ${industries}
            ${stages}
            ${decisionText}
        `.toLowerCase();


        return searchableText.includes(
            keyword
        );

    }


    function matchesIndustry(
        career,
        selectedIndustry
    ) {

        if (!selectedIndustry) {
            return true;
        }


        return career.companies.some(
            company =>
                company.industry ===
                selectedIndustry
        );

    }


    function matchesAge(
        career,
        selectedAge
    ) {

        if (!selectedAge) {
            return true;
        }


        if (!career.age) {
            return false;
        }


        const age =
            career.age;


        switch (selectedAge) {

            case '20':

                return (
                    age >= 20 &&
                    age < 30
                );

            case '30':

                return (
                    age >= 30 &&
                    age < 40
                );

            case '40':

                return (
                    age >= 40 &&
                    age < 50
                );

            case '50':

                return age >= 50;

            default:

                return true;

        }

    }


    function matchesIncome(
        career,
        selectedIncome
    ) {

        if (!selectedIncome) {
            return true;
        }


        return (
            career.income ===
            selectedIncome
        );

    }


    function matchesTheme(
        career,
        theme
    ) {

        if (!theme) {
            return true;
        }


        const careerType =
            (
                career.career_type ||
                ''
            ).toLowerCase();


        const profession =
            (
                career.profession ||
                ''
            ).toLowerCase();


        if (theme === '転職') {

            return (
                career.careerStages.length >= 3 ||
                career.companies.length >= 2
            );

        }


        return (
            careerType.includes(
                theme.toLowerCase()
            ) ||
            profession.includes(
                theme.toLowerCase()
            )
        );

    }


    /* ========================================
       RENDER
    ======================================== */

    function render() {

        renderCareerCards();

        renderPagination();

        renderResultCount();

    }


    function renderCareerCards() {

        careerList.innerHTML = '';


        if (!filteredCareers.length) {

            emptyState.hidden = false;

            return;

        }


        emptyState.hidden = true;


        const start =
            (
                currentPage - 1
            ) *
            ITEMS_PER_PAGE;


        const end =
            start +
            ITEMS_PER_PAGE;


        const careers =
            filteredCareers.slice(
                start,
                end
            );


        careers.forEach(career => {

            const card =
                createCareerCard(
                    career
                );

            careerList.appendChild(
                card
            );

        });

    }


    /* ========================================
       CAREER GPS STORY CARD
    ======================================== */

    function createCareerCard(career) {

        return createCareerGpsStoryCard(
            career
        );

    }


    function createCareerGpsStoryCard(career) {

        const li =
            document.createElement('li');


        li.className =
            'career-story-card career-story-card--gps';


        li.tabIndex = 0;


        li.setAttribute(
            'role',
            'link'
        );


        /* ==============================
           PERSON
        ============================== */

        const initial =
            getInitial(
                career.name
            );


        const ageText =
            career.age
                ? `${Math.floor(
                    career.age / 10
                ) * 10}代`
                : '年齢非公開';


        /* ==============================
           DECISION
        ============================== */

        const decision =
            career.decision || {};


        const decisionType =
            decision.decision_type || '';


        const decisionHook =
            decision.dilemma_text ||
            decision.title ||
            decision.trigger_text ||
            '';


        const priorityText =
            decision.priority_text || '';


        const hasDecision =
            Boolean(
                decisionType ||
                decisionHook ||
                priorityText
            );


        /* ==============================
           HTML
        ============================== */

        li.innerHTML = `

            <article class="career-gps-story-card">


                <!-- PERSON -->
                <div class="career-gps-story-profile">

                    <div
                        class="career-gps-story-avatar"
                        aria-hidden="true"
                    >
                        ${escapeHTML(
                            initial
                        )}
                    </div>


                    <div class="career-gps-story-person">

                        <p class="career-gps-story-meta">

                            <span>
                                ${escapeHTML(
                                    ageText
                                )}
                            </span>

                            <span>
                                ${escapeHTML(
                                    career.profession ||
                                    '職種未設定'
                                )}
                            </span>

                        </p>


                        <h3>
                            ${escapeHTML(
                                career.name
                            )}
                        </h3>

                    </div>

                </div>


                <!-- CAREER JOURNEY -->
                <section class="career-gps-story-section">

                    <p class="career-gps-story-label">
                        CAREER JOURNEY
                    </p>

                    ${buildCareerGpsJourneyHTML(
                        career.careerStages
                    )}

                </section>


                ${
                    hasDecision
                        ? `

                            <!-- CAREER DECISION -->
                            <section
                                class="
                                    career-gps-story-section
                                    career-gps-story-decision
                                "
                            >

                                <div class="career-gps-story-decision__heading">

                                    <p class="career-gps-story-label">
                                        CAREER DECISION
                                    </p>


                                    ${
                                        decisionType
                                            ? `
                                                <span class="career-gps-decision-badge">
                                                    ${escapeHTML(
                                                        decisionType
                                                    )}
                                                </span>
                                            `
                                            : ''
                                    }

                                </div>


                                ${
                                    decisionHook
                                        ? `
                                            <p class="career-gps-decision-hook">
                                                ${escapeHTML(
                                                    decisionHook
                                                )}
                                            </p>
                                        `
                                        : ''
                                }


                                ${
                                    priorityText
                                        ? `
                                            <div class="career-gps-priority">

                                                <span>
                                                    重視したこと
                                                </span>

                                                <p>
                                                    ${escapeHTML(
                                                        priorityText
                                                    )}
                                                </p>

                                            </div>
                                        `
                                        : ''
                                }

                            </section>

                        `
                        : ''
                }


                <!-- CTA -->
                <div class="career-gps-story-footer">

                    <span>

                        ${
                            hasDecision
                                ? '選択の背景と、その後を見る'
                                : 'このCareer Storyを見る'
                        }

                    </span>

                    <span aria-hidden="true">
                        →
                    </span>

                </div>

            </article>

        `;


        const navigate =
            () => {

                window.location.href =
                    `Career_detail.html?id=${
                        encodeURIComponent(
                            career.id
                        )
                    }`;

            };


        li.addEventListener(
            'click',
            navigate
        );


        li.addEventListener(
            'keydown',
            event => {

                if (
                    event.key === 'Enter' ||
                    event.key === ' '
                ) {

                    event.preventDefault();

                    navigate();

                }

            }
        );


        return li;

    }


    /* ========================================
       CAREER JOURNEY
    ======================================== */

    function buildCareerGpsJourneyHTML(stages) {

        if (
            !Array.isArray(stages) ||
            !stages.length
        ) {

            return `
                <p class="career-gps-journey-empty">
                    キャリア履歴は未登録です
                </p>
            `;

        }


        const displayStages =
            reduceTimelineStages(
                stages
            );


        return `

            <div class="career-gps-journey">

                <div class="career-gps-journey__track">

                    ${displayStages.map(
                        (stage, index) => `

                            <div class="career-gps-journey__item">

                                <span class="career-gps-journey__year">
                                    ${escapeHTML(
                                        String(
                                            stage.year
                                        )
                                    )}
                                </span>


                                <span
                                    class="
                                        career-gps-journey__dot
                                        ${
                                            index ===
                                            displayStages.length - 1
                                                ? 'is-current'
                                                : ''
                                        }
                                    "
                                ></span>


                                <span class="career-gps-journey__stage">
                                    ${escapeHTML(
                                        simplifyCareerGpsJourneyStage(
                                            stage.stage
                                        )
                                    )}
                                </span>

                            </div>

                        `
                    ).join('')}

                </div>

            </div>

        `;

    }


    function simplifyCareerGpsJourneyStage(stage) {

        if (!stage) {
            return '';
        }


        const normalized =
            String(stage)
                .replace(
                    /\s+/g,
                    ' '
                )
                .trim();


        if (
            normalized.length <= 17
        ) {

            return normalized;

        }


        return `${normalized.slice(
            0,
            17
        )}…`;

    }


    function reduceTimelineStages(stages) {

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


    /* ========================================
       CARD CONTENT
    ======================================== */

    function getInitial(name) {

        if (!name) {
            return '?';
        }


        const firstCharacter =
            name
                .trim()
                .charAt(0);


        return firstCharacter
            .toUpperCase();

    }


    /* ========================================
       PAGINATION
    ======================================== */

    function renderPagination() {

        paginationContainer.innerHTML = '';


        const totalPages =
            Math.ceil(
                filteredCareers.length /
                ITEMS_PER_PAGE
            );


        if (totalPages <= 1) {
            return;
        }


        const prev =
            document.createElement(
                'button'
            );


        prev.type =
            'button';

        prev.textContent =
            '前へ';

        prev.disabled =
            currentPage === 1;


        const page =
            document.createElement(
                'span'
            );


        page.className =
            'pagination__page';


        page.textContent =
            `${currentPage} / ${totalPages}`;


        const next =
            document.createElement(
                'button'
            );


        next.type =
            'button';

        next.textContent =
            '次へ';

        next.disabled =
            currentPage === totalPages;


        prev.addEventListener(
            'click',
            () => {

                if (currentPage > 1) {

                    currentPage--;

                    render();

                    scrollToStorySection();

                }

            }
        );


        next.addEventListener(
            'click',
            () => {

                if (
                    currentPage <
                    totalPages
                ) {

                    currentPage++;

                    render();

                    scrollToStorySection();

                }

            }
        );


        paginationContainer.append(
            prev,
            page,
            next
        );

    }


    function scrollToStorySection() {

        document
            .querySelector(
                '.career-story-section'
            )
            ?.scrollIntoView({
                behavior:
                    'smooth',

                block:
                    'start'
            });

    }


    function renderResultCount() {

        resultCount.textContent =
            `${filteredCareers.length}件のキャリア`;

    }


    /* ========================================
       EVENTS
    ======================================== */

    searchInput.addEventListener(
        'input',
        applyFilters
    );


    industryFilter.addEventListener(
        'change',
        applyFilters
    );


    ageFilter.addEventListener(
        'change',
        applyFilters
    );


    incomeFilter.addEventListener(
        'change',
        applyFilters
    );


    themeButtons.forEach(button => {

        button.addEventListener(
            'click',
            () => {

                themeButtons.forEach(
                    chip =>
                        chip.classList.remove(
                            'active'
                        )
                );


                button.classList.add(
                    'active'
                );


                selectedTheme =
                    button.dataset.theme ||
                    '';


                applyFilters();

            }
        );

    });


    resetButton.addEventListener(
        'click',
        () => {

            searchInput.value =
                '';

            industryFilter.value =
                '';

            ageFilter.value =
                '';

            incomeFilter.value =
                '';

            selectedTheme =
                '';


            themeButtons.forEach(
                button => {

                    button.classList.toggle(
                        'active',
                        !button.dataset.theme
                    );

                }
            );


            applyFilters();

        }
    );


    /* ========================================
       ESCAPE
    ======================================== */

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

});