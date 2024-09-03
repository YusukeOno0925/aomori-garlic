document.addEventListener('DOMContentLoaded', function () {
    fetch('data/careers.json')
        .then(response => response.json())
        .then(data => {
            const urlParams = new URLSearchParams(window.location.search);
            const careerId = urlParams.get('id');

            const career = data.careers.find(c => c.id == careerId);
            const careerDetail = document.getElementById('career-detail');
            if (career) {
                careerDetail.innerHTML = `
                    <div class="card">
                        <h2>${career.name}</h2>
                        <p><strong>職業:</strong> ${career.profession}</p>
                    </div>
                    <div class="card">
                        <h3>キャリアストーリー</h3>
                        <p>${career.story}</p>
                    </div>
                    <div class="card">
                        <h3>就職時の苦労</h3>
                        <p>${career.challenges}</p>
                    </div>
                    <div class="card">
                        <h3>成功体験</h3>
                        <p>${career.successes}</p>
                    </div>
                    <div class="card">
                        <h3>失敗体験</h3>
                        <p>${career.failures}</p>
                    </div>
                    <div class="card">
                        <h3>転職した理由</h3>
                        <p>${career.reasonForChange}</p>
                    </div>
                    <div class="card">
                        <h3>転職後の所感</h3>
                        <p>${career.experienceAfterChange}</p>
                    </div>
                    <div class="card">
                        <h3>転職後に必要だったスキル</h3>
                        <p>${career.skillsNeeded}</p>
                    </div>
                    <div class="card">
                        <h3>学歴</h3>
                        <p>${career.education}</p>
                    </div>
                    <div class="card">
                        <h3>会社履歴</h3>
                        <ul>
                            ${career.companies.map(company => `<li>${company.name}: ${company.startYear} - ${company.endYear ? company.endYear : '現在'}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="card">
                        <h3>年収推移</h3>
                        <ul>
                            ${career.income.map(income => `<li>年齢 ${income.age}: ${income.income}万円</li>`).join('')}
                        </ul>
                    </div>
                `;

                const commentList = document.getElementById('comment-list');
                const comments = JSON.parse(localStorage.getItem(`comments-${careerId}`)) || [];
                comments.forEach(comment => {
                    const commentItem = document.createElement('div');
                    commentItem.classList.add('card'); // コメントもカード形式にする
                    commentItem.textContent = comment;
                    commentList.appendChild(commentItem);
                });

                const commentText = document.getElementById('comment-text');
                const submitComment = document.getElementById('submit-comment');
                submitComment.addEventListener('click', function () {
                    const newComment = commentText.value;
                    if (newComment) {
                        comments.push(newComment);
                        localStorage.setItem(`comments-${careerId}`, JSON.stringify(comments));
                        const commentItem = document.createElement('div');
                        commentItem.classList.add('card'); // 新しいコメントもカード形式にする
                        commentItem.textContent = newComment;
                        commentList.appendChild(commentItem);
                        commentText.value = '';
                    }
                });
            } else {
                careerDetail.innerHTML = '<p>キャリアが見つかりませんでした。</p>';
            }
        });
});