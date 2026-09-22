/* =========================================================
   IMNORMAL
   CAREER GPS HOME
   home.js
   ========================================================= */

   document.addEventListener(
    'DOMContentLoaded',
    function () {

        /* =================================================
           01. INITIALIZE
           ================================================= */

        fetchAnnouncements();

        initializeHeroDecisionStart();

        initializeDilemmaAnalytics();

        initializeSelfCheck();

        initializeMyCareerGPSAnalytics();

        initializeSignupAnalytics();

        initializeHeaderRegisterAnalytics();

        initializeHowToUseVisibility();

        trackHomeView();

        initializeScrollDepthTracking();

    }
);



/* =========================================================
   02. HERO
   「転職するか、今の会社に残るか」
   → Decision Experience
   ========================================================= */

function initializeHeroDecisionStart() {

    const primary =
        document.querySelector(
            '.home-decision-start__primary'
        );


    if (!primary) {
        return;
    }


    primary.addEventListener(
        'click',
        function (event) {

            const targetSelector =
                primary.getAttribute(
                    'href'
                );


            /*
             * #から始まるページ内リンクだけ
             * JSでスムーズ移動する。
             */
            if (
                targetSelector
                &&
                targetSelector.startsWith(
                    '#'
                )
            ) {

                const target =
                    document.querySelector(
                        targetSelector
                    );


                if (target) {

                    event.preventDefault();


                    target.scrollIntoView({
                        behavior:
                            prefersReducedMotion()
                                ? 'auto'
                                : 'smooth',

                        block:
                            'start'
                    });

                }

            }


            /*
             * GA4
             */
            if (
                typeof gtag
                ===
                'function'
            ) {

                gtag(
                    'event',
                    'career_decision_start',
                    {

                        page_type:
                            'career_home',

                        theme:
                            primary.dataset
                                .dilemmaTheme
                            ||
                            'change',

                        entry_point:
                            'hero_primary'

                    }
                );

            }

        }
    );

}



/* =========================================================
   03. DILEMMA LINKS
   ========================================================= */

function initializeDilemmaAnalytics() {

    document
        .querySelectorAll(
            '[data-dilemma-theme]'
        )
        .forEach(
            link => {

                /*
                 * HeroメインCTAは
                 * career_decision_startで
                 * 別途計測している。
                 *
                 * career_dilemma_clickも残すことで、
                 * 既存分析との互換を維持する。
                 */
                link.addEventListener(
                    'click',
                    function () {

                        if (
                            typeof gtag
                            !==
                            'function'
                        ) {
                            return;
                        }


                        let sectionName =
                            'other';


                        if (
                            link.closest(
                                '.home-hero'
                            )
                        ) {

                            sectionName =
                                'hero';

                        } else if (
                            link.closest(
                                '.home-explore-section'
                            )
                        ) {

                            sectionName =
                                'explore';

                        } else if (
                            link.closest(
                                '.home-decision-experience'
                            )
                        ) {

                            sectionName =
                                'decision_experience';

                        }


                        gtag(
                            'event',
                            'career_dilemma_click',
                            {

                                event_category:
                                    'engagement',

                                page_type:
                                    'career_home',

                                theme:
                                    link.dataset
                                        .dilemmaTheme
                                    ||
                                    '',

                                section_name:
                                    sectionName

                            }
                        );

                    }
                );

            }
        );

}



/* =========================================================
   04. YOUR DECISION
   「今のあなたが大切にしたいもの」
   ========================================================= */

function initializeSelfCheck() {

    const selfCheck =
        document.getElementById(
            'home-self-check'
        );


    if (!selfCheck) {
        return;
    }


    const buttons =
        Array.from(
            selfCheck.querySelectorAll(
                '[data-self-priority]'
            )
        );


    if (!buttons.length) {
        return;
    }


    buttons.forEach(
        button => {

            button.addEventListener(
                'click',
                function () {

                    const currentlySelected =
                        button.getAttribute(
                            'aria-pressed'
                        )
                        ===
                        'true';


                    const nextSelected =
                        !currentlySelected;


                    button.setAttribute(
                        'aria-pressed',
                        nextSelected
                            ? 'true'
                            : 'false'
                    );


                    button.classList.toggle(
                        'is-selected',
                        nextSelected
                    );


                    const selectedValues =
                        getSelectedSelfPriorities(
                            selfCheck
                        );


                    /*
                     * GA4
                     *
                     * DB保存はまだしない。
                     */
                    if (
                        typeof gtag
                        ===
                        'function'
                    ) {

                        gtag(
                            'event',
                            'career_self_priority_click',
                            {

                                page_type:
                                    'career_home',

                                priority:
                                    button.dataset
                                        .selfPriority
                                    ||
                                    '',

                                action:
                                    nextSelected
                                        ? 'select'
                                        : 'unselect',

                                selected_count:
                                    selectedValues
                                        .length,

                                selected_priorities:
                                    selectedValues
                                        .join(',')

                            }
                        );

                    }

                }
            );

        }
    );


    /*
     * My Career GPS CTA
     */
    const myGpsLink =
        selfCheck.querySelector(
            'a[href="Mypage.html"]'
        );


    if (myGpsLink) {

        myGpsLink.addEventListener(
            'click',
            function () {

                const selectedValues =
                    getSelectedSelfPriorities(
                        selfCheck
                    );


                if (
                    typeof gtag
                    ===
                    'function'
                ) {

                    gtag(
                        'event',
                        'career_self_check_continue',
                        {

                            page_type:
                                'career_home',

                            selected_count:
                                selectedValues
                                    .length,

                            selected_priorities:
                                selectedValues
                                    .join(',')

                        }
                    );

                }

            }
        );

    }

}



/* =========================================================
   05. SELECTED PRIORITIES
   ========================================================= */

function getSelectedSelfPriorities(
    container
) {

    if (!container) {
        return [];
    }


    return Array
        .from(
            container.querySelectorAll(
                '[data-self-priority][aria-pressed="true"]'
            )
        )
        .map(
            button =>
                button.dataset
                    .selfPriority
        )
        .filter(
            Boolean
        );

}



/* =========================================================
   06. MY CAREER GPS
   Home下部
   ========================================================= */

function initializeMyCareerGPSAnalytics() {

    const section =
        document.querySelector(
            '.home-my-gps-section'
        );


    if (!section) {
        return;
    }


    const link =
        section.querySelector(
            'a[href="Mypage.html"]'
        );


    if (!link) {
        return;
    }


    link.addEventListener(
        'click',
        function () {

            if (
                typeof gtag
                !==
                'function'
            ) {
                return;
            }


            gtag(
                'event',
                'my_career_gps_click',
                {

                    page_type:
                        'career_home',

                    section_name:
                        'my_career_gps'

                }
            );

        }
    );

}



/* =========================================================
   07. SIGNUP CTA
   ========================================================= */

function initializeSignupAnalytics() {

    document
        .querySelectorAll(
            '.cta-button'
        )
        .forEach(
            button => {

                button.addEventListener(
                    'click',
                    function () {

                        if (
                            typeof gtag
                            !==
                            'function'
                        ) {
                            return;
                        }


                        let sectionName =
                            'home';


                        if (
                            button.closest(
                                '.career-story-preview-area'
                            )
                        ) {

                            sectionName =
                                'career_story_preview';

                        } else if (
                            button.closest(
                                '.home-share-section'
                            )
                        ) {

                            sectionName =
                                'share_your_story';

                        }


                        gtag(
                            'event',
                            'signup_cta_click',
                            {

                                event_category:
                                    'engagement',

                                event_label:
                                    'ホームCTA',

                                page_type:
                                    'career_home',

                                section_name:
                                    sectionName

                            }
                        );

                    }
                );

            }
        );

}



/* =========================================================
   08. HEADER REGISTER
   ========================================================= */

function initializeHeaderRegisterAnalytics() {

    const headerRegister =
        document.querySelector(
            '.header-register-btn'
        );


    if (!headerRegister) {
        return;
    }


    headerRegister.addEventListener(
        'click',
        function () {

            if (
                typeof gtag
                !==
                'function'
            ) {
                return;
            }


            gtag(
                'event',
                'click_register_cta_header',
                {

                    event_category:
                        'engagement',

                    event_label:
                        'header_register',

                    page_type:
                        'career_home'

                }
            );

        }
    );

}



/* =========================================================
   09. HOW TO USE

   未ログイン：
       表示

   ログイン済み：
       非表示

   APIが失敗した場合：
       未ログイン扱いとして表示を維持する。

   ※ local 127.0.0.1 では401になるため、
      表示されたままで正常。
   ========================================================= */

async function initializeHowToUseVisibility() {

    const section =
        document.getElementById(
            'home-how-to-use'
        );


    if (!section) {
        return;
    }


    /*
     * HTMLの初期状態は表示。
     *
     * JS実行前に一瞬消えるのを防ぐ。
     */
    section.hidden =
        false;


    try {

        const response =
            await fetch(
                '/check-login-status/',
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
         * 既存仕様では
         * response.ok = login済み
         * として扱う。
         */
        const isLoggedIn =
            response.ok;


        if (isLoggedIn) {

            section.hidden =
                true;

        } else {

            section.hidden =
                false;

        }


    } catch (error) {

        /*
         * 認証確認失敗だけで
         * Home表示を壊さない。
         *
         * 未ログイン向けHOW TO USEを
         * そのまま残す。
         */
        section.hidden =
            false;

    }

}



/* =========================================================
   10. HOME VIEW
   ========================================================= */

function trackHomeView() {

    if (
        typeof gtag
        !==
        'function'
    ) {
        return;
    }


    gtag(
        'event',
        'career_home_view',
        {

            event_category:
                'engagement',

            page_type:
                'career_home',

            home_version:
                'decision_gps'

        }
    );

}



/* =========================================================
   11. SCROLL DEPTH
   25 / 50 / 75 / 100
   ========================================================= */

function initializeScrollDepthTracking() {

    const depths = [
        25,
        50,
        75,
        100
    ];


    const tracked =
        {};


    function trackScrollDepth() {

        const documentElement =
            document.documentElement;


        const scrollTop =
            window.scrollY
            ||
            documentElement
                .scrollTop;


        const viewportBottom =
            scrollTop
            +
            window.innerHeight;


        const pageHeight =
            Math.max(
                document.body
                    .scrollHeight,

                documentElement
                    .scrollHeight
            );


        if (!pageHeight) {
            return;
        }


        const scrollPercentage =
            Math.min(
                100,
                (
                    viewportBottom
                    /
                    pageHeight
                )
                *
                100
            );


        depths.forEach(
            depth => {

                if (
                    scrollPercentage
                    >=
                    depth
                    &&
                    !tracked[
                        depth
                    ]
                ) {

                    tracked[
                        depth
                    ] =
                        true;


                    if (
                        typeof gtag
                        ===
                        'function'
                    ) {

                        gtag(
                            'event',
                            `scroll_${depth}`,
                            {

                                event_category:
                                    'engagement',

                                event_label:
                                    `ホームスクロール${depth}%`,

                                page_type:
                                    'career_home',

                                home_version:
                                    'decision_gps'

                            }
                        );

                    }

                }

            }
        );

    }


    window.addEventListener(
        'scroll',
        trackScrollDepth,
        {
            passive:
                true
        }
    );


    /*
     * 読み込み直後にも確認。
     */
    trackScrollDepth();

}



/* =========================================================
   12. ANNOUNCEMENTS
   ========================================================= */

function fetchAnnouncements() {

    const list =
        document.getElementById(
            'announcements-list'
        );


    if (!list) {
        return;
    }


    /*
     * 読込中
     */
    list.innerHTML = `

        <p class="announcement-empty">

            お知らせを読み込んでいます。

        </p>

    `;


    fetch(
        '/announcements/',
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
    )


        .then(
            response => {

                if (!response.ok) {

                    throw new Error(
                        `HTTP ${response.status}`
                    );

                }


                return response.json();

            }
        )


        .then(
            data => {

                const announcements =
                    Array.isArray(
                        data.announcements
                    )

                        ? data.announcements

                        : [];


                list.innerHTML =
                    '';


                /*
                 * お知らせなし
                 */
                if (
                    announcements.length
                    ===
                    0
                ) {

                    renderAnnouncementMessage(
                        list,
                        '現在お知らせはありません。'
                    );

                    return;

                }


                /*
                 * Homeは最新3件のみ。
                 */
                announcements

                    .slice(
                        0,
                        3
                    )

                    .forEach(
                        item => {

                            const row =
                                createAnnouncementRow(
                                    item
                                );


                            list.appendChild(
                                row
                            );

                        }
                    );

            }
        )


        .catch(
            error => {

                console.error(
                    'お知らせ取得エラー:',
                    error
                );


                /*
                 * Home全体を壊さない。
                 */
                renderAnnouncementMessage(
                    list,
                    'お知らせを読み込めませんでした。'
                );

            }
        );

}



/* =========================================================
   13. ANNOUNCEMENT ROW
   ========================================================= */

function createAnnouncementRow(
    item
) {

    const row =
        document.createElement(
            'a'
        );


    row.className =
        'announcement-item';


    const id =
        item?.id
        ??
        '';


    row.href =
        `Announcements.html?id=${
            encodeURIComponent(
                id
            )
        }`;


    /*
     * Date
     */
    const date =
        document.createElement(
            'span'
        );


    date.className =
        'announcement-date';


    date.textContent =
        formatAnnouncementDate(
            item?.timestamp
        );


    /*
     * Category
     */
    const category =
        document.createElement(
            'span'
        );


    category.className =
        'announcement-category';


    category.textContent =
        'NEWS';


    /*
     * Title
     */
    const title =
        document.createElement(
            'span'
        );


    title.className =
        'announcement-title';


    title.textContent =
        item?.title
        ||
        'お知らせ';


    /*
     * Arrow
     */
    const arrow =
        document.createElement(
            'span'
        );


    arrow.className =
        'announcement-arrow';


    arrow.setAttribute(
        'aria-hidden',
        'true'
    );


    arrow.textContent =
        '→';


    row.append(
        date,
        category,
        title,
        arrow
    );


    return row;

}



/* =========================================================
   14. ANNOUNCEMENT DATE
   ========================================================= */

function formatAnnouncementDate(
    timestamp
) {

    if (!timestamp) {
        return '';
    }


    const dateObject =
        new Date(
            timestamp
        );


    if (
        Number.isNaN(
            dateObject
                .getTime()
        )
    ) {

        return '';

    }


    return (

        `${dateObject.getFullYear()}.`

        +

        `${String(
            dateObject.getMonth()
            +
            1
        ).padStart(
            2,
            '0'
        )}.`

        +

        `${String(
            dateObject.getDate()
        ).padStart(
            2,
            '0'
        )}`

    );

}



/* =========================================================
   15. ANNOUNCEMENT MESSAGE
   ========================================================= */

function renderAnnouncementMessage(
    list,
    message
) {

    if (!list) {
        return;
    }


    const empty =
        document.createElement(
            'p'
        );


    empty.className =
        'announcement-empty';


    empty.textContent =
        message;


    list.innerHTML =
        '';


    list.appendChild(
        empty
    );

}



/* =========================================================
   16. REDUCED MOTION
   ========================================================= */

function prefersReducedMotion() {

    return (

        typeof window.matchMedia
        ===
        'function'

        &&

        window
            .matchMedia(
                '(prefers-reduced-motion: reduce)'
            )
            .matches

    );

}