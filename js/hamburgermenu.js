document.addEventListener('DOMContentLoaded', function() {
    // ハンバーガーメニューを取得
    const menuIcon = document.querySelector('.hamburger-menu');
    const navLinks = document.querySelector('.main-menu');

    // ハンバーガーメニューが存在する場合のみ処理を行う
    if (menuIcon && navLinks) {
        menuIcon.addEventListener('click', function() {
            navLinks.classList.toggle('show'); // サイドバーの表示・非表示を切り替え
        });
    } else {
        console.error('hamburger-menu または main-menu が見つかりません');
    }

    // サイドバーの右に > アイコンを追加する処理
    const linksWithIcons = document.querySelectorAll('.main-menu nav ul li a');
    linksWithIcons.forEach(link => {
        const span = document.createElement('span');
        span.classList.add('icon');
        span.textContent = '>';  // 右に > アイコンを追加
        link.appendChild(span);
    });
});