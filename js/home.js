document.addEventListener('DOMContentLoaded', function() {
    fetchAnnouncements();
});

function fetchAnnouncements() {
    const announcements = [
        { date: '2024-08-01', content: '新しいキャリアストーリーが追加されました！' },
        { date: '2024-07-28', content: 'キャリアパスの可視化機能がアップデートされました。' }
    ];

    const announcementsList = document.getElementById('announcements-list');
    announcements.forEach(announcement => {
        const announcementItem = document.createElement('div');
        announcementItem.className = 'announcement-item';
        announcementItem.innerHTML = `<p>${announcement.date}: ${announcement.content}</p>`;
        announcementsList.appendChild(announcementItem);
    });
}