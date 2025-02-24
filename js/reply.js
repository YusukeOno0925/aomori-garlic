// リプライの追加、リプライフォームの表示/非表示切り替え、リプライの取得を行います

let currentReplyPostId = null;
let isUserLoggedIn = false;
let loggedInUsername = "ゲストユーザ";

// 初期化
window.initReplySystem = function(isLoggedIn, username) {
  isUserLoggedIn = isLoggedIn;
  loggedInUsername = username || "ゲストユーザ";

  const replyModal = document.getElementById('reply-modal');
  const closeReplyModalBtn = document.querySelector('.close-reply-modal');
  const replySubmitBtn = document.getElementById('reply-submit-btn');

  // 閉じる
  closeReplyModalBtn.addEventListener('click', () => {
    replyModal.style.display = 'none';
  });
  // 背景クリック
  window.addEventListener('click', (e) => {
    if (e.target === replyModal) {
      replyModal.style.display = 'none';
    }
  });

  // リプライ送信
  replySubmitBtn.addEventListener('click', async () => {
    if (!isUserLoggedIn) {
      alert('リプライにはログインが必要です。');
      window.location.href = '/Login.html';
      return;
    }
    const contentField = document.getElementById('reply-content-field');
    const contentVal = contentField.value.trim();
    if (!contentVal) {
      alert('リプライ内容を入力してください。');
      return;
    }
    try {
      const res = await fetch('/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: currentReplyPostId,
          author: loggedInUsername,
          content: contentVal
        })
      });
      if (!res.ok) {
        throw new Error('リプライ送信に失敗');
      }
      alert('リプライが投稿されました。');
      contentField.value = '';
      replyModal.style.display = 'none';
      // 再取得(新しい順)
      window.fetchReplies(currentReplyPostId, true);
    } catch (err) {
      console.error(err);
      alert('リプライに失敗しました。');
    }
  });
};

// リプライモーダルを開く
window.showReplyModal = function(postId) {
  if (!isUserLoggedIn) {
    alert('リプライするにはログインが必要です。');
    window.location.href = '/Login.html';
    return;
  }
  currentReplyPostId = postId;
  const replyModal = document.getElementById('reply-modal');
  replyModal.style.display = 'block';
};

// リプライ一覧を取得して表示
window.fetchReplies = async function(postId, descending=false) {
  try {
    const resp = await fetch(`/replies/${postId}`, { method: 'GET' });
    if (!resp.ok) {
      const errData = await resp.json();
      throw new Error(`リプライ取得失敗: ${errData.detail}`);
    }
    const data = await resp.json();
    const container = document.getElementById(`post-details-${postId}`);
    if (!container) return;

    // リプライを "降順(最新が上)" にソート
    let replies = data.replies;
    if (descending) {
      replies = replies.sort((a,b) => {
        return new Date(b.created_at) - new Date(a.created_at);
      });
    }

    let html = `<div class="reply-list">`;
    replies.forEach(reply => {
      html += `
        <div class="reply-item">
          <div class="reply-author-date">
            <span class="reply-author">${reply.author}</span> |
            <span class="reply-date">${reply.created_at}</span>
          </div>
          <div class="reply-content">${reply.content}</div>
        </div>
      `;
    });
    html += `</div>`;

    container.innerHTML = html;
  } catch (err) {
    console.error(err);
  }
};