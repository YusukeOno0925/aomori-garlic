document.addEventListener('DOMContentLoaded', function() {
    const menuIcon = document.querySelector('.hamburger-menu');
    const navLinks = document.querySelector('.nav-list');
    const dropdownTriggers = document.querySelectorAll('.career-story > a');

    menuIcon.addEventListener('click', function() {
        navLinks.classList.toggle('show');
    });

    dropdownTriggers.forEach(trigger => {
        trigger.addEventListener('click', function(e) {
            e.preventDefault(); 
            const dropdown = trigger.nextElementSibling;
            dropdown.classList.toggle('show');
            
            if (dropdown.classList.contains('show')) {
                trigger.querySelector('.icon').textContent = '−'; // 展開時に−を表示
            } else {
                trigger.querySelector('.icon').textContent = '+'; // 非展開時に+を表示
            }
        });
    });

    // 初期状態の設定：全てのドロップダウンが閉じていることを前提とする
    dropdownTriggers.forEach(trigger => {
        trigger.querySelector('.icon').textContent = '+';
    });

    const linksWithIcons = document.querySelectorAll('.nav-list > li > a:not(.career-story > a), .dropdown > li > a');
    linksWithIcons.forEach(link => {
        const span = document.createElement('span');
        span.classList.add('icon');
        span.textContent = '>';
        link.appendChild(span);
    });
});