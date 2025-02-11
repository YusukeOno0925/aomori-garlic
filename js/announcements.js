document.addEventListener('DOMContentLoaded', () => {
    // /announcements/ APIからお知らせ一覧データを取得
    fetch('/announcements/')
        .then(response => response.json())
        .then(data => {
            const announcements = data.announcements;
            const container = document.getElementById('announcements-container');

            announcements.forEach(item => {
                // カード全体
                const card = document.createElement('div');
                card.className = 'announcement-card';

                // 日時表示
                const timestampEl = document.createElement('div');
                timestampEl.className = 'timestamp';
                // 例: 2025-02-15T14:30:00 => 2025/02/15 14:30 の形式に変換
                const dateObj = new Date(item.timestamp);
                const y = dateObj.getFullYear();
                const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                const d = String(dateObj.getDate()).padStart(2, '0');
                const hh = String(dateObj.getHours()).padStart(2, '0');
                const mm = String(dateObj.getMinutes()).padStart(2, '0');
                timestampEl.textContent = `${y}/${m}/${d} ${hh}:${mm}`;

                // タイトル
                const titleEl = document.createElement('div');
                titleEl.className = 'title';
                titleEl.textContent = item.title;

                // 内容
                const contentEl = document.createElement('div');
                contentEl.className = 'content';
                contentEl.textContent = item.content;

                // カードに要素を追加
                card.appendChild(titleEl);
                card.appendChild(timestampEl);
                card.appendChild(contentEl);

                container.appendChild(card);
            });
        })
        .catch(error => {
            console.error('Error fetching announcements:', error);
        });
});