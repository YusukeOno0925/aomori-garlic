document.addEventListener('DOMContentLoaded', () => {

    const API_URL = '/career-overview/';

    const ITEMS_PER_PAGE = 6;

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


    /* ========================================
       INITIAL LOAD
    ======================================== */

    loadCareers();


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
                allCareers.map(normalizeCareer);

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
       NORMALIZE
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


        uniqueStages.sort((a, b) => {

            const yearA =
                Number(a.year) || 9999;

            const yearB =
                Number(b.year) || 9999;

            return yearA - yearB;

        });


        return {

            ...career,

            name:
                career.name || 'Anonymous',

            profession:
                career.profession || '職種未設定',

            income:
                normalizeIncome(career.income),

            careerStages:
                uniqueStages,

            companies:
                Array.isArray(career.companies)
                    ? career.companies
                    : [],

            career_type:
                career.career_type || '',

            age:
                calculateAge(
                    career.birthYear
                )

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
            .sort((a, b) =>
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


        const searchableText = `
            ${career.name}
            ${career.profession}
            ${career.career_type}
            ${companyNames}
            ${industries}
            ${stages}
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
                return age >= 20 &&
                    age < 30;

            case '30':
                return age >= 30 &&
                    age < 40;

            case '40':
                return age >= 40 &&
                    age < 50;

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

        return career.income ===
            selectedIncome;

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


    function createCareerCard(career) {

        const li =
            document.createElement('li');

        li.className =
            'career-story-card';

        li.tabIndex = 0;

        li.setAttribute(
            'role',
            'link'
        );


        const initial =
            getInitial(
                career.name
            );


        const headline =
            buildCareerHeadline(
                career
            );


        const tags =
            buildCareerTags(
                career
            );


        const ageText =
            career.age
                ? `${career.age}歳`
                : '年齢非公開';


        li.innerHTML = `

            <article class="career-story-card__inner">

                <div class="career-story-profile">

                    <div
                        class="career-story-avatar"
                        aria-hidden="true"
                    >
                        ${escapeHTML(initial)}
                    </div>

                    <div class="career-story-profile__main">

                        <div class="career-story-profile__meta">

                            <span>
                                ${escapeHTML(ageText)}
                            </span>

                            <span class="career-meta-separator">
                                |
                            </span>

                            <span>
                                ${escapeHTML(
                                    career.profession
                                )}
                            </span>

                        </div>

                        <h3>
                            ${escapeHTML(
                                career.name
                            )}
                        </h3>

                        <p class="career-story-profile__summary">
                            ${escapeHTML(
                                buildCareerSummary(
                                    career
                                )
                            )}
                        </p>

                    </div>

                </div>


                <div class="career-story-hook">

                    <p class="career-story-hook__label">
                        CAREER THEME
                    </p>

                    <p class="career-story-hook__text">
                        ${escapeHTML(
                            headline
                        )}
                    </p>

                </div>


                <div class="career-story-tags">

                    ${tags.map(tag => `
                        <span class="career-story-tag">
                            ${escapeHTML(tag)}
                        </span>
                    `).join('')}

                </div>


                <div class="career-story-timeline">

                    ${buildTimelineHTML(
                        career.careerStages
                    )}

                </div>


                <div class="career-story-footer">

                    <div class="career-story-footer__stats">

                        <span>
                            ${escapeHTML(
                                getTransferCount(
                                    career
                                )
                            )}回転職
                        </span>

                        <span>
                            年収
                            ${escapeHTML(
                                career.income
                            )}
                        </span>

                    </div>

                    <span class="career-story-link">
                        このキャリアを見る
                        <span aria-hidden="true">
                            →
                        </span>
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
       CARD CONTENT
    ======================================== */

    function getInitial(name) {

        if (!name) {
            return '?';
        }

        const firstCharacter =
            name.trim().charAt(0);

        return firstCharacter
            .toUpperCase();

    }


    function buildCareerSummary(career) {

        const companyCount =
            getCompanyCount(
                career
            );

        const careerYears =
            getCareerYears(
                career
            );


        const parts = [];


        if (companyCount) {

            parts.push(
                `${companyCount}社`
            );

        }


        if (careerYears) {

            parts.push(
                `キャリア約${careerYears}年`
            );

        }


        return parts.length
            ? parts.join('・')
            : 'キャリアストーリー';

    }


    function buildCareerHeadline(career) {

        const type =
            career.career_type
                .trim();


        if (type) {

            return normalizeCareerType(
                type
            );

        }


        if (
            career.companies.length >= 2
        ) {

            return '新しい環境へ踏み出したキャリア';

        }


        return '自分らしいキャリアを模索してきた';

    }


    function normalizeCareerType(type) {

        if (type.length <= 34) {
            return type;
        }

        return `${type.slice(0, 34)}…`;

    }


    function buildCareerTags(career) {

        const tags = [];


        if (
            career.companies.length >= 2
        ) {

            tags.push(
                '#キャリアチェンジ'
            );

        }


        if (
            career.career_type.includes(
                'お金'
            )
        ) {

            tags.push(
                '#年収UP'
            );

        }


        if (
            career.career_type.includes(
                'やりがい'
            )
        ) {

            tags.push(
                '#やりがい'
            );

        }


        if (
            career.career_type.includes(
                '起業'
            )
        ) {

            tags.push(
                '#独立・起業'
            );

        }


        if (
            career.profession &&
            career.profession !==
                '職種未設定'
        ) {

            tags.push(
                `#${career.profession}`
            );

        }


        if (career.age) {

            const decade =
                Math.floor(
                    career.age / 10
                ) * 10;

            tags.push(
                `#${decade}代`
            );

        }


        return [
            ...new Set(tags)
        ].slice(0, 4);

    }


    function getCompanyCount(career) {

        const companies =
            career.companies
                .map(company =>
                    company.name
                )
                .filter(Boolean);


        return new Set(
            companies
        ).size;

    }


    function getTransferCount(career) {

        const companyCount =
            getCompanyCount(
                career
            );

        return Math.max(
            0,
            companyCount - 1
        );

    }


    function getCareerYears(career) {

        const years =
            career.companies
                .map(company =>
                    Number(
                        company.startYear
                    )
                )
                .filter(Boolean);


        if (!years.length) {
            return null;
        }


        const firstYear =
            Math.min(...years);

        const currentYear =
            new Date().getFullYear();


        return Math.max(
            1,
            currentYear -
                firstYear
        );

    }


    /* ========================================
       TIMELINE
    ======================================== */

    function buildTimelineHTML(stages) {

        if (!stages.length) {

            return `
                <p class="career-story-timeline__empty">
                    キャリア履歴は未登録です
                </p>
            `;

        }


        const displayStages =
            reduceTimelineStages(
                stages
            );


        return `

            <div class="career-story-timeline__track">

                ${displayStages.map(
                    (stage, index) => `

                        <div
                            class="career-story-timeline__item"
                        >

                            <span class="career-story-timeline__year">
                                ${escapeHTML(
                                    String(
                                        stage.year
                                    )
                                )}
                            </span>

                            <span
                                class="
                                    career-story-timeline__dot
                                    ${
                                        index ===
                                        displayStages.length - 1
                                            ? 'is-current'
                                            : ''
                                    }
                                "
                            ></span>

                            <span class="career-story-timeline__stage">
                                ${escapeHTML(
                                    simplifyStage(
                                        stage.stage
                                    )
                                )}
                            </span>

                        </div>

                    `
                ).join('')}

            </div>

        `;

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


    function simplifyStage(stage) {

        if (!stage) {
            return '';
        }

        return stage
            .replace(
                /\s+/g,
                ' '
            )
            .trim();

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
                behavior: 'smooth',
                block: 'start'
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
                    button.dataset.theme || '';

                applyFilters();

            }
        );

    });


    resetButton.addEventListener(
        'click',
        () => {

            searchInput.value = '';

            industryFilter.value = '';

            ageFilter.value = '';

            incomeFilter.value = '';

            selectedTheme = '';

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
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');

    }

});