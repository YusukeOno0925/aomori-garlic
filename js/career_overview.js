document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    /* =====================================================
       CONFIG
       ===================================================== */

    const API_URL = '/career-overview/';
    const THEME_API_URL = '/career-stories-by-theme/';
    const ITEMS_PER_PAGE = 12;
    const OVERVIEW_LIMIT = 300;

    const ROUTE_ORDER = [
        'change',
        'stay',
        'internal'
    ];

    const DILEMMA_GROUP_LABELS = {
        growth: '成長機会',
        income: '年収・待遇',
        workstyle: '働き方・生活',
        role: '仕事内容・役割',
        relationship: '人間関係・組織',
        stability: '安定・将来不安'
    };

    const urlParams =
        new URLSearchParams(
            window.location.search
        );

    const pageTheme =
        (
            urlParams.get('theme')
            ||
            ''
        )
            .trim()
            .toLowerCase();

    const isThemeMode =
        Boolean(
            pageTheme
        );

    const isChangeTheme =
        pageTheme ===
        'change';


    /* =====================================================
       STATE
       ===================================================== */

    let allCareers =
        [];

    let filteredCareers =
        [];

    let currentPage =
        1;


    /*
     * 通常一覧用
     */
    let selectedTheme =
        '';


    /*
     * change Theme用
     */
    let selectedDecisionPath =
        '';

    let selectedDilemmaGroup =
        '';


    /* =====================================================
       DOM
       ===================================================== */

    const overviewPage =
        document.getElementById(
            'career-overview-page'
        );


    const searchPanel =
        document.getElementById(
            'career-search-panel'
        );


    const decisionExplorer =
        document.getElementById(
            'career-decision-path-panel'
        );


    const searchInput =
        document.getElementById(
            'search'
        );


    const industryFilter =
        document.getElementById(
            'filter-industry'
        );


    const ageFilter =
        document.getElementById(
            'filter-age'
        );


    const incomeFilter =
        document.getElementById(
            'filter-income'
        );


    const resetButton =
        document.getElementById(
            'reset-career-filter'
        );


    const careerList =
        document.getElementById(
            'career-list'
        );


    const resultCount =
        document.getElementById(
            'career-result-count'
        );


    const emptyState =
        document.getElementById(
            'career-empty-state'
        );


    const paginationContainer =
        document.getElementById(
            'pagination-container'
        );


    const themeButtons =
        document.querySelectorAll(
            '.career-theme-chip'
        );


    const dilemmaButtons =
        document.querySelectorAll(
            '.career-dilemma-button'
        );


    const dilemmaCountElements =
        document.querySelectorAll(
            '[data-dilemma-group-count]'
        );


    const decisionPathButtons =
        document.querySelectorAll(
            '.career-decision-path-button'
        );


    const decisionPathCountElements =
        document.querySelectorAll(
            '[data-decision-path-count]'
        );


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


    const currentViewSection =
        document.getElementById(
            'career-current-view'
        );


    const currentViewTitle =
        document.getElementById(
            'career-current-view-title'
        );


    const currentViewCount =
        document.getElementById(
            'career-current-view-count'
        );


    const currentViewRouteCountElements =
        document.querySelectorAll(
            '[data-current-view-route-count]'
        );


    const currentViewRouteElements =
        document.querySelectorAll(
            '[data-current-view-route]'
        );


    /* =====================================================
       PAGE MODE
       ===================================================== */

    if (
        isThemeMode
    ) {

        overviewPage
            ?.classList
            .add(
                'is-theme-mode'
            );

    }


    if (
        isChangeTheme
    ) {

        overviewPage
            ?.classList
            .add(
                'is-change-theme'
            );


        if (
            searchPanel
        ) {

            searchPanel.hidden =
                true;

        }


        if (
            decisionExplorer
        ) {

            decisionExplorer.hidden =
                false;

        }

    }


    /* =====================================================
       INITIAL LOAD
       ===================================================== */

    if (
        isThemeMode
    ) {

        loadThemeCareers();

    } else {

        loadCareers();

    }


    /* =====================================================
       LOAD THEME CAREERS
       ===================================================== */

    async function loadThemeCareers() {

        try {

            const params =
                new URLSearchParams();


            params.set(
                'theme',
                pageTheme
            );


            params.set(
                'view',
                'overview'
            );


            params.set(
                'limit',
                String(
                    OVERVIEW_LIMIT
                )
            );


            const response =
                await fetch(
                    `${THEME_API_URL}?${params.toString()}`,
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


            if (
                !response.ok
            ) {

                throw new Error(
                    `HTTP error: ${response.status}`
                );

            }


            const data =
                await response.json();


            updateThemeModeCopy(
                data
            );


            const stories =
                Array.isArray(
                    data.stories
                )

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


            renderLoadError(
                'Career Storyを取得できませんでした'
            );

        }

    }


    /* =====================================================
       LOAD NORMAL CAREERS
       ===================================================== */

    async function loadCareers() {

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


            if (
                !response.ok
            ) {

                throw new Error(
                    `HTTP error: ${response.status}`
                );

            }


            const data =
                await response.json();


            allCareers =
                Array.isArray(
                    data.careers
                )

                    ? data.careers
                        .map(
                            normalizeCareer
                        )

                    : [];


            populateIndustryOptions();


            applyFilters();


        } catch (error) {

            console.error(
                'キャリア情報取得エラー:',
                error
            );


            renderLoadError(
                'キャリア情報を取得できませんでした'
            );

        }

    }


    /* =====================================================
       LOAD ERROR
       ===================================================== */

    function renderLoadError(
        message
    ) {

        if (
            careerList
        ) {

            careerList.innerHTML =
                '';

        }


        if (
            paginationContainer
        ) {

            paginationContainer.innerHTML =
                '';

        }


        if (
            resultCount
        ) {

            resultCount.textContent =
                '';

        }


        if (
            currentViewSection
        ) {

            currentViewSection.hidden =
                true;

        }


        if (
            emptyState
        ) {

            emptyState.hidden =
                false;


            const title =
                emptyState.querySelector(
                    '.career-empty-state__title'
                );


            if (
                title
            ) {

                title.textContent =
                    message;

            }

        }

    }


    /* =====================================================
       THEME MODE COPY
       ===================================================== */

    function updateThemeModeCopy(
        data
    ) {

        if (
            overviewEyebrow
        ) {

            overviewEyebrow.textContent =
                'CAREER DECISIONS';

        }


        if (
            isChangeTheme
        ) {

            if (
                overviewTitle
            ) {

                overviewTitle.innerHTML =
                    '転職するか、残るか。<br>'
                    +
                    '同じ迷いにいた人は、何を選んだ？';

            }


            if (
                overviewLead
            ) {

                overviewLead.innerHTML =
                    '自分と近い迷いを選んで、<br>'
                    +
                    '違う選択と、その後を見てみましょう。';

            }


            updateStorySectionCopy();


            return;

        }


        /*
         * change以外のTheme
         */

        if (
            overviewTitle
        ) {

            overviewTitle.textContent =
                data.theme_title
                ||
                '今の悩みからCareer Storyを探す';

        }


        if (
            overviewLead
        ) {

            overviewLead.textContent =
                data.theme_description
                ||
                '同じような分岐に立った人の選択を見てみましょう。';

        }


        if (
            storySectionEyebrow
        ) {

            storySectionEyebrow.textContent =
                'STORIES FROM THE SAME DILEMMA';

        }


        if (
            storySectionTitle
        ) {

            storySectionTitle.textContent =
                '同じ悩みを経験したCareer Story';

        }


        if (
            storySectionLead
        ) {

            storySectionLead.textContent =
                '同じような分岐に立った人が、何を考え、何を選んだのか。';

        }

    }


    /* =====================================================
       STORY SECTION COPY
       change専用
       ===================================================== */

    function updateStorySectionCopy() {

        if (
            !isChangeTheme
        ) {

            return;

        }


        const dilemmaLabel =
            selectedDilemmaGroup

                ? (
                    DILEMMA_GROUP_LABELS[
                        selectedDilemmaGroup
                    ]
                    ||
                    ''
                )

                : '';


        const routeLabel =
            selectedDecisionPath

                ? getFallbackRouteLabel(
                    selectedDecisionPath
                )

                : '';


        if (
            storySectionEyebrow
        ) {

            storySectionEyebrow.textContent =
                'DECISION STORIES';

        }


        if (
            storySectionTitle
        ) {

            if (
                dilemmaLabel
                &&
                routeLabel
            ) {

                storySectionTitle.textContent =
                    `「${dilemmaLabel}」で迷い、「${routeLabel}」を選んだ人`;

            } else if (
                dilemmaLabel
            ) {

                storySectionTitle.textContent =
                    `「${dilemmaLabel}」で迷った人の選択`;

            } else if (
                routeLabel
            ) {

                storySectionTitle.textContent =
                    `「${routeLabel}」を選んだ人のCareer Story`;

            } else {

                storySectionTitle.textContent =
                    '転職するか迷った人の、選択とその後';

            }

        }


        if (
            storySectionLead
        ) {

            storySectionLead.textContent =
                '何に迷い、何を大切にし、どんな道を選び、その後どうなったのかを比べられます。';

        }

    }


    /* =====================================================
       NORMALIZE THEME CAREER
       ===================================================== */

    function normalizeThemeCareer(
        story
    ) {

        const uniqueStages =
            normalizeStages(
                story?.careerStages
            );


        const decision =
            normalizeDecision(
                story?.decision
            );


        const age =
            normalizeNumericAge(
                story?.age
            );


        return {

            id:
                story?.id,


            name:
                normalizeDisplayText(
                    story?.username
                )
                ||
                'Anonymous',


            profession:
                normalizeDisplayText(
                    story?.profession
                )
                ||
                '職種未設定',


            age:
                age,


            birthYear:
                age

                    ? (
                        new Date()
                            .getFullYear()
                        -
                        age
                    )

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
                decision,


            theme_match_score:
                Number(
                    story?.theme_match_score
                )
                ||
                0,


            theme_match_reasons:
                Array.isArray(
                    story?.theme_match_reasons
                )

                    ? story.theme_match_reasons

                    : [],


            isThemeStory:
                true

        };

    }


    function normalizeDecision(
        value
    ) {

        if (
            !value
            ||
            typeof value !==
            'object'
        ) {

            return null;

        }


        return {

            ...value,


            decision_path:
                value.decision_path
                ||
                null,


            dilemma_groups:
                Array.isArray(
                    value.dilemma_groups
                )

                    ? value.dilemma_groups

                    : [],


            primary_dilemma_group:
                (
                    value.primary_dilemma_group
                    &&
                    typeof value.primary_dilemma_group
                    ===
                    'object'
                )

                    ? value.primary_dilemma_group

                    : null

        };

    }


    function normalizeNumericAge(
        value
    ) {

        if (
            value === null
            ||
            value === undefined
            ||
            value === ''
        ) {

            return null;

        }


        const number =
            Number(
                value
            );


        return (
            Number.isFinite(
                number
            )
            &&
            number > 0
        )

            ? number

            : null;

    }


    function normalizeStages(
        stages
    ) {

        const source =
            Array.isArray(
                stages
            )

                ? stages

                : [];


        const uniqueStages =
            [];


        const stageKeys =
            new Set();


        source.forEach(
            stage => {

                const year =
                    stage?.year
                    ??
                    '';


                const label =
                    normalizeDisplayText(
                        stage?.stage
                    );


                const type =
                    normalizeDisplayText(
                        stage?.type
                    );


                if (
                    !label
                ) {

                    return;

                }


                const key =
                    `${year}-${label}-${type}`;


                if (
                    stageKeys.has(
                        key
                    )
                ) {

                    return;

                }


                stageKeys.add(
                    key
                );


                uniqueStages.push({

                    ...stage,

                    year:

                        year,

                    stage:
                        label,

                    type:
                        type

                });

            }
        );


        uniqueStages.sort(
            (
                a,
                b
            ) => {

                const yearA =
                    Number(
                        a.year
                    )
                    ||
                    9999;


                const yearB =
                    Number(
                        b.year
                    )
                    ||
                    9999;


                return (
                    yearA
                    -
                    yearB
                );

            }
        );


        return uniqueStages;

    }


    function buildCompaniesFromStages(
        stages
    ) {

        return stages

            .filter(
                stage =>
                    stage.type ===
                    'company'
            )

            .map(
                stage => ({

                    name:
                        String(
                            stage.stage
                            ||
                            ''
                        )
                            .replace(
                                /\s*入社$/,
                                ''
                            ),


                    industry:
                        '不明',


                    startYear:
                        stage.year

                })
            );

    }


    /* =====================================================
       NORMALIZE NORMAL CAREER
       ===================================================== */

    function normalizeCareer(
        career
    ) {

        const uniqueStages =
            normalizeStages(
                career?.careerStages
            );


        return {

            ...career,


            name:
                normalizeDisplayText(
                    career?.name
                )
                ||
                'Anonymous',


            profession:
                normalizeDisplayText(
                    career?.profession
                )
                ||
                '職種未設定',


            income:
                normalizeIncome(
                    career?.income
                ),


            careerStages:
                uniqueStages,


            companies:
                Array.isArray(
                    career?.companies
                )

                    ? career.companies

                    : [],


            career_type:
                career?.career_type
                ||
                '',


            age:
                calculateAge(
                    career?.birthYear
                ),


            decision:
                normalizeDecision(
                    career?.decision
                ),


            isThemeStory:
                false

        };

    }


    function normalizeIncome(
        income
    ) {

        if (
            !Array.isArray(
                income
            )
            ||
            !income.length
            ||
            !income[0]
            ||
            !income[0].income
        ) {

            return '未設定';

        }


        return (
            income[0].income
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
            !year
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


    /* =====================================================
       INDUSTRY OPTIONS
       ===================================================== */

    function populateIndustryOptions() {

        if (
            !industryFilter
        ) {

            return;

        }


        while (
            industryFilter.options.length >
            1
        ) {

            industryFilter.remove(
                1
            );

        }


        const industries =
            new Set();


        allCareers.forEach(
            career => {

                (
                    career.companies
                    ||
                    []
                )
                    .forEach(
                        company => {

                            if (
                                company?.industry
                                &&
                                company.industry !==
                                '不明'
                            ) {

                                industries.add(
                                    company.industry
                                );

                            }

                        }
                    );

            }
        );


        [
            ...industries
        ]

            .sort(
                (
                    a,
                    b
                ) =>
                    a.localeCompare(
                        b,
                        'ja'
                    )
            )

            .forEach(
                industry => {

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

                }
            );

    }


    /* =====================================================
       FILTERS
       ===================================================== */

    function applyFilters() {

        const keyword =
            searchInput

                ? searchInput
                    .value
                    .trim()
                    .toLowerCase()

                : '';


        const selectedIndustry =
            industryFilter

                ? industryFilter.value

                : '';


        const selectedAge =
            ageFilter

                ? ageFilter.value

                : '';


        const selectedIncome =
            incomeFilter

                ? incomeFilter.value

                : '';


        filteredCareers =
            allCareers.filter(
                career => {

                    return (

                        matchesKeyword(
                            career,
                            keyword
                        )

                        &&

                        matchesIndustry(
                            career,
                            selectedIndustry
                        )

                        &&

                        matchesAge(
                            career,
                            selectedAge
                        )

                        &&

                        matchesIncome(
                            career,
                            selectedIncome
                        )

                        &&

                        matchesTheme(
                            career,
                            selectedTheme
                        )

                        &&

                        matchesDilemmaGroup(
                            career,
                            selectedDilemmaGroup
                        )

                        &&

                        matchesDecisionPath(
                            career,
                            selectedDecisionPath
                        )

                    );

                }
            );


        currentPage =
            1;


        if (
            isChangeTheme
        ) {

            renderExplorerCounts();


            updateCurrentView();


            updateStorySectionCopy();

        }


        render();

    }


    function matchesKeyword(
        career,
        keyword
    ) {

        if (
            !keyword
        ) {

            return true;

        }


        const companyNames =
            (
                career.companies
                ||
                []
            )

                .map(
                    company =>
                        company?.name
                        ||
                        ''
                )

                .join(
                    ' '
                );


        const industries =
            (
                career.companies
                ||
                []
            )

                .map(
                    company =>
                        company?.industry
                        ||
                        ''
                )

                .join(
                    ' '
                );


        const stages =
            (
                career.careerStages
                ||
                []
            )

                .map(
                    stage =>
                        stage?.stage
                        ||
                        ''
                )

                .join(
                    ' '
                );


        const decision =
            career.decision
            ||
            {};


        const decisionText = `

            ${decision.decision_type || ''}

            ${decision.title || ''}

            ${decision.trigger_text || ''}

            ${decision.dilemma_text || ''}

            ${decision.priority_text || ''}

            ${decision.result_text || ''}

        `;


        const searchableText = `

            ${career.name || ''}

            ${career.profession || ''}

            ${career.career_type || ''}

            ${companyNames}

            ${industries}

            ${stages}

            ${decisionText}

        `
            .toLowerCase();


        return (
            searchableText.includes(
                keyword
            )
        );

    }


    function matchesIndustry(
        career,
        selectedIndustry
    ) {

        if (
            !selectedIndustry
        ) {

            return true;

        }


        return (
            career.companies
            ||
            []
        )
            .some(
                company =>
                    company?.industry ===
                    selectedIndustry
            );

    }


    function matchesAge(
        career,
        selectedAge
    ) {

        if (
            !selectedAge
        ) {

            return true;

        }


        if (
            !career.age
        ) {

            return false;

        }


        const age =
            career.age;


        switch (
            selectedAge
        ) {

            case '20':

                return (
                    age >= 20
                    &&
                    age < 30
                );


            case '30':

                return (
                    age >= 30
                    &&
                    age < 40
                );


            case '40':

                return (
                    age >= 40
                    &&
                    age < 50
                );


            case '50':

                return (
                    age >= 50
                );


            default:

                return true;

        }

    }


    function matchesIncome(
        career,
        selectedIncome
    ) {

        if (
            !selectedIncome
        ) {

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

        if (
            !theme
        ) {

            return true;

        }


        const careerType =
            (
                career.career_type
                ||
                ''
            )
                .toLowerCase();


        const profession =
            (
                career.profession
                ||
                ''
            )
                .toLowerCase();


        if (
            theme ===
            '転職'
        ) {

            return (

                (
                    career.careerStages
                    ||
                    []
                ).length >= 3

                ||

                (
                    career.companies
                    ||
                    []
                ).length >= 2

            );

        }


        return (

            careerType.includes(
                theme.toLowerCase()
            )

            ||

            profession.includes(
                theme.toLowerCase()
            )

        );

    }


    /* =====================================================
       DILEMMA GROUP
       ===================================================== */

    function matchesDilemmaGroup(
        career,
        groupKey
    ) {

        if (
            !isChangeTheme
            ||
            !groupKey
        ) {

            return true;

        }


        return careerHasDilemmaGroup(
            career,
            groupKey
        );

    }


    function careerHasDilemmaGroup(
        career,
        groupKey
    ) {

        const decision =
            career?.decision
            ||
            {};


        const groups =
            Array.isArray(
                decision.dilemma_groups
            )

                ? decision.dilemma_groups

                : [];


        const groupMatched =
            groups.some(
                group =>
                    normalizeDisplayText(
                        group?.key
                    )
                    ===
                    groupKey
            );


        if (
            groupMatched
        ) {

            return true;

        }


        return (

            normalizeDisplayText(
                decision
                    ?.primary_dilemma_group
                    ?.key
            )
            ===
            groupKey

        );

    }


    /* =====================================================
       DECISION PATH

       Backendのdecision_pathを最優先。
       Frontend再判定はFallbackのみ。
       ===================================================== */

    function getDecisionPath(
        decision
    ) {

        const backendPath =
            decision?.decision_path;


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


        const backendStringKey =
            typeof backendPath ===
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


        if (
            [
                '現職継続',
                '継続',
                '残留',
                '現職に残る'
            ]
                .includes(
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


        if (
            [
                '異動',
                '社内異動',
                '役割変更'
            ]
                .includes(
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
                'その他の道を選んだ'

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
                routeKey
            ]
            ||
            '選択'
        );

    }


    function matchesDecisionPath(
        career,
        selectedPath
    ) {

        if (
            !isChangeTheme
            ||
            !selectedPath
        ) {

            return true;

        }


        const path =
            getDecisionPath(
                career.decision
                ||
                {}
            );


        return (
            path.key ===
            selectedPath
        );

    }


    /* =====================================================
       CURRENT VIEW
       ===================================================== */

    function updateCurrentView() {

        if (
            !isChangeTheme
            ||
            !currentViewSection
        ) {

            return;

        }


        const dilemmaLabel =
            selectedDilemmaGroup

                ? (
                    DILEMMA_GROUP_LABELS[
                        selectedDilemmaGroup
                    ]
                    ||
                    ''
                )

                : '';


        const routeLabel =
            selectedDecisionPath

                ? getFallbackRouteLabel(
                    selectedDecisionPath
                )

                : '';


        /*
         * Title
         */

        if (
            currentViewTitle
        ) {

            if (
                dilemmaLabel
                &&
                routeLabel
            ) {

                currentViewTitle.textContent =
                    `「${dilemmaLabel}」で迷い、「${routeLabel}」を選んだ人`;

            } else if (
                dilemmaLabel
            ) {

                currentViewTitle.textContent =
                    `「${dilemmaLabel}」で迷った人の選択`;

            } else if (
                routeLabel
            ) {

                currentViewTitle.textContent =
                    `転職するか迷い、「${routeLabel}」を選んだ人`;

            } else {

                currentViewTitle.textContent =
                    '転職するか迷った人の選択';

            }

        }


        /*
         * 現在の検索結果件数
         */

        if (
            currentViewCount
        ) {

            currentViewCount.textContent =
                String(
                    filteredCareers.length
                );

        }


        /*
         * Route別件数
         *
         * Choice選択の影響は受けず、
         * 現在選択しているDilemma内で
         * それぞれ何件あるかを表示する。
         */

        const baseCareers =
            allCareers.filter(
                career => {

                    if (
                        !selectedDilemmaGroup
                    ) {

                        return true;

                    }


                    return careerHasDilemmaGroup(
                        career,
                        selectedDilemmaGroup
                    );

                }
            );


        const routeCounts = {

            change:
                0,

            stay:
                0,

            internal:
                0

        };


        baseCareers.forEach(
            career => {

                const path =
                    getDecisionPath(
                        career.decision
                        ||
                        {}
                    );


                if (
                    Object
                        .prototype
                        .hasOwnProperty
                        .call(
                            routeCounts,
                            path.key
                        )
                ) {

                    routeCounts[
                        path.key
                    ]++;

                }

            }
        );


        currentViewRouteCountElements
            .forEach(
                element => {

                    const routeKey =
                        element
                            .dataset
                            .currentViewRouteCount;


                    element.textContent =
                        String(
                            routeCounts[
                                routeKey
                            ]
                            ??
                            0
                        );

                }
            );


        /*
         * 現在選択中のChoice
         */

        currentViewRouteElements
            .forEach(
                element => {

                    const routeKey =
                        element
                            .dataset
                            .currentViewRoute;


                    element.classList.toggle(
                        'is-selected',

                        Boolean(
                            selectedDecisionPath
                        )
                        &&
                        routeKey ===
                        selectedDecisionPath
                    );

                }
            );


        currentViewSection.hidden =
            false;

    }


    /* =====================================================
       EXPLORER COUNTS

       迷いを選ぶ
       → 選択肢件数も変わる

       選択肢を選ぶ
       → 迷い件数も変わる
       ===================================================== */

    function renderExplorerCounts() {

        if (
            !isChangeTheme
        ) {

            return;

        }


        renderDilemmaCounts();


        renderDecisionPathCounts();

    }


    function renderDilemmaCounts() {

        /*
         * 選択済みRouteだけを母数にする。
         */

        const base =
            allCareers.filter(
                career => {

                    if (
                        !selectedDecisionPath
                    ) {

                        return true;

                    }


                    return (

                        getDecisionPath(
                            career.decision
                            ||
                            {}
                        ).key
                        ===
                        selectedDecisionPath

                    );

                }
            );


        const counts = {

            all:
                base.length,

            growth:
                0,

            income:
                0,

            workstyle:
                0,

            role:
                0,

            relationship:
                0,

            stability:
                0

        };


        base.forEach(
            career => {

                Object
                    .keys(
                        DILEMMA_GROUP_LABELS
                    )
                    .forEach(
                        groupKey => {

                            if (
                                careerHasDilemmaGroup(
                                    career,
                                    groupKey
                                )
                            ) {

                                counts[
                                    groupKey
                                ]++;

                            }

                        }
                    );

            }
        );


        dilemmaCountElements
            .forEach(
                element => {

                    const key =
                        element
                            .dataset
                            .dilemmaGroupCount;


                    element.textContent =
                        counts[
                            key
                        ]
                        ??
                        0;

                }
            );

    }


    function renderDecisionPathCounts() {

        /*
         * 選択済みDilemmaだけを母数にする。
         */

        const base =
            allCareers.filter(
                career => {

                    if (
                        !selectedDilemmaGroup
                    ) {

                        return true;

                    }


                    return careerHasDilemmaGroup(
                        career,
                        selectedDilemmaGroup
                    );

                }
            );


        const counts = {

            all:
                base.length,

            change:
                0,

            stay:
                0,

            internal:
                0

        };


        base.forEach(
            career => {

                const path =
                    getDecisionPath(
                        career.decision
                        ||
                        {}
                    );


                if (
                    Object
                        .prototype
                        .hasOwnProperty
                        .call(
                            counts,
                            path.key
                        )
                ) {

                    counts[
                        path.key
                    ]++;

                }

            }
        );


        decisionPathCountElements
            .forEach(
                element => {

                    const key =
                        element
                            .dataset
                            .decisionPathCount;


                    element.textContent =
                        counts[
                            key
                        ]
                        ??
                        0;

                }
            );

    }


    /* =====================================================
       RENDER
       ===================================================== */

    function render() {

        renderCareerCards();


        renderPagination();


        renderResultCount();

    }


    function renderCareerCards() {

        if (
            !careerList
            ||
            !emptyState
        ) {

            return;

        }


        careerList.innerHTML =
            '';


        if (
            !filteredCareers.length
        ) {

            emptyState.hidden =
                false;


            return;

        }


        emptyState.hidden =
            true;


        const start =
            (
                currentPage
                -
                1
            )
            *
            ITEMS_PER_PAGE;


        const end =
            start
            +
            ITEMS_PER_PAGE;


        const careers =
            filteredCareers.slice(
                start,
                end
            );


        careers.forEach(
            career => {

                careerList.appendChild(
                    createCareerCard(
                        career
                    )
                );

            }
        );

    }


    function createCareerCard(
        career
    ) {

        /*
         * change Themeでは
         * Decision-first Card。
         */

        if (
            isChangeTheme
        ) {

            return createDecisionExplorerCard(
                career
            );

        }


        /*
         * 通常一覧・その他Themeは
         * 既存型を維持。
         */

        return createStandardCareerCard(
            career
        );

    }


    /* =====================================================
       CHANGE THEME CARD
       Decision First
       ===================================================== */

    function createDecisionExplorerCard(
        career
    ) {

        const li =
            createInteractiveListItem(
                career
            );


        li.className =
            'career-story-card career-story-card--decision';


        const decision =
            career.decision
            ||
            {};


        const route =
            getDecisionPath(
                decision
            );


        const dilemma =
            getDilemmaText(
                decision
            );


        const priority =
            normalizeDisplayText(
                decision.priority_text
            );


        const result =
            normalizeDisplayText(
                decision.result_text
            );


        const dilemmaGroupLabel =
            getDilemmaGroupLabel(
                decision,
                selectedDilemmaGroup
            );


        const ageText =
            getAgeGroup(
                career.age
            )
            ||
            '年齢非公開';


        const journeyText =
            buildCompactJourneyText(
                career.careerStages
            );


        li.innerHTML = `

            <article class="career-decision-card">


                <!-- ==============================
                     GROUP / ROUTE
                     ============================== -->

                <div class="career-decision-card__topline">


                    ${
                        dilemmaGroupLabel

                            ? `

                                <span class="career-decision-card__dilemma-badge">

                                    ${escapeHTML(
                                        dilemmaGroupLabel
                                    )}

                                </span>

                            `

                            : `

                                <span
                                    class="
                                        career-decision-card__dilemma-badge
                                        career-decision-card__dilemma-badge--muted
                                    "
                                >

                                    転職の迷い

                                </span>

                            `
                    }


                    <span
                        class="
                            career-decision-card__route
                            career-decision-card__route--${escapeHTML(
                                route.key
                            )}
                        "
                    >

                        ${escapeHTML(
                            route.label
                        )}

                    </span>


                </div>



                <!-- ==============================
                     DILEMMA
                     ============================== -->

                <section class="career-decision-card__main">


                    <p class="career-decision-card__label">

                        当時の迷い

                    </p>


                    <h3 class="career-decision-card__dilemma">

                        ${escapeHTML(
                            createExcerpt(
                                dilemma
                                ||
                                '迷いの詳細はまだ記録されていません。',
                                84
                            )
                        )}

                    </h3>


                </section>



                <!-- ==============================
                     PRIORITY / RESULT
                     ============================== -->

                <div class="career-decision-card__details">


                    <section class="career-decision-card__detail-block">


                        <p class="career-decision-card__label">

                            大切にしたこと

                        </p>


                        <p>

                            ${escapeHTML(
                                createExcerpt(
                                    priority
                                    ||
                                    'まだ記録されていません。',
                                    58
                                )
                            )}

                        </p>


                    </section>



                    <section
                        class="
                            career-decision-card__detail-block
                            career-decision-card__detail-block--result
                        "
                    >


                        <p class="career-decision-card__label">

                            その後

                        </p>


                        <p>

                            ${escapeHTML(
                                createExcerpt(
                                    result
                                    ||
                                    'まだ記録されていません。',
                                    68
                                )
                            )}

                        </p>


                    </section>


                </div>



                <!-- ==============================
                     PERSON
                     ============================== -->

                <div class="career-decision-card__person">


                    <div
                        class="career-decision-card__avatar"
                        aria-hidden="true"
                    >

                        ${escapeHTML(
                            getInitial(
                                career.name
                            )
                        )}

                    </div>


                    <div class="career-decision-card__person-copy">


                        <strong>

                            ${escapeHTML(
                                career.name
                            )}

                        </strong>


                        <p>

                            ${escapeHTML(
                                ageText
                            )}

                            ${
                                career.profession
                                &&
                                career.profession !==
                                '職種未設定'

                                    ? `・${escapeHTML(
                                        career.profession
                                    )}`

                                    : ''
                            }

                        </p>


                        ${
                            journeyText

                                ? `

                                    <p class="career-decision-card__journey">

                                        ${escapeHTML(
                                            journeyText
                                        )}

                                    </p>

                                `

                                : ''
                        }


                    </div>


                </div>



                <!-- ==============================
                     CTA
                     ============================== -->

                <div class="career-decision-card__footer">


                    <span>

                        この選択を詳しく見る

                    </span>


                    <span aria-hidden="true">

                        →

                    </span>


                </div>


            </article>

        `;


        return li;

    }


    /* =====================================================
       DILEMMA GROUP LABEL
       ===================================================== */

    function getDilemmaGroupLabel(
        decision,
        preferredGroupKey
    ) {

        const groups =
            Array.isArray(
                decision?.dilemma_groups
            )

                ? decision.dilemma_groups

                : [];


        /*
         * ユーザーが迷いフィルターを
         * 選んでいる場合はそれを優先。
         */

        if (
            preferredGroupKey
        ) {

            const preferred =
                groups.find(
                    group =>
                        normalizeDisplayText(
                            group?.key
                        )
                        ===
                        preferredGroupKey
                );


            if (
                preferred
            ) {

                return (

                    normalizeDisplayText(
                        preferred.label
                    )

                    ||

                    DILEMMA_GROUP_LABELS[
                        preferredGroupKey
                    ]

                    ||

                    ''

                );

            }

        }


        /*
         * 未選択ならPrimary Group
         */

        const primaryKey =
            normalizeDisplayText(
                decision
                    ?.primary_dilemma_group
                    ?.key
            );


        return (

            normalizeDisplayText(
                decision
                    ?.primary_dilemma_group
                    ?.label
            )

            ||

            DILEMMA_GROUP_LABELS[
                primaryKey
            ]

            ||

            ''

        );

    }


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


    /* =====================================================
       COMPACT CAREER JOURNEY
       ===================================================== */

    function buildCompactJourneyText(
        stages
    ) {

        const companies =
            (
                Array.isArray(
                    stages
                )

                    ? stages

                    : []
            )

                .filter(
                    stage =>
                        stage?.type ===
                        'company'
                )

                .map(
                    stage =>
                        normalizeDisplayText(
                            stage?.stage
                        )
                            .replace(
                                /\s*入社$/,
                                ''
                            )
                )

                .filter(
                    Boolean
                );


        if (
            !companies.length
        ) {

            return '';

        }


        const uniqueCompanies =
            [
                ...new Set(
                    companies
                )
            ];


        const displayCompanies =
            uniqueCompanies.length <=
            3

                ? uniqueCompanies

                : [

                    uniqueCompanies[
                        0
                    ],

                    uniqueCompanies[
                        Math.floor(
                            uniqueCompanies.length
                            /
                            2
                        )
                    ],

                    uniqueCompanies[
                        uniqueCompanies.length
                        -
                        1
                    ]

                ];


        return (
            displayCompanies.join(
                ' → '
            )
        );

    }


    /* =====================================================
       NORMAL CARD
       既存通常一覧を維持
       ===================================================== */

    function createStandardCareerCard(
        career
    ) {

        const li =
            createInteractiveListItem(
                career
            );


        li.className =
            'career-story-card career-story-card--gps';


        const initial =
            getInitial(
                career.name
            );


        const ageText =
            getAgeGroup(
                career.age
            )
            ||
            '年齢非公開';


        const decision =
            career.decision
            ||
            {};


        const decisionType =
            normalizeDisplayText(
                decision.decision_type
            );


        const decisionHook =
            getDilemmaText(
                decision
            );


        const priorityText =
            normalizeDisplayText(
                decision.priority_text
            );


        const hasDecision =
            Boolean(

                decisionType

                ||

                decisionHook

                ||

                priorityText

            );


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
                                    career.profession
                                    ||
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
                                                    createExcerpt(
                                                        decisionHook,
                                                        90
                                                    )
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
                                                        createExcerpt(
                                                            priorityText,
                                                            70
                                                        )
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


        return li;

    }


    /* =====================================================
       INTERACTIVE CARD
       ===================================================== */

    function createInteractiveListItem(
        career
    ) {

        const li =
            document.createElement(
                'li'
            );


        li.tabIndex =
            0;


        li.setAttribute(
            'role',
            'link'
        );


        const navigate =
            () => {

                trackStoryClick(
                    career
                );


                window.location.href =
                    createCareerDetailUrl(
                        career
                    );

            };


        li.addEventListener(
            'click',
            navigate
        );


        li.addEventListener(
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


        return li;

    }


    /* =====================================================
       CAREER JOURNEY
       通常一覧用
       ===================================================== */

    function buildCareerGpsJourneyHTML(
        stages
    ) {

        if (
            !Array.isArray(
                stages
            )
            ||
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


                    ${
                        displayStages

                            .map(
                                (
                                    stage,
                                    index
                                ) => `


                                    <div class="career-gps-journey__item">


                                        <span class="career-gps-journey__year">

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
                            )

                            .join('')
                    }


                </div>


            </div>

        `;

    }


    function simplifyCareerGpsJourneyStage(
        stage
    ) {

        const normalized =
            normalizeDisplayText(
                stage
            )

                .replace(
                    /\s+/g,
                    ' '
                )

                .trim();


        if (
            normalized.length <=
            17
        ) {

            return normalized;

        }


        return `${
            normalized.slice(
                0,
                17
            )
        }…`;

    }


    function reduceTimelineStages(
        stages
    ) {

        if (
            stages.length <=
            4
        ) {

            return stages;

        }


        return [

            stages[
                0
            ],


            stages[
                Math.floor(
                    stages.length
                    /
                    3
                )
            ],


            stages[
                Math.floor(
                    stages.length
                    *
                    2
                    /
                    3
                )
            ],


            stages[
                stages.length
                -
                1
            ]

        ];

    }


    /* =====================================================
       CARD HELPERS
       ===================================================== */

    function getInitial(
        name
    ) {

        const text =
            normalizeDisplayText(
                name
            );


        if (
            !text
        ) {

            return '?';

        }


        return (
            text
                .charAt(
                    0
                )
                .toUpperCase()
        );

    }


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
                number
                /
                10
            )
            *
            10
        }代`;

    }


    /* =====================================================
       EXCERPT
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


        if (
            !text
        ) {

            return '';

        }


        const characters =
            Array.from(
                text
            );


        if (
            characters.length <=
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
            bestIndex >=
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
       DETAIL URL
       ===================================================== */

    function createCareerDetailUrl(
        career
    ) {

        const params =
            new URLSearchParams();


        params.set(
            'id',
            String(
                career.id
            )
        );


        const decisionId =
            career
                ?.decision
                ?.id;


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


        if (
            pageTheme
        ) {

            params.set(
                'theme',
                pageTheme
            );

        }


        return (
            'Career_detail.html?'
            +
            params.toString()
        );

    }


    /* =====================================================
       PAGINATION
       ===================================================== */

    function renderPagination() {

        if (
            !paginationContainer
        ) {

            return;

        }


        paginationContainer.innerHTML =
            '';


        const totalPages =
            Math.ceil(
                filteredCareers.length
                /
                ITEMS_PER_PAGE
            );


        if (
            totalPages <=
            1
        ) {

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
            currentPage ===
            1;


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
            currentPage ===
            totalPages;


        prev.addEventListener(
            'click',
            () => {

                if (
                    currentPage <=
                    1
                ) {

                    return;

                }


                currentPage--;


                render();


                scrollToStorySection();

            }
        );


        next.addEventListener(
            'click',
            () => {

                if (
                    currentPage >=
                    totalPages
                ) {

                    return;

                }


                currentPage++;


                render();


                scrollToStorySection();

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

        if (
            !resultCount
        ) {

            return;

        }


        resultCount.textContent =
            `${filteredCareers.length}件のCareer Story`;

    }


    /* =====================================================
       EVENTS
       DILEMMA
       ===================================================== */

    dilemmaButtons.forEach(
        button => {

            button.addEventListener(
                'click',
                () => {

                    dilemmaButtons.forEach(
                        item => {

                            item.classList.remove(
                                'active'
                            );

                        }
                    );


                    button.classList.add(
                        'active'
                    );


                    selectedDilemmaGroup =
                        button
                            .dataset
                            .dilemmaGroup
                        ||
                        '';


                    trackFilterEvent(
                        'career_overview_dilemma_filter',
                        {

                            dilemma_group:
                                selectedDilemmaGroup
                                ||
                                'all'

                        }
                    );


                    applyFilters();

                }
            );

        }
    );


    /* =====================================================
       EVENTS
       DECISION PATH
       ===================================================== */

    decisionPathButtons.forEach(
        button => {

            button.addEventListener(
                'click',
                () => {

                    decisionPathButtons.forEach(
                        item => {

                            item.classList.remove(
                                'active'
                            );

                        }
                    );


                    button.classList.add(
                        'active'
                    );


                    selectedDecisionPath =
                        button
                            .dataset
                            .decisionPath
                        ||
                        '';


                    trackFilterEvent(
                        'career_overview_choice_filter',
                        {

                            decision_path:
                                selectedDecisionPath
                                ||
                                'all'

                        }
                    );


                    applyFilters();

                }
            );

        }
    );


    /* =====================================================
       EVENTS
       NORMAL SEARCH
       ===================================================== */

    searchInput
        ?.addEventListener(
            'input',
            applyFilters
        );


    industryFilter
        ?.addEventListener(
            'change',
            applyFilters
        );


    ageFilter
        ?.addEventListener(
            'change',
            applyFilters
        );


    incomeFilter
        ?.addEventListener(
            'change',
            applyFilters
        );


    themeButtons.forEach(
        button => {

            button.addEventListener(
                'click',
                () => {

                    themeButtons.forEach(
                        chip => {

                            chip.classList.remove(
                                'active'
                            );

                        }
                    );


                    button.classList.add(
                        'active'
                    );


                    selectedTheme =
                        button
                            .dataset
                            .theme
                        ||
                        '';


                    applyFilters();

                }
            );

        }
    );


    resetButton
        ?.addEventListener(
            'click',
            () => {

                if (
                    searchInput
                ) {

                    searchInput.value =
                        '';

                }


                if (
                    industryFilter
                ) {

                    industryFilter.value =
                        '';

                }


                if (
                    ageFilter
                ) {

                    ageFilter.value =
                        '';

                }


                if (
                    incomeFilter
                ) {

                    incomeFilter.value =
                        '';

                }


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


    /* =====================================================
       ANALYTICS
       ===================================================== */

    function trackFilterEvent(
        eventName,
        parameters
    ) {

        if (
            typeof gtag !==
            'function'
        ) {

            return;

        }


        gtag(
            'event',
            eventName,
            {

                page_type:
                    'career_overview',

                theme:
                    pageTheme
                    ||
                    'all',

                ...parameters

            }
        );

    }


    function trackStoryClick(
        career
    ) {

        if (
            typeof gtag !==
            'function'
        ) {

            return;

        }


        const path =
            getDecisionPath(
                career?.decision
                ||
                {}
            );


        gtag(
            'event',
            'career_story_click',
            {

                page_type:
                    'career_overview',

                theme:
                    pageTheme
                    ||
                    'all',

                dilemma_group:
                    selectedDilemmaGroup
                    ||
                    '',

                decision_path:
                    path.key
                    ||
                    '',

                career_id:
                    career?.id
                    ||
                    '',

                decision_id:
                    career
                        ?.decision
                        ?.id
                    ||
                    ''

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


        if (
            !text
        ) {

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


    /* =====================================================
       ESCAPE
       ===================================================== */

    function escapeHTML(
        value
    ) {

        return String(
            value
            ??
            ''
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

});