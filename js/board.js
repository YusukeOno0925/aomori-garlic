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

            // 人気のある投稿を表示
            const popularPostsContainer = document.getElementById('popular-posts-container');
            popularPostsContainer.innerHTML = '';
            data.popular_posts.slice(0, 3).forEach((post, index) => {
                const rankIcon = getRankIcon(index + 1);
                const postElement = createPostElement(post, rankIcon);
                popularPostsContainer.appendChild(postElement);
            });

            // 最新の投稿を表示
            const newPostsContainer = document.getElementById('new-posts-container');
            newPostsContainer.innerHTML = '';
            data.new_posts.slice(0, 5).forEach((post) => {
                const postElement = createPostElement(post, '');
                newPostsContainer.appendChild(postElement);
            });

            // 投稿一覧を表示
            const postsContainer = document.getElementById('posts-container');
            postsContainer.innerHTML = '';
            data.all_posts.forEach(post => {
                const postElement = createPostElement(post, '');
                postsContainer.appendChild(postElement);
            });
        } catch (error) {
            console.error('投稿の取得に失敗しました:', error);
        }
    }

    // 投稿一覧の表示をトグルする関数
    function togglePosts() {
        const postsSection = document.getElementById('posts');
        const postsContainer = document.getElementById('posts-container');
        if (postsContainer.innerHTML.trim() === '') {
            console.error('投稿が見つかりません');
            return;
        }

        if (postsSection.style.display === 'none' || postsSection.style.display === '') {
            postsSection.style.display = 'block';
        } else {
            postsSection.style.display = 'none';
        }
    }

    // 投稿の要素を作成する関数（ランクアイコン付き）
    function createPostElement(post, rankIcon) {
        const postElement = document.createElement('div');
        postElement.classList.add('popular-post-card');
        postElement.innerHTML = `
            <div class="popular-post-header">
                ${rankIcon ? `<div class="rank-icon">${rankIcon}</div>` : ''}
                <div class="post-title ${!rankIcon ? 'no-rank-icon' : ''}">
                    ${post.title ? truncateText(post.title, 30) : truncateText(post.content, 30)}
                </div>
            </div>
            <div class="popular-post-body">
                <p class="post-content">${truncateText(post.content, 100)}</p>
            </div>
            <div class="popular-post-footer">
                <span class="post-author">${post.author}</span> |
                <span class="post-date">${formatDate(post.created_at)}</span> |
                <span class="post-view-count">閲覧数: ${post.view_count}</span>
            </div>
            <div class="comments-link">
                <a href="#" class="expand-button" data-post-id="${post.id}">コメントを見る &gt;</a>
            </div>
            <div class="post-details" id="post-details-${post.id}" style="display: none;">
                <!-- リプライエリア -->
                <div class="replies-container" id="replies-${post.id}"></div>
                <!-- リプライフォームは reply.js で生成 -->
            </div>
        `;

        // コメントを見るボタンのイベントリスナーを追加
        const expandButton = postElement.querySelector('.expand-button');
        expandButton.addEventListener('click', function () {
            event.preventDefault(); // リンクのデフォルト動作を無効化する
            toggleDetails(post.id);
            incrementViewCount(post.id);
        });

        return postElement;
    }

    // 日付を「年月日」形式にフォーマットする関数
    function formatDate(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // テキストを指定した長さにトリミングする関数
    function truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    // ランクアイコンを取得する関数
    function getRankIcon(rank) {
        switch (rank) {
            case 1:
                return '<img src="images/rank1-icon.png" alt="ランキング1位アイコン" width="40" height="40">';
            case 2:
                return '<img src="images/rank2-icon.png" alt="ランキング2位アイコン" width="40" height="40">';
            case 3:
                return '<img src="images/rank3-icon.png" alt="ランキング3位アイコン" width="40" height="40">';
            default:
                return '';
        }
    }

    // 詳細を表示/非表示に切り替える
    async function toggleDetails(postId) {
        const postDetails = document.getElementById(`post-details-${postId}`);
    
        // postDetails が null の場合は処理を中断する
        if (!postDetails) {
            console.error(`投稿詳細の要素が見つかりませんでした: post-details-${postId}`);
            return;
        }
    
        const isVisible = postDetails.style.display === 'block';
    
        if (isVisible) {
            postDetails.style.display = 'none';
        } else {
            postDetails.style.display = 'block';
            try {
                await fetchReplies(postId);
                // リプライ取得後、フォームが存在しない場合に生成する
                if (!postDetails.querySelector('.reply-form')) {
                    generateReplyForm(postId);
                }
            } catch (error) {
                console.error(`リプライの取得に失敗しました: ${error}`);
            }
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

    // 閲覧回数をインクリメントする関数
    async function incrementViewCount(postId) {
        try {
            await fetch(`/board/${postId}/view`, {
                method: 'POST',
            });
        } catch (error) {
            console.error('閲覧回数の更新に失敗しました:', error);
        }
    }

    // 新しい投稿フォームのイベントリスナーを追加
    document.getElementById('new-post-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await addPost();
    });

    // 初期表示
    await fetchPosts();

    // 投稿一覧ボタンのイベントリスナーを追加
    document.getElementById('toggle-posts-button').addEventListener('click', togglePosts);
});

document.addEventListener('DOMContentLoaded', function () {
    // ボタンをクリックしてフォームを表示/非表示にする
    const askQuestionButton = document.getElementById('ask-question-button');
    const postFormSection = document.getElementById('post-form');

    askQuestionButton.addEventListener('click', function () {
        // フォームの表示をトグル
        if (postFormSection.style.display === 'none') {
            postFormSection.style.display = 'block';
        } else {
            postFormSection.style.display = 'none';
        }
    });

    // 新しい投稿フォームの送信処理
    document.getElementById('new-post-form').addEventListener('submit', async function (e) {
        e.preventDefault();
        const author = document.getElementById('author').value;
        const content = document.getElementById('content').value;

        // 投稿データをサーバーに送信（仮の処理）
        console.log('新しい投稿:', { author, content });

        // フォームをリセットして非表示にする
        document.getElementById('new-post-form').reset();
        postFormSection.style.display = 'none';
    });
});