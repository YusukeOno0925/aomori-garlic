// 投稿管理用：投稿の取得、投稿フォームの管理、リプライボタンの初期化を行います

document.addEventListener('DOMContentLoaded', async function() {
    // クッキーからトークンを取得する関数
    function getAccessToken() {
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('access_token='));
        return cookieValue ? cookieValue.split('=')[1] : null;
    }

    // 投稿を取得して表示する
    async function fetchPosts() {
        try {
            const response = await fetch('/board', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAccessToken()}`,
                },
            });

            if (response.status === 401) {
                console.error('ユーザーは認証されていません');
                return;
            }

            if (!response.ok) {
                throw new Error(`投稿の取得に失敗しました: ${response.statusText}`);
            }

            const data = await response.json();
            const postsContainer = document.getElementById('posts-container');
            postsContainer.innerHTML = '';

            data.posts.forEach(post => {
                const postElement = document.createElement('div');
                postElement.classList.add('post');
                postElement.innerHTML = `
                    <div class="post-summary">
                        <div class="post-title">
                            <strong>${post.author}</strong>: ${post.content.substring(0, 30)}...
                        </div>
                        <div class="expand-button" data-post-id="${post.id}">＞</div>
                    </div>
                    <div class="post-details" id="post-details-${post.id}" style="display: none;">
                        <div class="replies-container" id="replies-${post.id}"></div>
                        <div class="reply-form">
                            <input type="text" id="reply-author-${post.id}" placeholder="名前" required>
                            <textarea id="reply-content-${post.id}" placeholder="リプライ内容" required></textarea>
                            <button class="reply-submit-button" data-post-id="${post.id}">送信</button>
                        </div>
                    </div>
                `;
                postsContainer.appendChild(postElement);
            });

            // 各投稿の「＞」ボタンにイベントリスナーを追加して詳細を展開
            document.querySelectorAll('.expand-button').forEach(button => {
                button.addEventListener('click', function() {
                    const postId = this.dataset.postId;
                    toggleDetails(postId);
                });
            });

            // リプライに関する機能を初期化
            initializeReplyFeatures();
        } catch (error) {
            console.error('投稿の取得に失敗しました:', error);
        }
    }

    // 詳細を展開または折りたたむ
    function toggleDetails(postId) {
        const postDetails = document.getElementById(`post-details-${postId}`);
        const expandButton = document.querySelector(`.expand-button[data-post-id="${postId}"]`);
        
        if (postDetails.style.display === 'none') {
            postDetails.style.display = 'block';
            expandButton.textContent = '＜'; // 折りたたみ時の表示を「＜」に変更
            fetchReplies(postId);
        } else {
            postDetails.style.display = 'none';
            expandButton.textContent = '＞'; // 展開時の表示を「＞」に変更
        }
    }

    // リプライ関連の機能を初期化
    function initializeReplyFeatures() {
        // リプライ送信ボタンにイベントリスナーを追加
        document.querySelectorAll('.reply-submit-button').forEach(button => {
            button.addEventListener('click', function() {
                const postId = this.dataset.postId;
                addReply(postId);
            });
        });
    }

    // 新しいリプライを追加する
    async function addReply(postId) {
        const author = document.getElementById(`reply-author-${postId}`).value;
        const content = document.getElementById(`reply-content-${postId}`).value;

        try {
            const response = await fetch('/reply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAccessToken()}`,
                },
                body: JSON.stringify({ post_id: postId, author, content }),
            });

            if (response.ok) {
                await fetchReplies(postId); // 返信の一覧を再取得して表示
                document.getElementById(`reply-author-${postId}`).value = '';
                document.getElementById(`reply-content-${postId}`).value = '';
            } else {
                const errorData = await response.json();
                console.error('リプライ失敗:', errorData);
                alert('リプライの追加に失敗しました。');
            }
        } catch (error) {
            console.error('リプライの追加に失敗しました:', error);
        }
    }

    // 指定された投稿の返信を取得して表示する
    async function fetchReplies(postId) {
        try {
            const response = await fetch(`/replies/${postId}`);
            if (!response.ok) {
                throw new Error(`返信の取得に失敗しました: ${response.statusText}`);
            }

            const data = await response.json();
            const repliesContainer = document.getElementById(`replies-${postId}`);
            repliesContainer.innerHTML = '';

            data.replies.forEach(reply => {
                const replyElement = document.createElement('div');
                replyElement.classList.add('reply');
                replyElement.innerHTML = `<strong>${reply.author}</strong>: ${reply.content}`;
                repliesContainer.appendChild(replyElement);
            });
        } catch (error) {
            console.error('リプライの取得に失敗しました:', error);
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
                    'Authorization': `Bearer ${getAccessToken()}`,
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

    // 投稿の取得を初期化
    await fetchPosts();
});