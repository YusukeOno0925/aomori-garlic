// 投稿管理用：投稿の取得、投稿フォームの管理、リプライボタンの初期化を行います
// board.js
// - 投稿一覧の取得・表示
// - 新規投稿モーダル (名前自動セット, ログイン必須)
// - リプライモーダルを呼ぶ
// - リプライ表示は reply.js に任せる

document.addEventListener('DOMContentLoaded', async function () {
    let isLoggedIn = false;
    let currentUserName = "";
  
    // 1) ログイン状態確認 & ユーザー名取得
    try {
      const checkRes = await fetch('/check-login-status/', {
        method: 'GET',
        credentials: 'include'
      });
      if (checkRes.ok) {
        isLoggedIn = true;
        // user-info からユーザ名取得
        const userInfoRes = await fetch('/user-info/', { credentials: 'include' });
        if (userInfoRes.ok) {
          const userInfo = await userInfoRes.json();
          currentUserName = userInfo.username || "ゲストユーザ";
        }
      }
    } catch (err) {
      console.log("ログインしていないかエラー:", err);
    }
  
    // 2) 新規投稿モーダル関連
    const postModal = document.getElementById('post-modal');
    const openModalBtn = document.getElementById('ask-question-button');
    const closeModalSpan = document.querySelector('.close-modal');
    const newPostForm = document.getElementById('new-post-form');
    const authorField = document.getElementById('author');
    const contentField = document.getElementById('content');
  
    // 名前フィールドにログインユーザ名をセット (ログインしてなければ空)
    if (authorField) {
      authorField.value = isLoggedIn ? currentUserName : "";
    }
  
    // モーダルを開く: ログイン必須
    openModalBtn.addEventListener('click', () => {
      if (!isLoggedIn) {
        alert('投稿するにはログインが必要です。');
        window.location.href = '/Login.html';
        return;
      }
      postModal.style.display = 'block';
    });
  
    // 閉じるボタン(X)
    closeModalSpan.addEventListener('click', () => {
      postModal.style.display = 'none';
    });
    // 背景クリックで閉じる
    window.addEventListener('click', (e) => {
      if (e.target === postModal) {
        postModal.style.display = 'none';
      }
    });
  
    // 新規投稿フォーム送信
    newPostForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!isLoggedIn) {
        alert('ログインが必要です。');
        return;
      }
      const authorVal = authorField.value.trim() || "ゲストユーザ";
      const contentVal = contentField.value.trim();
      if (!contentVal) {
        alert('投稿内容を入力してください。');
        return;
      }
      try {
        const resp = await fetch('/board', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ author: authorVal, content: contentVal })
        });
        if (!resp.ok) {
          throw new Error('投稿の追加に失敗');
        }
        alert('投稿が追加されました！');
        newPostForm.reset();
        postModal.style.display = 'none';
        await fetchPosts(); // 再取得して更新
      } catch (error) {
        console.error(error);
        alert('投稿に失敗しました');
      }
    });
  
    // 3) リプライ初期化
    window.initReplySystem(isLoggedIn, currentUserName);
  
    // 4) 投稿一覧を取得 & 表示
    await fetchPosts();
  
    // 5) 投稿一覧トグル (「投稿一覧を見る」ボタンなど)
    const togglePostsButton = document.getElementById('toggle-posts-button');
    if (togglePostsButton) {
      togglePostsButton.addEventListener('click', togglePosts);
    }
  });
  
  // =========================
  // 投稿一覧の取得 & 表示
  // =========================
  async function fetchPosts() {
    try {
      const res = await fetch('/board');
      if (!res.ok) {
        throw new Error(`投稿取得エラー: ${res.statusText}`);
      }
      const data = await res.json();
      displayPopularPosts(data.popular_posts);
      displayNewPosts(data.new_posts);
      displayAllPosts(data.all_posts);
    } catch (error) {
      console.error('投稿の取得失敗:', error);
    }
  }
  
  function displayPopularPosts(posts) {
    const container = document.getElementById('popular-posts-container');
    if (!container) return;
    container.innerHTML = '';
    // 最初の3件
    posts.slice(0, 3).forEach((post, idx) => {
      const rankIcon = getRankIcon(idx + 1);
      const card = createPostCard(post, rankIcon);
      container.appendChild(card);
    });
  }
  
  function displayNewPosts(posts) {
    const container = document.getElementById('new-posts-container');
    if (!container) return;
    container.innerHTML = '';
    // 最新5件
    posts.slice(0, 5).forEach(post => {
      const card = createPostCard(post, "");
      container.appendChild(card);
    });
  }
  
  function displayAllPosts(posts) {
    const container = document.getElementById('posts-container');
    if (!container) return;
    container.innerHTML = '';
    posts.forEach(post => {
      const card = createPostCard(post, "");
      container.appendChild(card);
    });
  }
  
  // =========================
  // カード生成
  // =========================
  function createPostCard(post, rankIcon) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('popular-post-card');
  
    const shortTitle = truncateText(post.content, 30);
    const dateStr = formatDate(post.created_at);
  
    // 本文HTML
    wrapper.innerHTML = `
      <div class="popular-post-header">
        ${rankIcon ? `<div class="rank-icon">${rankIcon}</div>` : ""}
        <div class="post-title">${shortTitle}</div>
      </div>
      <div class="popular-post-body">
        <p class="post-content">${truncateText(post.content, 100)}</p>
      </div>
      <div class="popular-post-footer">
        <span class="post-author">${post.author}</span> |
        <span class="post-date">${dateStr}</span> |
        <span class="post-view-count">閲覧数: ${post.view_count}</span>
      </div>
    `;

    const discussionActions = document.createElement('div');
    discussionActions.classList.add('discussion-actions'); // CSSで横並びにする
  
    // (A) 「コメント一覧」ボタン (secondary)
    const viewCommentsBtn = document.createElement('button');
    viewCommentsBtn.classList.add('secondary-button'); 
    viewCommentsBtn.textContent = 'コメント一覧';
  
    // (B) 「コメントを書く」ボタン (primary)
    const writeCommentBtn = document.createElement('button');
    writeCommentBtn.classList.add('primary-button');
    writeCommentBtn.textContent = 'コメントを書く';
  
    // post-details 領域
    const postDetails = document.createElement('div');
    postDetails.id = `post-details-${post.id}`;
    postDetails.classList.add('post-details');
    postDetails.style.display = 'none';
  
    // ボタンのイベント設定
    viewCommentsBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await handleToggleDetails(post.id);
      incrementViewCount(post.id);
    });
    writeCommentBtn.addEventListener('click', () => {
      // リプライ用モーダルを表示
      window.showReplyModal(post.id);
    });
  
    // ボタンをDOMに追加
    discussionActions.appendChild(viewCommentsBtn);
    discussionActions.appendChild(writeCommentBtn);
  
    // ラッパに差し込む
    wrapper.appendChild(discussionActions);
    wrapper.appendChild(postDetails);
  
    return wrapper;
  }
  
  // ランクアイコン
  function getRankIcon(rank) {
    switch (rank) {
      case 1: return `<img src="images/rank1-icon.png" alt="1位" width="36" height="36">`;
      case 2: return `<img src="images/rank2-icon.png" alt="2位" width="36" height="36">`;
      case 3: return `<img src="images/rank3-icon.png" alt="3位" width="36" height="36">`;
      default: return '';
    }
  }
  
  // コメント(リプライ一覧)の表示切り替え
  async function handleToggleDetails(postId) {
    try {
      const chk = await fetch('/check-login-status/', { method: 'GET' });
      if (!chk.ok) {
        alert('コメントを見るにはログインが必要です。');
        window.location.href = '/Login.html';
        return;
      }
    } catch (err) {
      window.location.href = '/Login.html';
      return;
    }
    toggleDetails(postId);
  }
  
  function toggleDetails(postId) {
    const detailsEl = document.getElementById(`post-details-${postId}`);
    if (!detailsEl) return;
    const visible = (detailsEl.style.display === 'block');
    detailsEl.style.display = visible ? 'none' : 'block';
    if (!visible) {
      // fetchReplies (descendingで後ろが新しい順など自由に)
      window.fetchReplies(postId, /* descending= */ true);
    }
  }
  
  // 閲覧回数
  async function incrementViewCount(postId) {
    try {
      await fetch(`/board/${postId}/view`, { method: 'POST' });
    } catch (err) {
      console.error('閲覧回数更新失敗:', err);
    }
  }
  
  // 投稿一覧トグル
  function togglePosts() {
    const postsSection = document.getElementById('posts');
    if (!postsSection) return;
    const st = postsSection.style.display;
    postsSection.style.display = (st === 'none' || !st) ? 'block' : 'none';
  }
  
  // ユーティリティ
  function truncateText(text, maxLen) {
    if (!text) return '';
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
  }
  function formatDate(dateString) {
    if (!dateString) return '';
    const dt = new Date(dateString);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }