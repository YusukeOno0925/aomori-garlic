document.addEventListener('DOMContentLoaded', function () {
    fetch('/metrics/')
        .then(response => response.json())
        .then(data => {
            const userCount = document.getElementById('user-count');
            const storyCount = document.getElementById('story-count');
            const qaCount = document.getElementById('qa-count');

            if (userCount) userCount.textContent = data.user_count ?? 0;
            if (storyCount) storyCount.textContent = data.story_count ?? 0;
            if (qaCount) qaCount.textContent = data.qa_count ?? 0;
        })
        .catch(error => {
            console.error('メトリクス取得エラー:', error);
        });
});