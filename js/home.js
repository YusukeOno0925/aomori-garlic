/* =========================================================
   CAREER GPS HOME
   home.js
   ========================================================= */

   document.addEventListener('DOMContentLoaded', function () {

    /* =====================================================
       01. お知らせ取得
       ===================================================== */

    fetchAnnouncements();


    /* =====================================================
       02. 新規登録CTAクリック
       ===================================================== */

    document
        .querySelectorAll('.cta-button')
        .forEach(button => {

            button.addEventListener('click', function () {

                if (typeof gtag !== 'function') {
                    return;
                }

                gtag(
                    'event',
                    'signup_cta_click',
                    {
                        event_category: 'engagement',
                        event_label: 'ホームCTA'
                    }
                );

            });

        });



    /* =====================================================
       03. ヘッダー新規登録クリック
       ===================================================== */

    const headerRegister =
        document.querySelector(
            '.header-register-btn'
        );


    if (headerRegister) {

        headerRegister.addEventListener(
            'click',
            function () {

                if (typeof gtag !== 'function') {
                    return;
                }

                gtag(
                    'event',
                    'click_register_cta_header',
                    {
                        event_category: 'engagement',
                        event_label: 'header_register'
                    }
                );

            }
        );

    }



    /* =====================================================
       04. 悩みテーマクリック
       ===================================================== */

    document
        .querySelectorAll(
            '[data-dilemma-theme]'
        )
        .forEach(link => {

            link.addEventListener(
                'click',
                function () {

                    if (typeof gtag !== 'function') {
                        return;
                    }


                    const sectionName =
                        link.closest('.home-hero')
                            ? 'hero'
                            : 'dilemma';


                    gtag(
                        'event',
                        'career_dilemma_click',
                        {
                            event_category:
                                'engagement',

                            theme:
                                link.dataset
                                    .dilemmaTheme || '',

                            section_name:
                                sectionName
                        }
                    );

                }
            );

        });



    /* =====================================================
       05. Home表示
       ===================================================== */

    if (typeof gtag === 'function') {

        gtag(
            'event',
            'career_home_view',
            {
                event_category:
                    'engagement'
            }
        );

    }



    /* =====================================================
       06. スクロール深度
       25 / 50 / 75 / 100
       ===================================================== */

    const depths = [
        25,
        50,
        75,
        100
    ];


    const tracked = {};


    function trackScrollDepth() {

        const documentElement =
            document.documentElement;


        const scrollTop =
            window.scrollY ||
            documentElement.scrollTop;


        const viewportBottom =
            scrollTop +
            window.innerHeight;


        const pageHeight =
            Math.max(
                document.body.scrollHeight,
                documentElement.scrollHeight
            );


        if (!pageHeight) {
            return;
        }


        const scrollPercentage =
            Math.min(
                100,
                (
                    viewportBottom /
                    pageHeight
                ) * 100
            );


        depths.forEach(
            depth => {

                if (
                    scrollPercentage >= depth &&
                    !tracked[depth]
                ) {

                    tracked[depth] =
                        true;


                    if (
                        typeof gtag ===
                        'function'
                    ) {

                        gtag(
                            'event',
                            `scroll_${depth}`,
                            {
                                event_category:
                                    'engagement',

                                event_label:
                                    `ホームスクロール${depth}%`
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
            passive: true
        }
    );


    /*
     * ページ読込時点で
     * 25%等に到達しているケースもあるため
     * 初回にも実行する。
     */
    trackScrollDepth();

});



/* =========================================================
   07. お知らせ取得
   ========================================================= */

function fetchAnnouncements() {

    fetch(
        '/announcements/'
    )

        .then(response => {

            if (!response.ok) {

                throw new Error(
                    `HTTP ${response.status}`
                );

            }


            return response.json();

        })


        .then(data => {

            const list =
                document.getElementById(
                    'announcements-list'
                );


            if (!list) {
                return;
            }


            list.innerHTML = '';


            const announcements =
                Array.isArray(
                    data.announcements
                )
                    ? data.announcements
                    : [];


            /* =============================================
               お知らせなし
               ============================================= */

            if (
                announcements.length === 0
            ) {

                const empty =
                    document.createElement(
                        'p'
                    );


                empty.className =
                    'announcement-empty';


                empty.textContent =
                    '現在お知らせはありません。';


                list.appendChild(
                    empty
                );


                return;

            }



            /* =============================================
               Homeでは最新3件
               ============================================= */

            announcements

                .slice(
                    0,
                    3
                )

                .forEach(
                    item => {


                        /* -----------------------------
                           日付
                           ----------------------------- */

                        const dateObject =
                            new Date(
                                item.timestamp
                            );


                        const formattedDate =
                            `${dateObject.getFullYear()}.` +
                            `${String(
                                dateObject.getMonth() + 1
                            ).padStart(
                                2,
                                '0'
                            )}.` +
                            `${String(
                                dateObject.getDate()
                            ).padStart(
                                2,
                                '0'
                            )}`;



                        /* -----------------------------
                           行
                           ----------------------------- */

                        const row =
                            document.createElement(
                                'a'
                            );


                        row.className =
                            'announcement-item';


                        row.href =
                            `Announcements.html?id=${encodeURIComponent(
                                item.id
                            )}`;



                        /* -----------------------------
                           日付
                           ----------------------------- */

                        const date =
                            document.createElement(
                                'span'
                            );


                        date.className =
                            'announcement-date';


                        date.textContent =
                            formattedDate;



                        /* -----------------------------
                           NEWS
                           ----------------------------- */

                        const category =
                            document.createElement(
                                'span'
                            );


                        category.className =
                            'announcement-category';


                        category.textContent =
                            'NEWS';



                        /* -----------------------------
                           タイトル
                           ----------------------------- */

                        const title =
                            document.createElement(
                                'span'
                            );


                        title.className =
                            'announcement-title';


                        title.textContent =
                            item.title || '';



                        /* -----------------------------
                           Arrow
                           ----------------------------- */

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



                        /* -----------------------------
                           DOMへ追加
                           ----------------------------- */

                        row.append(
                            date,
                            category,
                            title,
                            arrow
                        );


                        list.appendChild(
                            row
                        );

                    }
                );

        })


        .catch(error => {

            console.error(
                'お知らせ取得エラー:',
                error
            );

        });

}