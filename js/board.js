document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();

    document.getElementById('new-post-form').addEventListener('submit', async (e) => {
        e.preventDefault();  // デフォルトの送信を防ぐ
        await addPost();
    });
});

async function fetchPosts() {
    try {
        const response = await fetch('/board');
        const data = await response.json();
        const postsContainer = document.getElementById('posts-container');
        postsContainer.innerHTML = '';  // 既存の投稿をクリア

        data.posts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.innerHTML = `<strong>${post.author}</strong>: ${post.content}`;
            postsContainer.appendChild(postElement);
        });
    } catch (error) {
        console.error('投稿の取得に失敗しました:', error);
    }
}

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
            document.getElementById('new-post-form').reset();
            fetchPosts();  // 投稿が成功したら再取得
        } else {
            const errorData = await response.json();
            console.error('投稿失敗:', errorData);
            alert('投稿の追加に失敗しました。');
        }
    } catch (error) {
        console.error('投稿の追加に失敗しました:', error);
    }
}