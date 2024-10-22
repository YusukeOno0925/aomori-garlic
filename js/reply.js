// リプライの追加、リプライフォームの表示/非表示切り替え、リプライの取得を行います

document.addEventListener('DOMContentLoaded', function() {
    // クッキーからトークンを取得する関数
    function getAccessToken() {
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('access_token='));
        return cookieValue ? cookieValue.split('=')[1] : null;
    }

    // 各投稿に対するリプライ機能を初期化
    window.initializeReplyFeatures = function() {
        document.querySelectorAll('.reply-button').forEach(button => {
            button.addEventListener('click', function() {
                const postId = this.dataset.postId;
                showReplyForm(postId);
            });
        });

        document.querySelectorAll('.reply-submit-button').forEach(button => {
            button.addEventListener('click', function() {
                const postId = this.dataset.postId;
                addReply(postId);
            });
        });

        document.querySelectorAll('.post').forEach(postElement => {
            const postId = postElement.querySelector('.reply-button').dataset.postId;
            fetchReplies(postId);
        });
    }

    // リプライフォームの表示/非表示切り替え
    function showReplyForm(postId) {
        const replyForm = document.getElementById(`reply-form-${postId}`);
        replyForm.style.display = replyForm.style.display === 'none' ? 'block' : 'none';
    }

    // リプライを追加する
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
                fetchReplies(postId);
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

    // リプライを取得して表示する
    async function fetchReplies(postId) {
        try {
            const response = await fetch(`/replies/${postId}`, {
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
});