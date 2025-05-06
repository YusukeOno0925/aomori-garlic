document.addEventListener('DOMContentLoaded', function() {
    fetchAnnouncements();

    // ─── CTAクリックを計測 ───
   document.querySelectorAll('.cta-button').forEach(btn => {
        btn.addEventListener('click', () => {
        gtag('event', 'click_register_cta', {
            event_category: 'engagement',
            event_label: 'ホームCTA'
        });
        });
    });
    
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
            gtag('event', `scroll_${p}`, {
            event_category: 'engagement',
            event_label: `ホームスクロール${p}%`
            });
        }
        });
    });
});

function fetchAnnouncements() {
    fetch('/announcements/')
        .then(res => res.json())
        .then(data => {
            const list = document.getElementById('announcements-list');
            list.innerHTML = '';

            data.announcements.slice(0, 6)  // たとえば最新6件
                .forEach(item => {
                    const dateObj = new Date(item.timestamp);
                    const formattedDate = `${dateObj.getFullYear()}/` +
                    `${String(dateObj.getMonth()+1).padStart(2,'0')}/` +
                    `${String(dateObj.getDate()).padStart(2,'0')} ` +
                    `${String(dateObj.getHours()).padStart(2,'0')}:` +
                    `${String(dateObj.getMinutes()).padStart(2,'0')}`;

                    const card = document.createElement('div');
                    card.className = 'announcement-item';
                    card.innerHTML = `
                    <div class="date">${formattedDate}</div>
                    <div class="title">${item.title}</div>
                    <div class="snippet">
                        ${item.content.slice(0, 80)}…
                        <a href="Announcements.html?id=${item.id}" class="read-more">続きを読む</a>
                    </div>
                    `;
                    list.appendChild(card);
                });

            // さらに多い場合は“もっと見る”ボタン
            if (data.announcements.length > 6) {
                const more = document.createElement('a');
                more.href = 'Announcements.html';
                more.textContent = 'もっと見る';
                more.className = 'read-more';
                more.style.display = 'block';
                more.style.textAlign = 'center';
                more.style.marginTop = '1rem';
                list.appendChild(more);
            }
        })
        .catch(e => console.error(e));
}