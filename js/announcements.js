document.addEventListener('DOMContentLoaded', () => {
    fetch('/announcements/')
        .then(response => response.json())
        .then(data => {
            const announcements = data.announcements || [];
            const container = document.getElementById('announcements-container');

            if (!container) return;

            container.innerHTML = '';

            if (announcements.length === 0) {
                container.innerHTML = `
                    <div class="announcements-empty">
                        現在表示できるお知らせはありません。
                    </div>
                `;
                return;
            }

            announcements.forEach(item => {
                const card = document.createElement('div');
                card.className = 'announcement-card';

                const timestampEl = document.createElement('div');
                timestampEl.className = 'timestamp';
                timestampEl.textContent = formatAnnouncementDate(item.timestamp);

                const titleEl = document.createElement('div');
                titleEl.className = 'title';
                titleEl.textContent = item.title || 'お知らせ';

                const contentEl = document.createElement('div');
                contentEl.className = 'content';
                contentEl.textContent = item.content || '';

                card.appendChild(timestampEl);
                card.appendChild(titleEl);
                card.appendChild(contentEl);

                container.appendChild(card);
            });
        })
        .catch(error => {
            console.error('Error fetching announcements:', error);

            const container = document.getElementById('announcements-container');
            if (container) {
                container.innerHTML = `
                    <div class="announcements-error">
                        お知らせの取得中にエラーが発生しました。
                    </div>
                `;
            }
        });
});

function formatAnnouncementDate(timestamp) {
    if (!timestamp) return '日時未設定';

    const dateObj = new Date(timestamp);

    if (Number.isNaN(dateObj.getTime())) {
        return '日時未設定';
    }

    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    const hh = String(dateObj.getHours()).padStart(2, '0');
    const mm = String(dateObj.getMinutes()).padStart(2, '0');

    return `${y}/${m}/${d} ${hh}:${mm}`;
}