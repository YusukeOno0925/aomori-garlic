document.addEventListener(
    'DOMContentLoaded',
    () => {
        loadPopularStories();
    }
);


/* =========================================================
   CONFIG
========================================================= */

const POPULAR_STORIES_API =
    '/popular-career-stories/';

const POPULAR_STORIES_LIMIT =
    6;

const POPULAR_TIMELINE_LIMIT =
    4;


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


    try {

        const response =
            await fetch(
                POPULAR_STORIES_API,
                {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Accept':
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


        const rawStories =
            Array.isArray(data?.careers)
                ? data.careers
                : Array.isArray(data)
                    ? data
                    : [];


        const stories =
            rawStories
                .map(normalizePopularStory)
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
            list,
            indicators
        );


    } catch (error) {

        console.error(
            '人気Career Story取得エラー:',
            error
        );


        renderPopularStoriesError(
            list,
            indicators
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
        || {};


    const careerStages =
        normalizeCareerStages(
            career?.careerStages
            || career?.career_stages
            || []
        );


    return {

        id:
            career?.id
            ?? career?.user_id
            ?? null,


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


        careerStages:
            reduceCareerStages(
                careerStages,
                POPULAR_TIMELINE_LIMIT
            ),


        decision: {

            type:
                firstNonEmpty(
                    decision?.decision_type,
                    decision?.type,
                    decision?.category,
                    ''
                ),


            hook:
                firstNonEmpty(
                    decision?.dilemma_text,
                    decision?.title,
                    decision?.trigger_text,
                    decision?.decision_text,
                    ''
                ),


            priority:
                firstNonEmpty(
                    decision?.priority_text,
                    decision?.priority,
                    decision?.important_point,
                    ''
                )

        }

    };

}


/* =========================================================
   CAREER STAGES
========================================================= */

function normalizeCareerStages(
    stages
) {

    if (!Array.isArray(stages)) {
        return [];
    }


    const normalized =
        stages
            .map(
                stage => {

                    if (
                        stage === null
                        ||
                        stage === undefined
                    ) {
                        return null;
                    }


                    if (
                        typeof stage === 'string'
                    ) {

                        return {
                            year: '',
                            stage: stage.trim()
                        };

                    }


                    const year =
                        firstNonEmpty(
                            stage?.year,
                            stage?.startYear,
                            stage?.start_year,
                            ''
                        );


                    const text =
                        firstNonEmpty(
                            stage?.stage,
                            stage?.label,
                            stage?.name,
                            stage?.company,
                            stage?.company_name,
                            ''
                        );


                    if (!text) {
                        return null;
                    }


                    return {
                        year:
                            String(year || ''),
                        stage:
                            String(text)
                    };

                }
            )
            .filter(Boolean);


    /*
     * API側で
     * education → job experience
     * の時系列順に返しているため、
     * frontendでは順番を変更しない。
     *
     * 同一内容だけ重複排除する。
     */

    const result = [];
    const seen = new Set();


    normalized.forEach(
        item => {

            const key =
                `${item.year}__${item.stage}`;


            if (seen.has(key)) {
                return;
            }


            seen.add(key);

            result.push(item);

        }
    );


    return result;

}


/* =========================================================
   REDUCE TIMELINE
========================================================= */

function reduceCareerStages(
    stages,
    limit = 4
) {

    if (!Array.isArray(stages)) {
        return [];
    }


    if (
        stages.length
        <= limit
    ) {
        return stages;
    }


    /*
     * 5件以上ある場合も、
     * Career Journey全体の形を残す。
     *
     * 4件表示の場合：
     *   最初
     *   中間1
     *   中間2
     *   最新
     *
     * 単純に先頭4件を切り取らない。
     */

    const lastIndex =
        stages.length - 1;


    const indexes =
        [
            0,
            Math.round(
                lastIndex / 3
            ),
            Math.round(
                lastIndex * 2 / 3
            ),
            lastIndex
        ];


    const uniqueIndexes =
        [
            ...new Set(indexes)
        ];


    return uniqueIndexes
        .map(
            index =>
                stages[index]
        )
        .filter(Boolean);

}


/* =========================================================
   RENDER
========================================================= */

function renderPopularStories(
    stories,
    list,
    indicators
) {

    list.innerHTML = '';


    if (indicators) {
        indicators.innerHTML = '';
    }


    if (!stories.length) {

        list.innerHTML = `
            <p class="announcement-empty">
                現在、表示できるCareer Storyはありません。
            </p>
        `;

        return;

    }


    stories.forEach(
        (
            story,
            index
        ) => {

            const card =
                createPopularStoryCard(
                    story,
                    index
                );


            list.appendChild(card);

        }
    );


    setupPopularCarouselIndicators(
        list,
        indicators,
        stories.length
    );

}


/* =========================================================
   CREATE CARD
========================================================= */

function createPopularStoryCard(
    story,
    index
) {

    const card =
        document.createElement(
            'article'
        );


    card.className =
        'home-career-card';


    card.setAttribute(
        'tabindex',
        '0'
    );


    card.setAttribute(
        'role',
        'link'
    );


    card.setAttribute(
        'aria-label',
        `${story.name}さんのCareer Storyを見る`
    );


    const initial =
        getInitial(
            story.name
        );


    const metaHTML =
        buildPersonMetaHTML(
            story
        );


    const timelineHTML =
        buildPopularTimelineHTML(
            story.careerStages
        );


    const decisionHTML =
        buildPopularDecisionHTML(
            story.decision
        );


    card.innerHTML = `

        <div class="home-career-card__top">

            <div
                class="home-career-avatar"
                aria-hidden="true"
            >
                ${escapeHTML(initial)}
            </div>


            <div class="home-career-person">

                ${
                    metaHTML
                        ? `
                            <p class="home-career-person__meta">
                                ${metaHTML}
                            </p>
                        `
                        : ''
                }


                <h3>
                    ${escapeHTML(story.name)}
                </h3>

            </div>

        </div>


        ${timelineHTML}


        ${decisionHTML}


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

            trackPopularCareerStoryClick(
                story.id,
                index + 1
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


/* =========================================================
   PERSON META
========================================================= */

function buildPersonMetaHTML(
    story
) {

    const values = [];


    if (story.age) {

        values.push(
            `<span>${escapeHTML(story.age)}</span>`
        );

    }


    if (story.profession) {

        values.push(
            `<span>${escapeHTML(story.profession)}</span>`
        );

    }


    return values.join('');

}


/* =========================================================
   CAREER JOURNEY
========================================================= */

function buildPopularTimelineHTML(
    stages
) {

    if (
        !Array.isArray(stages)
        ||
        !stages.length
    ) {

        /*
         * Career Journeyが無い場合に
         * 「キャリア情報を見る」のような
         * 疑似データは表示しない。
         *
         * 情報が無いものは無理に作らない。
         */

        return '';

    }


    const itemsHTML =
        stages
            .map(
                (
                    stage,
                    index
                ) => {

                    const isCurrent =
                        index
                        ===
                        stages.length - 1;


                    return `

                        <div
                            class="home-career-timeline__item"
                        >

                            <span
                                class="home-career-timeline__year"
                            >
                                ${
                                    escapeHTML(
                                        stage.year
                                        || ''
                                    )
                                }
                            </span>


                            <span
                                class="
                                    home-career-timeline__dot
                                    ${
                                        isCurrent
                                            ? 'is-current'
                                            : ''
                                    }
                                "
                                aria-hidden="true"
                            >
                            </span>


                            <span
                                class="home-career-timeline__stage"
                            >
                                ${
                                    escapeHTML(
                                        stage.stage
                                    )
                                }
                            </span>

                        </div>

                    `;

                }
            )
            .join('');


    return `

        <div class="career-preview-journey">

            <p class="career-preview-journey__label">
                CAREER JOURNEY
            </p>


            <div class="home-career-timeline">

                <div class="home-career-timeline__track">

                    ${itemsHTML}

                </div>

            </div>

        </div>

    `;

}


/* =========================================================
   CAREER DECISION
========================================================= */

function buildPopularDecisionHTML(
    decision
) {

    if (!decision) {
        return '';
    }


    const decisionType =
        firstNonEmpty(
            decision.type,
            ''
        );


    const decisionHook =
        firstNonEmpty(
            decision.hook,
            ''
        );


    const priority =
        firstNonEmpty(
            decision.priority,
            ''
        );


    /*
     * StoryはあるがDecisionが未登録の場合、
     * 架空の文章は作らない。
     */

    if (
        !decisionType
        &&
        !decisionHook
        &&
        !priority
    ) {

        return '';

    }


    return `

        <div class="career-preview-decision">

            <div
                class="career-preview-decision__heading"
            >

                <span>
                    CAREER DECISION
                </span>


                ${
                    decisionType
                        ? `
                            <strong>
                                ${
                                    escapeHTML(
                                        decisionType
                                    )
                                }
                            </strong>
                        `
                        : ''
                }

            </div>


            ${
                decisionHook
                    ? `
                        <p
                            class="
                                career-preview-decision__hook
                            "
                        >
                            ${
                                escapeHTML(
                                    decisionHook
                                )
                            }
                        </p>
                    `
                    : ''
            }


            ${
                priority
                    ? `

                        <div
                            class="career-preview-priority"
                        >

                            <span>
                                重視したこと
                            </span>


                            <p>
                                ${
                                    escapeHTML(
                                        priority
                                    )
                                }
                            </p>

                        </div>

                    `
                    : ''
            }

        </div>

    `;

}


/* =========================================================
   CAROUSEL INDICATORS
========================================================= */

function setupPopularCarouselIndicators(
    list,
    indicators,
    itemCount
) {

    if (!indicators) {
        return;
    }


    indicators.innerHTML = '';


    /*
     * Desktop / Tabletではgridなので
     * indicatorは不要。
     *
     * Mobileだけ横スワイプになるため表示する。
     */

    const mobile =
        window.matchMedia(
            '(max-width: 700px)'
        );


    const render =
        () => {

            indicators.innerHTML = '';


            if (
                !mobile.matches
                ||
                itemCount <= 1
            ) {

                indicators.style.display =
                    'none';

                return;

            }


            indicators.style.display =
                'flex';


            for (
                let index = 0;
                index < itemCount;
                index += 1
            ) {

                const dot =
                    document.createElement(
                        'button'
                    );


                dot.type =
                    'button';


                dot.setAttribute(
                    'aria-label',
                    `${index + 1}件目のCareer Storyへ`
                );


                if (index === 0) {

                    dot.classList.add(
                        'active'
                    );

                }


                dot.addEventListener(
                    'click',
                    () => {

                        const cards =
                            list.querySelectorAll(
                                '.home-career-card'
                            );


                        const target =
                            cards[index];


                        if (!target) {
                            return;
                        }


                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'nearest',
                            inline: 'start'
                        });

                    }
                );


                indicators.appendChild(
                    dot
                );

            }

        };


    const updateActiveIndicator =
        () => {

            if (!mobile.matches) {
                return;
            }


            const cards =
                Array.from(
                    list.querySelectorAll(
                        '.home-career-card'
                    )
                );


            const dots =
                Array.from(
                    indicators.children
                );


            if (
                !cards.length
                ||
                !dots.length
            ) {
                return;
            }


            const listRect =
                list.getBoundingClientRect();


            let closestIndex = 0;
            let closestDistance =
                Number.POSITIVE_INFINITY;


            cards.forEach(
                (
                    card,
                    index
                ) => {

                    const rect =
                        card.getBoundingClientRect();


                    const distance =
                        Math.abs(
                            rect.left
                            -
                            listRect.left
                        );


                    if (
                        distance
                        <
                        closestDistance
                    ) {

                        closestDistance =
                            distance;

                        closestIndex =
                            index;

                    }

                }
            );


            dots.forEach(
                (
                    dot,
                    index
                ) => {

                    dot.classList.toggle(
                        'active',
                        index === closestIndex
                    );

                }
            );

        };


    render();


    list.addEventListener(
        'scroll',
        debounce(
            updateActiveIndicator,
            70
        ),
        {
            passive: true
        }
    );


    if (
        typeof mobile.addEventListener
        ===
        'function'
    ) {

        mobile.addEventListener(
            'change',
            () => {

                render();

                updateActiveIndicator();

            }
        );

    } else if (
        typeof mobile.addListener
        ===
        'function'
    ) {

        mobile.addListener(
            () => {

                render();

                updateActiveIndicator();

            }
        );

    }

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
                position

        }
    );

}


/* =========================================================
   ERROR
========================================================= */

function renderPopularStoriesError(
    list,
    indicators
) {

    if (indicators) {

        indicators.innerHTML = '';

        indicators.style.display =
            'none';

    }


    list.innerHTML = `

        <p class="announcement-empty">
            Career Storyを読み込めませんでした。
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
        String(value).trim();


    if (!text) {
        return '';
    }


    /*
     * APIが既に
     * 20代 / 30代
     * のように返している場合
     */

    if (
        text.includes('代')
    ) {
        return text;
    }


    /*
     * 数値年齢の場合
     * 31 -> 30代
     */

    const numeric =
        Number(text);


    if (
        Number.isFinite(numeric)
        &&
        numeric > 0
    ) {

        const decade =
            Math.floor(
                numeric / 10
            ) * 10;


        return `${decade}代`;

    }


    return text;

}


/* =========================================================
   INITIAL
========================================================= */

function getInitial(
    name
) {

    const value =
        String(
            name || ''
        )
            .trim();


    if (!value) {
        return '人';
    }


    const first =
        Array.from(value)[0];


    /*
     * 英数字なら大文字化。
     * 日本語の場合は先頭文字をそのまま表示。
     */

    if (
        /^[a-zA-Z]$/.test(first)
    ) {

        return first.toUpperCase();

    }


    return first;

}


/* =========================================================
   VALUE HELPERS
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
            String(value).trim();


        if (text) {
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
        ?? ''
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
   DEBOUNCE
========================================================= */

function debounce(
    func,
    wait
) {

    let timer = null;


    return function (
        ...args
    ) {

        clearTimeout(
            timer
        );


        timer =
            setTimeout(
                () => {

                    func.apply(
                        this,
                        args
                    );

                },
                wait
            );

    };

}