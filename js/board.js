// 投稿管理用：投稿の取得、投稿フォームの管理、リプライボタンの初期化を行います

document.addEventListener('DOMContentLoaded', async function() {
    // 投稿を取得して表示する
    async function fetchPosts() {
        try {
            const response = await fetch('/board', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`投稿の取得に失敗しました: ${response.statusText}`);
            }

            const data = await response.json();
            const postsContainer = document.getElementById('posts-container');
            postsContainer.innerHTML = '';

            data.posts.forEach(post => {
                const postElement = document.createElement('div');
                postElement.classList.add('post-card');
                postElement.innerHTML = `
                    <div class="post-header">
                        <div class="post-author">${post.author}</div>
                        <div class="post-date">${post.created_at}</div>
                    </div>
                    <div class="post-content">${post.content}</div>
                    <div class="expand-button" data-post-id="${post.id}">コメントを見る &gt;</div>
                    <div class="post-details" id="post-details-${post.id}">
                        <!-- リプライエリア -->
                        <div class="replies-container" id="replies-${post.id}"></div>
                        <!-- リプライフォームは reply.js で生成 -->
                    </div>
                `;
                postsContainer.appendChild(postElement);

                // 各投稿の「コメントを見る」ボタンにイベントリスナーを追加
                const expandButton = postElement.querySelector('.expand-button');
                expandButton.addEventListener('click', function() {
                    toggleDetails(post.id);
                });
            });
        } catch (error) {
            console.error('投稿の取得に失敗しました:', error);
        }
    }

    // 詳細を表示/非表示に切り替える
    function toggleDetails(postId) {
        const postDetails = document.getElementById(`post-details-${postId}`);
        const isVisible = postDetails.style.display === 'block';

        if (isVisible) {
            postDetails.style.display = 'none';
        } else {
            postDetails.style.display = 'block';
            fetchReplies(postId);
            generateReplyForm(postId);
        }
    }

    // 新しい投稿を追加する
    async function addPost() {
        const author = document.getElementById('author').value;
        const content = document.getElementById('content').value;

        try {
            const response = await fetch('/board', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ author, content }),
            });

            if (response.ok) {
                await fetchPosts(); // 投稿の一覧を再取得して表示
                document.getElementById('author').value = '';
                document.getElementById('content').value = '';
            } else {
                const errorData = await response.json();
                console.error('投稿失敗:', errorData);
                alert('投稿の追加に失敗しました。');
            }
        } catch (error) {
            console.error('投稿の追加に失敗しました:', error);
        }
    }

    // 新しい投稿フォームのイベントリスナーを追加
    document.getElementById('new-post-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await addPost();
    });

    // 初期表示
    await fetchPosts();
});