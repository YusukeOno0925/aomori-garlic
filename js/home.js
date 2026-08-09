document.addEventListener('DOMContentLoaded', function() {
    fetchAnnouncements();

    // ─── CTAクリックを計測 ───
   document.querySelectorAll('.cta-button').forEach(btn => {
        btn.addEventListener('click', () => {
            if (typeof gtag === 'function') {
                gtag('event', 'click_register_cta', {
                    event_category: 'engagement',
                    event_label: 'ホームCTA'
                });
            }
        });
    });

    // ヘッダーの新規登録ボタン
    const headerRegister = document.querySelector('.header-register-btn');
    if (headerRegister) {
        headerRegister.addEventListener('click', () => {
        if (typeof gtag === 'function') {
            gtag('event', 'click_register_cta_header', {
            event_category: 'engagement',
            event_label: 'header_register'
            });
        }
        });
    }
    
    // ─── スクロール深度の計測 (25% / 50% / 75% / 100%) ───
    const depths = [25,50,75,100];
    const tracked = {};
    window.addEventListener('scroll', () => {
        const scrollPct = Math.min(100,
        (window.scrollY + window.innerHeight) / document.body.scrollHeight * 100
        );
        depths.forEach(p => {
            if (scrollPct >= p && !tracked[p]) {
                tracked[p] = true;
                if (typeof gtag === 'function') {
                    gtag('event', `scroll_${p}`, {
                    event_category: 'engagement',
                    event_label: `ホームスクロール${p}%`
                    });
                }
            }
        });
    });
});

function fetchAnnouncements() {
    fetch('/announcements/')
        .then(res => res.json())
        .then(data => {
            const list = document.getElementById('announcements-list');
            if (!list) return;

            list.innerHTML = '';

            const announcements = data.announcements || [];

            if (announcements.length === 0) {
                list.innerHTML = '<p class="announcement-empty">現在お知らせはありません。</p>';
                return;
            }

            announcements
            .slice(0, 3)
            .forEach(item => {

                const dateObj =
                    new Date(
                        item.timestamp
                    );

                const formattedDate =
                    `${dateObj.getFullYear()}.` +
                    `${String(
                        dateObj.getMonth() + 1
                    ).padStart(2, '0')}.` +
                    `${String(
                        dateObj.getDate()
                    ).padStart(2, '0')}`;


                const row =
                    document.createElement(
                        'a'
                    );


                row.className =
                    'announcement-item';


                row.href =
                    `Announcements.html?id=${item.id}`;


                row.innerHTML = `

                    <span class="announcement-date">
                        ${formattedDate}
                    </span>

                    <span class="announcement-category">
                        NEWS
                    </span>

                    <span class="announcement-title">
                        ${item.title}
                    </span>

                    <span
                        class="announcement-arrow"
                        aria-hidden="true"
                    >
                        →
                    </span>

                `;


                list.appendChild(
                    row
                );

            });

        })
        .catch(e => console.error(e));
}