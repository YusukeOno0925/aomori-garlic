document.addEventListener('DOMContentLoaded', function() {
    fetchAnnouncements();
});

function fetchAnnouncements() {
    fetch('/announcements/') // ← DB連動のAPI
        .then(response => response.json())
        .then(data => {
            const announcementsArray = data.announcements; // [{ id, title, content, timestamp, ... }, ...]
            const announcementsList = document.getElementById('announcements-list');
            
            // 既に要素があればクリア
            announcementsList.innerHTML = '';

            // 例: 最新3件だけホーム画面に表示
            const latestAnnouncements = announcementsArray.slice(0, 3);

            latestAnnouncements.forEach(item => {
                const announcementItem = document.createElement('div');
                announcementItem.className = 'announcement-item';

                // 日付整形
                const dateObj = new Date(item.timestamp);
                const y = dateObj.getFullYear();
                const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                const d = String(dateObj.getDate()).padStart(2, '0');
                const hh = String(dateObj.getHours()).padStart(2, '0');
                const mm = String(dateObj.getMinutes()).padStart(2, '0');
                const formattedDate = `${y}/${m}/${d} ${hh}:${mm}`;

                // HTML組み立て: タイトルや本文を短く切るなど適宜
                announcementItem.innerHTML = `
                    <p>${formattedDate}</p>
                    <p><strong>${item.title}</strong></p>
                    <p>${item.content.substring(0,30)}…</p> <!-- 50文字まで表示 -->
                `;

                announcementsList.appendChild(announcementItem);
            });

            // お知らせが多い場合は「もっと見る」リンクをつけるなど
            if (announcementsArray.length > 3) {
                const moreLink = document.createElement('a');
                moreLink.href = "Announcements.html";
                moreLink.textContent = "もっと見る";
                moreLink.style.display = "inline-block";
                moreLink.style.marginTop = "0.5rem";
                announcementsList.appendChild(moreLink);
            }

        })
        .catch(error => {
            console.error('Error fetching announcements on Home:', error);
        });
}


// "登録すると何ができる？"のアコーディオン対応
function openWhyRegister() {
    // 折りたたみを非表示
    document.getElementById('whyRegisterCollapsed').style.display = 'none';
    // 展開を表示
    document.getElementById('whyRegisterExpanded').style.display = 'block';
}
  
  function closeWhyRegister() {
    // 展開を非表示
    document.getElementById('whyRegisterExpanded').style.display = 'none';
    // 折りたたみを表示
    document.getElementById('whyRegisterCollapsed').style.display = 'flex'; 
}