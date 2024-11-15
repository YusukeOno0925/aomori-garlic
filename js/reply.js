// リプライの追加、リプライフォームの表示/非表示切り替え、リプライの取得を行います

// グローバルスコープで関数を定義
window.fetchReplies = async function(postId) {
    try {
        const response = await fetch(`/replies/${postId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`リプライの取得に失敗しました: ${errorData.detail}`);
        }

        const data = await response.json();
        const repliesContainer = document.getElementById(`replies-${postId}`);
        repliesContainer.innerHTML = '';

        data.replies.forEach(reply => {
            const replyElement = document.createElement('div');
            replyElement.classList.add('reply');

            let replyContent = reply.content;
            let isLongContent = false;
            const maxLength = 100; // 最大表示文字数

            if (replyContent.length > maxLength) {
                isLongContent = true;
                replyContent = replyContent.substring(0, maxLength) + '...';
            }

            replyElement.innerHTML = `
                <div class="reply-date">${reply.created_at}</div>
                <div class="reply-author">${reply.author}</div>
                <div class="reply-content">${replyContent}</div>
            `;

            if (isLongContent) {
                const readMoreLink = document.createElement('a');
                readMoreLink.href = '#';
                readMoreLink.textContent = '続きを読む';
                readMoreLink.classList.add('read-more-link');
                replyElement.appendChild(readMoreLink);

                readMoreLink.addEventListener('click', function(e) {
                    e.preventDefault();
                    // フルテキストを表示
                    const fullContent = document.createElement('div');
                    fullContent.classList.add('reply-content-full');
                    fullContent.textContent = reply.content;
                    replyElement.replaceChild(fullContent, replyElement.querySelector('.reply-content'));
                    readMoreLink.style.display = 'none';
                });
            }

            repliesContainer.appendChild(replyElement);
        });

        // リプライフォームを確実に生成する
        generateReplyForm(postId);
    } catch (error) {
        console.error('リプライの取得に失敗しました:', error);
    }
}

window.generateReplyForm = function(postId) {
    const postDetails = document.getElementById(`post-details-${postId}`);
    if (postDetails.querySelector('.reply-form')) return; // 既にフォームがある場合は生成しない

    const replyForm = document.createElement('div');
    replyForm.classList.add('reply-form');
    replyForm.innerHTML = `
        <input type="text" id="reply-author-${postId}" placeholder="名前（50文字以内）" required maxlength="50">
        <textarea id="reply-content-${postId}" placeholder="リプライ内容（100文字以内）" required maxlength="100"></textarea>
        <button class="reply-submit-button" data-post-id="${postId}">送信</button>
    `;
    postDetails.appendChild(replyForm);

    // リプライ送信ボタンのイベントリスナーを追加
    const replySubmitButton = replyForm.querySelector('.reply-submit-button');
    replySubmitButton.addEventListener('click', function() {
        addReply(postId);
    });
}

window.addReply = async function(postId) {
    const authorInput = document.getElementById(`reply-author-${postId}`);
    const contentInput = document.getElementById(`reply-content-${postId}`);
    const author = authorInput.value.trim();
    const content = contentInput.value.trim();

    // フロントエンドでのバリデーション
    if (author.length === 0) {
        alert('名前を入力してください。');
        return;
    }
    if (author.length > 50) {
        alert('名前は50文字以内で入力してください。');
        return;
    }
    if (content.length === 0) {
        alert('リプライ内容を入力してください。');
        return;
    }
    if (content.length > 100) {
        alert('リプライ内容は100文字以内で入力してください。');
        return;
    }

    try {
        const response = await fetch('/reply', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ post_id: postId, author, content }),
        });

        if (response.ok) {
            await fetchReplies(postId);
            authorInput.value = '';
            contentInput.value = '';
        } else {
            const errorData = await response.json();
            console.error('リプライ失敗:', errorData);
            alert('リプライの追加に失敗しました。');
        }
    } catch (error) {
        console.error('リプライの追加に失敗しました:', error);
    }
}