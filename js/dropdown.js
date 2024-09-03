document.addEventListener('DOMContentLoaded', function() {
    const careerStoryLink = document.querySelector('.career-story > a');
    const dropdownMenu = document.querySelector('.career-story .dropdown');

    careerStoryLink.addEventListener('click', function(event) {
        event.preventDefault(); // デフォルトのリンク動作をキャンセル
        dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
        event.stopPropagation(); // 他のイベントへのバブリングを防ぐ
    });

    // ページ外をクリックした時にドロップダウンメニューを閉じる
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.career-story')) {
            dropdownMenu.style.display = 'none';
        }
    });
});